import React, { useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

interface TweetBoxProps {
  onTweetCreated: () => void;
  /** When set, the box posts a reply to this tweet instead of a top-level tweet. */
  parentId?: string;
  placeholder?: string;
  submitLabel?: string;
}

// Small image (camera) icon, X-style.
const IMAGE_ICON_PATH =
  "M3 5.5C3 4.119 4.119 3 5.5 3h13C19.881 3 21 4.119 21 5.5v13c0 1.381-1.119 2.5-2.5 2.5h-13C4.119 21 3 19.881 3 18.5v-13zM5.5 5c-.276 0-.5.224-.5.5v9.086l3-3 3 3 5-5 3 3V5.5c0-.276-.224-.5-.5-.5h-13zM19 15.414l-3-3-5 5-3-3-3 3V18.5c0 .276.224.5.5.5h13c.276 0 .5-.224.5-.5v-3.086zM9.75 7C8.784 7 8 7.784 8 8.75s.784 1.75 1.75 1.75 1.75-.784 1.75-1.75S10.716 7 9.75 7z";

export const TweetBox: React.FC<TweetBoxProps> = ({
  onTweetCreated,
  parentId,
  placeholder = "What is happening?!",
  submitLabel = "Post",
}) => {
  const { token } = useAuth();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = text.length;
  const isOverLimit = charCount > 280;
  const isNearLimit = charCount >= 260 && charCount <= 280;
  const busy = submitting || uploading;

  const handleSelectImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploadError(null);
    setUploading(true);
    try {
      const { url } = await api.upload<{ url: string }>("/api/uploads", file, token);
      setImageUrl(url);
    } catch (err) {
      console.error("Image upload error:", err);
      setUploadError("Could not upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = () => {
    setImageUrl(null);
    setUploadError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isOverLimit || busy || !token) return;

    const endpoint = parentId ? `/api/tweets/${parentId}/replies` : "/api/tweets";

    setSubmitting(true);
    try {
      await api.post(endpoint, { text: trimmed, ...(imageUrl ? { imageUrl } : {}) }, token);
      setText("");
      setImageUrl(null);
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

        {imageUrl && (
          <div className="tweet-box-image-preview">
            <img src={imageUrl} alt="Selected attachment" />
            <button type="button" className="tweet-box-image-remove" onClick={removeImage} aria-label="Remove image">
              ×
            </button>
          </div>
        )}
        {uploadError && <span className="tweet-box-upload-error">{uploadError}</span>}

        <div className="tweet-box-actions">
          <button
            type="button"
            className="tweet-box-image-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            aria-label="Add image"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d={IMAGE_ICON_PATH} fill="currentColor" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="tweet-box-file-input"
            onChange={handleSelectImage}
            data-testid="tweet-image-input"
          />
          <span className={counterClass}>
            {isOverLimit ? `-${charCount - 280}` : charCount > 0 ? charCount : ""}
          </span>
          <button
            className="tweet-btn"
            type="submit"
            disabled={!text.trim() || isOverLimit || busy}
            onClick={handleSubmit}
          >
            {uploading ? "Uploading..." : submitting ? "Posting..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
