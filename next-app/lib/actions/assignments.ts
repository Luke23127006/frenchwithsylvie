"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from '../supabase'
import { verifyToken } from "../auth";

export async function createAssignment(title: string, fileUrl: string | null, audioUrls: string[], assigneeIds: string[]) {
  try {
    const supabase = await createClient();

    const { data: assignmentData, error: assignmentError } = await supabase
      .from("assignments")
      .insert([{ title, file_url: fileUrl, audio_urls: audioUrls }])
      .select();

    if (assignmentError) {
      console.error("Error creating assignment:", assignmentError);
      return { error: assignmentError.message };
    }

    const assignmentId = assignmentData[0].id;
    
    if (assigneeIds && assigneeIds.length > 0) {
      const assigneesToInsert = assigneeIds.map(id => ({
        assignment_id: assignmentId,
        student_id: id
      }));
      
      const { error: assigneesError } = await supabase
        .from("assignment_assignees")
        .insert(assigneesToInsert);
        
      if (assigneesError) {
        console.error("Error adding assignees:", assigneesError);
        return { error: assigneesError.message };
      }
    }

    revalidatePath("/dashboard");
    return { data: assignmentData };
  } catch (error: any) {
    console.error("Error in createAssignment:", error);
    return { error: error.message || "An unexpected error occurred" };
  }
}

export async function getAssignments() {
  try {
    const supabase = await createClient();

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return { error: "Not authenticated" };
    
    const payload = await verifyToken(token);
    if (!payload) return { error: "Invalid token" };

    if (payload.role === 'student') {
      const { data, error } = await supabase
        .from("assignments")
        .select(`
          *,
          assignment_assignees!inner(student_id),
          submissions (id, student_id)
        `)
        .eq('assignment_assignees.student_id', payload.id)
        .is('deleted_at', null)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      const formattedData = data.map((assignment: any) => ({
        ...assignment,
        submissions_count: assignment.submissions?.length || 0,
        has_submitted: assignment.submissions?.some((sub: any) => sub.student_id === payload.id) || false
      }));
      return { data: formattedData };
    } else {
      const { data, error } = await supabase
        .from("assignments")
        .select(`
          *,
          submissions (count),
          assignment_assignees (count)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const formattedData = data.map((assignment: any) => ({
        ...assignment,
        submissions_count: assignment.submissions?.[0]?.count || 0,
        assignees_count: assignment.assignment_assignees?.[0]?.count || 0
      }));
      return { data: formattedData };
    }
  } catch (error: any) {
    console.error("Error in getAssignments:", error);
    return { error: error.message || "An unexpected error occurred" };
  }
}

export async function getAssignmentById(id: string) {
  try {
    const supabase = await createClient();

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return { error: "Not authenticated" };
    
    const payload = await verifyToken(token);
    if (!payload) return { error: "Invalid token" };

    const { data, error } = await supabase
      .from("assignments")
      .select(`
        *,
        assignment_assignees(student_id)
      `)
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      console.error("Error fetching assignment:", error);
      return { error: error.message };
    }

    if (payload.role === "student") {
      if (data.is_hidden) {
        return { error: "Assignment not found" }; // Hidden acts like it doesn't exist
      }
      
      const isAssigned = data.assignment_assignees?.some(
        (a: any) => a.student_id === payload.id
      );
      
      if (!isAssigned) {
        return { authError: "You are not assigned to this assignment." };
      }
    }

    // Remove the assignees array before returning to keep payload clean
    const { assignment_assignees, ...assignmentData } = data;
    return { data: assignmentData };
  } catch (error: any) {
    console.error("Error in getAssignmentById:", error);
    return { error: error.message || "An unexpected error occurred" };
  }
}

export async function getAssignmentDetailsForTeacher(assignmentId: string) {
  try {
    const supabase = await createClient();
    
    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select("*")
      .eq("id", assignmentId)
      .single();

    if (assignmentError) throw assignmentError;

    const { data: assigneesData, error: assigneesError } = await supabase
      .from("assignment_assignees")
      .select(`
        student_id,
        users ( full_name, username )
      `)
      .eq("assignment_id", assignmentId);

    if (assigneesError) throw assigneesError;

    const { data: submissionsData, error: submissionsError } = await supabase
      .from("submissions")
      .select("*")
      .eq("assignment_id", assignmentId);

    if (submissionsError) throw submissionsError;

    const assignees = assigneesData.map((a: any) => {
      const submission = submissionsData.find((s: any) => s.student_id === a.student_id);
      return {
        id: a.student_id,
        full_name: a.users.full_name,
        username: a.users.username,
        has_submitted: !!submission,
        submission: submission || null
      };
    });

    return { 
      data: {
        ...assignment,
        assignees
      }
    };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateAssignees(assignmentId: string, newAssigneeIds: string[]) {
  try {
    const supabase = await createClient();

    const { error: deleteError } = await supabase.from("assignment_assignees").delete().eq("assignment_id", assignmentId);
    if (deleteError) throw deleteError;

    if (newAssigneeIds && newAssigneeIds.length > 0) {
      const assigneesToInsert = newAssigneeIds.map(id => ({
        assignment_id: assignmentId,
        student_id: id
      }));
      const { error: insertError } = await supabase.from("assignment_assignees").insert(assigneesToInsert);
      if (insertError) throw insertError;
    }
    
    revalidatePath(`/dashboard/assignment/${assignmentId}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateAssignmentTitle(assignmentId: string, title: string) {
  try {
    const supabase = await createClient();
    
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return { error: "Not authenticated" };
    
    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'teacher') return { error: "Unauthorized" };

    const { data, error } = await supabase
      .from("assignments")
      .update({ title })
      .eq("id", assignmentId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/dashboard/assignment/${assignmentId}`);
    revalidatePath(`/dashboard`);
    return { data };
  } catch (error: any) {
    console.error("Error in updateAssignmentTitle:", error);
    return { error: error.message };
  }
}

export async function toggleHideAssignment(assignmentId: string, isHidden: boolean) {
  try {
    const supabase = await createClient();
    
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return { error: "Not authenticated" };
    
    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'teacher') return { error: "Unauthorized" };

    const { error } = await supabase
      .from("assignments")
      .update({ is_hidden: isHidden })
      .eq("id", assignmentId);

    if (error) throw error;

    revalidatePath(`/dashboard`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function moveToTrash(assignmentId: string) {
  try {
    const supabase = await createClient();
    
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return { error: "Not authenticated" };
    
    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'teacher') return { error: "Unauthorized" };

    const { error } = await supabase
      .from("assignments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", assignmentId);

    if (error) throw error;

    revalidatePath(`/dashboard`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function restoreAssignment(assignmentId: string) {
  try {
    const supabase = await createClient();

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return { error: "Not authenticated" };
    
    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'teacher') return { error: "Unauthorized" };

    const { error } = await supabase
      .from("assignments")
      .update({ deleted_at: null })
      .eq("id", assignmentId);

    if (error) throw error;

    revalidatePath(`/dashboard`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function permanentlyDeleteAssignment(assignmentId: string) {
  try {
    const supabase = await createClient();

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return { error: "Not authenticated" };
    
    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'teacher') return { error: "Unauthorized" };

    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) throw error;

    revalidatePath(`/dashboard`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getTrashedAssignments() {
  try {
    const supabase = await createClient();

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return { error: "Not authenticated" };
    
    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'teacher') return { error: "Unauthorized" };

    const { data, error } = await supabase
      .from("assignments")
      .select(`
        *,
        submissions (count)
      `)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (error) throw error;

    const formattedData = data.map((assignment: any) => ({
      ...assignment,
      submissions_count: assignment.submissions?.[0]?.count || 0
    }));

    return { data: formattedData };
  } catch (error: any) {
    console.error("Error fetching trashed assignments:", error);
    return { error: error.message };
  }
}
