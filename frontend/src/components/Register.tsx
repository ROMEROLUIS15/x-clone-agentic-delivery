import React, { useState } from "react";
import { useAuth, User } from "../context/AuthContext";
import { useNavigation } from "../context/NavigationContext";
import { api, ApiError } from "../api/client";

export const Register: React.FC = () => {
  const { login } = useAuth();
  const { navigateTo } = useNavigation();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !username || !password || !name) {
      setError("Please fill in all required fields (Name, Email, Username, Password)");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username can only contain alphanumeric characters and underscores");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const data = await api.post<{ token: string; user: User }>(
        "/api/auth/register",
        {
          email,
          username,
          password,
          name,
          bio: bio || null,
          avatarUrl: avatarUrl || null,
        }
      );
      login(data.token, data.user);
      navigateTo("home");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Registration failed. Please try again.");
      } else {
        console.error("Register request error:", err);
        setError("Network error. Please try again later.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
          </svg>
        </div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Join X today</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Name *
            </label>
            <input
              className="form-input"
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              disabled={submitting}
              maxLength={50}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email *
            </label>
            <input
              className="form-input"
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. test@example.com"
              disabled={submitting}
              maxLength={254}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="username">
              Username *
            </label>
            <input
              className="form-input"
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. testuser"
              disabled={submitting}
              maxLength={30}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password *
            </label>
            <input
              className="form-input"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              disabled={submitting}
              maxLength={128}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="bio">
              Bio
            </label>
            <textarea
              className="form-textarea"
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
              disabled={submitting}
              maxLength={160}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="avatarUrl">
              Avatar Image URL
            </label>
            <input
              className="form-input"
              type="url"
              id="avatarUrl"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="e.g. https://example.com/avatar.jpg"
              disabled={submitting}
              maxLength={500}
            />
          </div>

          <button className="auth-btn" type="submit" disabled={submitting}>
            {submitting ? "Signing up..." : "Sign up"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <span className="auth-link" onClick={() => navigateTo("login")}>
            Log in
          </span>
        </p>
      </div>
    </div>
  );
};
