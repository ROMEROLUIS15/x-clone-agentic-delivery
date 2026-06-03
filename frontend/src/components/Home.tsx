import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { useEventStream } from "../api/useEventStream";
import { TweetBox } from "./TweetBox";
import { TweetCard, Tweet } from "./TweetCard";

interface TimelineResponse {
  tweets: Tweet[];
  total: number;
  limit: number;
  offset: number;
}

const PAGE_SIZE = 10;

export const Home: React.FC = () => {
  const { user, token } = useAuth();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [newTweets, setNewTweets] = useState<Tweet[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEventStream("/api/tweets/timeline/stream", token, {
    // Buffer new tweets behind a banner instead of auto-inserting (avoids scroll jumps).
    onTweetNew: (tweet) => {
      setNewTweets((prev) => (prev.some((t) => t.id === tweet.id) ? prev : [tweet, ...prev]));
    },
    onLikeUpdate: ({ tweetId, likesCount }) => {
      setTweets((prev) => prev.map((t) => (t.id === tweetId ? { ...t, likesCount } : t)));
    },
    onReplyNew: (reply) => {
      setTweets((prev) =>
        prev.map((t) => (t.id === reply.parentId ? { ...t, replyCount: t.replyCount + 1 } : t))
      );
    },
  });

  const handleShowNew = () => {
    if (newTweets.length === 0) return;
    setTweets((prev) => {
      const seen = new Set(prev.map((t) => t.id));
      const merged = newTweets.filter((t) => !seen.has(t.id));
      return [...merged, ...prev];
    });
    setTotal((prev) => prev + newTweets.length);
    setNewTweets([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fetchTimeline = useCallback(async (offset: number) => {
    if (!token) return null;
    try {
      return await api.get<TimelineResponse>(
        `/api/tweets/timeline?limit=${PAGE_SIZE}&offset=${offset}`,
        token
      );
    } catch (err) {
      console.error("Failed to fetch timeline:", err);
      return null;
    }
  }, [token]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await fetchTimeline(0);
    if (data) {
      setTweets(data.tweets);
      setTotal(data.total);
      setNewTweets([]);
    }
    setLoading(false);
  }, [fetchTimeline]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const data = await fetchTimeline(tweets.length);
    if (data && data.tweets.length > 0) {
      setTweets((prev) => [...prev, ...data.tweets]);
    }
    setLoadingMore(false);
  };

  const handleDelete = async (tweetId: string) => {
    if (!token) return;
    try {
      await api.delete(`/api/tweets/${tweetId}`, token);
      setTweets((prev) => prev.filter((t) => t.id !== tweetId));
      setTotal((prev) => prev - 1);
    } catch (err) {
      console.error("Failed to delete tweet:", err);
    }
  };

  const handleLike = async (tweetId: string, currentlyLiked: boolean) => {
    if (!token) return;
    const endpoint = currentlyLiked ? "unlike" : "like";
    try {
      const data = await api.post<{ likesCount: number; liked: boolean }>(
        `/api/tweets/${tweetId}/${endpoint}`,
        undefined,
        token
      );
      setTweets((prev) =>
        prev.map((t) =>
          t.id === tweetId ? { ...t, likesCount: data.likesCount, liked: data.liked } : t
        )
      );
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  return (
    <div>
      <header className="main-header">
        <h1 className="main-header-title">Home</h1>
      </header>

      <TweetBox onTweetCreated={refresh} />

      {newTweets.length > 0 && (
        <button
          type="button"
          className="new-tweets-banner"
          onClick={handleShowNew}
          aria-live="polite"
        >
          <span className="new-tweets-banner-dot" />
          {newTweets.length === 1
            ? "1 new tweet — click to view"
            : `${newTweets.length} new tweets — click to view`}
        </button>
      )}

      <div className="tweet-feed">
        {loading ? (
          <div className="feed-placeholder">Loading tweets...</div>
        ) : tweets.length === 0 ? (
          <div className="feed-placeholder">
            <p>No tweets yet. Write your first one above!</p>
          </div>
        ) : (
          <>
            {tweets.map((tweet) => (
              <TweetCard
                key={tweet.id}
                tweet={tweet}
                currentUserId={user?.id}
                onLike={handleLike}
                onDelete={handleDelete}
              />
            ))}
            {tweets.length < total && (
              <div className="load-more-container">
                <button
                  className="load-more-btn"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
