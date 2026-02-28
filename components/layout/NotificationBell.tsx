"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, CheckCircle2, XCircle, AlertTriangle, Car, UserPlus, UserMinus, Clock, Navigation } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  getNotifications,
  getUnreadCount,
  markNotificationAsRead,
} from "@/lib/actions/notifications";

interface Notification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: Date | string;
  rideId: string | null;
}

const typeIcon: Record<string, typeof Bell> = {
  request_accepted: CheckCircle2,
  request_rejected: XCircle,
  ride_cancelled: AlertTriangle,
  ride_completed: Car,
  ride_request: UserPlus,
  rider_kicked: UserMinus,
  reminder_24h: Clock,
  reminder_2h: Clock,
  departure: Navigation,
};

const typeColor: Record<string, string> = {
  request_accepted: "text-emerald-500",
  request_rejected: "text-red-500",
  ride_cancelled: "text-amber-500",
  ride_completed: "text-blue-500",
  ride_request: "text-purple-500",
  rider_kicked: "text-red-500",
  reminder_24h: "text-amber-500",
  reminder_2h: "text-orange-500",
  departure: "text-clemson-orange",
};

const POLL_INTERVAL = 30_000;

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch unread count on mount + poll
  const fetchCount = useCallback(async () => {
    const count = await getUnreadCount();
    setUnreadCount(count);
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Load full notifications when dropdown opens
  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      const data = await getNotifications();
      setItems(data as Notification[]);
      setLoaded(true);
    }
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  async function handleMarkRead(id: string) {
    await markNotificationAsRead(id);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-clemson-orange px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl z-50">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Notifications
            </h3>
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {items.map((item) => {
                const Icon = typeIcon[item.type] ?? Bell;
                const color = typeColor[item.type] ?? "text-gray-400";
                const createdAt =
                  typeof item.createdAt === "string"
                    ? new Date(item.createdAt)
                    : item.createdAt;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => !item.read && handleMarkRead(item.id)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                      item.read
                        ? "bg-white"
                        : "bg-clemson-orange/5 hover:bg-clemson-orange/10"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 mt-0.5 shrink-0 ${color}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm ${
                          item.read
                            ? "text-gray-500"
                            : "text-gray-900 font-medium"
                        }`}
                      >
                        {item.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDistanceToNow(createdAt, {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    {!item.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-clemson-orange" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
