import React, { useState } from "react";
import { useAuth, User } from "../context/AuthContext";
import { useNavigation } from "../context/NavigationContext";
import { api, ApiError } from "../api/client";

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { navigateTo } = useNavigation();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError("Please fill in all fields");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const data = await api.post<{ token: string; user: User }>(
        "/api/auth/login",
        { emailOrUsername: identifier, password }
      );
      login(data.token, data.user);
      navigateTo("home");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Login failed. Please check your credentials.");
      } else {
        console.error("Login request error:", err);
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
        <h1 className="auth-title">Log in to X</h1>
        <p className="auth-subtitle">Enter your email or username to continue</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="identifier">
              Email or Username
            </label>
            <input
              className="form-input"
              type="text"
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. test@example.com or testuser"
              disabled={submitting}
              maxLength={100}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              className="form-input"
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={submitting}
              maxLength={128}
              required
            />
          </div>

          <button className="auth-btn" type="submit" disabled={submitting}>
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{" "}
          <span className="auth-link" onClick={() => navigateTo("register")}>
            Sign up
          </span>
        </p>
      </div>
    </div>
  );
};
