import { act } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AuthProvider } from "../context/AuthContext";
import { NavigationProvider } from "../context/NavigationContext";
import { NotificationProvider, useNotifications } from "../context/NotificationContext";
import { Notifications } from "../components/Notifications";

const mockUser = {
  id: "user-1", email: "t@e.com", username: "me", name: "Me", bio: "", avatarUrl: null, createdAt: new Date().toISOString(),
};

type Listener = (e: MessageEvent) => void;
class FakeEventSource {
  static instance: FakeEventSource | null = null;
  url: string;
  listeners = new Map<string, Set<Listener>>();
  constructor(url: string) { this.url = url; FakeEventSource.instance = this; }
  addEventListener(t: string, fn: Listener) { const s = this.listeners.get(t) ?? new Set(); s.add(fn); this.listeners.set(t, s); }
  removeEventListener(t: string, fn: Listener) { this.listeners.get(t)?.delete(fn); }
  close() {}
  emit(t: string, data: unknown) { this.listeners.get(t)?.forEach((fn) => fn(new MessageEvent(t, { data: JSON.stringify(data) }))); }
}

function notif(over: Partial<{ id: string; type: string; actorName: string; text: string | null }> = {}) {
  return {
    id: over.id ?? "n1",
    type: over.type ?? "like",
    read: false,
    createdAt: new Date().toISOString(),
    actor: { id: "user-2", username: "alice", name: over.actorName ?? "Alice", avatarUrl: null },
    tweet: over.text === undefined ? { id: "tw-1", text: "Hello tweet" } : over.text === null ? null : { id: "tw-1", text: over.text },
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.setItem("token", "fake-jwt");
  localStorage.setItem("user", JSON.stringify(mockUser));
  window.scrollTo = vi.fn();
  FakeEventSource.instance = null;
  vi.stubGlobal("EventSource", FakeEventSource);
});

describe("NotificationProvider — live unread badge", () => {
  it("loads the initial unread count and increments on a notification:new event", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
      if (url === "/api/auth/me") return Promise.resolve({ ok: true, json: async () => ({ user: mockUser }) });
      if (url.includes("/api/notifications/unread-count")) return Promise.resolve({ ok: true, json: async () => ({ unread: 2 }) });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }));

    function Consumer() {
      const { unreadCount } = useNotifications();
      return <div data-testid="count">{unreadCount}</div>;
    }

    render(
      <AuthProvider>
        <NotificationProvider><Consumer /></NotificationProvider>
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("2"));

    await act(async () => {
      FakeEventSource.instance!.emit("notification:new", notif({ id: "n-live" }));
    });

    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("3"));
  });
});

describe("Notifications view", () => {
  it("renders the list and marks all as read on open", async () => {
    let markReadCalled = false;
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string, opts?: { method?: string }) => {
      if (url === "/api/auth/me") return Promise.resolve({ ok: true, json: async () => ({ user: mockUser }) });
      if (url.includes("/api/notifications/unread-count")) return Promise.resolve({ ok: true, json: async () => ({ unread: 2 }) });
      if (url === "/api/notifications/read" && opts?.method === "POST") { markReadCalled = true; return Promise.resolve({ ok: true, json: async () => ({}) }); }
      if (url.includes("/api/notifications")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            notifications: [
              notif({ id: "n1", type: "like", actorName: "Alice", text: "My great tweet" }),
              notif({ id: "n2", type: "follow", actorName: "Bob", text: null }),
            ],
            total: 2, unread: 2, limit: 20, offset: 0,
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }));

    render(
      <AuthProvider>
        <NavigationProvider>
          <NotificationProvider><Notifications /></NotificationProvider>
        </NavigationProvider>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("liked your tweet")).toBeInTheDocument();
      expect(screen.getByText("followed you")).toBeInTheDocument();
      expect(screen.getByText("My great tweet")).toBeInTheDocument();
    });

    await waitFor(() => expect(markReadCalled).toBe(true));
  });
});
