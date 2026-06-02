import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "../context/NavigationContext";

interface ProfileUser {
  id: string;
  username: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

interface ProfileData {
  user: ProfileUser;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}

interface ListUser {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
}

type FollowListType = "followers" | "following";

export const Profile: React.FC = () => {
  const { user: currentUser, token } = useAuth();
  const { viewParams, navigateTo } = useNavigation();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [listType, setListType] = useState<FollowListType | null>(null);
  const [listUsers, setListUsers] = useState<ListUser[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const profileUserId = viewParams?.userId || currentUser?.id;

  useEffect(() => {
    if (!token || !profileUserId) return;
    setLoading(true);
    fetch(`/api/users/${profileUserId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) setProfile(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token, profileUserId]);

  const handleFollowToggle = async () => {
    if (!token || !profile) return;
    setFollowLoading(true);
    const endpoint = profile.isFollowing ? "unfollow" : "follow";
    try {
      const res = await fetch(`/api/users/${profile.user.id}/${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile((prev) =>
          prev ? { ...prev, isFollowing: !prev.isFollowing, followersCount: data.followersCount } : prev
        );
      }
    } catch (err) {
      console.error("Follow toggle error:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const openList = async (type: FollowListType) => {
    if (!token || !profile) return;
    setListType(type);
    setListLoading(true);
    try {
      const res = await fetch(`/api/users/${profile.user.id}/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setListUsers(data);
      }
    } catch (err) {
      console.error(`List ${type} error:`, err);
    } finally {
      setListLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <header className="main-header">
          <h1 className="main-header-title">Profile</h1>
        </header>
        <div className="feed-placeholder">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div>
        <header className="main-header">
          <h1 className="main-header-title">Profile</h1>
        </header>
        <div className="feed-placeholder">User not found</div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.user.id;

  return (
    <div>
      <header className="main-header">
        <h1 className="main-header-title">Profile</h1>
      </header>

      <div className="profile-header">
        <div className="profile-banner" />
        <div className="profile-avatar-section">
          <img
            className="profile-large-avatar"
            src={profile.user.avatarUrl ?? "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"}
            alt={profile.user.name}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png";
            }}
          />
          {!isOwnProfile && (
            <button
              className={`follow-btn ${profile.isFollowing ? "following" : ""}`}
              onClick={handleFollowToggle}
              disabled={followLoading}
            >
              {followLoading ? "..." : profile.isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </div>

        <div className="profile-info-section">
          <h2 className="profile-name">{profile.user.name}</h2>
          <span className="profile-username">@{profile.user.username}</span>
          {profile.user.bio && <p className="profile-bio">{profile.user.bio}</p>}
        </div>

        <div className="profile-stats">
          <button className="profile-stat-btn" onClick={() => openList("following")}>
            <strong>{profile.followingCount}</strong> Following
          </button>
          <button className="profile-stat-btn" onClick={() => openList("followers")}>
            <strong>{profile.followersCount}</strong> Followers
          </button>
        </div>
      </div>

      {listType && (
        <div className="modal-overlay" onClick={() => setListType(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{listType === "followers" ? "Followers" : "Following"}</h3>
              <button className="modal-close-btn" onClick={() => setListType(null)}>X</button>
            </div>
            <div className="modal-body">
              {listLoading ? (
                <div className="feed-placeholder">Loading...</div>
              ) : listUsers.length === 0 ? (
                <div className="feed-placeholder">No {listType} yet</div>
              ) : (
                listUsers.map((u) => (
                  <div
                    key={u.id}
                    className="list-user-item"
                    onClick={() => {
                      setListType(null);
                      navigateTo("profile", { userId: u.id });
                    }}
                  >
                    <img
                      className="list-user-avatar"
                      src={u.avatarUrl ?? "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"}
                      alt={u.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png";
                      }}
                    />
                    <div className="list-user-info">
                      <span className="list-user-name">{u.name}</span>
                      <span className="list-user-handle">@{u.username}</span>
                      {u.bio && <p className="list-user-bio">{u.bio}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
