"use server";

import { Resource } from "sst";

export async function getStripePublishableKey(): Promise<string | null> {
  try {
    return Resource.StripePublishableKey.value;
  } catch {
    return null;
  }
}
