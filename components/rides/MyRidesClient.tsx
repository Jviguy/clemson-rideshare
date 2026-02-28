"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  Car,
  Navigation,
  MapPin,
  Calendar,
  Users,
  DollarSign,
  ArrowRight,
  User,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { cancelRideRequest } from "@/lib/actions/rides";

// Types based on server action return shapes

interface DriverRide {
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
  pendingRequests: number;
  acceptedRequests: number;
}

interface RiderRide {
  requestId: string;
  requestStatus: string;
  amountCents: number;
  requestCreatedAt: Date | string;
  ride: {
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
  };
  driver: {
    id: string;
    name: string;
    email: string;
  };
}

interface MyRidesClientProps {
  driverRides: DriverRide[];
  riderRides: RiderRide[];
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

const requestStatusLabel: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export function MyRidesClient({
  driverRides,
  riderRides,
}: MyRidesClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  function handleCancelRequest(requestId: string) {
    setCancellingId(requestId);
    startTransition(async () => {
      const result = await cancelRideRequest(requestId);
      if (result.success) {
        toast("success", "Request cancelled.");
        router.refresh();
      } else {
        toast("error", result.error ?? "Failed to cancel request.");
      }
      setCancellingId(null);
    });
  }

  return (
    <Tabs defaultValue="driver">
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="driver">
          <Car className="mr-1.5 h-4 w-4" />
          As Driver
          {driverRides.length > 0 && (
            <span className="ml-1.5 rounded-full bg-clemson-orange/10 px-2 py-0.5 text-xs font-medium text-clemson-orange">
              {driverRides.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="rider">
          <Navigation className="mr-1.5 h-4 w-4" />
          As Rider
          {riderRides.length > 0 && (
            <span className="ml-1.5 rounded-full bg-clemson-purple/10 px-2 py-0.5 text-xs font-medium text-clemson-purple">
              {riderRides.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      {/* Driver tab */}
      <TabsContent value="driver">
        {driverRides.length === 0 ? (
          <EmptyState
            icon={Car}
            title="No rides posted"
            description="You haven't posted any rides yet. Share your next trip with fellow Tigers!"
            actionLabel="Post a Ride"
            actionHref="/post-ride"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {driverRides.map((ride) => {
              const departure =
                typeof ride.departureTime === "string"
                  ? new Date(ride.departureTime)
                  : ride.departureTime;

              return (
                <Card
                  key={ride.id}
                  className="transition-shadow hover:shadow-md"
                >
                  <CardContent className="space-y-3">
                    {/* Route */}
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <p className="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">
                        {ride.originName}
                      </p>
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <p className="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">
                        {ride.destName}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>
                        {format(departure, "EEE, MMM d 'at' h:mm a")}
                      </span>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Users className="h-4 w-4 text-gray-400" />
                          {ride.availableSeats}/{ride.totalSeats}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          {formatPrice(ride.pricePerSeat)}
                        </div>
                      </div>
                      <Badge
                        variant={statusBadgeVariant[ride.status] ?? "default"}
                      >
                        {statusLabel[ride.status] ?? ride.status}
                      </Badge>
                    </div>

                    {/* Request counts + actions */}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                      <div className="flex items-center gap-3">
                        {Number(ride.pendingRequests) > 0 && (
                          <Badge variant="warning">
                            {ride.pendingRequests} pending
                          </Badge>
                        )}
                        {Number(ride.acceptedRequests) > 0 && (
                          <Badge variant="success">
                            {ride.acceptedRequests} confirmed
                          </Badge>
                        )}
                        {Number(ride.pendingRequests) === 0 &&
                          Number(ride.acceptedRequests) === 0 && (
                            <span className="text-xs text-gray-400">
                              No requests yet
                            </span>
                          )}
                      </div>
                      <Link href={`/rides/${ride.id}`}>
                        <Button size="sm" variant="outline">
                          Manage
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>

      {/* Rider tab */}
      <TabsContent value="rider">
        {riderRides.length === 0 ? (
          <EmptyState
            icon={Navigation}
            title="No ride requests"
            description="You haven't requested to join any rides yet. Browse available rides to get started!"
            actionLabel="Find a Ride"
            actionHref="/rides"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {riderRides.map((item) => {
              const departure =
                typeof item.ride.departureTime === "string"
                  ? new Date(item.ride.departureTime)
                  : item.ride.departureTime;

              const canCancel =
                item.requestStatus === "pending" ||
                item.requestStatus === "accepted";

              return (
                <Card
                  key={item.requestId}
                  className="transition-shadow hover:shadow-md"
                >
                  <CardContent className="space-y-3">
                    {/* Route */}
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <p className="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">
                        {item.ride.originName}
                      </p>
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      <p className="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">
                        {item.ride.destName}
                      </p>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>
                        {format(departure, "EEE, MMM d 'at' h:mm a")}
                      </span>
                    </div>

                    {/* Driver */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>{item.driver.name}</span>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        {formatPrice(item.ride.pricePerSeat)}
                      </div>
                      <Badge
                        variant={
                          requestStatusBadgeVariant[item.requestStatus] ??
                          "default"
                        }
                      >
                        {requestStatusLabel[item.requestStatus] ??
                          item.requestStatus}
                      </Badge>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                      <Link
                        href={`/rides/${item.ride.id}`}
                        className="text-sm font-medium text-clemson-orange hover:text-clemson-orange-dark transition-colors"
                      >
                        View ride
                      </Link>
                      {canCancel && (
                        <Button
                          size="sm"
                          variant="danger"
                          loading={
                            isPending && cancellingId === item.requestId
                          }
                          disabled={isPending}
                          onClick={() => handleCancelRequest(item.requestId)}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

// -- Empty state helper --

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: typeof Car;
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-16 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>
      <Link href={actionHref}>
        <Button variant="primary" className="mt-6">
          {actionLabel}
        </Button>
      </Link>
    </div>
  );
}
