'use server';

import { cookies } from 'next/headers';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const updatePreferencesSchema = z.object({
  notify_new_assignment: z.boolean().optional(),
  notify_assignment_graded: z.boolean().optional(),
  notify_deadline_reminder: z.boolean().optional(),
});

export async function getNotificationSettings() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  const payload = (await verifyToken(token)) as TokenPayload | null;
  if (!payload || !payload.id) {
    return null;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('user_notification_settings')
    .select('*')
    .eq('user_id', payload.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function updateNotificationPreferences(
  preferences: z.infer<typeof updatePreferencesSchema>
) {
  const parsed = updatePreferencesSchema.safeParse(preferences);
  
  if (!parsed.success) {
    return { error: 'Invalid preferences format' };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return { error: 'Unauthorized' };
  }

  const payload = (await verifyToken(token)) as TokenPayload | null;
  if (!payload || !payload.id) {
    return { error: 'Unauthorized' };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from('user_notification_settings')
    .update(parsed.data)
    .eq('user_id', payload.id);

  if (error) {
    console.error('Failed to update notification preferences:', error);
    return { error: 'Failed to update preferences' };
  }

  revalidatePath('/dashboard');
  revalidatePath('/student');
  return { success: true };
}
