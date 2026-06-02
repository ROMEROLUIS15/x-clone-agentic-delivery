import React, { act } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AuthProvider } from "../context/AuthContext";
import { NavigationProvider } from "../context/NavigationContext";
import { Home } from "../components/Home";

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  username: "tester",
  name: "Test",
  bio: "",
  avatarUrl: null,
  createdAt: new Date().toISOString(),
};

const initialTweets = [
  {
    id: "old-1",
    text: "Older tweet",
    userId: "user-2",
    createdAt: new Date(Date.now() - 1000 * 60).toISOString(),
    user: { id: "user-2", username: "alice", name: "Alice", avatarUrl: null },
    likesCount: 0,
    liked: false,
  },
];

type Listener = (e: MessageEvent) => void;

class FakeEventSource {
  static instance: FakeEventSource | null = null;
  url: string;
  listeners = new Map<string, Set<Listener>>();
  closed = false;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instance = this;
  }
  addEventListener(type: string, fn: Listener) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(fn);
    this.listeners.set(type, set);
  }
  removeEventListener(type: string, fn: Listener) {
    this.listeners.get(type)?.delete(fn);
  }
  close() { this.closed = true; }
  emit(type: string, data: unknown) {
    this.listeners.get(type)?.forEach((fn) => fn(new MessageEvent(type, { data: JSON.stringify(data) })));
  }
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NavigationProvider>{children}</NavigationProvider>
    </AuthProvider>
  );
}

describe("Real-time — new tweets banner", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.setItem("token", "fake-jwt");
    localStorage.setItem("user", JSON.stringify(mockUser));
    window.scrollTo = vi.fn();
    FakeEventSource.instance = null;
    vi.stubGlobal("EventSource", FakeEventSource);

    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url === "/api/auth/me") {
        return Promise.resolve({ ok: true, json: async () => ({ user: mockUser }) });
      }
      if (url.includes("/api/tweets/timeline")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ tweets: initialTweets, total: 1, limit: 10, offset: 0 }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }));
  });

  it("shows the banner when a tweet:new event arrives and hides it after click", async () => {
    render(<Home />, { wrapper: Wrapper });

    await waitFor(() => expect(screen.getByText("Older tweet")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /new tweet/i })).not.toBeInTheDocument();

    const newTweet = {
      id: "new-1",
      text: "Just streamed in",
      userId: "user-3",
      createdAt: new Date().toISOString(),
      user: { id: "user-3", username: "bob", name: "Bob", avatarUrl: null },
      likesCount: 0,
      liked: false,
    };

    await act(async () => {
      FakeEventSource.instance!.emit("tweet:new", newTweet);
    });

    const banner = await screen.findByRole("button", { name: /1 new tweet/i });
    expect(banner).toBeInTheDocument();

    fireEvent.click(banner);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /new tweet/i })).not.toBeInTheDocument();
      expect(screen.getByText("Just streamed in")).toBeInTheDocument();
    });
  });

  it("pluralizes the banner label when multiple tweets arrive", async () => {
    render(<Home />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByText("Older tweet")).toBeInTheDocument());

    await act(async () => {
      FakeEventSource.instance!.emit("tweet:new", { ...initialTweets[0], id: "n-a", text: "a" });
      FakeEventSource.instance!.emit("tweet:new", { ...initialTweets[0], id: "n-b", text: "b" });
      FakeEventSource.instance!.emit("tweet:new", { ...initialTweets[0], id: "n-c", text: "c" });
    });

    expect(await screen.findByRole("button", { name: /3 new tweets/i })).toBeInTheDocument();
  });
});
