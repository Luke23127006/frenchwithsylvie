import { createSafeAction } from "../safe-action";
import { z } from "zod";

export const getClassOverviewData = createSafeAction(
  z.object({}),
  ["teacher", "admin"],
  async ({ supabase }) => {
    const { data, error } = await supabase
      .from("student_analytics_view")
      .select("*")
      .order("student_name", { ascending: true });

    if (error) {
      console.error("Failed to fetch class overview:", error);
      throw new Error(error.message);
    }
    return data;
  }
);

export const getStudentDetailedAnalytics = createSafeAction(
  z.object({ studentId: z.string() }),
  ["teacher", "admin"],
  async ({ input, supabase }) => {
    // STRICT ENFORCEMENT: Using Promise.all inside the safe action to fetch independent datasets concurrently
    const [profileRes, submissionsRes] = await Promise.all([
      supabase
        .from("users")
        .select("id, full_name, username, role")
        .eq("id", input.studentId)
        .single(),
      supabase
        .from("submissions")
        .select("*, assignments(title)")
        .eq("student_id", input.studentId)
        .order("submitted_at", { ascending: true })
    ]);

    return {
      profile: profileRes.data,
      profileError: profileRes.error,
      submissions: submissionsRes.data,
      submissionsError: submissionsRes.error
    };
  }
);
