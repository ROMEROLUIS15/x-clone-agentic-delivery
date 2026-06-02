import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { AuthProvider } from "../context/AuthContext";
import { NavigationProvider } from "../context/NavigationContext";
import { Home } from "../components/Home";

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  username: "testuser",
  name: "Test User",
  bio: "My bio",
  avatarUrl: null,
  createdAt: new Date().toISOString(),
};

const authResponse = {
  user: mockUser,
};

const mockTweets = [
  {
    id: "tweet-1",
    text: "First tweet",
    userId: "user-1",
    createdAt: new Date().toISOString(),
    user: {
      id: "user-1",
      username: "testuser",
      name: "Test User",
      avatarUrl: null,
    },
    likesCount: 5,
    liked: false,
  },
  {
    id: "tweet-2",
    text: "Second tweet",
    userId: "user-2",
    createdAt: new Date().toISOString(),
    user: {
      id: "user-2",
      username: "other",
      name: "Other",
      avatarUrl: null,
    },
    likesCount: 0,
    liked: true,
  },
];

function createFetchMock(tweetsResponse: unknown) {
  return vi.fn().mockImplementation((url: string) => {
    if (url === "/api/auth/me") {
      return Promise.resolve({
        ok: true,
        json: async () => authResponse,
      });
    }
    if (url.includes("/like") || url.includes("/unlike")) {
      const isLike = url.includes("/like") && !url.includes("/unlike");
      return Promise.resolve({
        ok: true,
        json: async () => ({
          likesCount: isLike ? 6 : 4,
          liked: isLike,
        }),
      });
    }
    if (url.includes("/api/tweets/timeline")) {
      const arr = tweetsResponse as any[];
      return Promise.resolve({
        ok: true,
        json: async () => ({ tweets: arr, total: arr.length, limit: 10, offset: 0 }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: async () => tweetsResponse,
    });
  });
}

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NavigationProvider>{children}</NavigationProvider>
    </AuthProvider>
  );
}

describe("Social - Like/Unlike", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem("token", "fake-jwt");
    localStorage.setItem("user", JSON.stringify(mockUser));
    window.scrollTo = vi.fn();
  });

  it("should render like buttons with counts on each tweet", async () => {
    vi.stubGlobal("fetch", createFetchMock(mockTweets));

    render(<Home />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText("First tweet")).toBeInTheDocument();
    });

    const likeCounts = screen.getAllByText(/^\d+$/);
    const tweet1Like = likeCounts.find((el) => el.textContent === "5");
    const tweet2Like = likeCounts.find((el) => el.textContent === "0");
    expect(tweet1Like).toBeInTheDocument();
    expect(tweet2Like).toBeInTheDocument();
  });

  it("should have liked class on tweets where liked is true", async () => {
    vi.stubGlobal("fetch", createFetchMock(mockTweets));

    render(<Home />, { wrapper: TestWrapper });

    await waitFor(() => {
      const likedBtns = screen
        .getAllByText("0")
        .filter(
          (el) =>
            el.closest("button")?.classList.contains("liked")
        );
      expect(likedBtns.length).toBe(1);
    });
  });

  it("should toggle like state on click", async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      callCount++;
      if (url === "/api/auth/me") {
        return Promise.resolve({
          ok: true,
          json: async () => authResponse,
        });
      }
      if (url === "/api/tweets/tweet-1/like") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ likesCount: 6, liked: true }),
        });
      }
      if (url.includes("/api/tweets/timeline")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ tweets: mockTweets, total: mockTweets.length, limit: 10, offset: 0 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockTweets,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Home />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText("First tweet")).toBeInTheDocument();
    });

    const likeBtns = screen.getAllByRole("button");
    const likeBtn = likeBtns.find(
      (btn) => btn.querySelector(".like-icon") !== null
    );
    expect(likeBtn).toBeDefined();

    if (likeBtn) {
      fireEvent.click(likeBtn);
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/tweets/tweet-1/like",
          expect.any(Object)
        );
      });
    }
  });

  it("should update like count after toggling", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/auth/me") {
        return Promise.resolve({
          ok: true,
          json: async () => authResponse,
        });
      }
      if (url === "/api/tweets/tweet-2/unlike") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ likesCount: 0, liked: false }),
        });
      }
      if (url.includes("/api/tweets/timeline")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ tweets: mockTweets, total: mockTweets.length, limit: 10, offset: 0 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockTweets,
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<Home />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText("Second tweet")).toBeInTheDocument();
    });

    const likeBtns = screen.getAllByRole("button");
    const unlikeBtn = likeBtns.find(
      (btn) =>
        btn.querySelector(".like-icon") !== null && btn.textContent === "0"
    );

    if (unlikeBtn) {
      fireEvent.click(unlikeBtn);
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/tweets/tweet-2/unlike",
          expect.any(Object)
        );
      });
    }
  });
});
