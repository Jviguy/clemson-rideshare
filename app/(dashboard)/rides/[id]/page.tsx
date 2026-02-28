import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getRideById, getRideMessages } from "@/lib/actions/rides";
import { getSession } from "@/lib/auth/cognito";
import { RideDetailClient } from "@/components/rides/RideDetailClient";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { calculateRouteAction } from "@/lib/actions/maps";

interface RideDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RideDetailPage({ params }: RideDetailPageProps) {
  const { id } = await params;

  const [ride, session] = await Promise.all([
    getRideById(id),
    getSession(),
  ]);

  if (!ride) {
    notFound();
  }

  // Fetch route geometry and user info in parallel
  const [routeResult, userResults] = await Promise.all([
    calculateRouteAction(
      ride.originLat,
      ride.originLng,
      ride.destLat,
      ride.destLng
    ),
    session
      ? db
          .select()
          .from(users)
          .where(eq(users.cognitoId, session.sub))
          .limit(1)
      : Promise.resolve([]),
  ]);

  let isDriver = false;
  let hasExistingRequest = false;
  let isAcceptedRider = false;

  if (userResults.length > 0) {
    const currentUser = userResults[0];
    isDriver = ride.driver.id === currentUser.id;
    hasExistingRequest = ride.requests.some(
      (r) =>
        r.rider.id === currentUser.id &&
        (r.status === "pending" || r.status === "accepted")
    );
    isAcceptedRider = ride.requests.some(
      (r) => r.rider.id === currentUser.id && r.status === "accepted"
    );
  }

  // Fetch messages if user has access (driver or accepted rider)
  const messages = (isDriver || isAcceptedRider)
    ? await getRideMessages(id)
    : [];

  return (
    <div>
      <Link
        href="/rides"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to rides
      </Link>

      <RideDetailClient
        ride={ride}
        isDriver={isDriver}
        hasExistingRequest={hasExistingRequest}
        routeGeometry={routeResult?.geometry ?? undefined}
        routeDistance={routeResult?.distance}
        routeDuration={routeResult?.duration}
        canMessage={isDriver || isAcceptedRider}
        initialMessages={messages}
        currentUser={
          userResults.length > 0
            ? { id: userResults[0].id, name: userResults[0].name, email: userResults[0].email }
            : undefined
        }
      />
    </div>
  );
}
