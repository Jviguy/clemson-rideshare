"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock } from "lucide-react";
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
import { signInAction } from "@/lib/actions/auth";

const initialState = { success: false, error: undefined as string | undefined };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(
    signInAction,
    initialState
  );
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.push("/rides");
    }
  }, [state.success, router]);

  return (
    <Card className="shadow-2xl border-0">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>
          Sign in to your Clemson Rideshare account
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {state.error && (
            <div className="rounded-lg bg-error/10 px-4 py-3 text-sm text-error" role="alert">
              {state.error}
            </div>
          )}

          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="you@clemson.edu"
            autoComplete="email"
            required
            iconLeft={<Mail className="h-4 w-4" />}
          />

          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            iconLeft={<Lock className="h-4 w-4" />}
          />

          <Button type="submit" size="lg" loading={isPending} className="mt-2 w-full">
            Sign In
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex-col gap-3">
        <p className="text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-clemson-orange hover:text-clemson-orange-dark transition-colors"
          >
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
