"use server";

import { revalidatePath } from "next/cache";
import { createSafeAction } from "../safe-action";
import { z } from "zod";

export const submitSolution = createSafeAction(
  z.object({
    assignmentId: z.string(),
    fileUrl: z.string()
  }),
  ["student"],
  async ({ input, user, supabase }) => {
    const { data, error } = await supabase
      .from("submissions")
      .insert([{ 
        assignment_id: input.assignmentId, 
        student_id: user.id,
        student_name: user.full_name,
        file_url: input.fileUrl 
      }])
      .select();

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/assignment/${input.assignmentId}`);
    return data;
  }
);

export const getSubmissionsByAssignment = createSafeAction(
  z.object({ assignmentId: z.string() }),
  ["teacher"],
  async ({ input, supabase }) => {
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("assignment_id", input.assignmentId)
      .order('submitted_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }
);

export const gradeSubmission = createSafeAction(
  z.object({
    submissionId: z.string(),
    grade: z.string().nullable(),
    feedback: z.string().nullable()
  }),
  ["teacher"],
  async ({ input, supabase }) => {
    const { data, error } = await supabase
      .from("submissions")
      .update({ grade: input.grade, feedback: input.feedback })
      .eq("id", input.submissionId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/assignment/${data.assignment_id}`);
    return data;
  }
);

export const getStudentSubmission = createSafeAction(
  z.object({ assignmentId: z.string() }),
  ["student"],
  async ({ input, user, supabase }) => {
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("assignment_id", input.assignmentId)
      .eq("student_id", user.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }
);

export const removeSubmission = createSafeAction(
  z.object({
    submissionId: z.string(),
    assignmentId: z.string()
  }),
  ["student"],
  async ({ input, user, supabase }) => {
    const { error } = await supabase
      .from("submissions")
      .delete()
      .eq("id", input.submissionId)
      .eq("student_id", user.id); // Ensure they own it

    if (error) throw new Error(error.message);

    revalidatePath(`/assignment/${input.assignmentId}`);
    return { success: true };
  }
);
