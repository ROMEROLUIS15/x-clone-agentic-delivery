import React, { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { useEventStream } from "../api/useEventStream";
import { TweetCard, Tweet } from "./TweetCard";

interface UserTweetListProps {
  userId: string;
  currentUserId?: string;
  token: string | null;
  emptyMessage: string;
}

interface UserTweetsResponse {
  tweets: Tweet[];
  total: number;
  limit: number;
  offset: number;
}

const PAGE_SIZE = 10;

export const UserTweetList: React.FC<UserTweetListProps> = ({
  userId, currentUserId, token, emptyMessage,
}) => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Live updates while viewing this user's profile: new tweets from this user,
  // like-count changes, and reply-count bumps — for any viewer, follower or not.
  useEventStream(`/api/users/${userId}/stream`, token, {
    onTweetNew: (tweet) => {
      if (tweet.userId !== userId || tweet.parentId !== null) return;
      setTweets((prev) => (prev.some((t) => t.id === tweet.id) ? prev : [tweet, ...prev]));
      setTotal((prev) => prev + 1);
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

  const fetchPage = useCallback(async (offset: number) => {
    if (!token) return null;
    try {
      return await api.get<UserTweetsResponse>(
        `/api/users/${userId}/tweets?limit=${PAGE_SIZE}&offset=${offset}`,
        token
      );
    } catch (err) {
      console.error("Failed to fetch user tweets:", err);
      return null;
    }
  }, [token, userId]);

  useEffect(() => {
    setLoading(true);
    setTweets([]);
    setTotal(0);
    fetchPage(0).then((data) => {
      if (data) {
        setTweets(data.tweets);
        setTotal(data.total);
      }
      setLoading(false);
    });
  }, [fetchPage]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const data = await fetchPage(tweets.length);
    if (data && data.tweets.length > 0) {
      setTweets((prev) => [...prev, ...data.tweets]);
    }
    setLoadingMore(false);
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

  return (
    <div className="tweet-feed" data-testid="profile-tweets">
      <div className="profile-tweets-header">
        <h3>Tweets</h3>
      </div>
      {loading ? (
        <div className="feed-placeholder">Loading tweets...</div>
      ) : tweets.length === 0 ? (
        <div className="feed-placeholder">{emptyMessage}</div>
      ) : (
        <>
          {tweets.map((tweet) => (
            <TweetCard
              key={tweet.id}
              tweet={tweet}
              currentUserId={currentUserId}
              onLike={handleLike}
              onDelete={handleDelete}
            />
          ))}
          {tweets.length < total && (
            <div className="load-more-container">
              <button className="load-more-btn" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
