"use server";

import { createClient } from '../supabase'

export async function getAllStudents() {
  try {
    const supabase = await createClient();

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
