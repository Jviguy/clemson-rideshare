"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, XCircle, AlertTriangle, Car, UserPlus, UserMinus, Clock, Navigation, MessageSquare, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { clsx } from "clsx";
import { markNotificationAsRead, getNotifications, getUnreadCount, clearAllNotifications } from "@/lib/actions/notifications";
import { useRealtime } from "@/lib/hooks/useRealtime";

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
  ride_message: MessageSquare,
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
  ride_message: "text-blue-500",
};

/** Map notification type → route to navigate to */
function getNotificationHref(item: Notification): string | null {
  if (!item.rideId) return null;

  switch (item.type) {
    case "ride_request":
    case "ride_message":
    case "request_accepted":
    case "request_rejected":
    case "ride_completed":
    case "ride_cancelled":
    case "rider_kicked":
    case "reminder_24h":
    case "reminder_2h":
    case "departure":
      return `/rides/${item.rideId}`;
    default:
      return item.rideId ? `/rides/${item.rideId}` : null;
  }
}

interface NotificationBellProps {
  isTransparent?: boolean;
}

export function NotificationBell({ isTransparent }: NotificationBellProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch notifications from server
  const fetchData = useCallback(async () => {
    try {
      const [notifs, count] = await Promise.all([
        getNotifications(),
        getUnreadCount(),
      ]);
      setItems(notifs as Notification[]);
      setUnreadCount(count);
    } catch {
      // ignore errors (not logged in, etc.)
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Connect to IoT Core — re-fetch when a notification signal arrives
  useRealtime(fetchData);

  // Polling fallback for when MQTT isn't available (dev, or IoT not deployed)
  useEffect(() => {
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  function handleToggle() {
    if (!open) {
      fetchData();
    }
    setOpen((prev) => !prev);
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

  async function handleNotificationClick(item: Notification) {
    // Mark as read
    if (!item.read) {
      await markNotificationAsRead(item.id);
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    // Navigate to relevant page
    const href = getNotificationHref(item);
    if (href) {
      setOpen(false);
      router.push(href);
    }
  }

  async function handleClearAll() {
    setClearing(true);
    await clearAllNotifications();
    setItems([]);
    setUnreadCount(0);
    setClearing(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleToggle}
        className={clsx(
          "relative rounded-lg p-2 transition-colors cursor-pointer",
          isTransparent
            ? "text-white/90 hover:text-white hover:bg-white/10"
            : "text-foreground hover:text-clemson-orange hover:bg-gray-100 dark:hover:bg-gray-800"
        )}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-clemson-orange px-1 text-[10px] font-bold text-white ring-2 ring-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-gray-200 dark:border-clemson-orange/20 bg-background shadow-xl z-50 animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-clemson-orange/20 px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">
              Notifications
            </h3>
            {items.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                disabled={clearing}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-clemson-orange/10">
              {items.map((item) => {
                const Icon = typeIcon[item.type] ?? Bell;
                const color = typeColor[item.type] ?? "text-gray-400";
                const createdAt =
                  typeof item.createdAt === "string"
                    ? new Date(item.createdAt)
                    : item.createdAt;
                const href = getNotificationHref(item);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNotificationClick(item)}
                    className={clsx(
                      "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer",
                      item.read
                        ? "bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        : "bg-clemson-orange/5 dark:bg-clemson-orange/10 hover:bg-clemson-orange/10 dark:hover:bg-clemson-orange/20"
                    )}
                  >
                    <Icon
                      className={clsx("h-4 w-4 mt-0.5 shrink-0", color)}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={clsx(
                          "text-sm",
                          item.read
                            ? "text-gray-500"
                            : "text-foreground font-medium"
                        )}
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
                    {href && (
                      <span className="mt-0.5 text-gray-300 dark:text-gray-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
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
