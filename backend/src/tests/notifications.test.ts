import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app";
import prisma from "../db";
import { subscribe, topics, _resetSubscribersForTests } from "../services/realtime.service";

describe("Notifications Integration Tests", () => {
  let tokenA: string; // actor
  let idA: string;
  let tokenB: string; // recipient
  let idB: string;
  let tweetB: string; // a tweet owned by B

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    _resetSubscribersForTests();
    await prisma.notification.deleteMany({});
    await prisma.follow.deleteMany({});
    await prisma.like.deleteMany({});
    await prisma.tweet.deleteMany({});
    await prisma.user.deleteMany({});

    const a = await request(app).post("/api/auth/register").send({ email: "n-a@test.com", username: "nactor", password: "password123", name: "Actor" });
    tokenA = a.body.token; idA = a.body.user.id;
    const b = await request(app).post("/api/auth/register").send({ email: "n-b@test.com", username: "nrecipient", password: "password123", name: "Recipient" });
    tokenB = b.body.token; idB = b.body.user.id;

    const tw = await request(app).post("/api/tweets").set("Authorization", `Bearer ${tokenB}`).send({ text: "B's tweet" });
    tweetB = tw.body.id;
  });

  afterAll(async () => {
    _resetSubscribersForTests();
    await prisma.notification.deleteMany({});
    await prisma.user.deleteMany({});
  });

  const list = (token: string) => request(app).get("/api/notifications").set("Authorization", `Bearer ${token}`);

  describe("generation", () => {
    it("creates a like notification for the tweet author", async () => {
      await request(app).post(`/api/tweets/${tweetB}/like`).set("Authorization", `Bearer ${tokenA}`).expect(200);
      const res = await list(tokenB);
      expect(res.body.total).toBe(1);
      expect(res.body.unread).toBe(1);
      expect(res.body.notifications[0]).toMatchObject({ type: "like", read: false });
      expect(res.body.notifications[0].actor.username).toBe("nactor");
      expect(res.body.notifications[0].tweet.id).toBe(tweetB);
    });

    it("creates a follow notification", async () => {
      await request(app).post(`/api/users/${idB}/follow`).set("Authorization", `Bearer ${tokenA}`).expect(200);
      const res = await list(tokenB);
      expect(res.body.notifications.map((n: { type: string }) => n.type)).toContain("follow");
    });

    it("creates a reply notification linked to the parent thread", async () => {
      await request(app).post(`/api/tweets/${tweetB}/replies`).set("Authorization", `Bearer ${tokenA}`).send({ text: "nice!" }).expect(201);
      const res = await list(tokenB);
      const reply = res.body.notifications.find((n: { type: string }) => n.type === "reply");
      expect(reply).toBeTruthy();
      expect(reply.tweet.id).toBe(tweetB);
    });

    it("never notifies a user about their own action", async () => {
      // B likes B's own tweet
      await request(app).post(`/api/tweets/${tweetB}/like`).set("Authorization", `Bearer ${tokenB}`).expect(200);
      const res = await list(tokenB);
      expect(res.body.total).toBe(0);
    });

    it("de-duplicates like notifications across like/unlike/like", async () => {
      await request(app).post(`/api/tweets/${tweetB}/like`).set("Authorization", `Bearer ${tokenA}`);
      await request(app).post(`/api/tweets/${tweetB}/unlike`).set("Authorization", `Bearer ${tokenA}`);
      await request(app).post(`/api/tweets/${tweetB}/like`).set("Authorization", `Bearer ${tokenA}`);
      const res = await list(tokenB);
      expect(res.body.notifications.filter((n: { type: string }) => n.type === "like")).toHaveLength(1);
    });

    it("pushes a notification:new event to the recipient's user topic", async () => {
      const received: Array<{ event: string; data: unknown }> = [];
      subscribe(topics.user(idB), { send: (event, data) => received.push({ event, data }) });

      await request(app).post(`/api/tweets/${tweetB}/like`).set("Authorization", `Bearer ${tokenA}`).expect(200);

      // createNotification is fire-and-forget; poll briefly for the event.
      const deadline = Date.now() + 2000;
      while (Date.now() < deadline && !received.some((r) => r.event === "notification:new")) {
        await new Promise((r) => setTimeout(r, 20));
      }
      expect(received.some((r) => r.event === "notification:new")).toBe(true);
    });
  });

  describe("read state", () => {
    beforeEach(async () => {
      await request(app).post(`/api/tweets/${tweetB}/like`).set("Authorization", `Bearer ${tokenA}`);
      await request(app).post(`/api/users/${idB}/follow`).set("Authorization", `Bearer ${tokenA}`);
    });

    it("returns the unread count", async () => {
      const res = await request(app).get("/api/notifications/unread-count").set("Authorization", `Bearer ${tokenB}`);
      expect(res.body.unread).toBe(2);
    });

    it("marks all notifications as read", async () => {
      await request(app).post("/api/notifications/read").set("Authorization", `Bearer ${tokenB}`).send({}).expect(200);
      const res = await request(app).get("/api/notifications/unread-count").set("Authorization", `Bearer ${tokenB}`);
      expect(res.body.unread).toBe(0);
    });

    it("marks a single notification as read by id", async () => {
      const all = await list(tokenB);
      const oneId = all.body.notifications[0].id;
      await request(app).post("/api/notifications/read").set("Authorization", `Bearer ${tokenB}`).send({ id: oneId }).expect(200);
      const res = await request(app).get("/api/notifications/unread-count").set("Authorization", `Bearer ${tokenB}`);
      expect(res.body.unread).toBe(1);
    });

    it("does not let a user mark someone else's notification as read", async () => {
      const all = await list(tokenB);
      const oneId = all.body.notifications[0].id;
      await request(app).post("/api/notifications/read").set("Authorization", `Bearer ${tokenA}`).send({ id: oneId }).expect(404);
    });
  });

  it("requires authentication", async () => {
    await request(app).get("/api/notifications").expect(401);
    await request(app).get("/api/notifications/unread-count").expect(401);
    await request(app).post("/api/notifications/read").send({}).expect(401);
  });
});
