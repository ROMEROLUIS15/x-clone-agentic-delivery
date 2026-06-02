import { useEffect, useRef, useState, useCallback } from "react";
import type { Tweet } from "../components/TweetCard";

/**
 * Subscribes to the SSE timeline stream and buffers incoming "tweet:new"
 * events without inserting them into the visible feed. The Home component
 * decides when to flush — usually on user click of the "N new tweets" banner.
 *
 * Why not auto-insert? Mid-scroll content shifts are jarring. The Twitter/X
 * UX is to surface the new count and let the user opt in.
 */
export function useTimelineStream(token: string | null) {
  const [newTweets, setNewTweets] = useState<Tweet[]>([]);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!token) return;

    const url = `/api/tweets/timeline/stream?token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);
    sourceRef.current = source;

    source.addEventListener("tweet:new", (e) => {
      try {
        const tweet = JSON.parse((e as MessageEvent).data) as Tweet;
        setNewTweets((prev) => {
          // Defensive de-dup in case of reconnect replay
          if (prev.some((t) => t.id === tweet.id)) return prev;
          return [tweet, ...prev];
        });
      } catch (err) {
        console.error("Failed to parse tweet:new payload:", err);
      }
    });

    source.onerror = () => {
      // EventSource auto-reconnects with exponential backoff; we just log.
      // Closing here would defeat that, so we leave it to the browser.
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
