import { getMyRidesAsDriver, getMyRidesAsRider } from "@/lib/actions/rides";
import { MyRidesClient } from "@/components/rides/MyRidesClient";

export default async function MyRidesPage() {
  const [driverRides, riderRides] = await Promise.all([
    getMyRidesAsDriver(),
    getMyRidesAsRider(),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">My Rides</h1>
        <p className="mt-1 text-gray-500">
          Manage your posted rides and ride requests.
        </p>
      </div>

      <MyRidesClient driverRides={driverRides} riderRides={riderRides} />
    </div>
  );
}
