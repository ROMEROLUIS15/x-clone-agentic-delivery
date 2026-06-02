import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "../context/NavigationContext";
import { TweetBox } from "./TweetBox";

export interface TweetUser {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
}

export interface Tweet {
  id: string;
  text: string;
  userId: string;
  createdAt: string;
  user: TweetUser;
  likesCount: number;
  liked: boolean;
}

interface TimelineResponse {
  tweets: Tweet[];
  total: number;
  limit: number;
  offset: number;
}

const PAGE_SIZE = 10;

export const Home: React.FC = () => {
  const { user, token } = useAuth();
  const { navigateTo } = useNavigation();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchTimeline = useCallback(async (offset: number) => {
    if (!token) return null;
    try {
      const res = await fetch(`/api/tweets/timeline?limit=${PAGE_SIZE}&offset=${offset}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        return await res.json() as TimelineResponse;
      }
    } catch (err) {
      console.error("Failed to fetch timeline:", err);
    }
    return null;
  }, [token]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const data = await fetchTimeline(0);
      if (data) {
        setTweets(data.tweets);
        setTotal(data.total);
      }
      setLoading(false);
    })();
  }, [fetchTimeline]);

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
      const res = await fetch(`/api/tweets/${tweetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTweets((prev) => prev.filter((t) => t.id !== tweetId));
        setTotal((prev) => prev - 1);
      }
    } catch (err) {
      console.error("Failed to delete tweet:", err);
    }
  };

  const handleLike = async (tweetId: string, currentlyLiked: boolean) => {
    if (!token) return;
    const endpoint = currentlyLiked ? "unlike" : "like";
    try {
      const res = await fetch(`/api/tweets/${tweetId}/${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTweets((prev) =>
          prev.map((t) =>
            t.id === tweetId
              ? { ...t, likesCount: data.likesCount, liked: data.liked }
              : t
          )
        );
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <header className="main-header">
        <h1 className="main-header-title">Home</h1>
      </header>

      <TweetBox onTweetCreated={() => {
        setTweets([]);
        setTotal(0);
        (async () => {
          setLoading(true);
          const data = await fetchTimeline(0);
          if (data) {
            setTweets(data.tweets);
            setTotal(data.total);
          }
          setLoading(false);
        })();
      }} />

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
              <article key={tweet.id} className="tweet-card">
                <div
                  className="tweet-card-avatar"
                  onClick={() => navigateTo("profile", { userId: tweet.user.id })}
                  style={{ cursor: "pointer" }}
                >
                  <img
                    src={tweet.user.avatarUrl ?? "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"}
                    alt={tweet.user.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png";
                    }}
                  />
                </div>
                <div className="tweet-card-body">
                  <div className="tweet-card-header">
                    <span
                      className="tweet-card-name"
                      onClick={() => navigateTo("profile", { userId: tweet.user.id })}
                      style={{ cursor: "pointer" }}
                    >
                      {tweet.user.name}
                    </span>
                    <span className="tweet-card-username">@{tweet.user.username}</span>
                    <span className="tweet-card-dot">·</span>
                    <span className="tweet-card-date">{formatDate(tweet.createdAt)}</span>
                  </div>
                  <p className="tweet-card-text">{tweet.text}</p>
                  <div className="tweet-card-actions">
                    <button
                      className={`tweet-like-btn ${tweet.liked ? "liked" : ""}`}
                      onClick={() => handleLike(tweet.id, tweet.liked)}
                    >
                      <svg viewBox="0 0 24 24" className="like-icon" width="18" height="18">
                        <path
                          d={tweet.liked ? "M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.505.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.35-2.47-1.341-4.73.034-6.686 1.38-1.96 3.45-2.75 5.264-1.982.772.327 1.53.913 2.097 1.655.277.362.421.432.985.432s.709-.07.985-.432c.567-.742 1.325-1.328 2.097-1.655 1.814-.768 3.885.022 5.264 1.982 1.375 1.956 1.384 4.216.034 6.686z" : "M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.505.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.35-2.47-1.341-4.73.034-6.686 1.38-1.96 3.45-2.75 5.264-1.982.772.327 1.53.913 2.097 1.655.277.362.421.432.985.432s.709-.07.985-.432c.567-.742 1.325-1.328 2.097-1.655 1.814-.768 3.885.022 5.264 1.982 1.375 1.956 1.384 4.216.034 6.686zM12 21l-1 .5-1-.5h2z"}
                          fill="currentColor"
                        />
                      </svg>
                      <span className="like-count">{tweet.likesCount}</span>
                    </button>
                    {tweet.userId === user?.id && (
                      <button
                        className="tweet-delete-btn"
                        onClick={() => handleDelete(tweet.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </article>
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
