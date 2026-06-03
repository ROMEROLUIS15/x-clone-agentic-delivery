import React from "react";
import { useNavigation } from "../context/NavigationContext";
import { Avatar } from "./Avatar";

export interface Tweet {
  id: string;
  text: string;
  userId: string;
  parentId: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    name: string;
    avatarUrl: string | null;
  };
  likesCount: number;
  replyCount: number;
  liked: boolean;
}

interface TweetCardProps {
  tweet: Tweet;
  currentUserId?: string;
  onLike: (tweetId: string, currentlyLiked: boolean) => void;
  onDelete: (tweetId: string) => void;
}

// X-style reply (speech bubble) outline icon.
const REPLY_PATH =
  "M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l2.063-.05v2.36l5.082-2.82c1.96-1.09 3.18-3.14 3.18-5.37 0-3.39-2.75-6.13-6.129-6.13H9.756z";

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// X-style heart icons. The outline variant is its own shape, NOT the
// filled path with extra strokes — that would still render as filled.
const HEART_PATH_FILLED =
  "M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.505.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.35-2.47-1.341-4.73.034-6.686 1.38-1.96 3.45-2.75 5.264-1.982.772.327 1.53.913 2.097 1.655.277.362.421.432.985.432s.709-.07.985-.432c.567-.742 1.325-1.328 2.097-1.655 1.814-.768 3.885.022 5.264 1.982 1.375 1.956 1.384 4.216.034 6.686z";
const HEART_PATH_OUTLINE =
  "M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z";

export const TweetCard: React.FC<TweetCardProps> = ({ tweet, currentUserId, onLike, onDelete }) => {
  const { navigateTo } = useNavigation();
  const goToProfile = () => navigateTo("profile", { userId: tweet.user.id });
  const goToThread = () => navigateTo("thread", { tweetId: tweet.id });

  return (
    <article className="tweet-card">
      <div className="tweet-card-avatar" onClick={goToProfile} style={{ cursor: "pointer" }}>
        <Avatar src={tweet.user.avatarUrl} alt={tweet.user.name} />
      </div>
      <div className="tweet-card-body">
        <div className="tweet-card-header">
          <span className="tweet-card-name" onClick={goToProfile} style={{ cursor: "pointer" }}>
            {tweet.user.name}
          </span>
          <span className="tweet-card-username">@{tweet.user.username}</span>
          <span className="tweet-card-dot">·</span>
          <span className="tweet-card-date">{formatDate(tweet.createdAt)}</span>
        </div>
        <p className="tweet-card-text" onClick={goToThread} style={{ cursor: "pointer" }}>
          {tweet.text}
        </p>
        <div className="tweet-card-actions">
          <button
            className="tweet-reply-btn"
            onClick={goToThread}
            aria-label="Reply"
          >
            <svg viewBox="0 0 24 24" className="reply-icon" width="18" height="18">
              <path d={REPLY_PATH} fill="currentColor" />
            </svg>
            <span className="reply-count">{tweet.replyCount}</span>
          </button>
          <button
            className={`tweet-like-btn ${tweet.liked ? "liked" : ""}`}
            onClick={() => onLike(tweet.id, tweet.liked)}
          >
            <svg viewBox="0 0 24 24" className="like-icon" width="18" height="18">
              <path d={tweet.liked ? HEART_PATH_FILLED : HEART_PATH_OUTLINE} fill="currentColor" />
            </svg>
            <span className="like-count">{tweet.likesCount}</span>
          </button>
          {tweet.userId === currentUserId && (
            <button className="tweet-delete-btn" onClick={() => onDelete(tweet.id)}>
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
