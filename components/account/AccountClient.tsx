"use client";

import { useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { startConnectOnboarding } from "@/lib/actions/account";

interface AccountClientProps {
  connectStatus: "not_started" | "pending" | "active";
  connectError: string | null;
  name: string;
  email: string;
}

export function AccountClient({
  connectStatus,
  connectError,
  name,
  email,
}: AccountClientProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Show toast for redirect params (only once, after mount)
  useEffect(() => {
    const connectParam = searchParams.get("connect");
    if (connectParam === "success") {
      toast("success", "Stripe onboarding completed! Your payout status may take a moment to update.");
    } else if (connectParam === "refresh") {
      toast("warning", "Onboarding session expired. Please try again.");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSetupPayouts() {
    startTransition(async () => {
      const result = await startConnectOnboarding();
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        toast("error", result.error ?? "Failed to start onboarding.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Profile card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Name</span>
            <span className="text-sm font-medium text-gray-900">{name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm font-medium text-gray-900">{email}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payout setup card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-clemson-orange" />
              Driver Payouts
            </CardTitle>
            {connectStatus === "active" && (
              <Badge variant="success">Active</Badge>
            )}
            {connectStatus === "pending" && (
              <Badge variant="warning">Pending</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectError && (
            <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  Connect not available
                </p>
                <p className="mt-1 text-xs text-red-700">
                  Stripe Connect needs to be enabled on the platform account. This is an admin setup step — driver payouts will work once Connect is activated in the Stripe Dashboard.
                </p>
              </div>
            </div>
          )}

          {!connectError && connectStatus === "active" && (
            <div className="flex items-start gap-3 rounded-lg bg-emerald-50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-emerald-900">
                  Payouts are set up
                </p>
                <p className="mt-1 text-xs text-emerald-700">
                  Rider payments are held until you complete the ride. Once marked complete, funds are released to your bank account minus a 10% platform fee.
                </p>
              </div>
            </div>
          )}

          {!connectError && connectStatus === "pending" && (
            <>
              <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-4">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    Onboarding incomplete
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    You started the payout setup but haven&apos;t finished. Complete onboarding to receive payments.
                  </p>
                </div>
              </div>
              <Button
                loading={isPending}
                disabled={isPending}
                onClick={handleSetupPayouts}
              >
                <ExternalLink className="h-4 w-4" />
                Continue Setup
              </Button>
            </>
          )}

          {!connectError && connectStatus === "not_started" && (
            <>
              <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Payouts not set up
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Set up payouts to receive money when riders pay for your rides. Without this, ride payments go to the platform.
                  </p>
                </div>
              </div>
              <Button
                loading={isPending}
                disabled={isPending}
                onClick={handleSetupPayouts}
              >
                <ExternalLink className="h-4 w-4" />
                Set Up Payouts
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
