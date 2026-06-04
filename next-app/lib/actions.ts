"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { supabase } from "./supabase";
import bcrypt from "bcryptjs";

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

// 2. Create Assignment
export async function createAssignment(title: string, fileUrl: string) {
  try {
    const { data, error } = await supabase
      .from("assignments")
      .insert([{ title, file_url: fileUrl }])
      .select();

    if (error) {
      console.error("Error creating assignment:", error);
      return { error: error.message };
    }

    revalidatePath("/dashboard");
    return { data };
  } catch (error: any) {
    console.error("Error in createAssignment:", error);
    return { error: error.message || "An unexpected error occurred" };
  }
}

// 3. Get Assignments
export async function getAssignments() {
  try {
    const { data, error } = await supabase
      .from("assignments")
      .select(`
        *,
        submissions (count)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching assignments:", error);
      return { error: error.message };
    }

    // Format the data to easily access the submissions count
    const formattedData = data.map((assignment: any) => ({
      ...assignment,
      submissions_count: assignment.submissions?.[0]?.count || 0
    }));

    return { data: formattedData };
  } catch (error: any) {
    console.error("Error in getAssignments:", error);
    return { error: error.message || "An unexpected error occurred" };
  }
}

// 4. Get Assignment By Id
export async function getAssignmentById(id: string) {
  try {
    const { data, error } = await supabase
      .from("assignments")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching assignment:", error);
      return { error: error.message };
    }

    return { data };
  } catch (error: any) {
    console.error("Error in getAssignmentById:", error);
    return { error: error.message || "An unexpected error occurred" };
  }
}

// 5. Submit Solution
export async function submitSolution(assignmentId: string, studentName: string, fileUrl: string) {
  try {
    const { data, error } = await supabase
      .from("submissions")
      .insert([{ 
        assignment_id: assignmentId, 
        student_name: studentName, 
        file_url: fileUrl 
      }])
      .select();

    if (error) {
      console.error("Error submitting solution:", error);
      return { error: error.message };
    }

    // Revalidate the teacher's dashboard view for this specific assignment
    revalidatePath(`/dashboard/assignment/${assignmentId}`);
    return { data };
  } catch (error: any) {
    console.error("Error in submitSolution:", error);
    return { error: error.message || "An unexpected error occurred" };
  }
}

// 6. Get Submissions By Assignment
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

// 7. Login
export async function login(username: string, passwordString: string) {
  try {
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

    // Set HTTP-only cookie using next/headers
    // Note: cookies() requires await in Next.js 15+
    const cookieStore = await cookies();
    cookieStore.set("auth_token", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return { 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        full_name: user.full_name 
      } 
    };
  } catch (error: any) {
    console.error("Error in login:", error);
    return { error: error.message || "An unexpected error occurred" };
  }
}
