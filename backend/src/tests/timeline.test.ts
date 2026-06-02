import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../db";

describe("Timeline & Search Integration Tests", () => {
  let tokenA: string;
  let userIdA: string;
  let tokenB: string;
  let userIdB: string;
  let tokenC: string;
  let userIdC: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.follow.deleteMany({});
    await prisma.like.deleteMany({});
    await prisma.tweet.deleteMany({});
    await prisma.user.deleteMany({});

    const userARes = await request(app)
      .post("/api/auth/register")
      .send({ email: "alice@test.com", username: "alice", password: "password123", name: "Alice Wonder" });
    tokenA = userARes.body.token;
    userIdA = userARes.body.user.id;

    const userBRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "bob@test.com", username: "bobby", password: "password123", name: "Bob Builder" });
    tokenB = userBRes.body.token;
    userIdB = userBRes.body.user.id;

    const userCRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "charlie@test.com", username: "charlie", password: "password123", name: "Charlie Brown" });
    tokenC = userCRes.body.token;
    userIdC = userCRes.body.user.id;

    // User A follows User B
    await request(app)
      .post(`/api/users/${userIdB}/follow`)
      .set("Authorization", `Bearer ${tokenA}`);

    // User A creates 3 tweets
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post("/api/tweets")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ text: `Alice tweet ${i}` });
    }

    // User B creates 2 tweets
    for (let i = 0; i < 2; i++) {
      await request(app)
        .post("/api/tweets")
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ text: `Bob tweet ${i}` });
    }

    // User C creates 2 tweets (not followed by A)
    for (let i = 0; i < 2; i++) {
      await request(app)
        .post("/api/tweets")
        .set("Authorization", `Bearer ${tokenC}`)
        .send({ text: `Charlie tweet ${i}` });
    }

    // Small delay so timestamps are distinct for ordering tests
    await new Promise((r) => setTimeout(r, 10));
  });

  afterAll(async () => {
    await prisma.follow.deleteMany({});
    await prisma.like.deleteMany({});
    await prisma.tweet.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe("GET /api/tweets/timeline", () => {
    it("should return tweets from self and followed users only", async () => {
      const res = await request(app)
        .get("/api/tweets/timeline")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.tweets.length).toBe(5);
      // Should include User A's 3 tweets + User B's 2 tweets = 5
      // Should NOT include User C's tweets
      const texts = res.body.tweets.map((t: any) => t.text);
      expect(texts.filter((t: string) => t.includes("Alice"))).toHaveLength(3);
      expect(texts.filter((t: string) => t.includes("Bob"))).toHaveLength(2);
      expect(texts.filter((t: string) => t.includes("Charlie"))).toHaveLength(0);
    });

    it("should return tweets ordered by createdAt DESC (most recent first)", async () => {
      const res = await request(app)
        .get("/api/tweets/timeline")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      const dates = res.body.tweets.map((t: any) => new Date(t.createdAt).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    });

    it("should support pagination with limit and offset", async () => {
      const page1 = await request(app)
        .get("/api/tweets/timeline?limit=2&offset=0")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(page1.status).toBe(200);
      expect(page1.body.tweets.length).toBe(2);
      expect(page1.body.total).toBe(5);
      expect(page1.body.limit).toBe(2);
      expect(page1.body.offset).toBe(0);

      const page2 = await request(app)
        .get("/api/tweets/timeline?limit=2&offset=2")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(page2.status).toBe(200);
      expect(page2.body.tweets.length).toBe(2);

      const page3 = await request(app)
        .get("/api/tweets/timeline?limit=2&offset=4")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(page3.status).toBe(200);
      expect(page3.body.tweets.length).toBe(1);

      // Verify pages don't overlap
      const page1Ids = page1.body.tweets.map((t: any) => t.id);
      const page2Ids = page2.body.tweets.map((t: any) => t.id);
      const page3Ids = page3.body.tweets.map((t: any) => t.id);
      const allIds = [...page1Ids, ...page2Ids, ...page3Ids];
      expect(new Set(allIds).size).toBe(5);
    });

    it("should return empty timeline for user who follows no one and has no tweets", async () => {
      const res = await request(app)
        .get("/api/tweets/timeline")
        .set("Authorization", `Bearer ${tokenC}`);

      expect(res.status).toBe(200);
      expect(res.body.tweets.length).toBe(2);
      // User C has their own tweets but follows no one else
    });

    it("should enforce max limit of 100", async () => {
      const res = await request(app)
        .get("/api/tweets/timeline?limit=500")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.limit).toBe(100);
    });

    it("should use default limit of 20 if no limit provided", async () => {
      const res = await request(app)
        .get("/api/tweets/timeline")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.limit).toBe(20);
    });

    it("should require authentication", async () => {
      const res = await request(app).get("/api/tweets/timeline");
      expect(res.status).toBe(401);
    });

    it("should include likesCount and liked in each tweet", async () => {
      const res = await request(app)
        .get("/api/tweets/timeline")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      for (const tweet of res.body.tweets) {
        expect(tweet).toHaveProperty("likesCount");
        expect(tweet).toHaveProperty("liked");
        expect(tweet).toHaveProperty("user");
        expect(tweet.user).toHaveProperty("id");
        expect(tweet.user).toHaveProperty("username");
        expect(tweet.user).toHaveProperty("name");
      }
    });
  });

  describe("GET /api/users/search", () => {
    it("should find users by name (partial match)", async () => {
      const res = await request(app)
        .get("/api/users/search?q=bob")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      const names = res.body.map((u: any) => u.name.toLowerCase());
      expect(names.some((n: string) => n.includes("bob"))).toBe(true);
    });

    it("should find users by username (partial match)", async () => {
      const res = await request(app)
        .get("/api/users/search?q=bobby")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body.some((u: any) => u.username === "bobby")).toBe(true);
    });

    it("should return empty array for no matches", async () => {
      const res = await request(app)
        .get("/api/users/search?q=zzzzzznonexistent")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should return empty array for empty query", async () => {
      const res = await request(app)
        .get("/api/users/search?q=")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("should match multiple users", async () => {
      const res = await request(app)
        .get("/api/users/search?q=a")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it("should require authentication", async () => {
      const res = await request(app).get("/api/users/search?q=bob");
      expect(res.status).toBe(401);
    });

    it("should return limited fields (no passwordHash or email)", async () => {
      const res = await request(app)
        .get("/api/users/search?q=bob")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      if (res.body.length > 0) {
        const user = res.body[0];
        expect(user).toHaveProperty("id");
        expect(user).toHaveProperty("username");
        expect(user).toHaveProperty("name");
        expect(user).toHaveProperty("bio");
        expect(user).toHaveProperty("avatarUrl");
        expect(user).not.toHaveProperty("passwordHash");
        expect(user).not.toHaveProperty("email");
      }
    });
  });
});
