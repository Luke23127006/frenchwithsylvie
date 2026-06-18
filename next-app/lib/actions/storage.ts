"use server";

import { createSafeAction } from "../safe-action";
import { z } from "zod";

import { cookies } from "next/headers";
import { verifyToken } from "../auth";
import { createClient } from "../supabase";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export async function uploadFile(formData: FormData) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return { error: "Not authenticated" };
    
    const user = await verifyToken(token);
    if (!user) return { error: "Invalid token" };

    const file = formData.get("file") as File;
    const bucketName = formData.get("bucketName") as string;
    
    if (!file) {
      return { error: "No file provided" };
    }

    const supabase = await createClient();

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

    return { data: { url: publicUrlData.publicUrl } };
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred" };
  }
}

export async function getSignedUploadUrls(input: { files: { fileName: string, bucketName: string }[] }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return { error: "Not authenticated" };
    
    const user = await verifyToken(token);
    if (!user) return { error: "Invalid token" };

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { error: "SUPABASE_SERVICE_ROLE_KEY is not configured on the server." };
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const results = await Promise.all(input.files.map(async (f) => {
      const fileExt = f.fileName.split('.').pop();
      const newFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      
      const { data, error } = await supabaseAdmin.storage
        .from(f.bucketName)
        .createSignedUploadUrl(newFileName);
        
      if (error) throw new Error(`Failed to create signed URL for ${f.fileName}: ${error.message}`);
      
      const { data: publicUrlData } = supabaseAdmin.storage
        .from(f.bucketName)
        .getPublicUrl(newFileName);
        
      return {
        originalName: f.fileName,
        token: data.token,
        path: data.path,
        publicUrl: publicUrlData.publicUrl
      };
    }));
    
    return { data: results };
  } catch (error: any) {
    return { error: error.message || "An unexpected error occurred" };
  }
}
