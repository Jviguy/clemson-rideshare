import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { rideRequests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET ||
    process.env.SST_SECRET_STRIPE_WEBHOOK_SECRET ||
    "";

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        await db
          .update(rideRequests)
          .set({ status: "accepted" })
          .where(
            eq(rideRequests.stripePaymentIntentId, paymentIntent.id)
          );
        break;
      }

      case "payment_intent.canceled": {
        const paymentIntent = event.data.object;
        await db
          .update(rideRequests)
          .set({ status: "cancelled" })
          .where(
            eq(rideRequests.stripePaymentIntentId, paymentIntent.id)
          );
        break;
      }

      default:
        // Unhandled event type
        break;
    }
  } catch (err) {
    console.error("Error processing webhook event:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
