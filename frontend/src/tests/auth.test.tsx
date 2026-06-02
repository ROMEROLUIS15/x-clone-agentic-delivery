// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { NavigationProvider, useNavigation } from "../context/NavigationContext";
import { Login } from "../components/Login";
import { Register } from "../components/Register";

// Helper components to inspect context state in tests
const InspectContext: React.FC = () => {
  const { user } = useAuth();
  const { currentView } = useNavigation();
  return (
    <div data-testid="context-state">
      <span data-testid="user">{user ? user.username : "null"}</span>
      <span data-testid="view">{currentView}</span>
    </div>
  );
};

describe("Frontend Auth Integration Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    window.scrollTo = vi.fn();
  });

  describe("Login Component", () => {
    it("should render login form inputs and buttons", () => {
      render(
        <AuthProvider>
          <NavigationProvider>
            <Login />
          </NavigationProvider>
        </AuthProvider>
      );

      expect(screen.getByLabelText(/email or username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
    });

    it("should submit credentials and navigate to home on successful login", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        username: "testuser",
        name: "Test User",
        bio: "My bio",
        avatarUrl: "http://avatar.url",
        createdAt: new Date().toISOString(),
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: "jwt-token-123", user: mockUser }),
      });
      vi.stubGlobal("fetch", fetchMock);

      render(
        <AuthProvider>
          <NavigationProvider>
            <Login />
            <InspectContext />
          </NavigationProvider>
        </AuthProvider>
      );

      fireEvent.change(screen.getByLabelText(/email or username/i), {
        target: { value: "testuser" },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: "password123" },
      });

      fireEvent.click(screen.getByRole("button", { name: /log in/i }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith("/api/auth/login", expect.any(Object));
        expect(screen.getByTestId("user")).toHaveTextContent("testuser");
        expect(screen.getByTestId("view")).toHaveTextContent("home");
      });
    });

    it("should show client-side error when fields are empty on submit", async () => {
      render(
        <AuthProvider>
          <NavigationProvider>
            <Login />
          </NavigationProvider>
        </AuthProvider>
      );

      fireEvent.submit(screen.getByRole("button", { name: /log in/i }).closest("form")!);

      expect(await screen.findByText(/please fill in all fields/i)).toBeInTheDocument();
    });

    it("should navigate to register page when sign up link is clicked", () => {
      render(
        <AuthProvider>
          <NavigationProvider>
            <Login />
            <InspectContext />
          </NavigationProvider>
        </AuthProvider>
      );

      fireEvent.click(screen.getByText(/sign up/i));

      expect(screen.getByTestId("view")).toHaveTextContent("register");
    });

    it("should display error message on invalid credentials", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Invalid email/username or password" }),
      });
      vi.stubGlobal("fetch", fetchMock);

      render(
        <AuthProvider>
          <NavigationProvider>
            <Login />
          </NavigationProvider>
        </AuthProvider>
      );

      fireEvent.change(screen.getByLabelText(/email or username/i), {
        target: { value: "wronguser" },
      });
      fireEvent.change(screen.getByLabelText(/password/i), {
        target: { value: "wrongpass" },
      });

      fireEvent.click(screen.getByRole("button", { name: /log in/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid email\/username or password/i)).toBeInTheDocument();
      });
    });
  });

  describe("Register Component", () => {
    it("should render registration inputs", () => {
      render(
        <AuthProvider>
          <NavigationProvider>
            <Register />
          </NavigationProvider>
        </AuthProvider>
      );

      expect(screen.getByLabelText(/^name \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^email \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^username \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/bio/i)).toBeInTheDocument();
    });

    it("should show client-side error when required fields are missing on register", async () => {
      render(
        <AuthProvider>
          <NavigationProvider>
            <Register />
          </NavigationProvider>
        </AuthProvider>
      );

      fireEvent.submit(screen.getByRole("button", { name: /sign up/i }).closest("form")!);

      expect(await screen.findByText(/please fill in all required fields/i)).toBeInTheDocument();
    });

    it("should show error for short username on register", () => {
      render(
        <AuthProvider>
          <NavigationProvider>
            <Register />
          </NavigationProvider>
        </AuthProvider>
      );

      fireEvent.change(screen.getByLabelText(/^username \*/i), {
        target: { value: "ab" },
      });
      fireEvent.change(screen.getByLabelText(/^name \*/i), {
        target: { value: "Test User" },
      });
      fireEvent.change(screen.getByLabelText(/^email \*/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/^password \*/i), {
        target: { value: "password123" },
      });

      fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

      expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument();
    });

    it("should show error for short password on register", () => {
      render(
        <AuthProvider>
          <NavigationProvider>
            <Register />
          </NavigationProvider>
        </AuthProvider>
      );

      fireEvent.change(screen.getByLabelText(/^name \*/i), {
        target: { value: "Test User" },
      });
      fireEvent.change(screen.getByLabelText(/^email \*/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/^username \*/i), {
        target: { value: "testuser" },
      });
      fireEvent.change(screen.getByLabelText(/^password \*/i), {
        target: { value: "12345" },
      });

      fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

      expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
    });

    it("should show error for invalid username characters on register", () => {
      render(
        <AuthProvider>
          <NavigationProvider>
            <Register />
          </NavigationProvider>
        </AuthProvider>
      );

      fireEvent.change(screen.getByLabelText(/^name \*/i), {
        target: { value: "Test User" },
      });
      fireEvent.change(screen.getByLabelText(/^email \*/i), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/^username \*/i), {
        target: { value: "user name!" },
      });
      fireEvent.change(screen.getByLabelText(/^password \*/i), {
        target: { value: "password123" },
      });

      fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

      expect(screen.getByText(/alphanumeric characters and underscores/i)).toBeInTheDocument();
    });

    it("should navigate to login page when log in link is clicked", () => {
      render(
        <AuthProvider>
          <NavigationProvider>
            <Register />
            <InspectContext />
          </NavigationProvider>
        </AuthProvider>
      );

      fireEvent.click(screen.getByText(/log in/i));

      expect(screen.getByTestId("view")).toHaveTextContent("login");
    });

    it("should submit new user details and navigate to home on successful registration", async () => {
      const mockUser = {
        id: "new-user-id",
        email: "new@example.com",
        username: "newuser",
        name: "New User",
        bio: "Creative bio",
        avatarUrl: "http://avatar.url",
        createdAt: new Date().toISOString(),
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ token: "new-jwt-token", user: mockUser }),
      });
      vi.stubGlobal("fetch", fetchMock);

      render(
        <AuthProvider>
          <NavigationProvider>
            <Register />
            <InspectContext />
          </NavigationProvider>
        </AuthProvider>
      );

      fireEvent.change(screen.getByLabelText(/^name \*/i), {
        target: { value: "New User" },
      });
      fireEvent.change(screen.getByLabelText(/^email \*/i), {
        target: { value: "new@example.com" },
      });
      fireEvent.change(screen.getByLabelText(/^username \*/i), {
        target: { value: "newuser" },
      });
      fireEvent.change(screen.getByLabelText(/^password \*/i), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByLabelText(/bio/i), {
        target: { value: "Creative bio" },
      });

      fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith("/api/auth/register", expect.any(Object));
        expect(screen.getByTestId("user")).toHaveTextContent("newuser");
        expect(screen.getByTestId("view")).toHaveTextContent("home");
      });
    });
  });
});
