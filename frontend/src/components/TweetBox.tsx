import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

interface TweetBoxProps {
  onTweetCreated: () => void;
}

export const TweetBox: React.FC<TweetBoxProps> = ({ onTweetCreated }) => {
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

    setSubmitting(true);
    try {
      const res = await fetch("/api/tweets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: trimmed }),
      });

      if (res.ok) {
        setText("");
        onTweetCreated();
      }
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
          placeholder="What is happening?!"
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
            {submitting ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
};
