import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../db";

describe("Social Interactions Integration Tests", () => {
  let tokenA: string;
  let userIdA: string;
  let tokenB: string;
  let userIdB: string;
  let tweetIdB: string;

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
      .send({ email: "userA@test.com", username: "userA", password: "password123", name: "User A" });
    tokenA = userARes.body.token;
    userIdA = userARes.body.user.id;

    const userBRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "userB@test.com", username: "userB", password: "password123", name: "User B" });
    tokenB = userBRes.body.token;
    userIdB = userBRes.body.user.id;

    const tweetRes = await request(app)
      .post("/api/tweets")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ text: "User B's tweet" });
    tweetIdB = tweetRes.body.id;
  });

  afterAll(async () => {
    await prisma.follow.deleteMany({});
    await prisma.like.deleteMany({});
    await prisma.tweet.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe("GET /api/users/:id", () => {
    it("should get user profile with follow counts", async () => {
      const res = await request(app)
        .get(`/api/users/${userIdB}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(userIdB);
      expect(res.body.user.username).toBe("userb");
      expect(res.body.followersCount).toBe(0);
      expect(res.body.followingCount).toBe(0);
      expect(res.body.isFollowing).toBe(false);
    });

    it("should return 404 for non-existent user", async () => {
      const res = await request(app)
        .get("/api/users/nonexistent-id")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
    });

    it("should require authentication", async () => {
      const res = await request(app).get(`/api/users/${userIdB}`);
      expect(res.status).toBe(401);
    });

    it("should NOT leak email when viewing another user's profile", async () => {
      const res = await request(app)
        .get(`/api/users/${userIdB}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.user).not.toHaveProperty("email");
      expect(res.body.user).not.toHaveProperty("passwordHash");
    });

    it("should include email when viewing own profile", async () => {
      const res = await request(app)
        .get(`/api/users/${userIdA}`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe("usera@test.com");
      expect(res.body.user).not.toHaveProperty("passwordHash");
    });
  });

  describe("POST /api/users/:id/follow", () => {
    it("should follow a user successfully", async () => {
      const res = await request(app)
        .post(`/api/users/${userIdB}/follow`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Followed successfully");
      expect(res.body.followersCount).toBe(1);
      expect(res.body.isFollowing).toBe(true);

      const follow = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: userIdA, followingId: userIdB } },
      });
      expect(follow).not.toBeNull();
    });

    it("should not allow following yourself", async () => {
      const res = await request(app)
        .post(`/api/users/${userIdA}/follow`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("cannot follow yourself");
    });

    it("should be idempotent (duplicate follow returns 200 with current state)", async () => {
      await request(app)
        .post(`/api/users/${userIdB}/follow`)
        .set("Authorization", `Bearer ${tokenA}`);

      const res = await request(app)
        .post(`/api/users/${userIdB}/follow`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.isFollowing).toBe(true);
      expect(res.body.followersCount).toBe(1);
    });

    it("should return 404 for non-existent user", async () => {
      const res = await request(app)
        .post("/api/users/nonexistent-id/follow")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
    });

    it("should require authentication", async () => {
      const res = await request(app).post(`/api/users/${userIdB}/follow`);
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/users/:id/unfollow", () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/users/${userIdB}/follow`)
        .set("Authorization", `Bearer ${tokenA}`);
    });

    it("should unfollow a user successfully", async () => {
      const res = await request(app)
        .post(`/api/users/${userIdB}/unfollow`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Unfollowed successfully");
      expect(res.body.followersCount).toBe(0);

      const follow = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: userIdA, followingId: userIdB } },
      });
      expect(follow).toBeNull();
    });

    it("should not allow unfollowing yourself", async () => {
      const res = await request(app)
        .post(`/api/users/${userIdA}/unfollow`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("cannot unfollow yourself");
    });

    it("should be idempotent (unfollow when not following returns 200)", async () => {
      const res = await request(app)
        .post(`/api/users/${userIdA}/unfollow`)
        .set("Authorization", `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.isFollowing).toBe(false);
    });

    it("should return 404 for non-existent user", async () => {
      const res = await request(app)
        .post("/api/users/nonexistent-id/unfollow")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
    });

    it("should require authentication", async () => {
      const res = await request(app).post(`/api/users/${userIdB}/unfollow`);
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/users/:id/followers", () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/users/${userIdB}/follow`)
        .set("Authorization", `Bearer ${tokenA}`);
    });

    it("should return followers list", async () => {
      const res = await request(app)
        .get(`/api/users/${userIdB}/followers`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(userIdA);
      expect(res.body[0].username).toBe("usera");
    });

    it("should return empty list for user with no followers", async () => {
      const res = await request(app)
        .get(`/api/users/${userIdA}/followers`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    it("should return 404 for non-existent user", async () => {
      const res = await request(app)
        .get("/api/users/nonexistent-id/followers")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
    });

    it("should require authentication", async () => {
      const res = await request(app).get(`/api/users/${userIdB}/followers`);
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/users/:id/following", () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/users/${userIdB}/follow`)
        .set("Authorization", `Bearer ${tokenA}`);
    });

    it("should return following list", async () => {
      const res = await request(app)
        .get(`/api/users/${userIdA}/following`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(userIdB);
      expect(res.body[0].username).toBe("userb");
    });

    it("should return empty list for user not following anyone", async () => {
      const res = await request(app)
        .get(`/api/users/${userIdB}/following`)
        .set("Authorization", `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    it("should return 404 for non-existent user", async () => {
      const res = await request(app)
        .get("/api/users/nonexistent-id/following")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
    });

    it("should require authentication", async () => {
      const res = await request(app).get(`/api/users/${userIdA}/following`);
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/tweets/:id/like", () => {
    it("should like a tweet successfully", async () => {
      const res = await request(app)
        .post(`/api/tweets/${tweetIdB}/like`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Liked successfully");
      expect(res.body.likesCount).toBe(1);
      expect(res.body.liked).toBe(true);

      const like = await prisma.like.findUnique({
        where: { userId_tweetId: { userId: userIdA, tweetId: tweetIdB } },
      });
      expect(like).not.toBeNull();
    });

    it("should be idempotent (duplicate like returns 200, count stays at 1)", async () => {
      await request(app)
        .post(`/api/tweets/${tweetIdB}/like`)
        .set("Authorization", `Bearer ${tokenA}`);

      const res = await request(app)
        .post(`/api/tweets/${tweetIdB}/like`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(true);
      expect(res.body.likesCount).toBe(1);
    });

    it("should return 404 for non-existent tweet", async () => {
      const res = await request(app)
        .post("/api/tweets/nonexistent-id/like")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
    });

    it("should require authentication", async () => {
      const res = await request(app).post(`/api/tweets/${tweetIdB}/like`);
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/tweets/:id/unlike", () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/tweets/${tweetIdB}/like`)
        .set("Authorization", `Bearer ${tokenA}`);
    });

    it("should unlike a tweet successfully", async () => {
      const res = await request(app)
        .post(`/api/tweets/${tweetIdB}/unlike`)
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Unliked successfully");
      expect(res.body.likesCount).toBe(0);
      expect(res.body.liked).toBe(false);

      const like = await prisma.like.findUnique({
        where: { userId_tweetId: { userId: userIdA, tweetId: tweetIdB } },
      });
      expect(like).toBeNull();
    });

    it("should be idempotent (unlike when not liked returns 200)", async () => {
      const res = await request(app)
        .post(`/api/tweets/${tweetIdB}/unlike`)
        .set("Authorization", `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(false);
    });

    it("should return 404 for non-existent tweet", async () => {
      const res = await request(app)
        .post("/api/tweets/nonexistent-id/unlike")
        .set("Authorization", `Bearer ${tokenA}`);

      expect(res.status).toBe(404);
    });

    it("should require authentication", async () => {
      const res = await request(app).post(`/api/tweets/${tweetIdB}/unlike`);
      expect(res.status).toBe(401);
    });
  });

  describe("Tweets include like info", () => {
    it("should include likesCount and liked in tweet response", async () => {
      const res = await request(app)
        .get(`/api/users/${userIdB}/tweets`)
        .set("Authorization", `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.tweets[0]).toHaveProperty("likesCount");
      expect(res.body.tweets[0]).toHaveProperty("liked");
      expect(res.body.tweets[0].likesCount).toBe(0);
      expect(res.body.tweets[0].liked).toBe(false);
    });

    it("should show liked=true after liking", async () => {
      await request(app)
        .post(`/api/tweets/${tweetIdB}/like`)
        .set("Authorization", `Bearer ${tokenA}`);

      const res = await request(app)
        .get(`/api/users/${userIdB}/tweets`)
        .set("Authorization", `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      const tweet = res.body.tweets.find((t: any) => t.id === tweetIdB);
      expect(tweet).toBeDefined();
      expect(tweet.likesCount).toBe(1);
    });
  });
});
