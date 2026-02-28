"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
  MapPin,
  Calendar,
  Users,
  DollarSign,
  User,
  Mail,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  AlertTriangle,
  MessageSquare,
  UserMinus,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { RideMap } from "@/components/maps/RideMap";
import { LocationSearch } from "@/components/maps/LocationSearch";
import {
  requestToJoinRide,
  acceptRideRequest,
  rejectRideRequest,
  kickRider,
  completeRide,
  cancelRide,
  sendRideMessage,
  getRideMessages,
} from "@/lib/actions/rides";
import { calculateDetourTime } from "@/lib/actions/maps";
import { useRealtime } from "@/lib/hooks/useRealtime";

interface RideRequest {
  id: string;
  status: string;
  amountCents: number;
  note: string | null;
  pickupName: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  createdAt: Date | string;
  rider: {
    id: string;
    name: string;
    email: string;
  };
}

interface RideDetailData {
  id: string;
  originName: string;
  originLat: number;
  originLng: number;
  destName: string;
  destLat: number;
  destLng: number;
  departureTime: Date | string;
  totalSeats: number;
  availableSeats: number;
  pricePerSeat: number;
  description: string | null;
  status: string;
  createdAt: Date | string;
  driver: {
    id: string;
    name: string;
    email: string;
  };
  requests: RideRequest[];
}

interface RideMessage {
  id: string;
  message: string;
  createdAt: Date | string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

interface RideDetailClientProps {
  ride: RideDetailData;
  isDriver: boolean;
  hasExistingRequest: boolean;
  routeGeometry?: [number, number][];
  routeDistance?: number;
  routeDuration?: number;
  canMessage?: boolean;
  initialMessages?: RideMessage[];
  currentUser?: CurrentUser;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Shows pickup name + estimated detour time for the driver */
function PickupInfo({
  pickupName,
  pickupLat,
  pickupLng,
  originLat,
  originLng,
  destLat,
  destLng,
}: {
  pickupName: string;
  pickupLat: number;
  pickupLng: number;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}) {
  const [detourMin, setDetourMin] = useState<number | null>(null);

  useEffect(() => {
    calculateDetourTime(originLat, originLng, destLat, destLng, pickupLat, pickupLng)
      .then((min) => setDetourMin(min));
  }, [originLat, originLng, destLat, destLng, pickupLat, pickupLng]);

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <MapPin className="h-3.5 w-3.5 shrink-0 text-clemson-orange" />
      <span className="text-gray-700 font-medium">{pickupName}</span>
      {detourMin != null && (
        <span className="text-gray-400">
          (+{detourMin <= 0 ? "<1" : detourMin} min)
        </span>
      )}
    </div>
  );
}

const statusBadgeVariant: Record<
  string,
  "default" | "success" | "warning" | "error" | "info"
> = {
  open: "success",
  full: "warning",
  in_progress: "info",
  completed: "default",
  cancelled: "error",
};

const statusLabel: Record<string, string> = {
  open: "Open",
  full: "Full",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const requestStatusBadgeVariant: Record<
  string,
  "default" | "success" | "warning" | "error" | "info"
> = {
  pending: "warning",
  accepted: "success",
  rejected: "error",
  cancelled: "default",
};

export function RideDetailClient({
  ride,
  isDriver,
  hasExistingRequest,
  routeGeometry,
  routeDistance,
  routeDuration,
  canMessage = false,
  initialMessages = [],
  currentUser,
}: RideDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinNote, setJoinNote] = useState("");
  const [joinPickup, setJoinPickup] = useState<{
    name: string;
    lat: number;
    lng: number;
  } | null>(null);

  // Messages state (MQTT-driven)
  const [messages, setMessages] = useState<RideMessage[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Re-fetch messages from server
  const refreshMessages = useCallback(async () => {
    try {
      const msgs = await getRideMessages(ride.id);
      setMessages(msgs as RideMessage[]);
    } catch {
      // ignore
    }
  }, [ride.id]);

  // Connect to IoT Core — listen for message signals on this ride's topic
  const messageTopics = canMessage ? [ride.id] : undefined;

  // When driver gets a notification signal, refresh the page to pick up new requests
  const handleNotification = useCallback(() => {
    router.refresh();
  }, [router]);

  useRealtime(isDriver ? handleNotification : undefined, messageTopics, refreshMessages);

  // Polling fallback: refresh messages + ride data when MQTT isn't available
  useEffect(() => {
    if (!canMessage && !isDriver) return;
    const interval = setInterval(() => {
      if (canMessage) refreshMessages();
      if (isDriver) router.refresh(); // picks up new requests
    }, 3000);
    return () => clearInterval(interval);
  }, [canMessage, isDriver, refreshMessages, router]);

  const departure =
    typeof ride.departureTime === "string"
      ? new Date(ride.departureTime)
      : ride.departureTime;

  const pendingRequests = ride.requests.filter((r) => r.status === "pending");
  const acceptedRequests = ride.requests.filter((r) => r.status === "accepted");

  const isActive = ride.status === "open" || ride.status === "full";

  // -- Action handlers --

  function handleRequestToJoin() {
    if (!joinPickup) {
      toast("error", "Please select a pickup location.");
      return;
    }
    setActionInProgress("join");
    startTransition(async () => {
      const result = await requestToJoinRide(ride.id, {
        note: joinNote || undefined,
        pickupName: joinPickup.name,
        pickupLat: joinPickup.lat,
        pickupLng: joinPickup.lng,
      });
      if (result.success) {
        toast("success", "Request sent! The driver will review it.");
        setJoinModalOpen(false);
        setJoinNote("");
        setJoinPickup(null);
        router.refresh();
      } else {
        toast("error", result.error ?? "Failed to send request.");
      }
      setActionInProgress(null);
    });
  }

  function handleAcceptRequest(requestId: string) {
    setActionInProgress(requestId);
    startTransition(async () => {
      const result = await acceptRideRequest(requestId);
      if (result.success) {
        toast("success", "Request accepted!");
        router.refresh();
      } else {
        toast("error", result.error ?? "Failed to accept request.");
      }
      setActionInProgress(null);
    });
  }

  function handleRejectRequest(requestId: string) {
    setActionInProgress(requestId);
    startTransition(async () => {
      const result = await rejectRideRequest(requestId);
      if (result.success) {
        toast("success", "Request rejected.");
        router.refresh();
      } else {
        toast("error", result.error ?? "Failed to reject request.");
      }
      setActionInProgress(null);
    });
  }

  function handleKickRider(requestId: string) {
    setActionInProgress(`kick-${requestId}`);
    startTransition(async () => {
      const result = await kickRider(requestId);
      if (result.success) {
        toast("success", "Rider removed from the ride.");
        router.refresh();
      } else {
        toast("error", result.error ?? "Failed to remove rider.");
      }
      setActionInProgress(null);
    });
  }

  function handleCompleteRide() {
    setActionInProgress("complete");

    // Get driver's GPS position first
    if (!navigator.geolocation) {
      toast("error", "Your browser doesn't support location services.");
      setActionInProgress(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const driverLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        startTransition(async () => {
          const result = await completeRide(ride.id, driverLocation);
          if (result.success) {
            toast("success", "Ride marked as completed! Payments have been processed.");
            router.refresh();
          } else {
            toast("error", result.error ?? "Failed to complete ride.");
          }
          setActionInProgress(null);
        });
      },
      (err) => {
        console.error("Geolocation error:", err);
        toast("error", "Location access denied. Please enable location services to complete the ride.");
        setActionInProgress(null);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleCancelRide() {
    setActionInProgress("cancel");
    startTransition(async () => {
      const result = await cancelRide(ride.id);
      if (result.success) {
        toast("success", "Ride has been cancelled.");
        router.refresh();
      } else {
        toast("error", result.error ?? "Failed to cancel ride.");
      }
      setActionInProgress(null);
    });
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || sendingMessage) return;
    const msg = newMessage.trim();
    setNewMessage("");
    setSendingMessage(true);

    // Optimistic update — show message locally immediately
    if (currentUser) {
      const optimistic: RideMessage = {
        id: `optimistic-${Date.now()}`,
        message: msg,
        createdAt: new Date().toISOString(),
        user: currentUser,
      };
      setMessages((prev) => [...prev, optimistic]);
    }

    const result = await sendRideMessage(ride.id, msg);
    if (result.success) {
      // Confirm with real data from DB
      refreshMessages();
    } else {
      toast("error", result.error ?? "Failed to send message.");
      setNewMessage(msg); // restore on failure
      // Remove optimistic message
      setMessages((prev) => prev.filter((m) => !m.id.startsWith("optimistic-")));
    }
    setSendingMessage(false);
  }

  // Scroll to bottom when messages update (SSE push)
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [messages.length]);

  return (
    <div className="space-y-6">
      {/* Map */}
      <RideMap
        origin={{ lat: ride.originLat, lng: ride.originLng }}
        destination={{ lat: ride.destLat, lng: ride.destLng }}
        routeGeometry={routeGeometry}
        className="h-72 sm:h-96"
      />

      {/* Route stats */}
      {(routeDistance != null || routeDuration != null) && (
        <div className="flex items-center gap-6 rounded-xl bg-gray-50 px-5 py-3">
          {routeDistance != null && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-clemson-orange" />
              <span className="font-medium">{(routeDistance * 0.621371).toFixed(1)} mi</span>
              <span className="text-gray-400">({routeDistance.toFixed(1)} km)</span>
            </div>
          )}
          {routeDuration != null && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-clemson-purple" />
              <span className="font-medium">
                {routeDuration >= 60
                  ? `${Math.floor(routeDuration / 60)}h ${Math.round(routeDuration % 60)}m`
                  : `${Math.round(routeDuration)} min`}
              </span>
              <span className="text-gray-400">drive</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info - left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ride info card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-xl">Ride Details</CardTitle>
                <Badge
                  variant={statusBadgeVariant[ride.status] ?? "default"}
                >
                  {statusLabel[ride.status] ?? ride.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Route */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                  <div className="h-8 w-px bg-gray-300" />
                  <div className="h-3 w-3 rounded-full bg-red-500 ring-2 ring-red-100" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      From
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {ride.originName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      To
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {ride.destName}
                    </p>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100 dark:border-clemson-orange/10" />

              {/* Meta grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Departure</p>
                    <p className="text-sm font-medium text-gray-900">
                      {format(departure, "EEE, MMM d")}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(departure, "h:mm a")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Seats</p>
                    <p className="text-sm font-medium text-gray-900">
                      {ride.availableSeats} of {ride.totalSeats} available
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400">Price / seat</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatPrice(ride.pricePerSeat)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Departure countdown */}
              {isActive && (
                <div className="flex items-center gap-2 rounded-lg bg-clemson-orange/5 px-3 py-2 text-sm text-clemson-orange">
                  <Clock className="h-4 w-4" />
                  <span>
                    Departing{" "}
                    {formatDistanceToNow(departure, { addSuffix: true })}
                  </span>
                </div>
              )}

              {/* Driver description / rules */}
              {ride.description && (
                <>
                  <hr className="border-gray-100 dark:border-clemson-orange/10" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1.5">
                      Driver Notes / Rules
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {ride.description}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Driver actions: ride requests management */}
          {isDriver && isActive && (
            <>
              {/* Pending requests */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-500" />
                    Pending Requests
                    {pendingRequests.length > 0 && (
                      <Badge variant="warning">{pendingRequests.length}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingRequests.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No pending requests at the moment.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {pendingRequests.map((req) => (
                        <div
                          key={req.id}
                          className="rounded-lg border border-gray-200 dark:border-clemson-orange/20 p-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-clemson-purple/10">
                                <User className="h-4 w-4 text-clemson-purple" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {req.rider.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {req.rider.email}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="primary"
                                loading={
                                  isPending && actionInProgress === req.id
                                }
                                disabled={isPending}
                                onClick={() => handleAcceptRequest(req.id)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                loading={
                                  isPending && actionInProgress === req.id
                                }
                                disabled={isPending}
                                onClick={() => handleRejectRequest(req.id)}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Reject
                              </Button>
                            </div>
                          </div>
                          {(req.pickupName || req.note) && (
                            <div className="mt-2 ml-12 space-y-1.5 rounded-md bg-gray-50 px-3 py-2">
                              {req.pickupName && req.pickupLat != null && req.pickupLng != null && (
                                <PickupInfo
                                  pickupName={req.pickupName}
                                  pickupLat={req.pickupLat}
                                  pickupLng={req.pickupLng}
                                  originLat={ride.originLat}
                                  originLng={ride.originLng}
                                  destLat={ride.destLat}
                                  destLng={ride.destLng}
                                />
                              )}
                              {req.note && (
                                <div className="flex items-start gap-1.5">
                                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                                  <p className="text-xs text-gray-600">{req.note}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Accepted passengers */}
              {acceptedRequests.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      Passengers
                      <Badge variant="success">
                        {acceptedRequests.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {acceptedRequests.map((req) => (
                        <div
                          key={req.id}
                          className="rounded-lg border border-gray-200 dark:border-clemson-orange/20 p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50">
                              <User className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {req.rider.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {req.rider.email}
                              </p>
                            </div>
                            <div className="ml-auto flex items-center gap-2">
                              <Badge variant="success">Confirmed</Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                loading={isPending && actionInProgress === `kick-${req.id}`}
                                disabled={isPending}
                                onClick={() => handleKickRider(req.id)}
                                className="text-red-500 hover:text-red-600 hover:border-red-300"
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          {(req.pickupName || req.note) && (
                            <div className="mt-2 ml-12 space-y-1.5 rounded-md bg-gray-50 px-3 py-2">
                              {req.pickupName && req.pickupLat != null && req.pickupLng != null && (
                                <PickupInfo
                                  pickupName={req.pickupName}
                                  pickupLat={req.pickupLat}
                                  pickupLng={req.pickupLng}
                                  originLat={ride.originLat}
                                  originLng={ride.originLng}
                                  destLat={ride.destLat}
                                  destLng={ride.destLng}
                                />
                              )}
                              {req.note && (
                                <div className="flex items-start gap-1.5">
                                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                                  <p className="text-xs text-gray-600">{req.note}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Driver action buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  loading={isPending && actionInProgress === "complete"}
                  disabled={isPending || acceptedRequests.length === 0}
                  onClick={handleCompleteRide}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Complete Ride
                </Button>
                <Button
                  variant="danger"
                  size="lg"
                  className="flex-1"
                  loading={isPending && actionInProgress === "cancel"}
                  disabled={isPending}
                  onClick={handleCancelRide}
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Ride
                </Button>
              </div>
            </>
          )}

          {/* Non-driver: accepted passengers list (if ride has any) */}
          {!isDriver && acceptedRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-clemson-purple" />
                  Passengers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {acceptedRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-clemson-orange/20 p-3"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50">
                        <User className="h-4 w-4 text-emerald-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {req.rider.name}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Ride Messages ── */}
          {canMessage && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-clemson-orange" />
                  Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Message thread */}
                <div className="max-h-80 overflow-y-auto space-y-3 mb-4">
                  {messages.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                      No messages yet. Start a conversation to coordinate details.
                    </p>
                  ) : (
                    messages.map((msg) => {
                      const msgDate =
                        typeof msg.createdAt === "string"
                          ? new Date(msg.createdAt)
                          : msg.createdAt;
                      return (
                        <div key={msg.id} className="flex items-start gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clemson-purple/10">
                            <User className="h-3.5 w-3.5 text-clemson-purple" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {msg.user.name}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatDistanceToNow(msgDate, { addSuffix: true })}
                              </span>
                            </div>
                            <p className="mt-0.5 text-sm text-gray-700 whitespace-pre-line break-words">
                              {msg.message}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message input */}
                <div className="flex items-center gap-2 border-t border-gray-100 dark:border-clemson-orange/10 pt-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    maxLength={1000}
                    className="flex-1 rounded-lg border border-gray-200 dark:border-clemson-orange/20 px-3 py-2 text-sm text-foreground bg-background placeholder:text-gray-400 focus:border-clemson-orange focus:outline-none focus:ring-1 focus:ring-clemson-orange"
                  />
                  <Button
                    size="sm"
                    disabled={!newMessage.trim() || sendingMessage}
                    loading={sendingMessage}
                    onClick={handleSendMessage}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - right column */}
        <div className="space-y-6">
          {/* Driver info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Driver</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-clemson-orange/10">
                  <User className="h-6 w-6 text-clemson-orange" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {ride.driver.name}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Mail className="h-3 w-3" />
                    {ride.driver.email}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                <Shield className="h-3.5 w-3.5" />
                Clemson verified student
              </div>
            </CardContent>
          </Card>

          {/* Join ride CTA */}
          {!isDriver && isActive && (
            <Card className="border-clemson-orange/30 bg-clemson-orange/5">
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">
                    {formatPrice(ride.pricePerSeat)}
                  </p>
                  <p className="text-sm text-gray-500">per seat</p>
                </div>

                {hasExistingRequest ? (
                  <div className="flex items-center justify-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    You already have a request for this ride
                  </div>
                ) : ride.availableSeats === 0 ? (
                  <div className="flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    No seats available
                  </div>
                ) : (
                  <Button
                    size="lg"
                    className="w-full"
                    disabled={isPending}
                    onClick={() => setJoinModalOpen(true)}
                  >
                    <ArrowRight className="h-4 w-4" />
                    Request to Join
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Ride completed/cancelled notice */}
          {!isActive && (
            <Card>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {ride.status === "completed" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      This ride has been completed.
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-red-500" />
                      This ride has been cancelled.
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Join ride modal */}
      <Modal
        open={joinModalOpen}
        onClose={() => { setJoinModalOpen(false); setJoinNote(""); setJoinPickup(null); }}
        title="Request to Join"
      >
        <div className="space-y-4">
          {/* Pickup location (required) */}
          <div>
            <LocationSearch
              label="Where should the driver pick you up?"
              placeholder="Enter an address or landmark..."
              onSelect={(place) => setJoinPickup(place)}
            />
            {joinPickup && (
              <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {joinPickup.name}
              </p>
            )}
          </div>

          {/* Optional note */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Note <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={joinNote}
              onChange={(e) => setJoinNote(e.target.value)}
              placeholder="e.g., I'll be wearing a red jacket, I have a large suitcase..."
              maxLength={500}
              rows={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-clemson-orange focus:outline-none focus:ring-1 focus:ring-clemson-orange resize-none"
            />
            <p className="mt-0.5 text-xs text-gray-400 text-right">{joinNote.length}/500</p>
          </div>

          <Button
            className="w-full"
            loading={isPending && actionInProgress === "join"}
            disabled={isPending || !joinPickup}
            onClick={handleRequestToJoin}
          >
            Send Request
          </Button>
        </div>
      </Modal>
    </div>
  );
}
