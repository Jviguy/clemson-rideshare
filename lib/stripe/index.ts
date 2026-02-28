import Stripe from "stripe";
import { Resource } from "sst";

function getStripeKey(): string {
  return Resource.StripeSecretKey.value;
}

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(getStripeKey(), {
      apiVersion: "2026-02-25.clover",
    });
  }
  return _stripe;
}

export async function createPaymentHold(
  amountCents: number,
  customerEmail: string,
  rideId: string,
  riderId: string
) {
  const stripe = getStripe();

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    capture_method: "manual", // Pre-auth only, capture later
    payment_method_types: ["card"],
    receipt_email: customerEmail,
    metadata: {
      rideId,
      riderId,
      type: "ride_payment",
    },
  });

  return paymentIntent;
}

export async function capturePayment(paymentIntentId: string) {
  const stripe = getStripe();
  return stripe.paymentIntents.capture(paymentIntentId);
}

export async function cancelPaymentHold(paymentIntentId: string) {
  const stripe = getStripe();
  return stripe.paymentIntents.cancel(paymentIntentId);
}

export async function createSetupIntent(customerEmail: string) {
  const stripe = getStripe();

  // Find or create customer
  const customers = await stripe.customers.list({ email: customerEmail, limit: 1 });
  let customer = customers.data[0];

  if (!customer) {
    customer = await stripe.customers.create({ email: customerEmail });
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customer.id,
    payment_method_types: ["card"],
  });

  return { setupIntent, customerId: customer.id };
}
