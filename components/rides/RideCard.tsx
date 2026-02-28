"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  MapPin,
  Calendar,
  Users,
  DollarSign,
  ArrowRight,
  User,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { RideMap } from "@/components/maps/RideMap";

interface RideCardProps {
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
  driver?: {
    name: string;
    email: string;
  };
  showMap?: boolean;
  href?: string;
  children?: React.ReactNode;
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

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function RideCard({
  ride,
  driver,
  showMap = true,
  href,
  children,
}: RideCardProps) {
  const departure =
    typeof ride.departureTime === "string"
      ? new Date(ride.departureTime)
      : ride.departureTime;

  const content = (
    <Card className="group overflow-hidden transition-shadow hover:shadow-md bg-gray-50/50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800">
      {showMap && (
        <div className="pointer-events-none">
          <RideMap
            origin={{ lat: ride.originLat, lng: ride.originLng }}
            destination={{ lat: ride.destLat, lng: ride.destLng }}
            className="h-36 rounded-none border-b border-gray-200 dark:border-gray-800"
          />
        </div>
      )}

      <CardContent className="space-y-3">
        {/* Route */}
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {ride.originName}
            </p>
          </div>
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {ride.destName}
            </p>
          </div>
        </div>

        {/* Date & Time */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
          <span>{format(departure, "EEE, MMM d 'at' h:mm a")}</span>
        </div>

        {/* Driver */}
        {driver && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <User className="h-4 w-4 shrink-0 text-gray-400" />
            <span>{driver.name}</span>
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-4">
            {/* Seats */}
            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
              <Users className="h-4 w-4 text-gray-400" />
              <span>
                {ride.availableSeats}/{ride.totalSeats} seats
              </span>
            </div>

            {/* Price */}
            <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span>{formatPrice(ride.pricePerSeat)}</span>
            </div>
          </div>

          {/* Status */}
          <Badge variant={statusBadgeVariant[ride.status] ?? "default"}>
            {statusLabel[ride.status] ?? ride.status}
          </Badge>
        </div>

        {/* Optional extra content (buttons, badges, etc.) */}
        {children}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

export { formatPrice, statusBadgeVariant, statusLabel };
