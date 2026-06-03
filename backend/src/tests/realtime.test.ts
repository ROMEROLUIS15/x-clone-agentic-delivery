import { describe, it, expect, beforeEach, afterAll } from "vitest";
import prisma from "../db";
import {
  subscribe,
  publish,
  publishNewTweet,
  topics,
  _resetSubscribersForTests,
  _subscriberCountForTests,
} from "../services/realtime.service";

interface Captured {
  event: string;
  data: unknown;
}

function makeSubscriber(): { received: Captured[]; send: (event: string, data: unknown) => void } {
  const received: Captured[] = [];
  return {
    received,
    send: (event, data) => {
      received.push({ event, data });
    },
  };
}

describe("realtime.service — pub/sub registry", () => {
  beforeEach(() => {
    _resetSubscribersForTests();
  });

  describe("subscribe / publish", () => {
    it("delivers events only to subscribers of the target userId", () => {
      const alice = makeSubscriber();
      const bob = makeSubscriber();

      subscribe("user-alice", alice);
      subscribe("user-bob", bob);

      publish("user-alice", "tweet:new", { id: "t1" });

      expect(alice.received).toEqual([{ event: "tweet:new", data: { id: "t1" } }]);
      expect(bob.received).toEqual([]);
    });

    it("supports multiple subscribers per user (e.g. multiple tabs)", () => {
      const tab1 = makeSubscriber();
      const tab2 = makeSubscriber();

      subscribe("user-1", tab1);
      subscribe("user-1", tab2);

      publish("user-1", "tweet:new", { id: "t1" });

      expect(tab1.received).toHaveLength(1);
      expect(tab2.received).toHaveLength(1);
    });

    it("does not throw when publishing to an unsubscribed user", () => {
      expect(() => publish("ghost", "tweet:new", { id: "x" })).not.toThrow();
    });

    it("unsubscribe stops further deliveries and cleans up empty sets", () => {
      const sub = makeSubscriber();
      const unsubscribe = subscribe("user-1", sub);
      expect(_subscriberCountForTests("user-1")).toBe(1);

      unsubscribe();
      expect(_subscriberCountForTests("user-1")).toBe(0);

      publish("user-1", "tweet:new", { id: "later" });
      expect(sub.received).toEqual([]);
    });

    it("isolates one subscriber's failure from the others", () => {
      const bad = { send: () => { throw new Error("broken sink"); } };
      const good = makeSubscriber();

      subscribe("user-1", bad);
      subscribe("user-1", good);

      expect(() => publish("user-1", "tweet:new", { id: "t1" })).not.toThrow();
      expect(good.received).toHaveLength(1);
    });
  });

  describe("publishNewTweet", () => {
    let alice: string;
    let bob: string;
    let carol: string;

    beforeEach(async () => {
      await prisma.like.deleteMany({});
      await prisma.follow.deleteMany({});
      await prisma.tweet.deleteMany({});
      await prisma.user.deleteMany({});

      const mk = (suffix: string) => prisma.user.create({
        data: {
          email: `${suffix}@rt.test`,
          username: suffix,
          passwordHash: "x",
          name: suffix,
        },
      });

      const [a, b, c] = await Promise.all([mk("rtalice"), mk("rtbob"), mk("rtcarol")]);
      alice = a.id;
      bob = b.id;
      carol = c.id;

      // bob and carol both follow alice
      await prisma.follow.createMany({
        data: [
          { followerId: bob, followingId: alice },
          { followerId: carol, followingId: alice },
        ],
      });
    });

    afterAll(async () => {
      _resetSubscribersForTests();
      await prisma.follow.deleteMany({});
      await prisma.user.deleteMany({});
    });

    it("delivers the tweet to author + every follower of the author", async () => {
      const aSub = makeSubscriber();
      const bSub = makeSubscriber();
      const cSub = makeSubscriber();

      subscribe(topics.user(alice), aSub);
      subscribe(topics.user(bob), bSub);
      subscribe(topics.user(carol), cSub);

      const tweet = { id: "tw-1", text: "hi", userId: alice };
      await publishNewTweet(tweet, alice);

      expect(aSub.received).toEqual([{ event: "tweet:new", data: tweet }]);
      expect(bSub.received).toEqual([{ event: "tweet:new", data: tweet }]);
      expect(cSub.received).toEqual([{ event: "tweet:new", data: tweet }]);
    });

    it("does not deliver to users who don't follow the author", async () => {
      // Make a fourth user who follows nobody
      const stranger = await prisma.user.create({
        data: { email: "stranger@rt.test", username: "stranger", passwordHash: "x", name: "S" },
      });
      const sSub = makeSubscriber();
      subscribe(topics.user(stranger.id), sSub);

      await publishNewTweet({ id: "tw-2" }, alice);

      expect(sSub.received).toEqual([]);
    });
  });
});
