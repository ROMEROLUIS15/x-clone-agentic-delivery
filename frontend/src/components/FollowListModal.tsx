import React, { useEffect, useState } from "react";
import { useNavigation } from "../context/NavigationContext";
import { api } from "../api/client";
import { Avatar } from "./Avatar";

interface ListUser {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
}

interface FollowListModalProps {
  userId: string;
  type: "followers" | "following";
  token: string | null;
  onClose: () => void;
}

export const FollowListModal: React.FC<FollowListModalProps> = ({
  userId, type, token, onClose,
}) => {
  const { navigateTo } = useNavigation();
  const [users, setUsers] = useState<ListUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api.get<ListUser[]>(`/api/users/${userId}/${type}`, token)
      .then(setUsers)
      .catch((err) => console.error(`List ${type} error:`, err))
      .finally(() => setLoading(false));
  }, [userId, type, token]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{type === "followers" ? "Followers" : "Following"}</h3>
          <button className="modal-close-btn" onClick={onClose}>X</button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="feed-placeholder">Loading...</div>
          ) : users.length === 0 ? (
            <div className="feed-placeholder">No {type} yet</div>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                className="list-user-item"
                onClick={() => {
                  onClose();
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
  );
};
