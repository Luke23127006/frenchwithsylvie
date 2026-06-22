"use server";

import { createSafeAction } from "../safe-action";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

// Initialize admin client to bypass RLS for user_features_seen
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const getSeenFeatures = createSafeAction(
  z.object({}),
  [], // Accessible to all authenticated users
  async ({ user }) => {
    const { data, error } = await adminSupabase
      .from("user_features_seen")
      .select("feature_key")
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to fetch seen features:", error);
      throw new Error(error.message);
    }

    return data.map((row: any) => row.feature_key);
  }
);

export const markFeatureAsSeen = createSafeAction(
  z.object({ featureKey: z.string() }),
  [], // Accessible to all authenticated users
  async ({ input, user }) => {
    // Perform an UPSERT. If (user_id, feature_key) already exists, it ignores or updates seen_at
    const { error } = await adminSupabase
      .from("user_features_seen")
      .upsert(
        { user_id: user.id, feature_key: input.featureKey },
        { onConflict: 'user_id, feature_key' }
      );

    if (error) {
      console.error("Failed to mark feature as seen:", error);
      throw new Error(error.message);
    }

    return { success: true };
  }
);
