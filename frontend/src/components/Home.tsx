import React from "react";
import { useAuth } from "../context/AuthContext";

export const Home: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      <header className="main-header">
        <h1 className="main-header-title">Home</h1>
      </header>
      <div style={{ padding: "16px" }}>
        <h2 style={{ marginBottom: "8px" }}>Welcome, {user?.name}!</h2>
        <p style={{ color: "#71767b" }}>This is your home timeline. Tweet feed will appear here in Phase 3.</p>
      </div>
    </div>
  );
};
