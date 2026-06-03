import prisma from "../db";

/**
 * Per-process topic-based pub/sub registry for SSE subscribers.
 *
 * A "topic" is any string key. We use three namespaces:
 *   - `user:<id>`    → a user's home timeline stream (self + followed authors)
 *   - `profile:<id>` → anyone currently viewing that user's profile
 *   - `thread:<id>`  → anyone currently viewing that tweet's thread
 *
 * Each view opens exactly one SSE connection subscribed to one topic, so a
 * client never receives the same event twice. In-memory is intentional: this
 * is a single-instance demo. A multi-instance deployment would back the
 * registry with Redis pub/sub or a similar out-of-process bus.
 */

export type SseEvent =
  | "tweet:new"
  | "reply:new"
  | "like:updated"
  | "notification:new"
  | "connected";

export interface Subscriber {
  send: (event: SseEvent, data: unknown) => void;
}

const subscribers = new Map<string, Set<Subscriber>>();

/** Topic key builders — keep namespaces consistent across the codebase. */
export const topics = {
  user: (id: string) => `user:${id}`,
  profile: (id: string) => `profile:${id}`,
  thread: (id: string) => `thread:${id}`,
};

export function subscribe(topic: string, sub: Subscriber): () => void {
  let set = subscribers.get(topic);
  if (!set) {
    set = new Set();
    subscribers.set(topic, set);
  }
  set.add(sub);

  return () => {
    const current = subscribers.get(topic);
    if (!current) return;
    current.delete(sub);
    if (current.size === 0) subscribers.delete(topic);
  };
}

export function publish(topic: string, event: SseEvent, data: unknown): void {
  const set = subscribers.get(topic);
  if (!set) return;
  for (const sub of set) {
    try {
      sub.send(event, data);
    } catch {
      // Best-effort: failed sends are dropped; the SSE controller cleans up on socket close.
    }
  }
}

/** Emit one event to a de-duplicated set of topics. */
function publishToTopics(targets: Set<string>, event: SseEvent, data: unknown): void {
  for (const topic of targets) publish(topic, event, data);
}

async function followerUserTopics(authorId: string): Promise<string[]> {
  const followers = await prisma.follow.findMany({
    where: { followingId: authorId },
    select: { followerId: true },
  });
  return followers.map((f) => topics.user(f.followerId));
}

/**
 * Broadcast a freshly-created top-level tweet to everywhere it can appear:
 * the author's home + their followers' homes, and the author's profile.
 */
export async function publishNewTweet(tweet: unknown, authorId: string): Promise<void> {
  const targets = new Set<string>([
    topics.user(authorId),
    topics.profile(authorId),
    ...(await followerUserTopics(authorId)),
  ]);
  publishToTopics(targets, "tweet:new", tweet);
}

/**
 * Broadcast a new reply. It appears live in the open thread, and bumps the
 * parent's reply count anywhere the parent is shown (home feeds, the parent
 * author's profile, and the grandparent thread if the parent is itself a reply).
 */
export async function publishNewReply(
  reply: unknown,
  parentId: string,
  parentAuthorId: string,
  grandParentId: string | null
): Promise<void> {
  const targets = new Set<string>([
    topics.thread(parentId),
    topics.profile(parentAuthorId),
    topics.user(parentAuthorId),
    ...(await followerUserTopics(parentAuthorId)),
  ]);
  if (grandParentId) targets.add(topics.thread(grandParentId));
  publishToTopics(targets, "reply:new", reply);
}

/**
 * Broadcast a like-count change to everywhere the tweet is shown: the author's
 * home + followers' homes, the author's profile, and the tweet's own thread
 * (plus its parent thread, when the tweet is a reply).
 */
export async function publishLikeUpdate(
  tweetId: string,
  authorId: string,
  likesCount: number,
  parentId: string | null = null
): Promise<void> {
  const payload = { tweetId, likesCount };
  const targets = new Set<string>([
    topics.user(authorId),
    topics.profile(authorId),
    topics.thread(tweetId),
    ...(await followerUserTopics(authorId)),
  ]);
  if (parentId) targets.add(topics.thread(parentId));
  publishToTopics(targets, "like:updated", payload);
}

/**
 * Push a notification to its recipient's personal topic. They receive it live
 * wherever they are in the app (the badge subscribes to this topic globally).
 */
export function publishNotification(recipientId: string, notification: unknown): void {
  publish(topics.user(recipientId), "notification:new", notification);
}

/**
 * Test-only helper: drop every subscriber. Prevents leaks between integration tests.
 */
export function _resetSubscribersForTests(): void {
  subscribers.clear();
}

export function _subscriberCountForTests(topic: string): number {
  return subscribers.get(topic)?.size ?? 0;
}
