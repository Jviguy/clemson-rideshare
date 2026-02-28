"use client";

import { useState, useCallback, useRef } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { confirmRidePayment } from "@/lib/actions/rides";
import { getStripePublishableKey } from "@/lib/actions/stripe-key";

// ── Inner form (must be inside <Elements>) ──

function CheckoutForm({
  onSuccess,
  onClose,
  priceLabel,
}: {
  onSuccess: () => void;
  onClose: () => void;
  priceLabel: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "Validation failed.");
      setProcessing(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed.");
      setProcessing(false);
      return;
    }

    setProcessing(false);
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onClose}
          disabled={processing}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          className="flex-1"
          loading={processing}
          disabled={!stripe || !elements || processing}
        >
          Pay {priceLabel}
        </Button>
      </div>
    </form>
  );
}

// ── Modal wrapper ──

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  requestId: string;
  pricePerSeat: number;
  onSuccess: () => void;
}

export function PaymentModal({
  open,
  onClose,
  requestId,
  pricePerSeat,
  onSuccess,
}: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stripePromiseRef = useRef<Promise<Stripe | null> | null>(null);

  const initPayment = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Lazily load Stripe with the key from the server
    if (!stripePromiseRef.current) {
      const key = await getStripePublishableKey();
      if (!key) {
        setError("Stripe is not configured. Please contact support.");
        setLoading(false);
        return;
      }
      stripePromiseRef.current = loadStripe(key);
    }

    const result = await confirmRidePayment(requestId);
    if (!result.success || !result.clientSecret) {
      setError(result.error ?? "Failed to create payment.");
      setLoading(false);
      return;
    }

    setClientSecret(result.clientSecret);
    setLoading(false);
  }, [requestId]);

  // Reset state when modal closes
  function handleClose() {
    setClientSecret(null);
    setError(null);
    setLoading(false);
    onClose();
  }

  if (open && !clientSecret && !loading && !error) {
    initPayment();
  }

  const priceLabel = `$${(pricePerSeat / 100).toFixed(2)}`;

  return (
    <Modal open={open} onClose={handleClose} title="Confirm Payment">
      {loading && (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-clemson-orange" />
          <p className="text-sm text-gray-500">Setting up payment...</p>
        </div>
      )}

      {error && (
        <div className="space-y-4">
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            {error}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={initPayment}>
              Try Again
            </Button>
          </div>
        </div>
      )}

      {clientSecret && stripePromiseRef.current && (
        <Elements
          stripe={stripePromiseRef.current}
          options={{
            clientSecret,
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary: "#F56600",
              },
            },
          }}
        >
          <CheckoutForm
            onSuccess={() => {
              handleClose();
              onSuccess();
            }}
            onClose={handleClose}
            priceLabel={priceLabel}
          />
        </Elements>
      )}
    </Modal>
  );
}
