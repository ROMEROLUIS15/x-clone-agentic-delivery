import React from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigation, ViewType } from "../context/NavigationContext";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { currentView, navigateTo } = useNavigation();

  if (!user) return <>{children}</>;

  const navItems: { view: ViewType; label: string; icon: string }[] = [
    { view: "home", label: "Home", icon: "🏠" },
    { view: "search", label: "Search", icon: "🔍" },
    { view: "profile", label: "Profile", icon: "👤" },
  ];

  return (
    <div className="app-layout">
      {/* Left Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo" onClick={() => navigateTo("home")}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
          </svg>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <div
              key={item.view}
              className={`nav-item ${currentView === item.view ? "active" : ""}`}
              onClick={() =>
                item.view === "profile"
                  ? navigateTo("profile", { userId: user.id })
                  : navigateTo(item.view)
              }
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.label}</span>
            </div>
          ))}

          <div className="nav-item" onClick={logout} style={{ marginTop: "12px", color: "#f4212e" }}>
            <span className="nav-icon" style={{ filter: "grayscale(0)" }}>🚪</span>
            <span className="nav-text">Log out</span>
          </div>
        </nav>

        {/* User profile section in sidebar bottom */}
        <div
          className="sidebar-profile"
          onClick={() => navigateTo("profile", { userId: user.id })}
        >
          <img
            className="profile-avatar"
            src={user.avatarUrl}
            alt={user.name}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png";
            }}
          />
          <div className="profile-info">
            <span className="profile-name">{user.name}</span>
            <span className="profile-handle">@{user.username}</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">{children}</main>

      {/* Right Sidebar (Trends/Search placeholder) */}
      <aside className="right-sidebar">
        <div style={{
          backgroundColor: "#16181c",
          borderRadius: "16px",
          padding: "16px",
          border: "1px solid #2f3336",
          marginTop: "12px"
        }}>
          <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "12px" }}>What's happening</h2>
          <p style={{ color: "#71767b", fontSize: "14px", marginBottom: "8px" }}>#AgenticCoding Challenge</p>
          <p style={{ color: "#71767b", fontSize: "14px", marginBottom: "8px" }}>#TwitterClone</p>
          <p style={{ color: "#71767b", fontSize: "14px" }}>#PrismaSQLite</p>
        </div>
      </aside>
    </div>
  );
};
