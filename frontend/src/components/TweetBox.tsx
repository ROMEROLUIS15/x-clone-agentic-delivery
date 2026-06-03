import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

interface TweetBoxProps {
  onTweetCreated: () => void;
  /** When set, the box posts a reply to this tweet instead of a top-level tweet. */
  parentId?: string;
  placeholder?: string;
  submitLabel?: string;
}

export const TweetBox: React.FC<TweetBoxProps> = ({
  onTweetCreated,
  parentId,
  placeholder = "What is happening?!",
  submitLabel = "Post",
}) => {
  const { token } = useAuth();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const charCount = text.length;
  const isOverLimit = charCount > 280;
  const isNearLimit = charCount >= 260 && charCount <= 280;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isOverLimit || !token) return;

    const endpoint = parentId ? `/api/tweets/${parentId}/replies` : "/api/tweets";

    setSubmitting(true);
    try {
      await api.post(endpoint, { text: trimmed }, token);
      setText("");
      onTweetCreated();
    } catch (err) {
      console.error("Tweet creation error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const counterClass = isOverLimit ? "char-counter danger" : isNearLimit ? "char-counter warning" : "char-counter";

  return (
    <div className="tweet-box">
      <div className="tweet-box-input-area">
        <textarea
          className="tweet-box-textarea"
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          disabled={submitting}
          rows={3}
        />
        <div className="tweet-box-actions">
          <span className={counterClass}>
            {isOverLimit ? `-${charCount - 280}` : charCount > 0 ? charCount : ""}
          </span>
          <button
            className="tweet-btn"
            type="submit"
            disabled={!text.trim() || isOverLimit || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Posting..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
