"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/cognito";
import { getStripe } from "@/lib/stripe";
import { eq } from "drizzle-orm";

async function getUser() {
  const session = await getSession();
  if (!session) return null;

  const results = await db
    .select()
    .from(users)
    .where(eq(users.cognitoId, session.sub))
    .limit(1);

  return results[0] ?? null;
}

export async function getAccountStatus() {
  const user = await getUser();
  if (!user) {
    return { authenticated: false as const };
  }

  if (!user.stripeConnectAccountId) {
    return {
      authenticated: true as const,
      connectStatus: "not_started" as const,
      connectError: null as string | null,
      name: user.name,
      email: user.email,
    };
  }

  try {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);

    let connectStatus: "pending" | "active";
    if (account.payouts_enabled && account.details_submitted) {
      connectStatus = "active";
    } else {
      connectStatus = "pending";
    }

    return {
      authenticated: true as const,
      connectStatus,
      connectError: null as string | null,
      name: user.name,
      email: user.email,
    };
  } catch (err: unknown) {
    console.error("getAccountStatus Connect error:", err);
    const message = err instanceof Error ? err.message : "Failed to check Connect status.";
    return {
      authenticated: true as const,
      connectStatus: "not_started" as const,
      connectError: message,
      name: user.name,
      email: user.email,
    };
  }
}

export async function startConnectOnboarding(): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }

  try {
    const stripe = getStripe();
    let accountId = user.stripeConnectAccountId;

    // Create Express account if needed
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        metadata: { userId: user.id },
      });
      accountId = account.id;

      await db
        .update(users)
        .set({ stripeConnectAccountId: accountId })
        .where(eq(users.id, user.id));
    }

    // Build the base URL from the request context
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/api/stripe/connect?refresh=true`,
      return_url: `${baseUrl}/api/stripe/connect?success=true`,
      type: "account_onboarding",
    });

    return { success: true, url: accountLink.url };
  } catch (err: unknown) {
    console.error("startConnectOnboarding error:", err);
    const message = err instanceof Error ? err.message : "Failed to start onboarding.";
    return { success: false, error: message };
  }
}
