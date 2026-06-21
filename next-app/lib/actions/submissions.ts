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
    fileUrl: z.string().optional().nullable(),
    audioUrl: z.string().optional().nullable()
  }).refine(data => data.fileUrl || data.audioUrl, {
    message: "Either fileUrl or audioUrl must be provided"
  }),
  ["student"],
  async ({ input, user, supabase }) => {
    const { data: existing } = await supabase
      .from("submissions")
      .select("id, file_url, audio_url")
      .eq("assignment_id", input.assignmentId)
      .eq("student_id", user.id)
      .maybeSingle();

    let data, error;

    if (existing) {
      const updatePayload: any = {};
      if (input.fileUrl !== undefined) updatePayload.file_url = input.fileUrl;
      if (input.audioUrl !== undefined) updatePayload.audio_url = input.audioUrl;
      
      const result = await supabase
        .from("submissions")
        .update(updatePayload)
        .eq("id", existing.id)
        .select();
      data = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from("submissions")
        .insert([{ 
          assignment_id: input.assignmentId, 
          student_id: user.id,
          student_name: user.full_name,
          file_url: input.fileUrl,
          audio_url: input.audioUrl
        }])
        .select();
      data = result.data;
      error = result.error;
    }

    if (error) throw new Error(error.message);

    // Asynchronously send email to teacher if opted in
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      Promise.resolve().then(async () => {
        try {
          const resend = new Resend(resendApiKey);
          const { createClient } = await import('@supabase/supabase-js');
          const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );

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

          if (settings?.email && settings.notify_submission_received) {
            console.log("Preparing to send email to:", settings.email);
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL ? `https://${process.env.NEXT_PUBLIC_APP_URL}` : 'http://localhost:3000';
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
  async ({ input, supabase }) => {
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("assignment_id", input.assignmentId)
      .order('submitted_at', { ascending: false });

    if (error) throw new Error(error.message);
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
              user_notification_settings!inner(email, notify_assignment_graded)
            `)
            .eq("id", data.student_id)
            .eq("user_notification_settings.notify_assignment_graded", true)
            .not("user_notification_settings.email", "is", null)
            .maybeSingle();

          if (studentData) {
            const settings = Array.isArray(studentData.user_notification_settings) 
              ? studentData.user_notification_settings[0] 
              : studentData.user_notification_settings;
            
            const email = settings?.email;
            if (email) {
              const teacherName = user.full_name || 'Your Teacher';
              const baseUrl = process.env.NEXT_PUBLIC_APP_URL ? `https://${process.env.NEXT_PUBLIC_APP_URL}` : 'http://localhost:3000';
              const assignmentLink = `${baseUrl}/assignment/${data.assignment_id}`;
              const assignmentTitle = Array.isArray(data.assignments) ? data.assignments[0]?.title : data.assignments?.title;
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
  async ({ input, user, supabase }) => {
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("assignment_id", input.assignmentId)
      .eq("student_id", user.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  }
);

export const removeSubmission = createSafeAction(
  z.object({
    submissionId: z.string(),
    assignmentId: z.string()
  }),
  ["student"],
  async ({ input, user, supabase }) => {
    const { error } = await supabase
      .from("submissions")
      .delete()
      .eq("id", input.submissionId)
      .eq("student_id", user.id); // Ensure they own it

    if (error) throw new Error(error.message);

    revalidatePath(`/assignment/${input.assignmentId}`);
    return { success: true };
  }
);
