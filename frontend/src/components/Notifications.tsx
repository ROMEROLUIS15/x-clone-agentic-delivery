import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "../context/NavigationContext";
import { useNotifications } from "../context/NotificationContext";
import { useEventStream, NotificationItem } from "../api/useEventStream";
import { api } from "../api/client";
import { Avatar } from "./Avatar";

interface NotificationsResponse {
  notifications: NotificationItem[];
  total: number;
  unread: number;
  limit: number;
  offset: number;
}

const PAGE_SIZE = 20;

const MESSAGES: Record<NotificationItem["type"], string> = {
  like: "liked your tweet",
  follow: "followed you",
  reply: "replied to your tweet",
};

export const Notifications: React.FC = () => {
  const { token } = useAuth();
  const { navigateTo } = useNavigation();
  const { markAllRead } = useNotifications();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.get<NotificationsResponse>(`/api/notifications?limit=${PAGE_SIZE}&offset=0`, token);
      setItems(data.notifications);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // On entering the view: load the list and clear the unread badge.
  useEffect(() => {
    load();
    markAllRead();
  }, [load, markAllRead]);

  // Live: prepend notifications that arrive while the view is open.
  useEventStream("/api/tweets/timeline/stream", token, {
    onNotification: (n) => {
      setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]));
    },
  });

  const open = (n: NotificationItem) => {
    if (n.type === "follow") {
      navigateTo("profile", { userId: n.actor.id });
    } else if (n.tweet) {
      navigateTo("thread", { tweetId: n.tweet.id });
    }
  };

  return (
    <div>
      <header className="main-header">
        <h1 className="main-header-title">Notifications</h1>
      </header>

      <div className="notification-list">
        {loading ? (
          <div className="feed-placeholder">Loading notifications...</div>
        ) : items.length === 0 ? (
          <div className="feed-placeholder">
            <p>No notifications yet. Interactions with your tweets will show up here.</p>
          </div>
        ) : (
          items.map((n) => (
            <article
              key={n.id}
              className={`notification-item ${n.read ? "" : "unread"}`}
              onClick={() => open(n)}
            >
              <div className="notification-avatar">
                <Avatar src={n.actor.avatarUrl} alt={n.actor.name} />
              </div>
              <div className="notification-body">
                <p className="notification-text">
                  <span className="notification-actor">{n.actor.name}</span>{" "}
                  <span className="notification-action">{MESSAGES[n.type]}</span>
                </p>
                {n.tweet && <p className="notification-preview">{n.tweet.text}</p>}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};
