import React from "react";
import { useAuth } from "../context/AuthContext";

export const Profile: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      <header className="main-header">
        <h1 className="main-header-title">Profile</h1>
      </header>
      <div style={{ padding: "16px" }}>
        <h2 style={{ marginBottom: "8px" }}>{user?.name}</h2>
        <p style={{ color: "#71767b", marginBottom: "16px" }}>@{user?.username}</p>
        <p style={{ marginBottom: "16px" }}>{user?.bio || "No bio yet"}</p>
        <img
          src={user?.avatarUrl}
          alt={user?.name}
          style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "2px solid #2f3336" }}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png";
          }}
        />
      </div>
    </div>
  );
};
