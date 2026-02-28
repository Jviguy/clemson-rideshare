"use server";

import { db } from "@/lib/db";
import {
  users,
  rides,
  rideRequests,
  rideMessages,
  notifications,
} from "@/lib/db/schema";
import { getSession } from "@/lib/auth/cognito";
import {
  createPaymentHold,
  capturePayment,
  cancelPaymentHold,
} from "@/lib/stripe";
import { eq, and, desc, sql, gte, like, ilike, asc, or } from "drizzle-orm";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { pushNotification, pushMessage } from "@/lib/realtime";

// ── Types ──

interface ActionResult {
  success: boolean;
  error?: string;
}

interface CreateRideResult extends ActionResult {
  rideId?: string;
}

interface JoinRideResult extends ActionResult {
  clientSecret?: string;
}

interface RideWithDriver {
  id: string;
  originName: string;
  originLat: number;
  originLng: number;
  destName: string;
  destLat: number;
  destLng: number;
  departureTime: Date;
  totalSeats: number;
  availableSeats: number;
  pricePerSeat: number;
  description: string | null;
  status: string;
  createdAt: Date;
  driver: {
    id: string;
    name: string;
    email: string;
  };
}

interface RideDetail extends RideWithDriver {
  requests: {
    id: string;
    status: string;
    amountCents: number;
    note: string | null;
    pickupName: string | null;
    pickupLat: number | null;
    pickupLng: number | null;
    createdAt: Date;
    rider: {
      id: string;
      name: string;
      email: string;
    };
  }[];
}

interface RideFilters {
  destination?: string;
  date?: string;
  origin?: string;
}

// ── EventBridge helper (fire-and-forget) ──

async function publishEvent(type: string, detail: Record<string, string>) {
  try {
    const client = new EventBridgeClient({});
    await client.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: "clemson-rideshare",
            DetailType: type,
            Detail: JSON.stringify({ ...detail, type }),
            EventBusName: process.env.EVENT_BUS_NAME,
          },
        ],
      })
    );
  } catch (err) {
    console.error("publishEvent error:", err);
  }
}

// ── Haversine distance (miles) ──

function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Internal helper ──

async function getOrCreateUser() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  // Look up user by cognitoId (which maps to the 'sub' claim)
  const existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.cognitoId, session.sub))
    .limit(1);

  if (existingUsers.length > 0) {
    return existingUsers[0];
  }

  // User doesn't exist yet — create them
  const newUsers = await db
    .insert(users)
    .values({
      cognitoId: session.sub,
      email: session.email,
      name: session.name,
    })
    .returning();

  return newUsers[0];
}

// ── 1. Create Ride ──

export async function createRide(
  _prevState: CreateRideResult,
  formData: FormData
): Promise<CreateRideResult> {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return { success: false, error: "You must be signed in to create a ride." };
    }

    const originName = formData.get("originName") as string;
    const originLat = formData.get("originLat") as string;
    const originLng = formData.get("originLng") as string;
    const destName = formData.get("destName") as string;
    const destLat = formData.get("destLat") as string;
    const destLng = formData.get("destLng") as string;
    const departureTime = formData.get("departureTime") as string;
    const totalSeats = formData.get("totalSeats") as string;
    const pricePerSeat = formData.get("pricePerSeat") as string;
    const description = ((formData.get("description") as string) || "").trim().slice(0, 1000) || null;

    // Validate required fields
    if (
      !originName ||
      !originLat ||
      !originLng ||
      !destName ||
      !destLat ||
      !destLng ||
      !departureTime ||
      !totalSeats ||
      !pricePerSeat
    ) {
      return { success: false, error: "All fields are required." };
    }

    const parsedOriginLat = parseFloat(originLat);
    const parsedOriginLng = parseFloat(originLng);
    const parsedDestLat = parseFloat(destLat);
    const parsedDestLng = parseFloat(destLng);

    if (
      isNaN(parsedOriginLat) ||
      isNaN(parsedOriginLng) ||
      isNaN(parsedDestLat) ||
      isNaN(parsedDestLng)
    ) {
      return { success: false, error: "Invalid coordinates." };
    }

    const parsedTotalSeats = parseInt(totalSeats, 10);
    if (isNaN(parsedTotalSeats) || parsedTotalSeats < 1) {
      return { success: false, error: "Total seats must be at least 1." };
    }

    const parsedPricePerSeat = parseInt(pricePerSeat, 10);
    if (isNaN(parsedPricePerSeat) || parsedPricePerSeat < 0) {
      return { success: false, error: "Price per seat must be 0 or more (in cents)." };
    }

    const parsedDepartureTime = new Date(departureTime);
    if (isNaN(parsedDepartureTime.getTime())) {
      return { success: false, error: "Invalid departure time." };
    }

    if (parsedDepartureTime <= new Date()) {
      return { success: false, error: "Departure time must be in the future." };
    }

    const inserted = await db
      .insert(rides)
      .values({
        driverId: user.id,
        originName,
        originLat: parsedOriginLat,
        originLng: parsedOriginLng,
        destName,
        destLat: parsedDestLat,
        destLng: parsedDestLng,
        departureTime: parsedDepartureTime,
        totalSeats: parsedTotalSeats,
        availableSeats: parsedTotalSeats,
        pricePerSeat: parsedPricePerSeat,
        description,
        status: "open",
      })
      .returning();

    publishEvent("ride.created", {
      rideId: inserted[0].id,
      driverId: user.id,
      departureTime: parsedDepartureTime.toISOString(),
    });

    return { success: true, rideId: inserted[0].id };
  } catch (err: unknown) {
    console.error("createRide error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to create ride.";
    return { success: false, error: message };
  }
}

// ── 2. Get Rides ──

export async function getRides(
  filters?: RideFilters
): Promise<RideWithDriver[]> {
  try {
    const conditions = [
      eq(rides.status, "open"),
      gte(rides.departureTime, new Date()),
    ];

    if (filters?.destination) {
      // Search both origin and destination names (case-insensitive)
      conditions.push(
        or(
          ilike(rides.destName, `%${filters.destination}%`),
          ilike(rides.originName, `%${filters.destination}%`)
        )!
      );
    }

    if (filters?.origin) {
      conditions.push(ilike(rides.originName, `%${filters.origin}%`));
    }

    if (filters?.date) {
      // Filter rides on the given date (start of day to end of day)
      const dateStart = new Date(filters.date);
      const dateEnd = new Date(filters.date);
      dateEnd.setHours(23, 59, 59, 999);

      if (!isNaN(dateStart.getTime())) {
        conditions.push(gte(rides.departureTime, dateStart));
        conditions.push(
          sql`${rides.departureTime} <= ${dateEnd.toISOString()}`
        );
      }
    }

    const results = await db
      .select({
        id: rides.id,
        originName: rides.originName,
        originLat: rides.originLat,
        originLng: rides.originLng,
        destName: rides.destName,
        destLat: rides.destLat,
        destLng: rides.destLng,
        departureTime: rides.departureTime,
        totalSeats: rides.totalSeats,
        availableSeats: rides.availableSeats,
        pricePerSeat: rides.pricePerSeat,
        description: rides.description,
        status: rides.status,
        createdAt: rides.createdAt,
        driver: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(rides)
      .innerJoin(users, eq(rides.driverId, users.id))
      .where(and(...conditions))
      .orderBy(asc(rides.departureTime));

    return results;
  } catch (err: unknown) {
    console.error("getRides error:", err);
    return [];
  }
}

// ── 3. Get Ride By ID ──

export async function getRideById(
  rideId: string
): Promise<RideDetail | null> {
  try {
    if (!rideId) return null;

    // Fetch ride with driver info
    const rideResults = await db
      .select({
        id: rides.id,
        originName: rides.originName,
        originLat: rides.originLat,
        originLng: rides.originLng,
        destName: rides.destName,
        destLat: rides.destLat,
        destLng: rides.destLng,
        departureTime: rides.departureTime,
        totalSeats: rides.totalSeats,
        availableSeats: rides.availableSeats,
        pricePerSeat: rides.pricePerSeat,
        description: rides.description,
        status: rides.status,
        createdAt: rides.createdAt,
        driver: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(rides)
      .innerJoin(users, eq(rides.driverId, users.id))
      .where(eq(rides.id, rideId))
      .limit(1);

    if (rideResults.length === 0) return null;

    const ride = rideResults[0];

    // Fetch accepted and pending requests with rider info
    // Alias the users table for the rider join
    const requestResults = await db
      .select({
        id: rideRequests.id,
        status: rideRequests.status,
        amountCents: rideRequests.amountCents,
        note: rideRequests.note,
        pickupName: rideRequests.pickupName,
        pickupLat: rideRequests.pickupLat,
        pickupLng: rideRequests.pickupLng,
        createdAt: rideRequests.createdAt,
        rider: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(rideRequests)
      .innerJoin(users, eq(rideRequests.riderId, users.id))
      .where(
        and(
          eq(rideRequests.rideId, rideId),
          or(
            eq(rideRequests.status, "pending"),
            eq(rideRequests.status, "accepted")
          )
        )
      );

    return {
      ...ride,
      requests: requestResults,
    };
  } catch (err: unknown) {
    console.error("getRideById error:", err);
    return null;
  }
}

// ── 4. Request to Join Ride ──

export async function requestToJoinRide(
  rideId: string,
  options?: {
    note?: string;
    pickupName?: string;
    pickupLat?: number;
    pickupLng?: number;
  }
): Promise<JoinRideResult> {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return { success: false, error: "You must be signed in to join a ride." };
    }

    if (!rideId) {
      return { success: false, error: "Ride ID is required." };
    }

    // Fetch the ride
    const rideResults = await db
      .select()
      .from(rides)
      .where(eq(rides.id, rideId))
      .limit(1);

    if (rideResults.length === 0) {
      return { success: false, error: "Ride not found." };
    }

    const ride = rideResults[0];

    if (ride.status !== "open") {
      return { success: false, error: "This ride is no longer accepting requests." };
    }

    if (ride.driverId === user.id) {
      return { success: false, error: "You cannot request to join your own ride." };
    }

    // Check if the user already has a pending or accepted request
    const existingRequests = await db
      .select()
      .from(rideRequests)
      .where(
        and(
          eq(rideRequests.rideId, rideId),
          eq(rideRequests.riderId, user.id),
          or(
            eq(rideRequests.status, "pending"),
            eq(rideRequests.status, "accepted")
          )
        )
      )
      .limit(1);

    if (existingRequests.length > 0) {
      return { success: false, error: "You have already requested to join this ride." };
    }

    // Trim note to 500 chars
    const trimmedNote = options?.note?.trim().slice(0, 500) || null;

    // Insert ride request (no payment yet — payment happens after driver accepts)
    await db.insert(rideRequests).values({
      rideId,
      riderId: user.id,
      status: "pending",
      amountCents: ride.pricePerSeat,
      note: trimmedNote,
      pickupName: options?.pickupName || null,
      pickupLat: options?.pickupLat ?? null,
      pickupLng: options?.pickupLng ?? null,
    });

    // Notify the driver immediately (in-app)
    await db.insert(notifications).values({
      userId: ride.driverId,
      rideId,
      type: "ride_request",
      message: `${user.name} requested to join your ride from ${ride.originName} to ${ride.destName}.`,
    });
    pushNotification(ride.driverId, { type: "refresh" });

    // EventBridge handles email notification asynchronously
    publishEvent("ride.request.submitted", {
      rideId,
      riderId: user.id,
      driverId: ride.driverId,
    });

    return { success: true };
  } catch (err: unknown) {
    console.error("requestToJoinRide error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to request ride.";
    return { success: false, error: message };
  }
}

// ── 4b. Confirm Ride Payment (rider pays after driver accepts) ──

export async function confirmRidePayment(
  requestId: string
): Promise<JoinRideResult> {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return { success: false, error: "You must be signed in." };
    }

    if (!requestId) {
      return { success: false, error: "Request ID is required." };
    }

    // Fetch the request
    const requestResults = await db
      .select()
      .from(rideRequests)
      .where(eq(rideRequests.id, requestId))
      .limit(1);

    if (requestResults.length === 0) {
      return { success: false, error: "Request not found." };
    }

    const request = requestResults[0];

    if (request.riderId !== user.id) {
      return { success: false, error: "You can only pay for your own requests." };
    }

    if (request.status !== "accepted") {
      return { success: false, error: "This request is not ready for payment." };
    }

    if (request.stripePaymentIntentId) {
      return { success: false, error: "Payment has already been set up." };
    }

    // Fetch the ride for price info
    const rideResults = await db
      .select()
      .from(rides)
      .where(eq(rides.id, request.rideId))
      .limit(1);

    if (rideResults.length === 0) {
      return { success: false, error: "Ride not found." };
    }

    const ride = rideResults[0];

    // Look up driver's Stripe Connect account (if set up)
    const driverResults = await db
      .select({ stripeConnectAccountId: users.stripeConnectAccountId })
      .from(users)
      .where(eq(users.id, ride.driverId))
      .limit(1);

    const driverConnectAccountId = driverResults[0]?.stripeConnectAccountId;

    // Create Stripe payment hold (routes to driver if Connect is set up)
    const paymentIntent = await createPaymentHold(
      ride.pricePerSeat,
      user.email,
      ride.id,
      user.id,
      driverConnectAccountId
    );

    // Update request with payment intent
    await db
      .update(rideRequests)
      .set({ stripePaymentIntentId: paymentIntent.id })
      .where(eq(rideRequests.id, requestId));

    return {
      success: true,
      clientSecret: paymentIntent.client_secret ?? undefined,
    };
  } catch (err: unknown) {
    console.error("confirmRidePayment error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to set up payment.";
    return { success: false, error: message };
  }
}

// ── 5. Accept Ride Request ──

export async function acceptRideRequest(
  requestId: string
): Promise<ActionResult> {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return { success: false, error: "You must be signed in." };
    }

    if (!requestId) {
      return { success: false, error: "Request ID is required." };
    }

    // Fetch the request
    const requestResults = await db
      .select()
      .from(rideRequests)
      .where(eq(rideRequests.id, requestId))
      .limit(1);

    if (requestResults.length === 0) {
      return { success: false, error: "Request not found." };
    }

    const request = requestResults[0];

    if (request.status !== "pending") {
      return { success: false, error: "This request is no longer pending." };
    }

    // Verify current user is the driver of this ride
    const rideResults = await db
      .select()
      .from(rides)
      .where(eq(rides.id, request.rideId))
      .limit(1);

    if (rideResults.length === 0) {
      return { success: false, error: "Ride not found." };
    }

    const ride = rideResults[0];

    if (ride.driverId !== user.id) {
      return { success: false, error: "Only the driver can accept requests." };
    }

    if (ride.availableSeats <= 0) {
      return { success: false, error: "No available seats remaining." };
    }

    // Update request status to accepted
    await db
      .update(rideRequests)
      .set({ status: "accepted" })
      .where(eq(rideRequests.id, requestId));

    // Decrement available seats
    const newAvailableSeats = ride.availableSeats - 1;
    const rideUpdate: { availableSeats: number; status?: "open" | "full" | "in_progress" | "completed" | "cancelled" } = {
      availableSeats: newAvailableSeats,
    };

    // If no more seats, mark ride as full
    if (newAvailableSeats === 0) {
      rideUpdate.status = "full";
    }

    await db
      .update(rides)
      .set(rideUpdate)
      .where(eq(rides.id, ride.id));

    // Create notification for the rider — tell them to confirm with payment
    await db.insert(notifications).values({
      userId: request.riderId,
      rideId: ride.id,
      type: "request_accepted",
      message: `Your request for ${ride.originName} → ${ride.destName} was accepted! Go to My Rides to confirm & pay.`,
    });
    pushNotification(request.riderId, { type: "refresh" });

    publishEvent("ride.request.accepted", {
      rideId: ride.id,
      riderId: request.riderId,
    });

    return { success: true };
  } catch (err: unknown) {
    console.error("acceptRideRequest error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to accept request.";
    return { success: false, error: message };
  }
}

// ── 6. Reject Ride Request ──

export async function rejectRideRequest(
  requestId: string
): Promise<ActionResult> {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return { success: false, error: "You must be signed in." };
    }

    if (!requestId) {
      return { success: false, error: "Request ID is required." };
    }

    // Fetch the request
    const requestResults = await db
      .select()
      .from(rideRequests)
      .where(eq(rideRequests.id, requestId))
      .limit(1);

    if (requestResults.length === 0) {
      return { success: false, error: "Request not found." };
    }

    const request = requestResults[0];

    if (request.status !== "pending") {
      return { success: false, error: "This request is no longer pending." };
    }

    // Verify current user is the driver
    const rideResults = await db
      .select()
      .from(rides)
      .where(eq(rides.id, request.rideId))
      .limit(1);

    if (rideResults.length === 0) {
      return { success: false, error: "Ride not found." };
    }

    const ride = rideResults[0];

    if (ride.driverId !== user.id) {
      return { success: false, error: "Only the driver can reject requests." };
    }

    // Cancel Stripe payment hold
    if (request.stripePaymentIntentId) {
      await cancelPaymentHold(request.stripePaymentIntentId);
    }

    // Update request status to rejected
    await db
      .update(rideRequests)
      .set({ status: "rejected" })
      .where(eq(rideRequests.id, requestId));

    // Create notification for the rider
    await db.insert(notifications).values({
      userId: request.riderId,
      rideId: ride.id,
      type: "request_rejected",
      message: `Your request to join the ride from ${ride.originName} to ${ride.destName} has been rejected.`,
    });
    pushNotification(request.riderId, { type: "refresh" });

    return { success: true };
  } catch (err: unknown) {
    console.error("rejectRideRequest error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to reject request.";
    return { success: false, error: message };
  }
}

// ── 6b. Kick Rider (by driver, removes accepted passenger) ──

export async function kickRider(
  requestId: string
): Promise<ActionResult> {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return { success: false, error: "You must be signed in." };
    }

    if (!requestId) {
      return { success: false, error: "Request ID is required." };
    }

    // Fetch the request
    const requestResults = await db
      .select()
      .from(rideRequests)
      .where(eq(rideRequests.id, requestId))
      .limit(1);

    if (requestResults.length === 0) {
      return { success: false, error: "Request not found." };
    }

    const request = requestResults[0];

    if (request.status !== "accepted") {
      return { success: false, error: "This rider is not currently on the ride." };
    }

    // Verify current user is the driver
    const rideResults = await db
      .select()
      .from(rides)
      .where(eq(rides.id, request.rideId))
      .limit(1);

    if (rideResults.length === 0) {
      return { success: false, error: "Ride not found." };
    }

    const ride = rideResults[0];

    if (ride.driverId !== user.id) {
      return { success: false, error: "Only the driver can remove riders." };
    }

    // Cancel Stripe payment hold if present
    if (request.stripePaymentIntentId) {
      try {
        await cancelPaymentHold(request.stripePaymentIntentId);
      } catch (cancelErr) {
        console.error(`Failed to cancel payment hold for request ${request.id}:`, cancelErr);
      }
    }

    // Update request status to cancelled
    await db
      .update(rideRequests)
      .set({ status: "cancelled" })
      .where(eq(rideRequests.id, requestId));

    // Free up the seat
    const newAvailableSeats = ride.availableSeats + 1;
    const rideUpdate: { availableSeats: number; status?: "open" | "full" | "in_progress" | "completed" | "cancelled" } = {
      availableSeats: newAvailableSeats,
    };

    if (ride.status === "full") {
      rideUpdate.status = "open";
    }

    await db
      .update(rides)
      .set(rideUpdate)
      .where(eq(rides.id, ride.id));

    // Notify the rider
    await db.insert(notifications).values({
      userId: request.riderId,
      rideId: ride.id,
      type: "rider_kicked",
      message: `You have been removed from the ride from ${ride.originName} to ${ride.destName}. Any payment hold has been released.`,
    });
    pushNotification(request.riderId, { type: "refresh" });

    return { success: true };
  } catch (err: unknown) {
    console.error("kickRider error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to remove rider.";
    return { success: false, error: message };
  }
}

// ── 7. Cancel Ride Request (by rider) ──

export async function cancelRideRequest(
  requestId: string
): Promise<ActionResult> {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return { success: false, error: "You must be signed in." };
    }

    if (!requestId) {
      return { success: false, error: "Request ID is required." };
    }

    // Fetch the request
    const requestResults = await db
      .select()
      .from(rideRequests)
      .where(eq(rideRequests.id, requestId))
      .limit(1);

    if (requestResults.length === 0) {
      return { success: false, error: "Request not found." };
    }

    const request = requestResults[0];

    // Verify current user is the rider who made the request
    if (request.riderId !== user.id) {
      return { success: false, error: "You can only cancel your own requests." };
    }

    if (request.status !== "pending" && request.status !== "accepted") {
      return { success: false, error: "This request cannot be cancelled." };
    }

    const wasAccepted = request.status === "accepted";

    // Cancel Stripe payment hold if present
    if (request.stripePaymentIntentId) {
      await cancelPaymentHold(request.stripePaymentIntentId);
    }

    // Update request status to cancelled
    await db
      .update(rideRequests)
      .set({ status: "cancelled" })
      .where(eq(rideRequests.id, requestId));

    // If the request was previously accepted, increment available seats
    // and potentially reopen the ride
    if (wasAccepted) {
      const rideResults = await db
        .select()
        .from(rides)
        .where(eq(rides.id, request.rideId))
        .limit(1);

      if (rideResults.length > 0) {
        const ride = rideResults[0];
        const newAvailableSeats = ride.availableSeats + 1;
        const rideUpdate: { availableSeats: number; status?: "open" | "full" | "in_progress" | "completed" | "cancelled" } = {
          availableSeats: newAvailableSeats,
        };

        // If ride was full and now has a spot, reopen it
        if (ride.status === "full") {
          rideUpdate.status = "open";
        }

        await db
          .update(rides)
          .set(rideUpdate)
          .where(eq(rides.id, ride.id));
      }
    }

    return { success: true };
  } catch (err: unknown) {
    console.error("cancelRideRequest error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to cancel request.";
    return { success: false, error: message };
  }
}

// ── 8. Complete Ride ──

export async function completeRide(
  rideId: string,
  driverLocation?: { lat: number; lng: number }
): Promise<ActionResult> {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return { success: false, error: "You must be signed in." };
    }

    if (!rideId) {
      return { success: false, error: "Ride ID is required." };
    }

    // Fetch the ride
    const rideResults = await db
      .select()
      .from(rides)
      .where(eq(rides.id, rideId))
      .limit(1);

    if (rideResults.length === 0) {
      return { success: false, error: "Ride not found." };
    }

    const ride = rideResults[0];

    if (ride.driverId !== user.id) {
      return { success: false, error: "Only the driver can complete a ride." };
    }

    if (ride.status === "completed" || ride.status === "cancelled") {
      return { success: false, error: "This ride has already ended." };
    }

    // GPS verification: driver must be within ~1.5 miles of destination
    if (!driverLocation) {
      return { success: false, error: "Location access is required to complete a ride. Please enable location services." };
    }

    const distanceMiles = haversineDistance(
      driverLocation.lat,
      driverLocation.lng,
      ride.destLat,
      ride.destLng
    );

    if (distanceMiles > 1.5) {
      return {
        success: false,
        error: `You're ${distanceMiles.toFixed(1)} miles from the destination. You must be within 1.5 miles to complete the ride.`,
      };
    }

    // Update ride status to completed
    await db
      .update(rides)
      .set({ status: "completed" })
      .where(eq(rides.id, rideId));

    // Fetch all accepted requests to capture payments and notify riders
    const acceptedRequests = await db
      .select()
      .from(rideRequests)
      .where(
        and(
          eq(rideRequests.rideId, rideId),
          eq(rideRequests.status, "accepted")
        )
      );

    // Capture payment for each accepted request and create notifications
    for (const request of acceptedRequests) {
      if (request.stripePaymentIntentId) {
        try {
          await capturePayment(request.stripePaymentIntentId);
        } catch (captureErr) {
          console.error(
            `Failed to capture payment for request ${request.id}:`,
            captureErr
          );
          // Continue processing other requests even if one capture fails
        }
      }

      await db.insert(notifications).values({
        userId: request.riderId,
        rideId: ride.id,
        type: "ride_completed",
        message: `The ride from ${ride.originName} to ${ride.destName} has been completed. Payment has been processed.`,
      });
      pushNotification(request.riderId, { type: "refresh" });
    }

    publishEvent("ride.completed", { rideId });

    return { success: true };
  } catch (err: unknown) {
    console.error("completeRide error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to complete ride.";
    return { success: false, error: message };
  }
}

// ── 9. Cancel Ride (by driver) ──

export async function cancelRide(
  rideId: string
): Promise<ActionResult> {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return { success: false, error: "You must be signed in." };
    }

    if (!rideId) {
      return { success: false, error: "Ride ID is required." };
    }

    // Fetch the ride
    const rideResults = await db
      .select()
      .from(rides)
      .where(eq(rides.id, rideId))
      .limit(1);

    if (rideResults.length === 0) {
      return { success: false, error: "Ride not found." };
    }

    const ride = rideResults[0];

    if (ride.driverId !== user.id) {
      return { success: false, error: "Only the driver can cancel a ride." };
    }

    if (ride.status === "completed" || ride.status === "cancelled") {
      return { success: false, error: "This ride has already ended." };
    }

    // Fetch all pending and accepted requests
    const activeRequests = await db
      .select()
      .from(rideRequests)
      .where(
        and(
          eq(rideRequests.rideId, rideId),
          or(
            eq(rideRequests.status, "pending"),
            eq(rideRequests.status, "accepted")
          )
        )
      );

    // Cancel all payment holds and update request statuses
    for (const request of activeRequests) {
      if (request.stripePaymentIntentId) {
        try {
          await cancelPaymentHold(request.stripePaymentIntentId);
        } catch (cancelErr) {
          console.error(
            `Failed to cancel payment hold for request ${request.id}:`,
            cancelErr
          );
        }
      }

      // Update request status to cancelled
      await db
        .update(rideRequests)
        .set({ status: "cancelled" })
        .where(eq(rideRequests.id, request.id));

      // Notify rider
      await db.insert(notifications).values({
        userId: request.riderId,
        rideId: ride.id,
        type: "ride_cancelled",
        message: `The ride from ${ride.originName} to ${ride.destName} has been cancelled by the driver.`,
      });
      pushNotification(request.riderId, { type: "refresh" });
    }

    // Update ride status to cancelled
    await db
      .update(rides)
      .set({ status: "cancelled" })
      .where(eq(rides.id, rideId));

    return { success: true };
  } catch (err: unknown) {
    console.error("cancelRide error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to cancel ride.";
    return { success: false, error: message };
  }
}

// ── 10. Get My Rides as Driver ──

export async function getMyRidesAsDriver() {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return [];
    }

    const results = await db
      .select({
        id: rides.id,
        originName: rides.originName,
        originLat: rides.originLat,
        originLng: rides.originLng,
        destName: rides.destName,
        destLat: rides.destLat,
        destLng: rides.destLng,
        departureTime: rides.departureTime,
        totalSeats: rides.totalSeats,
        availableSeats: rides.availableSeats,
        pricePerSeat: rides.pricePerSeat,
        status: rides.status,
        createdAt: rides.createdAt,
        pendingRequests: sql<number>`count(case when ${rideRequests.status} = 'pending' then 1 end)`.as("pending_requests"),
        acceptedRequests: sql<number>`count(case when ${rideRequests.status} = 'accepted' then 1 end)`.as("accepted_requests"),
      })
      .from(rides)
      .leftJoin(rideRequests, eq(rides.id, rideRequests.rideId))
      .where(eq(rides.driverId, user.id))
      .groupBy(rides.id)
      .orderBy(desc(rides.departureTime));

    return results;
  } catch (err: unknown) {
    console.error("getMyRidesAsDriver error:", err);
    return [];
  }
}

// ── 11. Get My Rides as Rider ──

export async function getMyRidesAsRider() {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return [];
    }

    const results = await db
      .select({
        requestId: rideRequests.id,
        requestStatus: rideRequests.status,
        amountCents: rideRequests.amountCents,
        hasPaid: sql<boolean>`${rideRequests.stripePaymentIntentId} IS NOT NULL`.as("has_paid"),
        requestCreatedAt: rideRequests.createdAt,
        ride: {
          id: rides.id,
          originName: rides.originName,
          originLat: rides.originLat,
          originLng: rides.originLng,
          destName: rides.destName,
          destLat: rides.destLat,
          destLng: rides.destLng,
          departureTime: rides.departureTime,
          totalSeats: rides.totalSeats,
          availableSeats: rides.availableSeats,
          pricePerSeat: rides.pricePerSeat,
          status: rides.status,
        },
        driver: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(rideRequests)
      .innerJoin(rides, eq(rideRequests.rideId, rides.id))
      .innerJoin(users, eq(rides.driverId, users.id))
      .where(eq(rideRequests.riderId, user.id))
      .orderBy(desc(rides.departureTime));

    return results;
  } catch (err: unknown) {
    console.error("getMyRidesAsRider error:", err);
    return [];
  }
}

// ── 12. Send Ride Message ──

export async function sendRideMessage(
  rideId: string,
  message: string
): Promise<ActionResult> {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return { success: false, error: "You must be signed in." };
    }

    if (!rideId || !message.trim()) {
      return { success: false, error: "Ride ID and message are required." };
    }

    if (message.length > 1000) {
      return { success: false, error: "Message is too long (max 1000 characters)." };
    }

    // Fetch the ride to verify access
    const rideResults = await db
      .select()
      .from(rides)
      .where(eq(rides.id, rideId))
      .limit(1);

    if (rideResults.length === 0) {
      return { success: false, error: "Ride not found." };
    }

    const ride = rideResults[0];
    const isDriver = ride.driverId === user.id;

    // If not the driver, must be an accepted rider
    if (!isDriver) {
      const acceptedRequest = await db
        .select()
        .from(rideRequests)
        .where(
          and(
            eq(rideRequests.rideId, rideId),
            eq(rideRequests.riderId, user.id),
            eq(rideRequests.status, "accepted")
          )
        )
        .limit(1);

      if (acceptedRequest.length === 0) {
        return { success: false, error: "Only the driver and accepted riders can send messages." };
      }
    }

    await db.insert(rideMessages).values({
      rideId,
      userId: user.id,
      message: message.trim(),
    });

    // Notify all other participants (driver + accepted riders, excluding sender)
    const acceptedRiders = await db
      .select({ riderId: rideRequests.riderId })
      .from(rideRequests)
      .where(
        and(
          eq(rideRequests.rideId, rideId),
          eq(rideRequests.status, "accepted")
        )
      );

    const participantIds = new Set<string>();
    participantIds.add(ride.driverId);
    for (const r of acceptedRiders) {
      participantIds.add(r.riderId);
    }
    participantIds.delete(user.id); // don't notify sender

    const notifValues = [...participantIds].map((uid) => ({
      userId: uid,
      rideId,
      type: "ride_message" as const,
      message: `${user.name}: ${message.trim().slice(0, 80)}${message.trim().length > 80 ? "..." : ""}`,
    }));

    if (notifValues.length > 0) {
      await db.insert(notifications).values(notifValues);
      for (const uid of participantIds) {
        pushNotification(uid, { type: "refresh" });
      }
    }

    // Push message event for live chat via IoT Core
    pushMessage(rideId, { type: "refresh" });

    return { success: true };
  } catch (err: unknown) {
    console.error("sendRideMessage error:", err);
    const message_ =
      err instanceof Error ? err.message : "Failed to send message.";
    return { success: false, error: message_ };
  }
}

// ── 13. Get Ride Messages ──

export async function getRideMessages(rideId: string) {
  try {
    const user = await getOrCreateUser();
    if (!user) return [];

    // Verify user has access (driver or accepted rider)
    const rideResults = await db
      .select()
      .from(rides)
      .where(eq(rides.id, rideId))
      .limit(1);

    if (rideResults.length === 0) return [];

    const ride = rideResults[0];
    const isDriver = ride.driverId === user.id;

    if (!isDriver) {
      const acceptedRequest = await db
        .select()
        .from(rideRequests)
        .where(
          and(
            eq(rideRequests.rideId, rideId),
            eq(rideRequests.riderId, user.id),
            eq(rideRequests.status, "accepted")
          )
        )
        .limit(1);

      if (acceptedRequest.length === 0) return [];
    }

    const messages = await db
      .select({
        id: rideMessages.id,
        message: rideMessages.message,
        createdAt: rideMessages.createdAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(rideMessages)
      .innerJoin(users, eq(rideMessages.userId, users.id))
      .where(eq(rideMessages.rideId, rideId))
      .orderBy(asc(rideMessages.createdAt));

    return messages;
  } catch (err: unknown) {
    console.error("getRideMessages error:", err);
    return [];
  }
}
