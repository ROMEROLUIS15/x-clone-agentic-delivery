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

  const navItems: { view: ViewType; label: string; icon: React.ReactNode }[] = [
    {
      view: "home", label: "Home",
      icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M21.591 7.146L12.52 1.157c-.316-.21-.724-.21-1.04 0l-9.071 5.99c-.26.173-.409.456-.409.757v13.183c0 .502.418.913.929.913h5.8a.93.93 0 00.929-.913v-7.075h3.684v7.075c0 .502.418.913.929.913h5.8a.93.93 0 00.929-.913V7.903c0-.3-.15-.584-.409-.757z"/></svg>
    },
    {
      view: "search", label: "Search",
      icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z"/></svg>
    },
    {
      view: "profile", label: "Profile",
      icon: <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M5.651 19h12.698c-.337-1.8-1.023-3.21-1.945-4.19C15.318 13.65 13.838 13 12 13s-3.317.65-4.404 1.81c-.922.98-1.608 2.39-1.945 4.19zm.486-5.56C7.627 11.85 9.648 11 12 11s4.373.85 5.863 2.44c1.477 1.58 2.366 3.8 2.632 6.46l.11 1.1H3.395l.11-1.1c.266-2.66 1.155-4.88 2.632-6.46zM12 4c1.105 0 2 .9 2 2s-.895 2-2 2-2-.9-2-2 .895-2 2-2zm0-2c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"/></svg>
    },
  ];

  return (
    <div className="app-layout">
      {/* Left Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo" onClick={() => navigateTo("home")}>
          <svg viewBox="0 0 24 24" aria-hidden="true" width="28" height="28" fill="currentColor">
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

          <div className="nav-item nav-logout" onClick={logout}>
            <span className="nav-icon">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M5 11h13.586l-3.293-3.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L18.586 13H5a1 1 0 110-2z"/></svg>
            </span>
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

      {/* Right Sidebar */}
      <aside className="right-sidebar">
        <div className="right-sidebar-search">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--text-secondary)" className="right-sidebar-search-icon">
            <path d="M10.25 3.75c-3.59 0-6.5 2.91-6.5 6.5s2.91 6.5 6.5 6.5c1.795 0 3.419-.726 4.596-1.904 1.178-1.177 1.904-2.801 1.904-4.596 0-3.59-2.91-6.5-6.5-6.5zm-8.5 6.5c0-4.694 3.806-8.5 8.5-8.5s8.5 3.806 8.5 8.5c0 1.986-.682 3.815-1.824 5.262l4.781 4.781-1.414 1.414-4.781-4.781c-1.447 1.142-3.276 1.824-5.262 1.824-4.694 0-8.5-3.806-8.5-8.5z"/>
          </svg>
          <input
            className="right-sidebar-search-input"
            type="text"
            placeholder="Search"
            onClick={() => navigateTo("search")}
            readOnly
          />
        </div>
        <div className="right-sidebar-card">
          <h2>What's happening</h2>
          <p>#AgenticCoding Challenge</p>
          <p>#TwitterClone</p>
          <p>#PrismaSQLite</p>
        </div>
      </aside>
    </div>
  );
};
