"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Friend from "@/app/types/friend";
import {
  acceptFriendRequest,
  getFriends,
  getUserFriendRequests,
} from "@/app/lib/friend";
import Avatar from "./Avatar";

export default function FriendsPanel() {
  const { getToken, userId } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<Friend[]>([]);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const token = await getToken();
        const friendsData = await getFriends(token);
        const requestsData = await getUserFriendRequests(token);
        setFriends(friendsData);
        setRequests(requestsData);
        setStatus("done");
      } catch (e) {
        console.error("FriendsPanel fetch error:", e);
        setStatus("error");
      }
    })();
  }, [userId]);

  async function handleAccept(req: Friend) {
    if (!userId) return;
    try {
      const token = await getToken();
      await acceptFriendRequest(
        { receiverId: userId, status: "ACCEPTED" },
        req.id,
        token,
      );
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      setFriends((prev) => [...prev, { ...req, status: "ACCEPTED" }]);
    } catch (e) {
      console.error("Accept friend error:", e);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-8 rounded-lg bg-muted/10 animate-pulse" />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return <p className="text-xs text-muted py-2">Could not load friends.</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {requests.length > 0 && (
        <section>
          <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
            Requests · {requests.length}
          </h3>
          <div className="flex flex-col gap-2">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex flex-col gap-2 p-3 rounded-xl border border-muted/20 bg-background"
              >
                <div className="flex items-center gap-2">
                  <Avatar
                    userName={req.otherUser?.userName ?? "?"}
                    profileImg={req.otherUser?.profileImg}
                    size="sm"
                  />
                  <span className="text-sm font-medium text-foreground">
                    {req.otherUser?.userName ?? "Unknown"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(req)}
                    className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-primary text-white hover:opacity-90 transition-opacity"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() =>
                      setRequests((prev) => prev.filter((r) => r.id !== req.id))
                    }
                    className="flex-1 py-1.5 text-xs font-medium rounded-lg border border-muted/20 text-muted hover:bg-muted/10 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
          Friends · {friends.length}
        </h3>
        {friends.length === 0 ? (
          <p className="text-xs text-muted py-2">
            No friends yet. Start connecting!
          </p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {friends.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-2 py-1.5 px-1 rounded-lg hover:bg-muted/10 transition-colors"
              >
                <Avatar
                  userName={f.otherUser?.userName ?? "?"}
                  profileImg={f.otherUser?.profileImg}
                  size="sm"
                />
                <span className="text-sm text-foreground flex-1 min-w-0 truncate">
                  {f.otherUser?.userName ?? "Unknown"}
                </span>
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
