"use server";

import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/cognito";
import { eq, and, desc } from "drizzle-orm";

async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  if (!session) return null;

  // Import users here to avoid circular issues
  const { users } = await import("@/lib/db/schema");
  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.cognitoId, session.sub))
    .limit(1);

  return result[0]?.id ?? null;
}

export async function getNotifications() {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(20);
}

export async function getUnreadCount(): Promise<number> {
  const userId = await getCurrentUserId();
  if (!userId) return 0;

  const result = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      )
    );

  return result.length;
}

export async function markNotificationAsRead(notificationId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return;

  await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId)
      )
    );
}
