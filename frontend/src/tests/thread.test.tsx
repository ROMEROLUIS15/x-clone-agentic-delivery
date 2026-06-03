import { useEffect } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AuthProvider } from "../context/AuthContext";
import { NavigationProvider, useNavigation } from "../context/NavigationContext";
import { Thread } from "../components/Thread";

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  username: "testuser",
  name: "Test User",
  bio: null,
  avatarUrl: null,
  createdAt: new Date().toISOString(),
};

const authResponse = { user: mockUser };

interface TweetOverrides {
  id?: string;
  text?: string;
  userId?: string;
  parentId?: string | null;
  replyCount?: number;
}

function makeTweet(over: TweetOverrides = {}) {
  return {
    id: over.id ?? "tweet-1",
    text: over.text ?? "Focused tweet",
    userId: over.userId ?? "user-2",
    parentId: over.parentId ?? null,
    createdAt: new Date().toISOString(),
    user: { id: over.userId ?? "user-2", username: "author", name: "Author", avatarUrl: null },
    likesCount: 0,
    replyCount: over.replyCount ?? 0,
    liked: false,
  };
}

// Navigates to the thread view on mount, then renders the Thread component.
function ThreadHarness({ tweetId }: { tweetId: string }) {
  const { navigateTo } = useNavigation();
  useEffect(() => { navigateTo("thread", { tweetId }); }, [tweetId]);
  return <Thread />;
}

function renderThread(tweetId: string) {
  return render(
    <AuthProvider>
      <NavigationProvider>
        <ThreadHarness tweetId={tweetId} />
      </NavigationProvider>
    </AuthProvider>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.setItem("token", "fake-jwt");
  localStorage.setItem("user", JSON.stringify(mockUser));
  window.scrollTo = vi.fn();
});

describe("Thread / Replies view", () => {
  it("renders the focused tweet and its replies, with a reply composer", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/auth/me") return Promise.resolve({ ok: true, json: async () => authResponse });
      if (url.includes("/replies")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            replies: [makeTweet({ id: "reply-1", text: "A great reply", parentId: "tweet-1" })],
            total: 1, limit: 10, offset: 0,
          }),
        });
      }
      // GET /api/tweets/tweet-1
      return Promise.resolve({
        ok: true,
        json: async () => ({ tweet: makeTweet({ text: "Focused tweet" }), parent: null }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderThread("tweet-1");

    await waitFor(() => {
      expect(screen.getByText("Focused tweet")).toBeInTheDocument();
      expect(screen.getByText("A great reply")).toBeInTheDocument();
    });
    const composer = screen.getByPlaceholderText("Post your reply").closest(".tweet-box") as HTMLElement;
    expect(composer).toBeInTheDocument();
    expect(within(composer).getByRole("button", { name: /reply/i })).toBeInTheDocument();
  });

  it("renders the parent context when the focused tweet is a reply", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/auth/me") return Promise.resolve({ ok: true, json: async () => authResponse });
      if (url.includes("/replies")) {
        return Promise.resolve({ ok: true, json: async () => ({ replies: [], total: 0, limit: 10, offset: 0 }) });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          tweet: makeTweet({ id: "reply-9", text: "I am a reply", parentId: "parent-1" }),
          parent: makeTweet({ id: "parent-1", text: "I am the parent" }),
        }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderThread("reply-9");

    await waitFor(() => {
      expect(screen.getByText("I am the parent")).toBeInTheDocument();
      expect(screen.getByText("I am a reply")).toBeInTheDocument();
    });
    expect(screen.getByText("No replies yet. Be the first to reply!")).toBeInTheDocument();
  });

  it("posts a reply to the correct endpoint when the composer is submitted", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/auth/me") return Promise.resolve({ ok: true, json: async () => authResponse });
      if (url.includes("/replies") && opts?.method === "POST") {
        return Promise.resolve({ ok: true, json: async () => makeTweet({ id: "new-reply", text: "My reply", parentId: "tweet-1" }) });
      }
      if (url.includes("/replies")) {
        return Promise.resolve({ ok: true, json: async () => ({ replies: [], total: 0, limit: 10, offset: 0 }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ tweet: makeTweet(), parent: null }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderThread("tweet-1");

    await waitFor(() => expect(screen.getByPlaceholderText("Post your reply")).toBeInTheDocument());

    const composer = screen.getByPlaceholderText("Post your reply").closest(".tweet-box") as HTMLElement;
    fireEvent.change(screen.getByPlaceholderText("Post your reply"), { target: { value: "My reply" } });
    fireEvent.click(within(composer).getByRole("button", { name: /reply/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/tweets/tweet-1/replies",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("shows a not-available message when the tweet fails to load", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/auth/me") return Promise.resolve({ ok: true, json: async () => authResponse });
      return Promise.resolve({ ok: false, status: 404, json: async () => ({ error: "Tweet not found" }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    renderThread("missing");

    await waitFor(() => {
      expect(screen.getByText("This tweet is not available.")).toBeInTheDocument();
    });
  });
});
