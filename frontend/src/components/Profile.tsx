import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "../context/NavigationContext";
import { api } from "../api/client";
import { Avatar } from "./Avatar";
import { TweetCard, Tweet } from "./TweetCard";

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

interface UserTweetsResponse {
  tweets: Tweet[];
  total: number;
  limit: number;
  offset: number;
}

type FollowListType = "followers" | "following";

const TWEETS_PAGE_SIZE = 10;

export const Profile: React.FC = () => {
  const { user: currentUser, token } = useAuth();
  const { viewParams, navigateTo } = useNavigation();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [listType, setListType] = useState<FollowListType | null>(null);
  const [listUsers, setListUsers] = useState<ListUser[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [tweetsTotal, setTweetsTotal] = useState(0);
  const [tweetsLoading, setTweetsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const profileUserId = viewParams?.userId || currentUser?.id;

  useEffect(() => {
    if (!token || !profileUserId) return;
    setLoading(true);
    api.get<ProfileData>(`/api/users/${profileUserId}`, token)
      .then((data) => setProfile(data))
      .catch((err) => console.error("Profile load error:", err))
      .finally(() => setLoading(false));
  }, [token, profileUserId]);

  const fetchUserTweets = useCallback(async (offset: number): Promise<UserTweetsResponse | null> => {
    if (!token || !profileUserId) return null;
    try {
      return await api.get<UserTweetsResponse>(
        `/api/users/${profileUserId}/tweets?limit=${TWEETS_PAGE_SIZE}&offset=${offset}`,
        token
      );
    } catch (err) {
      console.error("Failed to fetch user tweets:", err);
      return null;
    }
  }, [token, profileUserId]);

  useEffect(() => {
    if (!profileUserId) return;
    setTweetsLoading(true);
    setTweets([]);
    setTweetsTotal(0);
    fetchUserTweets(0).then((data) => {
      if (data) {
        setTweets(data.tweets);
        setTweetsTotal(data.total);
      }
      setTweetsLoading(false);
    });
  }, [profileUserId, fetchUserTweets]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const data = await fetchUserTweets(tweets.length);
    if (data && data.tweets.length > 0) {
      setTweets((prev) => [...prev, ...data.tweets]);
    }
    setLoadingMore(false);
  };

  const handleFollowToggle = async () => {
    if (!token || !profile) return;
    setFollowLoading(true);
    const endpoint = profile.isFollowing ? "unfollow" : "follow";
    try {
      const data = await api.post<{ followersCount: number }>(
        `/api/users/${profile.user.id}/${endpoint}`,
        undefined,
        token
      );
      setProfile((prev) =>
        prev ? { ...prev, isFollowing: !prev.isFollowing, followersCount: data.followersCount } : prev
      );
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
      const data = await api.get<ListUser[]>(`/api/users/${profile.user.id}/${type}`, token);
      setListUsers(data);
    } catch (err) {
      console.error(`List ${type} error:`, err);
    } finally {
      setListLoading(false);
    }
  };

  const handleLike = async (tweetId: string, currentlyLiked: boolean) => {
    if (!token) return;
    const endpoint = currentlyLiked ? "unlike" : "like";
    try {
      const data = await api.post<{ likesCount: number; liked: boolean }>(
        `/api/tweets/${tweetId}/${endpoint}`,
        undefined,
        token
      );
      setTweets((prev) =>
        prev.map((t) =>
          t.id === tweetId ? { ...t, likesCount: data.likesCount, liked: data.liked } : t
        )
      );
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  const handleDelete = async (tweetId: string) => {
    if (!token) return;
    try {
      await api.delete(`/api/tweets/${tweetId}`, token);
      setTweets((prev) => prev.filter((t) => t.id !== tweetId));
      setTweetsTotal((prev) => prev - 1);
    } catch (err) {
      console.error("Failed to delete tweet:", err);
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

  return (
    <div>
      <header className="main-header">
        <h1 className="main-header-title">Profile</h1>
      </header>

      <div className="profile-header">
        <div className="profile-banner" />
        <div className="profile-avatar-section">
          <Avatar
            src={profile.user.avatarUrl}
            alt={profile.user.name}
            className="profile-large-avatar"
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

      <div className="tweet-feed" data-testid="profile-tweets">
        <div className="profile-tweets-header">
          <h3>Tweets</h3>
        </div>
        {tweetsLoading ? (
          <div className="feed-placeholder">Loading tweets...</div>
        ) : tweets.length === 0 ? (
          <div className="feed-placeholder">
            {isOwnProfile ? "You haven't tweeted yet." : `@${profile.user.username} hasn't tweeted yet.`}
          </div>
        ) : (
          <>
            {tweets.map((tweet) => (
              <TweetCard
                key={tweet.id}
                tweet={tweet}
                currentUserId={currentUser?.id}
                onLike={handleLike}
                onDelete={handleDelete}
              />
            ))}
            {tweets.length < tweetsTotal && (
              <div className="load-more-container">
                <button className="load-more-btn" onClick={handleLoadMore} disabled={loadingMore}>
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
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
                    <Avatar src={u.avatarUrl} alt={u.name} className="list-user-avatar" />
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
