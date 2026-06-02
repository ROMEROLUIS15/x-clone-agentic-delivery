import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { NavigationProvider } from "../context/NavigationContext";
import { TweetBox } from "../components/TweetBox";
import { Home } from "../components/Home";

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  username: "testuser",
  name: "Test User",
  bio: "My bio",
  avatarUrl: "http://avatar.url",
  createdAt: new Date().toISOString(),
};

const authResponse = {
  user: mockUser,
};

function createFetchMock(tweetsResponse: unknown) {
  return vi.fn().mockImplementation((url: string) => {
    if (url === "/api/auth/me") {
      return Promise.resolve({
        ok: true,
        json: async () => authResponse,
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

describe("TweetBox Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem("token", "fake-jwt");
    localStorage.setItem("user", JSON.stringify(mockUser));
    window.scrollTo = vi.fn();
  });

  it("should render the textarea and post button", () => {
    render(
      <TestWrapper>
        <TweetBox onTweetCreated={vi.fn()} />
      </TestWrapper>
    );

    expect(
      screen.getByPlaceholderText("What is happening?!")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /post/i })).toBeInTheDocument();
  });

  it("should have the post button disabled when textarea is empty", () => {
    render(
      <TestWrapper>
        <TweetBox onTweetCreated={vi.fn()} />
      </TestWrapper>
    );

    expect(screen.getByRole("button", { name: /post/i })).toBeDisabled();
  });

  it("should enable the post button when text is entered", () => {
    render(
      <TestWrapper>
        <TweetBox onTweetCreated={vi.fn()} />
      </TestWrapper>
    );

    fireEvent.change(screen.getByPlaceholderText("What is happening?!"), {
      target: { value: "Hello, world!" },
    });

    expect(screen.getByRole("button", { name: /post/i })).not.toBeDisabled();
  });

  it("should show character count when typing", () => {
    render(
      <TestWrapper>
        <TweetBox onTweetCreated={vi.fn()} />
      </TestWrapper>
    );

    fireEvent.change(screen.getByPlaceholderText("What is happening?!"), {
      target: { value: "Hello" },
    });

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should show warning color at 260 characters", () => {
    render(
      <TestWrapper>
        <TweetBox onTweetCreated={vi.fn()} />
      </TestWrapper>
    );

    const text = "A".repeat(260);
    fireEvent.change(screen.getByPlaceholderText("What is happening?!"), {
      target: { value: text },
    });

    const counter = screen.getByText("260");
    expect(counter.classList.contains("warning")).toBe(true);
  });

  it("should show negative count and disable button beyond 280 characters", () => {
    render(
      <TestWrapper>
        <TweetBox onTweetCreated={vi.fn()} />
      </TestWrapper>
    );

    const text = "A".repeat(285);
    fireEvent.change(screen.getByPlaceholderText("What is happening?!"), {
      target: { value: text },
    });

    expect(screen.getByText("-5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /post/i })).toBeDisabled();
  });

  it("should submit a tweet and clear the textarea on success", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/auth/me") {
        return Promise.resolve({
          ok: true,
          json: async () => authResponse,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ id: "tweet-1", text: "New tweet" }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const onTweetCreated = vi.fn();

    render(
      <TestWrapper>
        <TweetBox onTweetCreated={onTweetCreated} />
      </TestWrapper>
    );

    fireEvent.change(screen.getByPlaceholderText("What is happening?!"), {
      target: { value: "New tweet" },
    });
    fireEvent.click(screen.getByRole("button", { name: /post/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/tweets", expect.any(Object));
      expect(onTweetCreated).toHaveBeenCalled();
    });

    expect(
      (screen.getByPlaceholderText("What is happening?!") as HTMLTextAreaElement)
        .value
    ).toBe("");
  });
});

describe("Home Tweet Feed", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem("token", "fake-jwt");
    localStorage.setItem("user", JSON.stringify(mockUser));
    window.scrollTo = vi.fn();
  });

  it("should render tweet cards from API response", async () => {
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
      },
    ];

    vi.stubGlobal("fetch", createFetchMock(mockTweets));

    render(<Home />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText("First tweet")).toBeInTheDocument();
      expect(screen.getByText("Second tweet")).toBeInTheDocument();
    });
  });

  it("should show delete button only on own tweets", async () => {
    const mockTweets = [
      {
        id: "tweet-1",
        text: "Own tweet",
        userId: "user-1",
        createdAt: new Date().toISOString(),
        user: {
          id: "user-1",
          username: "testuser",
          name: "Test User",
          avatarUrl: null,
        },
      },
      {
        id: "tweet-2",
        text: "Other tweet",
        userId: "user-2",
        createdAt: new Date().toISOString(),
        user: {
          id: "user-2",
          username: "other",
          name: "Other",
          avatarUrl: null,
        },
      },
    ];

    vi.stubGlobal("fetch", createFetchMock(mockTweets));

    render(<Home />, { wrapper: TestWrapper });

    await waitFor(() => {
      const deleteButtons = screen.getAllByText("Delete");
      expect(deleteButtons).toHaveLength(1);
    });
  });

  it("should delete a tweet optimistically when delete is clicked", async () => {
    const mockTweets = [
      {
        id: "tweet-1",
        text: "Tweet to delete",
        userId: "user-1",
        createdAt: new Date().toISOString(),
        user: {
          id: "user-1",
          username: "testuser",
          name: "Test User",
          avatarUrl: null,
        },
      },
    ];

    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      callCount++;
      if (url === "/api/auth/me") {
        return Promise.resolve({
          ok: true,
          json: async () => authResponse,
        });
      }
      if (url.startsWith("/api/tweets/")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ message: "Deleted" }),
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
      expect(screen.getByText("Tweet to delete")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(screen.queryByText("Tweet to delete")).not.toBeInTheDocument();
    });
  });
});
