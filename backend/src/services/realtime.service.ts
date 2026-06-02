import prisma from "../db";

/**
 * Per-process pub/sub registry for SSE subscribers.
 *
 * Each connected user can have multiple subscribers (e.g. several tabs).
 * In-memory is intentional: this is a single-instance demo. For multi-instance
 * deployments the registry would be backed by Redis pub/sub or a similar
 * out-of-process bus.
 */

export type SseEvent =
  | "tweet:new"
  | "connected";

export interface Subscriber {
  send: (event: SseEvent, data: unknown) => void;
}

const subscribers = new Map<string, Set<Subscriber>>();

export function subscribe(userId: string, sub: Subscriber): () => void {
  let set = subscribers.get(userId);
  if (!set) {
    set = new Set();
    subscribers.set(userId, set);
  }
  set.add(sub);

  return () => {
    const current = subscribers.get(userId);
    if (!current) return;
    current.delete(sub);
    if (current.size === 0) subscribers.delete(userId);
  };
}

export function publish(userId: string, event: SseEvent, data: unknown): void {
  const set = subscribers.get(userId);
  if (!set) return;
  for (const sub of set) {
    try {
      sub.send(event, data);
    } catch {
      // Best-effort: failed sends are dropped; the SSE controller cleans up on socket close.
    }
  }
}

/**
 * Broadcast a freshly-created tweet to the author's followers AND to the author
 * themselves. Mirrors the timeline query (self + followed users).
 */
export async function publishTweetToFollowers(tweet: unknown, authorId: string): Promise<void> {
  const followers = await prisma.follow.findMany({
    where: { followingId: authorId },
    select: { followerId: true },
  });

  publish(authorId, "tweet:new", tweet);
  for (const f of followers) {
    publish(f.followerId, "tweet:new", tweet);
  }
}

/**
 * Test-only helper: drop every subscriber. Prevents leaks between integration tests.
 */
export function _resetSubscribersForTests(): void {
  subscribers.clear();
}

export function _subscriberCountForTests(userId: string): number {
  return subscribers.get(userId)?.size ?? 0;
}
