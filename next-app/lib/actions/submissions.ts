"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from '../supabase'
import { verifyToken } from "../auth";

export async function submitSolution(assignmentId: string, fileUrl: string) {
  try {
    const supabase = await createClient();

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return { error: "Not authenticated" };
    
    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'student') return { error: "Unauthorized" };

    const { data, error } = await supabase
      .from("submissions")
      .insert([{ 
        assignment_id: assignmentId, 
        student_id: payload.id,
        student_name: payload.full_name,
        file_url: fileUrl 
      }])
      .select();

    if (error) throw error;

    revalidatePath(`/dashboard/assignment/${assignmentId}`);
    return { data };
  } catch (error: any) {
    console.error("Error in submitSolution:", error);
    return { error: error.message || "An unexpected error occurred" };
  }
}

export async function getSubmissionsByAssignment(assignmentId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error("Error fetching submissions:", error);
      return { error: error.message };
    }

    return { data };
  } catch (error: any) {
    console.error("Error in getSubmissionsByAssignment:", error);
    return { error: error.message || "An unexpected error occurred" };
  }
}

export async function gradeSubmission(submissionId: string, grade: string | null, feedback: string | null) {
  try {
    const supabase = await createClient();

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return { error: "Not authenticated" };
    
    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'teacher') return { error: "Unauthorized" };

    const { data, error } = await supabase
      .from("submissions")
      .update({ grade, feedback })
      .eq("id", submissionId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/dashboard/assignment/${data.assignment_id}`);
    return { data };
  } catch (error: any) {
    console.error("Error in gradeSubmission:", error);
    return { error: error.message };
  }
}

export async function getStudentSubmission(assignmentId: string) {
  try {
    const supabase = await createClient();

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return { error: "Not authenticated" };
    
    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'student') return { error: "Unauthorized" };

    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .eq("student_id", payload.id)
      .maybeSingle();

    if (error) throw error;
    return { data };
  } catch (error: any) {
    console.error("Error in getStudentSubmission:", error);
    return { error: error.message };
  }
}

export async function removeSubmission(submissionId: string, assignmentId: string) {
  try {
    const supabase = await createClient();

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return { error: "Not authenticated" };
    
    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'student') return { error: "Unauthorized" };

    const { error } = await supabase
      .from("submissions")
      .delete()
      .eq("id", submissionId)
      .eq("student_id", payload.id); // Ensure they own it

    if (error) throw error;

    revalidatePath(`/assignment/${assignmentId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error in removeSubmission:", error);
    return { error: error.message };
  }
}
