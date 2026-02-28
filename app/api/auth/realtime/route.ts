import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/cognito";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get internal user ID for topic subscription
  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.cognitoId, session.sub))
    .limit(1);

  const userId = result[0]?.id;
  if (!userId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get access token from httpOnly cookie
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "No token" }, { status: 401 });
  }

  return NextResponse.json({
    token: accessToken,
    userId,
  });
}
