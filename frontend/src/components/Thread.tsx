import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "../context/NavigationContext";
import { api } from "../api/client";
import { TweetBox } from "./TweetBox";
import { TweetCard, Tweet } from "./TweetCard";

interface ThreadResponse {
  tweet: Tweet;
  parent: Tweet | null;
}

interface RepliesResponse {
  replies: Tweet[];
  total: number;
  limit: number;
  offset: number;
}

const PAGE_SIZE = 10;

export const Thread: React.FC = () => {
  const { user, token } = useAuth();
  const { viewParams, navigateTo } = useNavigation();
  const tweetId = viewParams?.tweetId;

  const [tweet, setTweet] = useState<Tweet | null>(null);
  const [parent, setParent] = useState<Tweet | null>(null);
  const [replies, setReplies] = useState<Tweet[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    if (!token || !tweetId) return;
    setLoading(true);
    setNotFound(false);
    try {
      const [thread, replyPage] = await Promise.all([
        api.get<ThreadResponse>(`/api/tweets/${tweetId}`, token),
        api.get<RepliesResponse>(`/api/tweets/${tweetId}/replies?limit=${PAGE_SIZE}&offset=0`, token),
      ]);
      setTweet(thread.tweet);
      setParent(thread.parent);
      setReplies(replyPage.replies);
      setTotal(replyPage.total);
    } catch (err) {
      console.error("Failed to load thread:", err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [token, tweetId]);

  useEffect(() => { load(); }, [load]);

  const handleLoadMore = async () => {
    if (!token || !tweetId) return;
    setLoadingMore(true);
    try {
      const data = await api.get<RepliesResponse>(
        `/api/tweets/${tweetId}/replies?limit=${PAGE_SIZE}&offset=${replies.length}`,
        token
      );
      if (data.replies.length > 0) {
        setReplies((prev) => [...prev, ...data.replies]);
      }
    } catch (err) {
      console.error("Failed to load more replies:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Patch like state across the focused tweet, parent, and replies.
  const handleLike = async (id: string, currentlyLiked: boolean) => {
    if (!token) return;
    const endpoint = currentlyLiked ? "unlike" : "like";
    try {
      const data = await api.post<{ likesCount: number; liked: boolean }>(
        `/api/tweets/${id}/${endpoint}`,
        undefined,
        token
      );
      const patch = (t: Tweet) =>
        t.id === id ? { ...t, likesCount: data.likesCount, liked: data.liked } : t;
      setTweet((prev) => (prev ? patch(prev) : prev));
      setParent((prev) => (prev ? patch(prev) : prev));
      setReplies((prev) => prev.map(patch));
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await api.delete(`/api/tweets/${id}`, token);
      if (id === tweet?.id) {
        // The focused tweet was deleted — leave the thread.
        navigateTo("home");
        return;
      }
      setReplies((prev) => prev.filter((r) => r.id !== id));
      setTotal((prev) => Math.max(prev - 1, 0));
      setTweet((prev) => (prev ? { ...prev, replyCount: Math.max(prev.replyCount - 1, 0) } : prev));
    } catch (err) {
      console.error("Failed to delete tweet:", err);
    }
  };

  const header = (
    <header className="main-header thread-header">
      <button className="thread-back-btn" onClick={() => navigateTo("home")} aria-label="Back">
        ←
      </button>
      <h1 className="main-header-title">Thread</h1>
    </header>
  );

  if (loading) {
    return (
      <div>
        {header}
        <div className="feed-placeholder">Loading thread...</div>
      </div>
    );
  }

  if (notFound || !tweet) {
    return (
      <div>
        {header}
        <div className="feed-placeholder">This tweet is not available.</div>
      </div>
    );
  }

  return (
    <div>
      {header}

      {parent && (
        <div className="thread-parent">
          <TweetCard
            tweet={parent}
            currentUserId={user?.id}
            onLike={handleLike}
            onDelete={handleDelete}
          />
          <div className="thread-connector" aria-hidden="true" />
        </div>
      )}

      <div className="thread-focus">
        <TweetCard
          tweet={tweet}
          currentUserId={user?.id}
          onLike={handleLike}
          onDelete={handleDelete}
        />
      </div>

      <TweetBox
        parentId={tweet.id}
        onTweetCreated={load}
        placeholder="Post your reply"
        submitLabel="Reply"
      />

      <div className="tweet-feed">
        {replies.length === 0 ? (
          <div className="feed-placeholder">
            <p>No replies yet. Be the first to reply!</p>
          </div>
        ) : (
          <>
            {replies.map((reply) => (
              <TweetCard
                key={reply.id}
                tweet={reply}
                currentUserId={user?.id}
                onLike={handleLike}
                onDelete={handleDelete}
              />
            ))}
            {replies.length < total && (
              <div className="load-more-container">
                <button className="load-more-btn" onClick={handleLoadMore} disabled={loadingMore}>
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
