import React, { useState, useEffect, useRef } from "react";
import { useAuth, User } from "../context/AuthContext";
import { useNavigation } from "../context/NavigationContext";
import { api } from "../api/client";
import { Avatar } from "./Avatar";
import { FollowListModal } from "./FollowListModal";
import { UserTweetList } from "./UserTweetList";

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

type FollowListType = "followers" | "following";

export const Profile: React.FC = () => {
  const { user: currentUser, token, updateUser } = useAuth();
  const { viewParams } = useNavigation();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [listType, setListType] = useState<FollowListType | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const profileUserId = viewParams?.userId || currentUser?.id;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setAvatarUploading(true);
    try {
      const { url } = await api.upload<{ url: string }>("/api/uploads", file, token);
      const updated = await api.patch<User>("/api/users/me", { avatarUrl: url }, token);
      updateUser(updated);
      setProfile((prev) =>
        prev ? { ...prev, user: { ...prev.user, avatarUrl: updated.avatarUrl } } : prev
      );
    } catch (err) {
      console.error("Avatar update error:", err);
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (!token || !profileUserId) return;
    setLoading(true);
    api.get<ProfileData>(`/api/users/${profileUserId}`, token)
      .then((data) => setProfile(data))
      .catch((err) => console.error("Profile load error:", err))
      .finally(() => setLoading(false));
  }, [token, profileUserId]);

  const handleFollowToggle = async () => {
    if (!token || !profile) return;
    setFollowLoading(true);
    const endpoint = profile.isFollowing ? "unfollow" : "follow";
    try {
      const data = await api.post<{ followersCount: number; isFollowing: boolean }>(
        `/api/users/${profile.user.id}/${endpoint}`,
        undefined,
        token
      );
      setProfile((prev) =>
        prev ? { ...prev, isFollowing: data.isFollowing, followersCount: data.followersCount } : prev
      );
    } catch (err) {
      console.error("Follow toggle error:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <header className="main-header"><h1 className="main-header-title">Profile</h1></header>
        <div className="feed-placeholder">Loading profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div>
        <header className="main-header"><h1 className="main-header-title">Profile</h1></header>
        <div className="feed-placeholder">User not found</div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile.user.id;
  const emptyMessage = isOwnProfile
    ? "You haven't tweeted yet."
    : `@${profile.user.username} hasn't tweeted yet.`;

  return (
    <div>
      <header className="main-header">
        <h1 className="main-header-title">Profile</h1>
      </header>

      <div className="profile-header">
        <div className="profile-banner" />
        <div className="profile-avatar-section">
          <div className="profile-avatar-wrap">
            <Avatar
              src={profile.user.avatarUrl}
              alt={profile.user.name}
              className="profile-large-avatar"
            />
            {isOwnProfile && (
              <>
                <button
                  type="button"
                  className="profile-avatar-edit"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                  aria-label="Change avatar"
                >
                  {avatarUploading ? "…" : "✎"}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="tweet-box-file-input"
                  onChange={handleAvatarChange}
                  data-testid="avatar-input"
                />
              </>
            )}
          </div>
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
          <button className="profile-stat-btn" onClick={() => setListType("following")}>
            <strong>{profile.followingCount}</strong> Following
          </button>
          <button className="profile-stat-btn" onClick={() => setListType("followers")}>
            <strong>{profile.followersCount}</strong> Followers
          </button>
        </div>
      </div>

      <UserTweetList
        userId={profile.user.id}
        currentUserId={currentUser?.id}
        token={token}
        emptyMessage={emptyMessage}
      />

      {listType && (
        <FollowListModal
          userId={profile.user.id}
          type={listType}
          token={token}
          onClose={() => setListType(null)}
        />
      )}
    </div>
  );
};
