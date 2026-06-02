import React, { useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NavigationProvider, useNavigation } from "./context/NavigationContext";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { Layout } from "./components/Layout";
import { Home } from "./components/Home";
import { Profile } from "./components/Profile";
import { Search } from "./components/Search";

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const { currentView, navigateTo } = useNavigation();

  // Navigation Guard / Route Protection
  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Force non-logged in users to login or register views
      if (currentView !== "login" && currentView !== "register") {
        navigateTo("login");
      }
    } else {
      // Force logged in users out of login/register pages
      if (currentView === "login" || currentView === "register") {
        navigateTo("home");
      }
    }
  }, [user, loading, currentView]);

  if (loading) {
    return (
      <div style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000000",
        color: "#e7e9ea"
      }}>
        <div style={{ textAlign: "center" }}>
          {/* Twitter/X sleek logo spinner */}
          <svg viewBox="0 0 24 24" aria-hidden="true" style={{
            fill: "#e7e9ea",
            width: "50px",
            height: "50px",
            animation: "pulse 1.5s infinite ease-in-out"
          }}>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
          </svg>
          <style>{`
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.1); opacity: 0.5; }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Unauthenticated Views
  if (!user) {
    if (currentView === "register") {
      return <Register />;
    }
    return <Login />;
  }

  // Authenticated Views (wrapped in Layout)
  const renderContentView = () => {
    switch (currentView) {
      case "home":
        return <Home />;
      case "profile":
        return <Profile />;
      case "search":
        return <Search />;
      default:
        return <Home />;
    }
  };

  return <Layout>{renderContentView()}</Layout>;
};

function App() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <AppContent />
      </NavigationProvider>
    </AuthProvider>
  );
}

export default App;
