import { RDSDataClient, ExecuteStatementCommand } from "@aws-sdk/client-rds-data";
import Stripe from "stripe";

const rdsClient = new RDSDataClient({});
const DATABASE_ARN = process.env.DATABASE_ARN || "";
const DATABASE_SECRET_ARN = process.env.DATABASE_SECRET_ARN || "";
const DATABASE_NAME = process.env.DATABASE_NAME || "clemson_rideshare";

function getStripe() {
  return new Stripe(
    process.env.STRIPE_SECRET_KEY || process.env.SST_SECRET_STRIPE_SECRET_KEY || "",
    { apiVersion: "2025-04-30.basil" }
  );
}

async function executeSQL(sql: string, parameters: { name: string; value: { stringValue?: string; longValue?: number; booleanValue?: boolean } }[] = []) {
  const command = new ExecuteStatementCommand({
    resourceArn: DATABASE_ARN,
    secretArn: DATABASE_SECRET_ARN,
    database: DATABASE_NAME,
    sql,
    parameters: parameters.map((p) => ({
      name: p.name,
      value: p.value,
    })),
  });
  return rdsClient.send(command);
}

type WorkflowEvent = {
  action: string;
  requestId?: string;
  rideId?: string;
  riderId?: string;
  driverId?: string;
  amountCents?: number;
  riderEmail?: string;
  paymentIntentId?: string;
};

export const handler = async (event: WorkflowEvent) => {
  console.log("Ride workflow event:", JSON.stringify(event));

  switch (event.action) {
    case "CREATE_PAYMENT_HOLD": {
      const { rideId, riderId, amountCents, riderEmail } = event;
      if (!rideId || !riderId || !amountCents || !riderEmail) {
        throw new Error("Missing required fields for CREATE_PAYMENT_HOLD");
      }

      const stripe = getStripe();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "usd",
        capture_method: "manual",
        payment_method_types: ["card"],
        receipt_email: riderEmail,
        metadata: { rideId, riderId, type: "ride_payment" },
      });

      // Update ride request with payment intent ID
      await executeSQL(
        "UPDATE ride_requests SET stripe_payment_intent_id = :paymentIntentId WHERE ride_id = :rideId AND rider_id = :riderId AND status = 'pending'",
        [
          { name: "paymentIntentId", value: { stringValue: paymentIntent.id } },
          { name: "rideId", value: { stringValue: rideId } },
          { name: "riderId", value: { stringValue: riderId } },
        ]
      );

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
      };
    }

    case "NOTIFY_DRIVER": {
      const { driverId, rideId, riderId } = event;
      if (!driverId || !rideId) {
        throw new Error("Missing required fields for NOTIFY_DRIVER");
      }

      await executeSQL(
        "INSERT INTO notifications (id, user_id, ride_id, type, message, read) VALUES (gen_random_uuid(), :userId, :rideId, 'ride_request', :message, false)",
        [
          { name: "userId", value: { stringValue: driverId } },
          { name: "rideId", value: { stringValue: rideId } },
          {
            name: "message",
            value: { stringValue: `A new rider has requested to join your ride.` },
          },
        ]
      );

      return { notified: true, driverId, riderId };
    }

    case "CAPTURE_PAYMENT": {
      const { paymentIntentId, requestId } = event;
      if (!paymentIntentId || !requestId) {
        throw new Error("Missing required fields for CAPTURE_PAYMENT");
      }

      const stripe = getStripe();
      await stripe.paymentIntents.capture(paymentIntentId);

      return { captured: true, paymentIntentId };
    }

    case "CANCEL_HOLD": {
      const { paymentIntentId } = event;
      if (!paymentIntentId) {
        throw new Error("Missing paymentIntentId for CANCEL_HOLD");
      }

      const stripe = getStripe();
      await stripe.paymentIntents.cancel(paymentIntentId);

      return { cancelled: true, paymentIntentId };
    }

    default:
      throw new Error(`Unknown action: ${event.action}`);
  }
};
