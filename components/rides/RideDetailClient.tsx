"use client";

import { useState, useTransition } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { RideMap } from "@/components/maps/RideMap";
import {
  requestToJoinRide,
  acceptRideRequest,
  rejectRideRequest,
  completeRide,
  cancelRide,
} from "@/lib/actions/rides";

interface RideRequest {
  id: string;
  status: string;
  amountCents: number;
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
  status: string;
  createdAt: Date | string;
  driver: {
    id: string;
    name: string;
    email: string;
  };
  requests: RideRequest[];
}

interface RideDetailClientProps {
  ride: RideDetailData;
  isDriver: boolean;
  hasExistingRequest: boolean;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
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
}: RideDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const departure =
    typeof ride.departureTime === "string"
      ? new Date(ride.departureTime)
      : ride.departureTime;

  const pendingRequests = ride.requests.filter((r) => r.status === "pending");
  const acceptedRequests = ride.requests.filter((r) => r.status === "accepted");

  const isActive = ride.status === "open" || ride.status === "full";

  // -- Action handlers --

  function handleRequestToJoin() {
    setActionInProgress("join");
    startTransition(async () => {
      const result = await requestToJoinRide(ride.id);
      if (result.success) {
        toast("success", "Your request has been sent to the driver!");
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

  function handleCompleteRide() {
    setActionInProgress("complete");
    startTransition(async () => {
      const result = await completeRide(ride.id);
      if (result.success) {
        toast("success", "Ride marked as completed! Payments have been processed.");
        router.refresh();
      } else {
        toast("error", result.error ?? "Failed to complete ride.");
      }
      setActionInProgress(null);
    });
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

  return (
    <div className="space-y-6">
      {/* Map */}
      <RideMap
        origin={{ lat: ride.originLat, lng: ride.originLng }}
        destination={{ lat: ride.destLat, lng: ride.destLng }}
        className="h-72 sm:h-96"
      />

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
                      Pickup
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {ride.originName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Destination
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {ride.destName}
                    </p>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

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
                          className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                        >
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
                          className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                        >
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
                          <Badge variant="success" className="ml-auto">
                            Confirmed
                          </Badge>
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
                      className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
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
                    loading={isPending && actionInProgress === "join"}
                    disabled={isPending}
                    onClick={handleRequestToJoin}
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
    </div>
  );
}
