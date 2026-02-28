"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/Card";
import { signUpAction } from "@/lib/actions/auth";

const initialState = { success: false, error: undefined as string | undefined };

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(
    signUpAction,
    initialState
  );
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    if (state.success) {
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    }
  }, [state.success, router, email]);

  function handleSubmit(formData: FormData) {
    setClientError(null);

    const emailValue = formData.get("email") as string;
    const passwordValue = formData.get("password") as string;
    const confirmValue = formData.get("confirmPassword") as string;

    if (!emailValue.endsWith("@clemson.edu")) {
      setClientError("You must use a @clemson.edu email address.");
      return;
    }

    if (passwordValue.length < 8) {
      setClientError("Password must be at least 8 characters.");
      return;
    }

    if (passwordValue !== confirmValue) {
      setClientError("Passwords do not match.");
      return;
    }

    formAction(formData);
  }

  const displayError = clientError || state.error;

  return (
    <Card className="shadow-2xl border-0">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>
          Join Clemson Rideshare to find and share rides
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={handleSubmit} className="flex flex-col gap-4">
          {displayError && (
            <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error" role="alert">
              {displayError}
            </div>
          )}

          <Input
            label="Full Name"
            name="name"
            type="text"
            placeholder="John Doe"
            autoComplete="name"
            required
            iconLeft={<User className="h-4 w-4" />}
          />

          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="you@clemson.edu"
            autoComplete="email"
            required
            helperText="Must be a @clemson.edu email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            iconLeft={<Mail className="h-4 w-4" />}
          />

          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            iconLeft={<Lock className="h-4 w-4" />}
          />

          <Input
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            placeholder="Re-enter your password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            iconLeft={<ShieldCheck className="h-4 w-4" />}
          />

          <Button type="submit" size="lg" loading={isPending} className="mt-2 w-full">
            Create Account
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex-col gap-3">
        <p className="text-sm text-gray-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-clemson-orange hover:text-clemson-orange-dark transition-colors"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
