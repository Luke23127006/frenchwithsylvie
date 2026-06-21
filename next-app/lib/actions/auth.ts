"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { signToken } from "../auth";
import { createSafeAction, createPublicAction } from "../safe-action";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  redirectUrl: z.string().optional(),
});

export const handleLogin = createPublicAction(
  loginSchema,
  async ({ input, supabase }) => {
    let redirectUrl = input.redirectUrl || "";
    
    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", input.username)
      .single();

    if (error || !user) {
      throw new Error("Invalid username or password");
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password_hash);

    if (!isPasswordValid) {
      throw new Error("Invalid username or password");
    }

    const token = await signToken({
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      state: user.state,
    });

    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });

    if (!redirectUrl) {
      redirectUrl = user.role === "student" ? "/student" : "/dashboard";
    }

    return { redirectUrl };
  }
);

// We keep logout as a regular server action because it requires no input/schema and just deletes a cookie
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  redirect("/login");
}

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export const changePassword = createSafeAction(
  changePasswordSchema,
  [], // Accessible to any authenticated role
  async ({ input, user, supabase }) => {
    const { data: userData, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error || !userData) {
      throw new Error("User not found");
    }

    const isPasswordValid = await bcrypt.compare(input.oldPassword, userData.password_hash);
    if (!isPasswordValid) {
      throw new Error("Incorrect old password");
    }

    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(input.newPassword, saltRounds);

    const { error: updateError } = await supabase
      .from("users")
      .update({ password_hash: newPasswordHash })
      .eq("id", user.id);

    if (updateError) throw new Error(updateError.message);

    return { success: true };
  }
);

export const updateOnboardingState = createSafeAction(
  z.object({}), // No input required
  ["student"], // Only students need onboarding
  async ({ user, supabase }) => {
    const { error } = await supabase
      .from("users")
      .update({ state: 'COMPLETED' })
      .eq("id", user.id);

    if (error) throw new Error(error.message);

    // Issue a new token with updated state
    const newToken = await signToken({
      ...user,
      state: 'COMPLETED',
    });

    const cookieStore = await cookies();
    cookieStore.set("auth_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });

    return { success: true };
  }
);
