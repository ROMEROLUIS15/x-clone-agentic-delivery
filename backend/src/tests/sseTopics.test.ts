import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import http from "node:http";
import request from "supertest";
import app from "../app";
import prisma from "../db";
import { _resetSubscribersForTests } from "../services/realtime.service";

/**
 * Topic-based streams: a viewer who follows NOBODY still gets live updates for
 * the profile / thread they are currently looking at.
 */
describe("SSE — topic streams (profile & thread)", () => {
  let server: http.Server;
  let port: number;
  let tokenAlice: string;
  let idAlice: string;
  let tokenBob: string;
  let tokenCarol: string; // follows nobody

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        port = typeof addr === "object" && addr ? addr.port : 0;
        resolve();
      });
    });
  });

  afterAll(async () => {
    _resetSubscribersForTests();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(async () => {
    _resetSubscribersForTests();
    await prisma.like.deleteMany({});
    await prisma.follow.deleteMany({});
    await prisma.tweet.deleteMany({});
    await prisma.user.deleteMany({});

    const a = await request(app).post("/api/auth/register").send({ email: "t-alice@test.com", username: "talice", password: "password123", name: "Alice" });
    tokenAlice = a.body.token; idAlice = a.body.user.id;
    const b = await request(app).post("/api/auth/register").send({ email: "t-bob@test.com", username: "tbob", password: "password123", name: "Bob" });
    tokenBob = b.body.token;
    const c = await request(app).post("/api/auth/register").send({ email: "t-carol@test.com", username: "tcarol", password: "password123", name: "Carol" });
    tokenCarol = c.body.token;
  });

  function openStream(path: string, token: string) {
    return new Promise<{ chunks: string[]; close: () => void }>((resolve, reject) => {
      const chunks: string[] = [];
      const req = http.get(`http://127.0.0.1:${port}${path}?token=${encodeURIComponent(token)}`, (res) => {
        if (res.statusCode !== 200) return reject(new Error(`expected 200, got ${res.statusCode}`));
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => chunks.push(chunk));
        resolve({ chunks, close: () => req.destroy() });
      });
      req.on("error", reject);
    });
  }

  function waitFor(predicate: () => boolean, timeoutMs = 3000) {
    return new Promise<void>((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      const tick = () => {
        if (predicate()) return resolve();
        if (Date.now() > deadline) return reject(new Error("timeout waiting for SSE event"));
        setTimeout(tick, 30);
      };
      tick();
    });
  }

  it("thread stream delivers reply:new to a viewer who follows nobody", async () => {
    // Alice posts a tweet; Carol (no follows) opens its thread stream.
    const tw = await request(app).post("/api/tweets").set("Authorization", `Bearer ${tokenAlice}`).send({ text: "parent" });
    const tweetId = tw.body.id as string;

    const stream = await openStream(`/api/tweets/${tweetId}/stream`, tokenCarol);
    try {
      await waitFor(() => stream.chunks.join("").includes("event: connected"));

      // Bob replies to Alice's tweet
      await request(app).post(`/api/tweets/${tweetId}/replies`).set("Authorization", `Bearer ${tokenBob}`).send({ text: "live reply!" });

      await waitFor(() => stream.chunks.join("").includes("event: reply:new"));
      const payload = stream.chunks.join("");
      expect(payload).toContain("event: reply:new");
      expect(payload).toContain("live reply!");
      expect(payload).toContain(`"parentId":"${tweetId}"`);
    } finally {
      stream.close();
    }
  });

  it("thread stream delivers like:updated for the focused tweet", async () => {
    const tw = await request(app).post("/api/tweets").set("Authorization", `Bearer ${tokenAlice}`).send({ text: "like target" });
    const tweetId = tw.body.id as string;

    const stream = await openStream(`/api/tweets/${tweetId}/stream`, tokenCarol);
    try {
      await waitFor(() => stream.chunks.join("").includes("event: connected"));
      await request(app).post(`/api/tweets/${tweetId}/like`).set("Authorization", `Bearer ${tokenBob}`);
      await waitFor(() => stream.chunks.join("").includes("event: like:updated"));
      const payload = stream.chunks.join("");
      expect(payload).toContain(`"tweetId":"${tweetId}"`);
      expect(payload).toContain('"likesCount":1');
    } finally {
      stream.close();
    }
  });

  it("profile stream delivers tweet:new when the profile owner posts", async () => {
    // Carol (follows nobody) views Alice's profile stream.
    const stream = await openStream(`/api/users/${idAlice}/stream`, tokenCarol);
    try {
      await waitFor(() => stream.chunks.join("").includes("event: connected"));
      await request(app).post("/api/tweets").set("Authorization", `Bearer ${tokenAlice}`).send({ text: "fresh on profile" });
      await waitFor(() => stream.chunks.join("").includes("event: tweet:new"));
      expect(stream.chunks.join("")).toContain("fresh on profile");
    } finally {
      stream.close();
    }
  });

  it("rejects topic streams without a valid token", async () => {
    await new Promise<void>((resolve) => {
      const req = http.get(`http://127.0.0.1:${port}/api/users/${idAlice}/stream`, (res) => {
        expect(res.statusCode).toBe(401);
        res.resume();
        res.on("end", resolve);
      });
      req.on("error", () => resolve());
    });
  });
});
