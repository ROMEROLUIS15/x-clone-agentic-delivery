import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "../context/NavigationContext";

interface SearchUser {
  id: string;
  username: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
}

export const Search: React.FC = () => {
  const { token } = useAuth();
  const { navigateTo, viewParams } = useNavigation();
  const [query, setQuery] = useState(viewParams?.query ?? "");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, token]);

  return (
    <div>
      <header className="main-header">
        <h1 className="main-header-title">Search</h1>
      </header>

      <div className="search-input-container">
        <input
          className="search-input"
          type="text"
          placeholder="Search users by name or username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <div className="search-results">
        {loading ? (
          <div className="feed-placeholder">Searching...</div>
        ) : searched && results.length === 0 ? (
          <div className="feed-placeholder">No users found for "{query}"</div>
        ) : (
          results.map((user) => (
            <div
              key={user.id}
              className="search-user-card"
              onClick={() => navigateTo("profile", { userId: user.id })}
            >
              <img
                className="search-user-avatar"
                src={user.avatarUrl ?? "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"}
                alt={user.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png";
                }}
              />
              <div className="search-user-info">
                <span className="search-user-name">{user.name}</span>
                <span className="search-user-handle">@{user.username}</span>
                {user.bio && <p className="search-user-bio">{user.bio}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
