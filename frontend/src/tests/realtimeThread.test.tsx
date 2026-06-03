import { useEffect, act } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AuthProvider } from "../context/AuthContext";
import { NavigationProvider, useNavigation } from "../context/NavigationContext";
import { Thread } from "../components/Thread";

const mockUser = {
  id: "user-1", email: "t@e.com", username: "me", name: "Me", bio: "", avatarUrl: null, createdAt: new Date().toISOString(),
};

type Listener = (e: MessageEvent) => void;
class FakeEventSource {
  static instance: FakeEventSource | null = null;
  url: string;
  listeners = new Map<string, Set<Listener>>();
  constructor(url: string) { this.url = url; FakeEventSource.instance = this; }
  addEventListener(type: string, fn: Listener) {
    const set = this.listeners.get(type) ?? new Set(); set.add(fn); this.listeners.set(type, set);
  }
  removeEventListener(type: string, fn: Listener) { this.listeners.get(type)?.delete(fn); }
  close() {}
  emit(type: string, data: unknown) {
    this.listeners.get(type)?.forEach((fn) => fn(new MessageEvent(type, { data: JSON.stringify(data) })));
  }
}

function focusedTweet() {
  return {
    id: "focused-1", text: "Focused tweet", userId: "user-2", imageUrl: null, parentId: null,
    createdAt: new Date().toISOString(),
    user: { id: "user-2", username: "author", name: "Author", avatarUrl: null },
    likesCount: 0, replyCount: 0, liked: false,
  };
}

function ThreadHarness({ tweetId }: { tweetId: string }) {
  const { navigateTo } = useNavigation();
  useEffect(() => { navigateTo("thread", { tweetId }); }, [tweetId]);
  return <Thread />;
}

describe("Real-time — thread replies", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem("token", "fake-jwt");
    localStorage.setItem("user", JSON.stringify(mockUser));
    window.scrollTo = vi.fn();
    FakeEventSource.instance = null;
    vi.stubGlobal("EventSource", FakeEventSource);
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url === "/api/auth/me") return Promise.resolve({ ok: true, json: async () => ({ user: mockUser }) });
      if (url.includes("/replies")) return Promise.resolve({ ok: true, json: async () => ({ replies: [], total: 0, limit: 10, offset: 0 }) });
      return Promise.resolve({ ok: true, json: async () => ({ tweet: focusedTweet(), parent: null }) });
    }));
  });

  it("appends a reply live when a reply:new event arrives for the focused tweet", async () => {
    render(
      <AuthProvider>
        <NavigationProvider>
          <ThreadHarness tweetId="focused-1" />
        </NavigationProvider>
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText("Focused tweet")).toBeInTheDocument());
    expect(screen.getByText("No replies yet. Be the first to reply!")).toBeInTheDocument();

    const incoming = {
      id: "reply-live", text: "Live reply via SSE", userId: "user-3", imageUrl: null, parentId: "focused-1",
      createdAt: new Date().toISOString(),
      user: { id: "user-3", username: "carol", name: "Carol", avatarUrl: null },
      likesCount: 0, replyCount: 0, liked: false,
    };

    await act(async () => {
      FakeEventSource.instance!.emit("reply:new", incoming);
    });

    await waitFor(() => {
      expect(screen.getByText("Live reply via SSE")).toBeInTheDocument();
    });
  });

  it("ignores a reply:new event for a different thread", async () => {
    render(
      <AuthProvider>
        <NavigationProvider>
          <ThreadHarness tweetId="focused-1" />
        </NavigationProvider>
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText("Focused tweet")).toBeInTheDocument());

    await act(async () => {
      FakeEventSource.instance!.emit("reply:new", {
        id: "other", text: "Belongs elsewhere", userId: "user-9", imageUrl: null, parentId: "some-other-tweet",
        createdAt: new Date().toISOString(),
        user: { id: "user-9", username: "x", name: "X", avatarUrl: null },
        likesCount: 0, replyCount: 0, liked: false,
      });
    });

    expect(screen.queryByText("Belongs elsewhere")).not.toBeInTheDocument();
    expect(screen.getByText("No replies yet. Be the first to reply!")).toBeInTheDocument();
  });
});
