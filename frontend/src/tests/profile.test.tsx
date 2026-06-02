import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AuthProvider } from "../context/AuthContext";
import { NavigationProvider } from "../context/NavigationContext";
import { Profile } from "../components/Profile";

const currentUser = {
  id: "current",
  email: "current@x.com",
  username: "current",
  name: "Current User",
  bio: "",
  avatarUrl: null,
  createdAt: new Date().toISOString(),
};

const profileUser = {
  id: "current",
  username: "current",
  name: "Current User",
  bio: "Bio text",
  avatarUrl: null,
  createdAt: new Date().toISOString(),
};

const tweets = [
  {
    id: "t1", text: "Hello from profile",
    userId: "current", createdAt: new Date().toISOString(),
    user: { id: "current", username: "current", name: "Current User", avatarUrl: null },
    likesCount: 2, liked: false,
  },
  {
    id: "t2", text: "Second profile tweet",
    userId: "current", createdAt: new Date().toISOString(),
    user: { id: "current", username: "current", name: "Current User", avatarUrl: null },
    likesCount: 0, liked: false,
  },
];

function makeFetch(emptyTweets = false) {
  return vi.fn().mockImplementation((url: string) => {
    if (url === "/api/auth/me") {
      return Promise.resolve({ ok: true, json: async () => ({ user: currentUser }) });
    }
    if (url.startsWith("/api/users/current/tweets")) {
      const list = emptyTweets ? [] : tweets;
      return Promise.resolve({
        ok: true,
        json: async () => ({ tweets: list, total: list.length, limit: 10, offset: 0 }),
      });
    }
    if (url === "/api/users/current") {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          user: profileUser, followersCount: 3, followingCount: 5, isFollowing: false,
        }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider><NavigationProvider>{children}</NavigationProvider></AuthProvider>;
}

describe("Profile - user tweets", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem("token", "fake-jwt");
    localStorage.setItem("user", JSON.stringify(currentUser));
    window.scrollTo = vi.fn();
  });

  it("renders the user's tweets below the profile stats", async () => {
    vi.stubGlobal("fetch", makeFetch());
    render(<Profile />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("Hello from profile")).toBeInTheDocument();
      expect(screen.getByText("Second profile tweet")).toBeInTheDocument();
    });
  });

  it("shows an empty-state message when the user has no tweets", async () => {
    vi.stubGlobal("fetch", makeFetch(true));
    render(<Profile />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/haven't tweeted yet/i)).toBeInTheDocument();
    });
  });

  it("renders the profile header with bio and counts", async () => {
    vi.stubGlobal("fetch", makeFetch());
    render(<Profile />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("Bio text")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument(); // followers
      expect(screen.getByText("5")).toBeInTheDocument(); // following
    });
  });
});
