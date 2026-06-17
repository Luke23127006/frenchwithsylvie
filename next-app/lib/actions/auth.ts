"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from '../supabase'
import bcrypt from "bcryptjs";
import { signToken, verifyToken } from "../auth";

export async function handleLogin(formData: FormData) {
  let redirectUrl = formData.get("redirectUrl") as string || "";
  try {
    const supabase = await createClient();
    
    const username = formData.get("username") as string;
    const passwordString = formData.get("password") as string;

    if (!username || !passwordString) {
      return { error: "Username and password are required" };
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single();

    if (error || !user) {
      return { error: "Invalid username or password" };
    }

    const isPasswordValid = await bcrypt.compare(passwordString, user.password_hash);

    if (!isPasswordValid) {
      return { error: "Invalid username or password" };
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
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });

    if (!redirectUrl) {
      redirectUrl = user.role === "student" ? "/student" : "/dashboard";
    }

  } catch (error: any) {
    console.error("Error in login:", error);
    return { error: error.message || "An unexpected error occurred" };
  }

  if (redirectUrl) {
    redirect(redirectUrl);
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  redirect("/login");
}

export async function changePassword(oldPassword: string, newPassword: string) {
  try {
    const supabase = await createClient();

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return { error: "Not authenticated" };
    
    const payload = await verifyToken(token);
    if (!payload) return { error: "Unauthorized" };

    if (!oldPassword || !newPassword) {
      return { error: "Old password and new password are required" };
    }

    if (newPassword.length < 6) {
      return { error: "New password must be at least 6 characters" };
    }

    const { data: user, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", payload.id)
      .single();

    if (error || !user) {
      return { error: "User not found" };
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isPasswordValid) {
      return { error: "Incorrect old password" };
    }

    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    const { error: updateError } = await supabase
      .from("users")
      .update({ password_hash: newPasswordHash })
      .eq("id", payload.id);

    if (updateError) throw updateError;

    return { success: true };
  } catch (error: any) {
    console.error("Error in changePassword:", error);
    return { error: error.message };
  }
}

export async function updateOnboardingState() {
  try {
    const supabase = await createClient();

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return { error: "Not authenticated" };
    
    const payload = await verifyToken(token);
    if (!payload) return { error: "Unauthorized" };

    const { error } = await supabase
      .from("users")
      .update({ state: 'COMPLETED' })
      .eq("id", payload.id);

    if (error) throw error;

    // Issue a new token with updated state
    const newToken = await signToken({
      ...payload,
      state: 'COMPLETED',
    });

    cookieStore.set("auth_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error in updateOnboardingState:", error);
    return { error: error.message };
  }
}
