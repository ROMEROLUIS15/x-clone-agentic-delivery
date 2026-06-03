import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { api } from "../api/client";
import { useEventStream } from "../api/useEventStream";

interface NotificationContextType {
  unreadCount: number;
  refreshUnread: () => void;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

/**
 * Owns the global unread-notification count. Subscribes to the user's personal
 * topic so the badge stays live on every view (the home stream is only mounted
 * on Home, so the badge needs its own persistent subscription).
 */
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!token) {
      setUnreadCount(0);
      return;
    }
    try {
      const { unread } = await api.get<{ unread: number }>("/api/notifications/unread-count", token);
      setUnreadCount(unread);
    } catch (err) {
      console.error("Failed to load unread count:", err);
    }
  }, [token]);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  useEventStream("/api/tweets/timeline/stream", token, {
    onNotification: () => setUnreadCount((c) => c + 1),
  });

  const markAllRead = useCallback(async () => {
    if (!token) return;
    setUnreadCount(0);
    try {
      await api.post("/api/notifications/read", {}, token);
    } catch (err) {
      console.error("Failed to mark notifications read:", err);
    }
  }, [token]);

  return (
    <NotificationContext.Provider value={{ unreadCount, refreshUnread, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
