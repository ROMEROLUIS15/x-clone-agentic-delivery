import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../db";

// 1x1 transparent PNG — a real, valid image small enough to upload in tests.
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

describe("Image Upload Integration Tests", () => {
  let token: string;
  let userId: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.follow.deleteMany({});
    await prisma.like.deleteMany({});
    await prisma.tweet.deleteMany({});
    await prisma.user.deleteMany({});

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "uploader@example.com", username: "uploader", password: "password123", name: "Uploader" });
    token = res.body.token;
    userId = res.body.user.id;
  });

  afterAll(async () => {
    await prisma.follow.deleteMany({});
    await prisma.like.deleteMany({});
    await prisma.tweet.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe("POST /api/uploads", () => {
    it("should accept a valid image and return a public url", async () => {
      const res = await request(app)
        .post("/api/uploads")
        .set("Authorization", `Bearer ${token}`)
        .attach("image", PNG_1x1, { filename: "pic.png", contentType: "image/png" });

      expect(res.status).toBe(201);
      expect(res.body.url).toMatch(/^\/uploads\/[A-Za-z0-9._-]+\.png$/);
    });

    it("should reject a non-image file", async () => {
      const res = await request(app)
        .post("/api/uploads")
        .set("Authorization", `Bearer ${token}`)
        .attach("image", Buffer.from("not an image"), { filename: "note.txt", contentType: "text/plain" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("image files");
    });

    it("should reject a file over the size limit", async () => {
      // Test setup caps MAX_UPLOAD_BYTES at 5000 bytes.
      const big = Buffer.alloc(6000, 1);
      const res = await request(app)
        .post("/api/uploads")
        .set("Authorization", `Bearer ${token}`)
        .attach("image", big, { filename: "big.png", contentType: "image/png" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("size");
    });

    it("should return 400 when no file is provided", async () => {
      const res = await request(app)
        .post("/api/uploads")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("No image file");
    });

    it("should require authentication", async () => {
      const res = await request(app)
        .post("/api/uploads")
        .attach("image", PNG_1x1, { filename: "pic.png", contentType: "image/png" });

      expect(res.status).toBe(401);
    });
  });

  describe("Tweets with images", () => {
    it("should create a tweet carrying an image url", async () => {
      const upload = await request(app)
        .post("/api/uploads")
        .set("Authorization", `Bearer ${token}`)
        .attach("image", PNG_1x1, { filename: "pic.png", contentType: "image/png" });

      const res = await request(app)
        .post("/api/tweets")
        .set("Authorization", `Bearer ${token}`)
        .send({ text: "Look at this!", imageUrl: upload.body.url });

      expect(res.status).toBe(201);
      expect(res.body.imageUrl).toBe(upload.body.url);
    });

    it("should default imageUrl to null when omitted", async () => {
      const res = await request(app)
        .post("/api/tweets")
        .set("Authorization", `Bearer ${token}`)
        .send({ text: "No image here" });

      expect(res.status).toBe(201);
      expect(res.body.imageUrl).toBeNull();
    });

    it("should reject an imageUrl that is not an internal upload reference", async () => {
      const res = await request(app)
        .post("/api/tweets")
        .set("Authorization", `Bearer ${token}`)
        .send({ text: "Sneaky", imageUrl: "https://evil.example.com/x.png" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid image reference");
    });
  });

  describe("PATCH /api/users/me", () => {
    it("should update the avatar url", async () => {
      const upload = await request(app)
        .post("/api/uploads")
        .set("Authorization", `Bearer ${token}`)
        .attach("image", PNG_1x1, { filename: "avatar.png", contentType: "image/png" });

      const res = await request(app)
        .patch("/api/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send({ avatarUrl: upload.body.url });

      expect(res.status).toBe(200);
      expect(res.body.avatarUrl).toBe(upload.body.url);
      expect(res.body.id).toBe(userId);
    });

    it("should update name and bio", async () => {
      const res = await request(app)
        .patch("/api/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "New Name", bio: "Updated bio" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("New Name");
      expect(res.body.bio).toBe("Updated bio");
    });

    it("should reject an empty update", async () => {
      const res = await request(app)
        .patch("/api/users/me")
        .set("Authorization", `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it("should require authentication", async () => {
      const res = await request(app).patch("/api/users/me").send({ bio: "x" });
      expect(res.status).toBe(401);
    });
  });
});
