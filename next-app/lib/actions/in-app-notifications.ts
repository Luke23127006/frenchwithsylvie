"use server";

import { createSafeAction } from "../safe-action";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Initialize admin client to bypass RLS for in_app_notifications
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const getNotifications = createSafeAction(
  z.object({}),
  [], // both student and teacher
  async ({ user }) => {
    // Fetch the 20 most recent notifications for the logged-in user
    const { data, error } = await adminSupabase
      .from("in_app_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Failed to fetch notifications:", error);
      throw new Error(error.message);
    }

    return data;
  }
);

export const markAsRead = createSafeAction(
  z.object({ notificationId: z.string() }),
  [], // both student and teacher
  async ({ input, user }) => {
    // Mark a specific notification as read, ensuring it belongs to the user
    const { error } = await adminSupabase
      .from("in_app_notifications")
      .update({ is_read: true })
      .eq("id", input.notificationId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to mark notification as read:", error);
      throw new Error(error.message);
    }

    // Since this is called from an optimistic UI update, revalidation might not be strictly necessary, 
    // but it ensures the server state is refreshed.
    revalidatePath("/", "layout");
    return { success: true };
  }
);

export const markAllAsRead = createSafeAction(
  z.object({}),
  [], // both student and teacher
  async ({ user }) => {
    // Mark all unread notifications for the user as read
    const { error } = await adminSupabase
      .from("in_app_notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (error) {
      console.error("Failed to mark all notifications as read:", error);
      throw new Error(error.message);
    }

    revalidatePath("/", "layout");
    return { success: true };
  }
);
