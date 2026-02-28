import Link from "next/link";
import { Car } from "lucide-react";
import { getRides } from "@/lib/actions/rides";
import { Button } from "@/components/ui/Button";
import { RideCard } from "@/components/rides/RideCard";
import { RideSearchBar } from "@/components/rides/RideSearchBar";

interface RidesPageProps {
  searchParams: Promise<{
    destination?: string;
    date?: string;
  }>;
}

export default async function RidesPage({ searchParams }: RidesPageProps) {
  const params = await searchParams;
  const destination = params.destination ?? "";
  const date = params.date ?? "";

  const rides = await getRides({
    destination: destination || undefined,
    date: date || undefined,
  });

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Browse Rides</h1>
        <p className="text-gray-500">
          Find available rides posted by fellow Clemson students.
        </p>
      </div>

      {/* Search bar with autocomplete */}
      <RideSearchBar />

      {/* Results grid */}
      {rides.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rides.map((ride) => (
            <RideCard
              key={ride.id}
              ride={ride}
              driver={ride.driver}
              showMap={true}
              href={`/rides/${ride.id}`}
            />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-transparent py-16 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-transparent mb-4">
            <Car className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            No rides found
          </h3>
          <p className="mt-1 max-w-sm text-sm text-gray-500">
            {destination || date
              ? "Try adjusting your filters or check back later for new rides."
              : "No one has posted a ride yet. Be the first!"}
          </p>
          <Link href="/post-ride">
            <Button variant="primary" className="mt-6">
              Post a Ride
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
