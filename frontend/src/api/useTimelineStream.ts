import { useEffect, useRef, useState, useCallback } from "react";
import type { Tweet } from "../components/TweetCard";

export interface LikeUpdate {
  tweetId: string;
  likesCount: number;
}

interface UseTimelineStreamOptions {
  /**
   * Called whenever a like:updated event arrives. The handler receives the
   * tweetId and the new total likesCount, and is expected to patch the
   * corresponding tweet in local state. The hook intentionally does not
   * own a list of tweets — each consumer (Home, UserTweetList) has its own.
   */
  onLikeUpdate?: (update: LikeUpdate) => void;
}

/**
 * Subscribes to the SSE timeline stream.
 *
 * - tweet:new events are buffered into `newTweets`; the Home banner flushes
 *   them on user click (we don't auto-insert to avoid mid-scroll jumps).
 * - like:updated events are forwarded synchronously to the optional
 *   onLikeUpdate callback. Likes feel like a live counter, so they DO patch
 *   the visible list immediately — no banner.
 */
export function useTimelineStream(
  token: string | null,
  options: UseTimelineStreamOptions = {}
) {
  const [newTweets, setNewTweets] = useState<Tweet[]>([]);
  const sourceRef = useRef<EventSource | null>(null);

  // Keep the latest callback in a ref so we don't tear down + reopen the
  // EventSource every time the consumer re-renders with a new closure.
  const onLikeUpdateRef = useRef(options.onLikeUpdate);
  useEffect(() => {
    onLikeUpdateRef.current = options.onLikeUpdate;
  }, [options.onLikeUpdate]);

  useEffect(() => {
    if (!token) return;

    const url = `/api/tweets/timeline/stream?token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);
    sourceRef.current = source;

    source.addEventListener("tweet:new", (e) => {
      try {
        const tweet = JSON.parse((e as MessageEvent).data) as Tweet;
        setNewTweets((prev) => {
          if (prev.some((t) => t.id === tweet.id)) return prev;
          return [tweet, ...prev];
        });
      } catch (err) {
        console.error("Failed to parse tweet:new payload:", err);
      }
    });

    source.addEventListener("like:updated", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data) as LikeUpdate;
        onLikeUpdateRef.current?.(data);
      } catch (err) {
        console.error("Failed to parse like:updated payload:", err);
      }
    });

    source.onerror = () => {
      // EventSource auto-reconnects with backoff; nothing to do here.
    };

    return () => {
      source.close();
      sourceRef.current = null;
    };
  }, [token]);

  const flush = useCallback((): Tweet[] => {
    const flushed = newTweets;
    setNewTweets([]);
    return flushed;
  }, [newTweets]);

  return { newTweets, flush };
}
