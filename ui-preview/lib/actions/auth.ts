"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { failure, success } from "../mock-data";

export async function handleLogin({ username, password, redirectUrl }: { username: string; password: string; redirectUrl?: string }) {
  const role = username.trim().toLowerCase();
  if ((role !== "teacher" && role !== "student") || password !== "demo123") {
    return failure("Use teacher or student with the preview password demo123.");
  }
  (await cookies()).set("preview_role", role, { httpOnly: true, sameSite: "lax", path: "/" });
  const safePath = redirectUrl && /^\/(?![/\\])/.test(redirectUrl) ? redirectUrl : null;
  return success({ redirectUrl: safePath || (role === "teacher" ? "/dashboard" : "/student") });
}

export async function logout() {
  (await cookies()).delete("preview_role");
  redirect("/login");
}

export async function changePassword({ newPassword }: { oldPassword: string; newPassword: string }) {
  return newPassword.length >= 6 ? success(null) : failure("Password must be at least 6 characters long.");
}

export async function updateOnboardingState(_input: object) {
  return success(null);
}
