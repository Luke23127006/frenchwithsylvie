"use server";

import { createClient } from '../supabase'

export async function uploadFile(formData: FormData, bucketName: string) {
  try {
    const supabase = await createClient();

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
