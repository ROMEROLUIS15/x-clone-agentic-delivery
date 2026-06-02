import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { TweetBox } from "./TweetBox";

interface TweetUser {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
}

interface Tweet {
  id: string;
  text: string;
  userId: string;
  createdAt: string;
  user: TweetUser;
}

export const Home: React.FC = () => {
  const { user, token } = useAuth();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTweets = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/tweets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTweets(data);
      }
    } catch (err) {
      console.error("Failed to fetch tweets:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTweets();
  }, [fetchTweets]);

  const handleDelete = async (tweetId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/tweets/${tweetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTweets((prev) => prev.filter((t) => t.id !== tweetId));
      }
    } catch (err) {
      console.error("Failed to delete tweet:", err);
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

      <TweetBox onTweetCreated={fetchTweets} />

      <div className="tweet-feed">
        {loading ? (
          <div className="feed-placeholder">Loading tweets...</div>
        ) : tweets.length === 0 ? (
          <div className="feed-placeholder">
            <p>No tweets yet. Write your first one above!</p>
          </div>
        ) : (
          tweets.map((tweet) => (
            <article key={tweet.id} className="tweet-card">
              <div className="tweet-card-avatar">
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
                  <span className="tweet-card-name">{tweet.user.name}</span>
                  <span className="tweet-card-username">@{tweet.user.username}</span>
                  <span className="tweet-card-dot">·</span>
                  <span className="tweet-card-date">{formatDate(tweet.createdAt)}</span>
                </div>
                <p className="tweet-card-text">{tweet.text}</p>
                {tweet.userId === user?.id && (
                  <button
                    className="tweet-delete-btn"
                    onClick={() => handleDelete(tweet.id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};
