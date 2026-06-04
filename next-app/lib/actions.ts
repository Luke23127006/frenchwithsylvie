"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabase } from "./supabase";
import bcrypt from "bcryptjs";
import { signToken } from "./auth";

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
export async function handleLogin(formData: FormData) {
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

    // Create a JWT token
    const token = await signToken({
      id: user.id,
      username: user.username,
    });

    // Set HTTP-only cookie using next/headers
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });

  } catch (error: any) {
    console.error("Error in login:", error);
    return { error: error.message || "An unexpected error occurred" };
  }

  // Redirect must be outside the try-catch block because it throws an error internally in Next.js
  redirect("/dashboard");
}

// 8. Logout
export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  redirect("/login");
}
