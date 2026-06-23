"use server";

import { revalidatePath } from "next/cache";
import { createSafeAction } from "../safe-action";
import { z } from "zod";
import { Resend } from "resend";
import React from "react";
import AssignmentGradedEmail from "@/emails/AssignmentGradedEmail";
import SubmissionReceivedEmail from "@/emails/SubmissionReceivedEmail";
import { createClient } from "@supabase/supabase-js";

export const submitSolution = createSafeAction(
  z.object({
    assignmentId: z.string(),
    attachments: z.array(z.object({
      fileName: z.string(),
      fileUrl: z.string(),
      fileType: z.string(),
      orderIndex: z.number()
    }))
  }).refine(data => data.attachments.length > 0, {
    message: "At least one attachment must be provided"
  }),
  ["student"],
  async ({ input, user }) => {
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existing } = await adminSupabase
      .from("submissions")
      .select("id, file_url, audio_url")
      .eq("assignment_id", input.assignmentId)
      .eq("student_id", user.id)
      .maybeSingle();

    let data, error;
    let submissionId;

    // Find first document and first audio for legacy columns (Two-Phase Rollout)
    const firstDoc = input.attachments.find(a => a.fileType === 'document');
    const firstAudio = input.attachments.find(a => a.fileType === 'audio');
    const legacyFileUrl = firstDoc ? firstDoc.fileUrl : null;
    const legacyAudioUrl = firstAudio ? firstAudio.fileUrl : null;

    if (existing) {
      submissionId = existing.id;
      const updatePayload: any = {
        file_url: legacyFileUrl,
        audio_url: legacyAudioUrl
      };
      
      const result = await adminSupabase
        .from("submissions")
        .update(updatePayload)
        .eq("id", existing.id)
        .select();
      data = result.data;
      error = result.error;

      // Delete old attachments to replace with new array
      await adminSupabase.from("submission_attachments").delete().eq("submission_id", submissionId);
    } else {
      // Ensure we pass constraint check submissions_has_file_or_audio
      const fallbackUrl = legacyFileUrl || legacyAudioUrl || input.attachments[0]?.fileUrl;
      const result = await adminSupabase
        .from("submissions")
        .insert([{ 
          assignment_id: input.assignmentId, 
          student_id: user.id,
          student_name: user.full_name,
          file_url: legacyFileUrl || (legacyAudioUrl ? null : fallbackUrl),
          audio_url: legacyAudioUrl || (legacyFileUrl ? null : fallbackUrl)
        }])
        .select();
      data = result.data;
      error = result.error;
      if (data && data.length > 0) {
        submissionId = data[0].id;
      }
    }

    if (error) throw new Error(error.message);

    // Insert new attachments
    if (submissionId && input.attachments.length > 0) {
      const attachmentsToInsert = input.attachments.map(att => ({
        submission_id: submissionId,
        file_name: att.fileName,
        file_url: att.fileUrl,
        file_type: att.fileType,
        order_index: att.orderIndex
      }));

      const { error: attachError } = await adminSupabase
        .from("submission_attachments")
        .insert(attachmentsToInsert);

      if (attachError) throw new Error(attachError.message);
    }

    // Asynchronously send email to teacher if opted in
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      Promise.resolve().then(async () => {
        try {
          const resend = new Resend(resendApiKey);

          const { data: assignmentData, error: fetchError } = await adminSupabase
            .from("assignments")
            .select(`
              title,
              created_by,
              users!assignments_created_by_fkey ( full_name )
            `)
            .eq("id", input.assignmentId)
            .single();

          if (fetchError) {
            console.error("Failed to fetch assignment for notification:", fetchError.message);
            return;
          }

          if (!assignmentData || !assignmentData.created_by) {
            console.log("No assignmentData or created_by:", assignmentData);
            return;
          }

          console.log("Fetching settings for user:", assignmentData.created_by);
          const { data: settings, error: settingsError } = await adminSupabase
            .from("user_notification_settings")
            .select("email, notify_submission_received")
            .eq("user_id", assignmentData.created_by)
            .single();

          if (settingsError) {
            console.error("Settings error:", settingsError);
          }

          console.log("Teacher settings:", settings);

          // 1. Insert In-App Notification
          const notificationPayload = {
            user_id: assignmentData.created_by,
            type: 'submission_received',
            title: 'New Submission',
            message: `${user.full_name} submitted: ${assignmentData.title}`,
            action_url: `/dashboard/assignment/${input.assignmentId}`
          };

          const { data: insertedNotification, error: insertError } = await adminSupabase
            .from('in_app_notifications')
            .insert(notificationPayload)
            .select()
            .single();

          if (!insertError && insertedNotification) {
            // 2. Emit Broadcast Event
            await adminSupabase.channel(`user_notifications_${assignmentData.created_by}`).send({
              type: 'broadcast',
              event: 'new_notification',
              payload: insertedNotification
            });
          } else {
            console.error("Failed to insert in-app notification:", insertError);
          }

          if (settings?.email && settings.notify_submission_received) {
            console.log("Preparing to send email to:", settings.email);
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';
            const baseUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;
            const submissionLink = `${baseUrl}/dashboard/assignment/${input.assignmentId}`;
            const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
            const usersData = assignmentData.users as any;
            const teacherName = Array.isArray(usersData) ? usersData[0]?.full_name : usersData?.full_name || 'Teacher';

            const resp = await resend.emails.send({
              from: fromEmail,
              to: settings.email,
              subject: `New Submission: ${assignmentData.title}`,
              react: React.createElement(SubmissionReceivedEmail, {
                teacherName: teacherName as string,
                studentName: user.full_name as string,
                assignmentTitle: assignmentData.title,
                submissionLink: submissionLink
              }),
            });
            console.log("Resend email response:", resp);
          } else {
            console.log("Email not sent. settings.email:", settings?.email, "notify:", settings?.notify_submission_received);
          }
        } catch (err) {
          console.error("Failed to send submission email (catch block):", err);
          console.error("Failed to send submission email:", err);
        }
      });
    }

    revalidatePath(`/dashboard/assignment/${input.assignmentId}`);
    return data;
  }
);

export const getSubmissionsByAssignment = createSafeAction(
  z.object({ assignmentId: z.string() }),
  ["teacher"],
  async ({ input }) => {
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await adminSupabase
      .from("submissions")
      .select(`
        *,
        submission_attachments (*)
      `)
      .eq("assignment_id", input.assignmentId)
      .order('submitted_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Sort attachments by order_index
    if (data) {
      data.forEach(sub => {
        if (sub.submission_attachments) {
          sub.submission_attachments.sort((a: any, b: any) => a.order_index - b.order_index);
        }
      });
    }

    return data;
  }
);

export const gradeSubmission = createSafeAction(
  z.object({
    submissionId: z.string(),
    grade: z.string().nullable(),
    feedback: z.string().nullable()
  }),
  ["teacher"],
  async ({ input, user, supabase }) => {
    const { data, error } = await supabase
      .from("submissions")
      .update({ grade: input.grade, feedback: input.feedback })
      .eq("id", input.submissionId)
      .select(`
        *,
        assignments (
          title
        )
      `)
      .single();

    if (error) throw new Error(error.message);

    // Asynchronously send email to student if opted in
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey && data.student_id) {
      Promise.resolve().then(async () => {
        try {
          const resend = new Resend(resendApiKey);
          const { createClient } = await import('@supabase/supabase-js');
          const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );
          
          const { data: studentData } = await adminSupabase
            .from("users")
            .select(`
              id,
              full_name,
              user_notification_settings(email, notify_assignment_graded)
            `)
            .eq("id", data.student_id)
            .maybeSingle();

          if (studentData) {
            const assignmentTitle = Array.isArray(data.assignments) ? data.assignments[0]?.title : data.assignments?.title;
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';
            const baseUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;
            const assignmentLink = `${baseUrl}/assignment/${data.assignment_id}`;

            // 1. Insert In-App Notification
            const notificationPayload = {
              user_id: data.student_id,
              type: 'assignment_graded',
              title: 'Assignment Graded',
              message: `Your assignment "${assignmentTitle || 'Assignment'}" has been graded.`,
              action_url: `/assignment/${data.assignment_id}`
            };

            const { data: insertedNotification, error: insertError } = await adminSupabase
              .from('in_app_notifications')
              .insert(notificationPayload)
              .select()
              .single();

            if (!insertError && insertedNotification) {
              // 2. Emit Broadcast Event
              await adminSupabase.channel(`user_notifications_${data.student_id}`).send({
                type: 'broadcast',
                event: 'new_notification',
                payload: insertedNotification
              });
            } else {
              console.error("Failed to insert in-app notification:", insertError);
            }

            // 3. Send Email Notification (if opted in)
            const settings = Array.isArray(studentData.user_notification_settings) 
              ? studentData.user_notification_settings[0] 
              : studentData.user_notification_settings;
            
            const email = settings?.email;
            if (email && settings?.notify_assignment_graded) {
              const teacherName = user.full_name || 'Your Teacher';
              const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

              await resend.emails.send({
                from: fromEmail,
                to: email,
                subject: `Assignment Graded: ${assignmentTitle || 'Your Assignment'}`,
                react: React.createElement(AssignmentGradedEmail, {
                  studentName: studentData.full_name,
                  assignmentTitle: assignmentTitle || 'Assignment',
                  teacherName: teacherName,
                  assignmentLink: assignmentLink,
                  grade: input.grade,
                  feedback: input.feedback
                }),
              });
            }
          }
        } catch (error) {
          console.error("Failed to send grading notification:", error);
        }
      });
    }

    revalidatePath(`/dashboard/assignment/${data.assignment_id}`);
    return data;
  }
);

export const getStudentSubmission = createSafeAction(
  z.object({ assignmentId: z.string() }),
  ["student"],
  async ({ input, user }) => {
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data, error } = await adminSupabase
      .from("submissions")
      .select(`
        *,
        submission_attachments (*)
      `)
      .eq("assignment_id", input.assignmentId)
      .eq("student_id", user.id)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (data && data.submission_attachments) {
      data.submission_attachments.sort((a: any, b: any) => a.order_index - b.order_index);
    }

    return data;
  }
);

export const removeSubmission = createSafeAction(
  z.object({
    submissionId: z.string(),
    assignmentId: z.string()
  }),
  ["student"],
  async ({ input, user }) => {
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { error } = await adminSupabase
      .from("submissions")
      .delete()
      .eq("id", input.submissionId)
      .eq("student_id", user.id); // Ensure they own it

    if (error) throw new Error(error.message);

    revalidatePath(`/assignment/${input.assignmentId}`);
    return { success: true };
  }
);
