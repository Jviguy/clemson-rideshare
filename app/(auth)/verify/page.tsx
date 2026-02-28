"use client";

import { useActionState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { KeyRound, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { confirmAction } from "@/lib/actions/auth";

const initialState = { success: false, error: undefined as string | undefined };

function VerifyForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    confirmAction,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      router.push("/login?verified=true");
    }
  }, [state.success, router]);

  return (
    <Card className="shadow-2xl border-0">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-clemson-orange/10">
          <Mail className="h-6 w-6 text-clemson-orange" />
        </div>
        <CardTitle className="text-xl">Check your email</CardTitle>
        <CardDescription>
          We sent a verification code to{" "}
          <span className="font-medium text-gray-700">{email || "your email"}</span>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state.error && (
            <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error" role="alert">
              {state.error}
            </div>
          )}

          {/* Hidden email field */}
          <input type="hidden" name="email" value={email} />

          <Input
            label="Verification Code"
            name="code"
            type="text"
            inputMode="numeric"
            placeholder="000000"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="\d{6}"
            required
            helperText="Enter the 6-digit code from your email"
            iconLeft={<KeyRound className="h-4 w-4" />}
            className="text-center text-lg tracking-[0.3em] font-mono"
          />

          <Button type="submit" size="lg" loading={isPending} className="mt-2 w-full">
            Verify Account
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <Card className="shadow-2xl border-0">
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-clemson-orange border-t-transparent" />
            </div>
          </CardContent>
        </Card>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
