import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getRideById } from "@/lib/actions/rides";
import { getSession } from "@/lib/auth/cognito";
import { RideDetailClient } from "@/components/rides/RideDetailClient";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface RideDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RideDetailPage({ params }: RideDetailPageProps) {
  const { id } = await params;
  const ride = await getRideById(id);

  if (!ride) {
    notFound();
  }

  // Determine if the current user is the driver
  const session = await getSession();
  let isDriver = false;
  let hasExistingRequest = false;

  if (session) {
    // Look up the user by cognito sub to get internal user ID
    const userResults = await db
      .select()
      .from(users)
      .where(eq(users.cognitoId, session.sub))
      .limit(1);

    if (userResults.length > 0) {
      const currentUser = userResults[0];
      isDriver = ride.driver.id === currentUser.id;

      // Check if the user already has a pending or accepted request
      hasExistingRequest = ride.requests.some(
        (r) =>
          r.rider.id === currentUser.id &&
          (r.status === "pending" || r.status === "accepted")
      );
    }
  }

  return (
    <div>
      {/* Back link */}
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
      />
    </div>
  );
}
