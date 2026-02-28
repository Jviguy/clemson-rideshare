"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Car,
  Navigation,
  XCircle,
  DollarSign,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
import { PaymentModal } from "@/components/rides/PaymentModal";
import { cancelRideRequest } from "@/lib/actions/rides";
import { RideCard } from "@/components/rides/RideCard";

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
  hasPaid: boolean;
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
  const [payingRequest, setPayingRequest] = useState<{
    requestId: string;
    rideId: string;
    pricePerSeat: number;
  } | null>(null);

  function handlePaymentSuccess() {
    setPayingRequest(null);
    toast("success", "Payment confirmed! You're all set for the ride.");
    router.refresh();
  }

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {driverRides.map((ride) => (
              <RideCard key={ride.id} ride={ride} showMap={false}>
                {/* Request counts + actions */}
                <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-3">
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
              </RideCard>
            ))}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {riderRides.map((item) => {
              const canCancel =
                item.requestStatus === "pending" ||
                item.requestStatus === "accepted";

              return (
                <RideCard
                  key={item.requestId}
                  ride={item.ride}
                  driver={item.driver}
                  showMap={false}
                >
                  <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 mt-1 pt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Status:</span>
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
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/rides/${item.ride.id}`}
                        className="text-sm font-medium text-clemson-orange hover:text-clemson-orange-dark transition-colors"
                      >
                        View
                      </Link>
                      <div className="flex items-center gap-2">
                        {item.requestStatus === "accepted" && !item.hasPaid && (
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={isPending}
                            onClick={() =>
                              setPayingRequest({
                                requestId: item.requestId,
                                rideId: item.ride.id,
                                pricePerSeat: item.ride.pricePerSeat,
                              })
                            }
                          >
                            <DollarSign className="h-3.5 w-3.5" />
                            Confirm & Pay
                          </Button>
                        )}
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
                    </div>
                  </div>
                </RideCard>
              );
            })}
          </div>
        )}
      </TabsContent>

      {payingRequest && (
        <PaymentModal
          open={true}
          onClose={() => setPayingRequest(null)}
          requestId={payingRequest.requestId}
          pricePerSeat={payingRequest.pricePerSeat}
          onSuccess={handlePaymentSuccess}
        />
      )}
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
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 py-16 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p>
      <Link href={actionHref}>
        <Button variant="primary" className="mt-6">
          {actionLabel}
        </Button>
      </Link>
    </div>
  );
}
