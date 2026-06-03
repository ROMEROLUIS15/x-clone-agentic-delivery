import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../db";

describe("Replies / Threads Integration Tests", () => {
  let token: string;
  let userId: string;
  let otherToken: string;
  let parentId: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.follow.deleteMany({});
    await prisma.like.deleteMany({});
    await prisma.tweet.deleteMany({});
    await prisma.user.deleteMany({});

    const userRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "author@example.com", username: "author", password: "password123", name: "Author" });
    token = userRes.body.token;
    userId = userRes.body.user.id;

    const otherRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "replier@example.com", username: "replier", password: "password123", name: "Replier" });
    otherToken = otherRes.body.token;

    const parentRes = await request(app)
      .post("/api/tweets")
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Parent tweet" });
    parentId = parentRes.body.id;
  });

  afterAll(async () => {
    await prisma.follow.deleteMany({});
    await prisma.like.deleteMany({});
    await prisma.tweet.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe("POST /api/tweets/:id/replies", () => {
    it("should create a reply on an existing tweet", async () => {
      const response = await request(app)
        .post(`/api/tweets/${parentId}/replies`)
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ text: "Nice tweet!" });

      expect(response.status).toBe(201);
      expect(response.body.text).toBe("Nice tweet!");
      expect(response.body.parentId).toBe(parentId);
      expect(response.body.replyCount).toBe(0);
      expect(response.body.user.username).toBe("replier");
    });

    it("should increment the parent's replyCount", async () => {
      await request(app)
        .post(`/api/tweets/${parentId}/replies`)
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ text: "First reply" });

      const parent = await request(app)
        .get(`/api/tweets/${parentId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(parent.body.tweet.replyCount).toBe(1);
    });

    it("should reject an empty reply", async () => {
      const response = await request(app)
        .post(`/api/tweets/${parentId}/replies`)
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ text: "   " });

      expect(response.status).toBe(400);
    });

    it("should reject a reply exceeding 280 characters", async () => {
      const response = await request(app)
        .post(`/api/tweets/${parentId}/replies`)
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ text: "A".repeat(281) });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("280 characters or less");
    });

    it("should return 404 when replying to a non-existent tweet", async () => {
      const response = await request(app)
        .post("/api/tweets/nonexistent-id/replies")
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ text: "Hello?" });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("Tweet not found");
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .post(`/api/tweets/${parentId}/replies`)
        .send({ text: "No auth" });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/tweets/:id/replies", () => {
    beforeEach(async () => {
      // Three replies in a known order
      for (const text of ["r1", "r2", "r3"]) {
        await request(app)
          .post(`/api/tweets/${parentId}/replies`)
          .set("Authorization", `Bearer ${otherToken}`)
          .send({ text });
      }
    });

    it("should return replies in chronological order with pagination metadata", async () => {
      const response = await request(app)
        .get(`/api/tweets/${parentId}/replies`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(3);
      expect(response.body.replies.map((r: { text: string }) => r.text)).toEqual(["r1", "r2", "r3"]);
    });

    it("should respect limit and offset", async () => {
      const response = await request(app)
        .get(`/api/tweets/${parentId}/replies?limit=2&offset=1`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(3);
      expect(response.body.replies.map((r: { text: string }) => r.text)).toEqual(["r2", "r3"]);
    });

    it("should return 404 for replies of a non-existent tweet", async () => {
      const response = await request(app)
        .get("/api/tweets/nonexistent-id/replies")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/tweets/:id (thread context)", () => {
    it("should return the tweet with a null parent for a top-level tweet", async () => {
      const response = await request(app)
        .get(`/api/tweets/${parentId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.tweet.id).toBe(parentId);
      expect(response.body.parent).toBeNull();
    });

    it("should return the parent context for a reply", async () => {
      const replyRes = await request(app)
        .post(`/api/tweets/${parentId}/replies`)
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ text: "A reply" });

      const response = await request(app)
        .get(`/api/tweets/${replyRes.body.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.tweet.text).toBe("A reply");
      expect(response.body.parent.id).toBe(parentId);
    });

    it("should return 404 for a non-existent tweet", async () => {
      const response = await request(app)
        .get("/api/tweets/nonexistent-id")
        .set("Authorization", `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe("Replies and the timeline", () => {
    it("should NOT include replies in the home timeline", async () => {
      await request(app)
        .post(`/api/tweets/${parentId}/replies`)
        .set("Authorization", `Bearer ${token}`)
        .send({ text: "My own reply" });

      const timeline = await request(app)
        .get("/api/tweets/timeline")
        .set("Authorization", `Bearer ${token}`);

      expect(timeline.status).toBe(200);
      // Only the parent tweet, not the reply
      expect(timeline.body.total).toBe(1);
      expect(timeline.body.tweets.every((t: { parentId: string | null }) => t.parentId === null)).toBe(true);
    });

    it("should cascade-delete replies when the parent is deleted", async () => {
      const replyRes = await request(app)
        .post(`/api/tweets/${parentId}/replies`)
        .set("Authorization", `Bearer ${otherToken}`)
        .send({ text: "Doomed reply" });
      const replyId = replyRes.body.id;

      await request(app)
        .delete(`/api/tweets/${parentId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const orphan = await prisma.tweet.findUnique({ where: { id: replyId } });
      expect(orphan).toBeNull();
    });
  });
});
