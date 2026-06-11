"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "./supabase";
import bcrypt from "bcryptjs";
import { signToken, verifyToken } from "./auth";

// 1. Upload File
export async function uploadFile(formData: FormData, bucketName: string) {
  try {
    const file = formData.get("file") as File;
    if (!file) {
      return { error: "No file provided" };
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file);

    if (error) {
      console.error("Upload error:", error);
      return { error: error.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return { url: publicUrlData.publicUrl };
  } catch (error: any) {
    console.error("Error in uploadFile:", error);
    return { error: error.message || "An unexpected error occurred" };
  }
}

// 2. Create Assignment (Modified to accept assignees)
export async function createAssignment(title: string, fileUrl: string, assigneeIds: string[]) {
  try {
    const { data: assignmentData, error: assignmentError } = await supabase
      .from("assignments")
      .insert([{ title, file_url: fileUrl }])
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

// 3. Get Assignments (Filtered by role)
export async function getAssignments() {
  try {
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
          submissions (count)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const formattedData = data.map((assignment: any) => ({
        ...assignment,
        submissions_count: assignment.submissions?.[0]?.count || 0
      }));
      return { data: formattedData };
    }
  } catch (error: any) {
    console.error("Error in getAssignments:", error);
    return { error: error.message || "An unexpected error occurred" };
  }
}

// 4. Get Assignment By Id (With Authorization Check)
export async function getAssignmentById(id: string) {
  try {
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

// 5. Submit Solution (Auto extract student from token)
export async function submitSolution(assignmentId: string, fileUrl: string) {
  try {
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

// 6. Get Submissions By Assignment (Deprecated/Replaced by getAssignmentDetailsForTeacher)
export async function getSubmissionsByAssignment(assignmentId: string) {
  try {
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

// NEW: 9. Get All Students
export async function getAllStudents() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, username')
      .eq('role', 'student');
      
    if (error) throw error;
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

// NEW: 10. Get Assignment Details For Teacher
export async function getAssignmentDetailsForTeacher(assignmentId: string) {
  try {
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

// NEW: 11. Update Assignees
export async function updateAssignees(assignmentId: string, newAssigneeIds: string[]) {
  try {
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

// NEW: 12. Grade Submission
export async function gradeSubmission(submissionId: string, grade: string | null, feedback: string | null) {
  try {
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

// NEW: 13. Update Assignment Title
export async function updateAssignmentTitle(assignmentId: string, title: string) {
  try {
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

// NEW: 13. Get Student Submission
export async function getStudentSubmission(assignmentId: string) {
  try {
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

// NEW: 15. Remove Student Submission
export async function removeSubmission(submissionId: string, assignmentId: string) {
  try {
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

// NEW: 17. Toggle Hide Assignment
export async function toggleHideAssignment(assignmentId: string, isHidden: boolean) {
  try {
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

// NEW: 18. Move to Trash
export async function moveToTrash(assignmentId: string) {
  try {
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

// NEW: 19. Restore Assignment
export async function restoreAssignment(assignmentId: string) {
  try {
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

// NEW: 20. Permanently Delete Assignment
export async function permanentlyDeleteAssignment(assignmentId: string) {
  try {
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

// NEW: 21. Get Trashed Assignments
export async function getTrashedAssignments() {
  try {
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

// 7. Login
export async function handleLogin(formData: FormData) {
  let redirectUrl = formData.get("redirectUrl") as string || "";
  try {
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

// 8. Logout
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  redirect("/login");
}

// NEW: 16. Change Password
export async function changePassword(oldPassword: string, newPassword: string) {
  try {
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

// NEW: 22. Update Onboarding State
export async function updateOnboardingState() {
  try {
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
