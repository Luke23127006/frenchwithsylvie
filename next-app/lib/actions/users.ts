"use server";

import { createSafeAction } from "../safe-action";
import { z } from "zod";

export const getAllStudents = createSafeAction(
  z.object({}),
  ["teacher"], // Only teachers should be listing all students usually
  async ({ supabase }) => {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, username')
      .eq('role', 'student');
      
    if (error) throw new Error(error.message);
    return data;
  }
);
