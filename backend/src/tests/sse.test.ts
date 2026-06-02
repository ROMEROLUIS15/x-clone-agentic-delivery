import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import http from "node:http";
import request from "supertest";
import app from "../app";
import prisma from "../db";
import { _resetSubscribersForTests } from "../services/realtime.service";

describe("SSE — GET /api/tweets/timeline/stream", () => {
  let server: http.Server;
  let port: number;
  let tokenAlice: string;
  let idAlice: string;
  let tokenBob: string;

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

    const aRes = await request(app).post("/api/auth/register").send({
      email: "sse-alice@test.com", username: "ssealice", password: "password123", name: "Alice",
    });
    tokenAlice = aRes.body.token;
    idAlice = aRes.body.user.id;

    const bRes = await request(app).post("/api/auth/register").send({
      email: "sse-bob@test.com", username: "ssebob", password: "password123", name: "Bob",
    });
    tokenBob = bRes.body.token;

    // Bob follows Alice
    await request(app)
      .post(`/api/users/${idAlice}/follow`)
      .set("Authorization", `Bearer ${tokenBob}`);
  });

  function openStream(token: string): Promise<{ chunks: string[]; close: () => void; req: http.ClientRequest }> {
    return new Promise((resolve, reject) => {
      const chunks: string[] = [];
      const req = http.get(
        `http://127.0.0.1:${port}/api/tweets/timeline/stream?token=${encodeURIComponent(token)}`,
        (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`SSE expected 200, got ${res.statusCode}`));
            return;
          }
          expect(res.headers["content-type"]).toMatch(/text\/event-stream/);
          res.setEncoding("utf8");
          res.on("data", (chunk: string) => chunks.push(chunk));
          resolve({
            chunks,
            close: () => req.destroy(),
            req,
          });
        }
      );
      req.on("error", reject);
    });
  }

  function waitFor(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + timeoutMs;
      const tick = () => {
        if (predicate()) return resolve();
        if (Date.now() > deadline) return reject(new Error("timeout waiting for SSE event"));
        setTimeout(tick, 30);
      };
      tick();
    });
  }

  it("rejects connections without a valid token", async () => {
    await new Promise<void>((resolve) => {
      const req = http.get(`http://127.0.0.1:${port}/api/tweets/timeline/stream`, (res) => {
        expect(res.statusCode).toBe(401);
        res.resume();
        res.on("end", resolve);
      });
      req.on("error", () => resolve());
    });
  });

  it("sends a 'connected' event on open", async () => {
    const stream = await openStream(tokenBob);
    try {
      await waitFor(() => stream.chunks.join("").includes("event: connected"));
      const all = stream.chunks.join("");
      expect(all).toContain("event: connected");
      expect(all).toContain('"userId"');
    } finally {
      stream.close();
    }
  });

  it("delivers tweet:new to a follower when the author posts", async () => {
    const stream = await openStream(tokenBob);
    try {
      await waitFor(() => stream.chunks.join("").includes("event: connected"));

      await request(app)
        .post("/api/tweets")
        .set("Authorization", `Bearer ${tokenAlice}`)
        .send({ text: "real-time hello" });

      await waitFor(() => stream.chunks.join("").includes("event: tweet:new"));

      const payload = stream.chunks.join("");
      expect(payload).toContain("event: tweet:new");
      expect(payload).toContain("real-time hello");
    } finally {
      stream.close();
    }
  });

  it("delivers like:updated to the tweet author when someone else likes it", async () => {
    // Alice subscribes to her own stream; Bob (who follows her) is the liker.
    const stream = await openStream(tokenAlice);
    try {
      await waitFor(() => stream.chunks.join("").includes("event: connected"));

      const tweetRes = await request(app)
        .post("/api/tweets")
        .set("Authorization", `Bearer ${tokenAlice}`)
        .send({ text: "like me" });
      const tweetId = tweetRes.body.id as string;

      // wait until alice has seen her own tweet:new (so we don't race)
      await waitFor(() => stream.chunks.join("").includes("event: tweet:new"));

      await request(app)
        .post(`/api/tweets/${tweetId}/like`)
        .set("Authorization", `Bearer ${tokenBob}`);

      await waitFor(() => stream.chunks.join("").includes("event: like:updated"));

      const payload = stream.chunks.join("");
      expect(payload).toContain("event: like:updated");
      expect(payload).toContain(`"tweetId":"${tweetId}"`);
      expect(payload).toContain('"likesCount":1');
    } finally {
      stream.close();
    }
  });

  it("delivers like:updated again when the tweet is unliked", async () => {
    const stream = await openStream(tokenAlice);
    try {
      await waitFor(() => stream.chunks.join("").includes("event: connected"));

      const tweetRes = await request(app)
        .post("/api/tweets")
        .set("Authorization", `Bearer ${tokenAlice}`)
        .send({ text: "fleeting like" });
      const tweetId = tweetRes.body.id as string;

      await request(app)
        .post(`/api/tweets/${tweetId}/like`)
        .set("Authorization", `Bearer ${tokenBob}`);
      await request(app)
        .post(`/api/tweets/${tweetId}/unlike`)
        .set("Authorization", `Bearer ${tokenBob}`);

      // Wait until at least two like:updated events have been seen
      await waitFor(() => {
        const text = stream.chunks.join("");
        return (text.match(/event: like:updated/g) || []).length >= 2;
      });

      const payload = stream.chunks.join("");
      const events = payload.match(/data: (\{[^\n]+\})/g) || [];
      // The last like:updated payload should have likesCount: 0
      const lastLike = events.reverse().find((e) => e.includes("likesCount"));
      expect(lastLike).toContain('"likesCount":0');
    } finally {
      stream.close();
    }
  });

  it("does not deliver to users who do not follow the author", async () => {
    // Register a third user (carol) who follows nobody
    const cRes = await request(app).post("/api/auth/register").send({
      email: "sse-carol@test.com", username: "ssecarol", password: "password123", name: "C",
    });
    const tokenCarol = cRes.body.token as string;

    const stream = await openStream(tokenCarol);
    try {
      await waitFor(() => stream.chunks.join("").includes("event: connected"));

      await request(app)
        .post("/api/tweets")
        .set("Authorization", `Bearer ${tokenAlice}`)
        .send({ text: "should not arrive" });

      // Wait long enough for delivery to happen if it were going to
      await new Promise((r) => setTimeout(r, 300));

      const payload = stream.chunks.join("");
      expect(payload).not.toContain("event: tweet:new");
      expect(payload).not.toContain("should not arrive");
    } finally {
      stream.close();
    }
  });
});
