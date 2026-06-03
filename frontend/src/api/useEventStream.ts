import { useEffect, useRef } from "react";
import type { Tweet } from "../components/TweetCard";

export interface LikeUpdate {
  tweetId: string;
  likesCount: number;
}

export interface EventStreamHandlers {
  /** A new top-level tweet was created (timeline / profile streams). */
  onTweetNew?: (tweet: Tweet) => void;
  /** A new reply was created (thread / profile / timeline streams). */
  onReplyNew?: (reply: Tweet) => void;
  /** A tweet's like count changed. */
  onLikeUpdate?: (update: LikeUpdate) => void;
}

/**
 * Subscribes to a topic-based SSE stream (timeline, profile, or thread) and
 * dispatches its events to the supplied handlers. The handlers are kept in a
 * ref so a consumer re-rendering with new closures doesn't tear down and
 * reopen the EventSource. Pass a null `streamUrl` to stay disconnected.
 */
export function useEventStream(
  streamUrl: string | null,
  token: string | null,
  handlers: EventStreamHandlers
): void {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!token || !streamUrl) return;

    const sep = streamUrl.includes("?") ? "&" : "?";
    const source = new EventSource(`${streamUrl}${sep}token=${encodeURIComponent(token)}`);

    const parse = <T,>(e: Event): T | null => {
      try {
        return JSON.parse((e as MessageEvent).data) as T;
      } catch {
        return null;
      }
    };

    source.addEventListener("tweet:new", (e) => {
      const t = parse<Tweet>(e);
      if (t) handlersRef.current.onTweetNew?.(t);
    });
    source.addEventListener("reply:new", (e) => {
      const r = parse<Tweet>(e);
      if (r) handlersRef.current.onReplyNew?.(r);
    });
    source.addEventListener("like:updated", (e) => {
      const u = parse<LikeUpdate>(e);
      if (u) handlersRef.current.onLikeUpdate?.(u);
    });

    source.onerror = () => {
      // EventSource auto-reconnects with backoff; nothing to do here.
    };

    return () => source.close();
  }, [streamUrl, token]);
}
