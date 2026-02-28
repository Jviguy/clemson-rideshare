import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isRefresh = searchParams.get("refresh") === "true";

  if (isRefresh) {
    // User needs to restart onboarding — redirect back to account page
    return NextResponse.redirect(new URL("/account?connect=refresh", request.url));
  }

  // Success — redirect to account page with success indicator
  return NextResponse.redirect(new URL("/account?connect=success", request.url));
}
