import Link from "next/link";
import { Search, CalendarDays, Car } from "lucide-react";
import { getRides } from "@/lib/actions/rides";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { RideCard } from "@/components/rides/RideCard";

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
        <h1 className="text-2xl font-bold text-gray-900">Browse Rides</h1>
        <p className="text-gray-500">
          Find available rides posted by fellow Clemson students.
        </p>
      </div>

      {/* Filter bar */}
      <form
        className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <Input
              label="Destination"
              name="destination"
              placeholder="Search by destination..."
              defaultValue={destination}
              iconLeft={<Search className="h-4 w-4" />}
            />
          </div>

          <div className="w-full sm:w-48">
            <Input
              label="Date"
              name="date"
              type="date"
              defaultValue={date}
              iconLeft={<CalendarDays className="h-4 w-4" />}
            />
          </div>

          <Button type="submit" className="w-full sm:w-auto">
            <Search className="h-4 w-4" />
            Search
          </Button>
        </div>
      </form>

      {/* Active filters indicator */}
      {(destination || date) && (
        <div className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <span>
            Showing results
            {destination && (
              <> for <span className="font-medium text-gray-900">&quot;{destination}&quot;</span></>
            )}
            {date && (
              <> on <span className="font-medium text-gray-900">{date}</span></>
            )}
          </span>
          <Link
            href="/rides"
            className="ml-2 text-clemson-orange hover:text-clemson-orange-dark font-medium transition-colors"
          >
            Clear filters
          </Link>
        </div>
      )}

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
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-16 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
            <Car className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
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
