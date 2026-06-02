import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AuthProvider } from "../context/AuthContext";
import { NavigationProvider } from "../context/NavigationContext";
import { Home } from "../components/Home";
import { Search } from "../components/Search";

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  username: "testuser",
  name: "Test User",
  bio: "My bio",
  avatarUrl: null,
  createdAt: new Date().toISOString(),
};

const authResponse = { user: mockUser };

const mockTimelineResponse = {
  tweets: [
    {
      id: "tweet-1",
      text: "First timeline tweet",
      userId: "user-1",
      createdAt: new Date(Date.now() - 1000).toISOString(),
      user: { id: "user-1", username: "testuser", name: "Test User", avatarUrl: null },
      likesCount: 3,
      liked: false,
    },
    {
      id: "tweet-2",
      text: "Second timeline tweet",
      userId: "user-2",
      createdAt: new Date(Date.now() - 2000).toISOString(),
      user: { id: "user-2", username: "other", name: "Other User", avatarUrl: null },
      likesCount: 5,
      liked: true,
    },
  ],
  total: 2,
  limit: 10,
  offset: 0,
};

function createFetchMock(responses: Record<string, unknown>) {
  return vi.fn().mockImplementation((url: string) => {
    const match = Object.keys(responses).find((key) => url.includes(key));
    if (match) {
      return Promise.resolve({
        ok: true,
        json: async () => responses[match],
      });
    }
    if (url === "/api/auth/me") {
      return Promise.resolve({ ok: true, json: async () => authResponse });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
}

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NavigationProvider>{children}</NavigationProvider>
    </AuthProvider>
  );
}

describe("Timeline - Pagination", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem("token", "fake-jwt");
    localStorage.setItem("user", JSON.stringify(mockUser));
    window.scrollTo = vi.fn();
  });

  it("should load timeline tweets from API on mount", async () => {
    const fetchMock = createFetchMock({
      "/api/tweets/timeline": mockTimelineResponse,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("First timeline tweet")).toBeInTheDocument();
      expect(screen.getByText("Second timeline tweet")).toBeInTheDocument();
    });
  });

  it("should show Load More button when there are more tweets", async () => {
    const responseWithMore = {
      tweets: mockTimelineResponse.tweets,
      total: 20,
      limit: 10,
      offset: 0,
    };
    const fetchMock = createFetchMock({
      "/api/tweets/timeline": responseWithMore,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("Load more")).toBeInTheDocument();
    });
  });

  it("should not show Load More when all tweets are loaded", async () => {
    const fetchMock = createFetchMock({
      "/api/tweets/timeline": mockTimelineResponse,
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("First timeline tweet")).toBeInTheDocument();
    });

    expect(screen.queryByText("Load more")).not.toBeInTheDocument();
  });

  it("should load more tweets on Load More click", async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/auth/me") {
        return Promise.resolve({ ok: true, json: async () => authResponse });
      }
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            tweets: [
              {
                id: "tweet-1",
                text: "First page tweet",
                userId: "user-1",
                createdAt: new Date().toISOString(),
                user: { id: "user-1", username: "testuser", name: "Test User", avatarUrl: null },
                likesCount: 0,
                liked: false,
              },
            ],
            total: 2,
            limit: 1,
            offset: 0,
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          tweets: [
            {
              id: "tweet-2",
              text: "Second page tweet",
              userId: "user-1",
              createdAt: new Date().toISOString(),
              user: { id: "user-1", username: "testuser", name: "Test User", avatarUrl: null },
              likesCount: 0,
              liked: false,
            },
          ],
          total: 2,
          limit: 1,
          offset: 1,
        }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText("First page tweet")).toBeInTheDocument();
    });

    const loadMoreBtn = screen.getByText("Load more");
    fireEvent.click(loadMoreBtn);

    await waitFor(() => {
      expect(screen.getByText("Second page tweet")).toBeInTheDocument();
    });
  });

  it("should show loading state initially", async () => {
    const fetchMock = vi.fn().mockImplementation(() => {
      return new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              ok: true,
              json: async () => mockTimelineResponse,
            }),
          100
        )
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <TestWrapper>
        <Home />
      </TestWrapper>
    );

    expect(screen.getByText("Loading tweets...")).toBeInTheDocument();
  });
});

describe("Search - User Search", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem("token", "fake-jwt");
    localStorage.setItem("user", JSON.stringify(mockUser));
    window.scrollTo = vi.fn();
  });

  it("should render search input", () => {
    render(
      <TestWrapper>
        <Search />
      </TestWrapper>
    );

    expect(
      screen.getByPlaceholderText("Search users by name or username...")
    ).toBeInTheDocument();
  });

  it("should search users on typing with debounce", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/auth/me") {
        return Promise.resolve({ ok: true, json: async () => authResponse });
      }
      if (url.includes("/api/users/search")) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              id: "user-found",
              username: "founduser",
              name: "Found User",
              bio: "Found bio",
              avatarUrl: null,
            },
          ],
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <TestWrapper>
        <Search />
      </TestWrapper>
    );

    const input = screen.getByPlaceholderText("Search users by name or username...");
    fireEvent.change(input, { target: { value: "found" } });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/users/search?q=found",
        expect.any(Object)
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Found User")).toBeInTheDocument();
      expect(screen.getByText("@founduser")).toBeInTheDocument();
      expect(screen.getByText("Found bio")).toBeInTheDocument();
    });
  });

  it("should show no results message when search yields nothing", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/auth/me") {
        return Promise.resolve({ ok: true, json: async () => authResponse });
      }
      if (url.includes("/api/users/search")) {
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <TestWrapper>
        <Search />
      </TestWrapper>
    );

    fireEvent.change(
      screen.getByPlaceholderText("Search users by name or username..."),
      { target: { value: "zzzznonexistent" } }
    );

    await waitFor(() => {
      expect(
        screen.getByText(/No users found for/)
      ).toBeInTheDocument();
    });
  });

  it("should not show results for empty query", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/auth/me") {
        return Promise.resolve({ ok: true, json: async () => authResponse });
      }
      return Promise.resolve({ ok: true, json: async () => [{ id: "x" }] });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <TestWrapper>
        <Search />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.queryByText("No users found for")).not.toBeInTheDocument();
    });
  });
});
