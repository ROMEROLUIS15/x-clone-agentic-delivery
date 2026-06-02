import React from "react";
import { useNavigation } from "../context/NavigationContext";
import { Avatar } from "./Avatar";

export interface Tweet {
  id: string;
  text: string;
  userId: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    name: string;
    avatarUrl: string | null;
  };
  likesCount: number;
  liked: boolean;
}

interface TweetCardProps {
  tweet: Tweet;
  currentUserId?: string;
  onLike: (tweetId: string, currentlyLiked: boolean) => void;
  onDelete: (tweetId: string) => void;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const HEART_PATH_FILLED =
  "M20.884 13.19c-1.351 2.48-4.001 5.12-8.379 7.67l-.505.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.35-2.47-1.341-4.73.034-6.686 1.38-1.96 3.45-2.75 5.264-1.982.772.327 1.53.913 2.097 1.655.277.362.421.432.985.432s.709-.07.985-.432c.567-.742 1.325-1.328 2.097-1.655 1.814-.768 3.885.022 5.264 1.982 1.375 1.956 1.384 4.216.034 6.686z";
const HEART_PATH_OUTLINE = `${HEART_PATH_FILLED}M12 21l-1 .5-1-.5h2z`;

export const TweetCard: React.FC<TweetCardProps> = ({ tweet, currentUserId, onLike, onDelete }) => {
  const { navigateTo } = useNavigation();
  const goToProfile = () => navigateTo("profile", { userId: tweet.user.id });

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
        <p className="tweet-card-text">{tweet.text}</p>
        <div className="tweet-card-actions">
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
