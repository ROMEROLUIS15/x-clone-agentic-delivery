import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AuthProvider } from "../context/AuthContext";
import { NavigationProvider } from "../context/NavigationContext";
import { TweetBox } from "../components/TweetBox";
import { TweetCard, Tweet } from "../components/TweetCard";

const mockUser = {
  id: "user-1",
  email: "test@example.com",
  username: "testuser",
  name: "Test User",
  bio: "",
  avatarUrl: null,
  createdAt: new Date().toISOString(),
};

const authResponse = { user: mockUser };

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NavigationProvider>{children}</NavigationProvider>
    </AuthProvider>
  );
}

function makeTweet(over: Partial<Tweet> = {}): Tweet {
  return {
    id: "tweet-1",
    text: "Hello",
    userId: "user-2",
    imageUrl: null,
    parentId: null,
    createdAt: new Date().toISOString(),
    user: { id: "user-2", username: "author", name: "Author", avatarUrl: null },
    likesCount: 0,
    replyCount: 0,
    liked: false,
    ...over,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.setItem("token", "fake-jwt");
  localStorage.setItem("user", JSON.stringify(mockUser));
  window.scrollTo = vi.fn();
});

describe("TweetBox image upload", () => {
  it("uploads a selected image, previews it, and includes imageUrl when posting", async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const fetchMock = vi.fn().mockImplementation((url: string, opts?: { body?: unknown }) => {
      calls.push({ url, body: opts?.body });
      if (url === "/api/auth/me") return Promise.resolve({ ok: true, json: async () => authResponse });
      if (url === "/api/uploads") return Promise.resolve({ ok: true, json: async () => ({ url: "/uploads/pic.png" }) });
      // POST /api/tweets
      return Promise.resolve({ ok: true, json: async () => ({ id: "new", text: "Look", imageUrl: "/uploads/pic.png" }) });
    });
    vi.stubGlobal("fetch", fetchMock);

    const onTweetCreated = vi.fn();
    render(
      <Wrapper>
        <TweetBox onTweetCreated={onTweetCreated} />
      </Wrapper>
    );

    const file = new File(["binary"], "pic.png", { type: "image/png" });
    fireEvent.change(screen.getByTestId("tweet-image-input"), { target: { files: [file] } });

    // Preview appears once the upload resolves
    await waitFor(() => {
      const preview = screen.getByAltText("Selected attachment") as HTMLImageElement;
      expect(preview.src).toContain("/uploads/pic.png");
    });

    fireEvent.change(screen.getByPlaceholderText("What is happening?!"), { target: { value: "Look" } });
    fireEvent.click(screen.getByRole("button", { name: /post/i }));

    await waitFor(() => expect(onTweetCreated).toHaveBeenCalled());

    const tweetCall = calls.find((c) => c.url === "/api/tweets");
    expect(tweetCall).toBeTruthy();
    expect(JSON.parse(tweetCall!.body as string)).toMatchObject({ text: "Look", imageUrl: "/uploads/pic.png" });
  });

  it("lets the user remove a selected image before posting", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/auth/me") return Promise.resolve({ ok: true, json: async () => authResponse });
      if (url === "/api/uploads") return Promise.resolve({ ok: true, json: async () => ({ url: "/uploads/pic.png" }) });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <Wrapper>
        <TweetBox onTweetCreated={vi.fn()} />
      </Wrapper>
    );

    const file = new File(["binary"], "pic.png", { type: "image/png" });
    fireEvent.change(screen.getByTestId("tweet-image-input"), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByAltText("Selected attachment")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /remove image/i }));
    expect(screen.queryByAltText("Selected attachment")).not.toBeInTheDocument();
  });
});

describe("TweetCard image rendering", () => {
  it("renders an image when the tweet has an imageUrl", () => {
    render(
      <Wrapper>
        <TweetCard tweet={makeTweet({ imageUrl: "/uploads/abc.png" })} onLike={vi.fn()} onDelete={vi.fn()} />
      </Wrapper>
    );
    const img = screen.getByAltText("Tweet attachment") as HTMLImageElement;
    expect(img.src).toContain("/uploads/abc.png");
  });

  it("renders no attachment image when imageUrl is null", () => {
    render(
      <Wrapper>
        <TweetCard tweet={makeTweet({ imageUrl: null })} onLike={vi.fn()} onDelete={vi.fn()} />
      </Wrapper>
    );
    expect(screen.queryByAltText("Tweet attachment")).not.toBeInTheDocument();
  });
});
