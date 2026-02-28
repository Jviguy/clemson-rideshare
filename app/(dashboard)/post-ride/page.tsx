"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Users,
  DollarSign,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { LocationSearch } from "@/components/maps/LocationSearch";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { useToast } from "@/components/ui/Toast";
import { createRide } from "@/lib/actions/rides";

const initialState = {
  success: false,
  rideId: undefined as string | undefined,
  error: undefined as string | undefined,
};

export default function PostRidePage() {
  const [state, formAction, isPending] = useActionState(
    createRide,
    initialState
  );
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  // Origin location state
  const [origin, setOrigin] = useState<{
    name: string;
    lat: number;
    lng: number;
  } | null>(null);

  // Destination location state
  const [destination, setDestination] = useState<{
    name: string;
    lat: number;
    lng: number;
  } | null>(null);

  // Departure time state
  const [departureTime, setDepartureTime] = useState("");

  // Price display (dollars) -> hidden field stores cents
  const [priceDisplay, setPriceDisplay] = useState("");
  const priceCents = priceDisplay
    ? Math.round(parseFloat(priceDisplay) * 100)
    : 0;

  // Redirect on success
  useEffect(() => {
    if (state.success && state.rideId) {
      toast("success", "Ride posted successfully!");
      router.push(`/rides/${state.rideId}`);
    }
  }, [state.success, state.rideId, router, toast]);

  // Show error toast
  useEffect(() => {
    if (state.error) {
      toast("error", state.error);
    }
  }, [state.error, toast]);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Post a Ride</h1>
        <p className="mt-1 text-gray-500">
          Share your route and help fellow Tigers get where they need to go.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-clemson-orange" />
            Ride Details
          </CardTitle>
          <CardDescription>
            Fill in the details about your upcoming trip.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            ref={formRef}
            action={formAction}
            className="flex flex-col gap-6"
          >
            {/* Error banner */}
            {state.error && (
              <div
                className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error"
                role="alert"
              >
                {state.error}
              </div>
            )}

            {/* Origin */}
            <div>
              <LocationSearch
                label="Starting Point"
                placeholder="Where are you leaving from?"
                onSelect={(place) => setOrigin(place)}
              />
              {/* Hidden fields for form submission */}
              <input type="hidden" name="originName" value={origin?.name ?? ""} />
              <input
                type="hidden"
                name="originLat"
                value={origin?.lat ?? ""}
              />
              <input
                type="hidden"
                name="originLng"
                value={origin?.lng ?? ""}
              />
            </div>

            {/* Destination */}
            <div>
              <LocationSearch
                label="Destination"
                placeholder="Where are you headed?"
                onSelect={(place) => setDestination(place)}
              />
              <input
                type="hidden"
                name="destName"
                value={destination?.name ?? ""}
              />
              <input
                type="hidden"
                name="destLat"
                value={destination?.lat ?? ""}
              />
              <input
                type="hidden"
                name="destLng"
                value={destination?.lng ?? ""}
              />
            </div>

            {/* Departure Date/Time */}
            <DateTimePicker
              label="Departure Date & Time"
              name="departureTime"
              value={departureTime}
              onChange={setDepartureTime}
              placeholder="When are you leaving?"
              required
            />

            {/* Two-column row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Total Seats */}
              <Input
                label="Available Seats"
                name="totalSeats"
                type="number"
                min={1}
                max={7}
                defaultValue={3}
                required
                iconLeft={<Users className="h-4 w-4" />}
                helperText="1 to 7 passengers"
              />

              {/* Price per Seat (dollars display) */}
              <div>
                <Input
                  label="Price per Seat"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={priceDisplay}
                  onChange={(e) => setPriceDisplay(e.target.value)}
                  required
                  iconLeft={<DollarSign className="h-4 w-4" />}
                  helperText="Amount in dollars"
                />
                {/* Hidden field sends cents to the server action */}
                <input
                  type="hidden"
                  name="pricePerSeat"
                  value={priceCents}
                />
              </div>
            </div>

            {/* Description / Rules */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Description / Rules <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                name="description"
                placeholder="e.g., No smoking, max 1 bag per person, meeting at the parking garage..."
                maxLength={1000}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-clemson-orange focus:outline-none focus:ring-1 focus:ring-clemson-orange resize-none"
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              loading={isPending}
              disabled={!origin || !destination}
              className="mt-2 w-full"
            >
              <MapPin className="h-4 w-4" />
              Post Ride
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
