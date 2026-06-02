import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../db";

describe("GET /api/users/:id/tweets", () => {
  let tokenA: string;
  let userIdA: string;
  let userIdB: string;
  let tokenB: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.follow.deleteMany({});
    await prisma.like.deleteMany({});
    await prisma.tweet.deleteMany({});
    await prisma.user.deleteMany({});

    const a = await request(app).post("/api/auth/register").send({
      email: "a@test.com", username: "alpha", password: "password123", name: "Alpha",
    });
    tokenA = a.body.token;
    userIdA = a.body.user.id;

    const b = await request(app).post("/api/auth/register").send({
      email: "b@test.com", username: "beta", password: "password123", name: "Beta",
    });
    tokenB = b.body.token;
    userIdB = b.body.user.id;

    for (let i = 0; i < 3; i++) {
      await request(app)
        .post("/api/tweets")
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ text: `Beta tweet ${i}` });
    }
  });

  afterAll(async () => {
    await prisma.follow.deleteMany({});
    await prisma.like.deleteMany({});
    await prisma.tweet.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it("should return tweets for the requested user with pagination metadata", async () => {
    const res = await request(app)
      .get(`/api/users/${userIdB}/tweets`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.tweets).toHaveLength(3);
    expect(res.body.total).toBe(3);
    expect(res.body.limit).toBe(20);
    expect(res.body.offset).toBe(0);
    expect(res.body.tweets[0].user.username).toBe("beta");
  });

  it("should order tweets DESC by createdAt", async () => {
    const res = await request(app)
      .get(`/api/users/${userIdB}/tweets`)
      .set("Authorization", `Bearer ${tokenA}`);

    const dates = res.body.tweets.map((t: { createdAt: string }) => new Date(t.createdAt).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it("should support limit and offset", async () => {
    const res = await request(app)
      .get(`/api/users/${userIdB}/tweets?limit=2&offset=1`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.tweets).toHaveLength(2);
    expect(res.body.total).toBe(3);
    expect(res.body.limit).toBe(2);
    expect(res.body.offset).toBe(1);
  });

  it("should return liked=true for tweets the requester has liked", async () => {
    const list = await request(app)
      .get(`/api/users/${userIdB}/tweets`)
      .set("Authorization", `Bearer ${tokenA}`);
    const firstTweetId = list.body.tweets[0].id;

    await request(app)
      .post(`/api/tweets/${firstTweetId}/like`)
      .set("Authorization", `Bearer ${tokenA}`);

    const after = await request(app)
      .get(`/api/users/${userIdB}/tweets`)
      .set("Authorization", `Bearer ${tokenA}`);

    const target = after.body.tweets.find((t: { id: string }) => t.id === firstTweetId);
    expect(target.liked).toBe(true);
    expect(target.likesCount).toBe(1);
  });

  it("should return 404 for non-existent user", async () => {
    const res = await request(app)
      .get("/api/users/nonexistent-id/tweets")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toContain("User not found");
  });

  it("should return empty list with total=0 for user without tweets", async () => {
    const res = await request(app)
      .get(`/api/users/${userIdA}/tweets`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.tweets).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it("should require authentication", async () => {
    const res = await request(app).get(`/api/users/${userIdB}/tweets`);
    expect(res.status).toBe(401);
  });
});
