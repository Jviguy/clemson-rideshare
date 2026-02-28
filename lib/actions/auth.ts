"use server";

import { signUp, confirmSignUp, signIn, signOut } from "@/lib/auth/cognito";
import { redirect } from "next/navigation";

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function signUpAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!name || !email || !password || !confirmPassword) {
    return { success: false, error: "All fields are required." };
  }

  if (!email.endsWith("@clemson.edu")) {
    return {
      success: false,
      error: "You must use a @clemson.edu email address.",
    };
  }

  if (password.length < 8) {
    return {
      success: false,
      error: "Password must be at least 8 characters.",
    };
  }

  if (password !== confirmPassword) {
    return { success: false, error: "Passwords do not match." };
  }

  try {
    await signUp(email, password, name);
    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}

export async function confirmAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = formData.get("email") as string;
  const code = formData.get("code") as string;

  if (!email || !code) {
    return { success: false, error: "Email and verification code are required." };
  }

  if (code.length !== 6 || !/^\d{6}$/.test(code)) {
    return { success: false, error: "Please enter a valid 6-digit code." };
  }

  try {
    await confirmSignUp(email, code);
    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}

export async function signInAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  try {
    await signIn(email, password);
    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return { success: false, error: message };
  }
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/login");
}
