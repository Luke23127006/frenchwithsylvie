"use server";

import { revalidatePath } from "next/cache";
import { createSafeAction } from "../safe-action";
import { z } from "zod";
import { Resend } from "resend";
import { NewAssignmentEmail } from "@/emails/NewAssignmentEmail";
import * as React from "react";
import { createClient } from "@supabase/supabase-js";

export const createAssignment = createSafeAction(
  z.object({
    title: z.string().min(1),
    attachments: z.array(z.object({
      fileUrl: z.string(),
      fileName: z.string(),
      fileType: z.enum(['document', 'audio']),
      orderIndex: z.number()
    })),
    submissionFormat: z.enum(["DOCUMENT", "AUDIO", "BOTH"]),
    assigneeIds: z.array(z.string()),
    publishAt: z.string().optional(),
  }),
  ["teacher"],
  async ({ input, supabase, user }) => {
    // We need adminSupabase to bypass RLS for inserting into assignment_attachments if standard policies don't permit it
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: assignmentData, error: assignmentError } = await supabase
      .from("assignments")
      .insert([{ 
        title: input.title, 
        submission_format: input.submissionFormat,
        created_by: user.id,
        is_hidden: !!input.publishAt,
        publish_at: input.publishAt || null
      }])
      .select();

    if (assignmentError) throw new Error(assignmentError.message);

    const assignmentId = assignmentData[0].id;
    
    // Insert attachments into the new assignment_attachments table
    if (input.attachments && input.attachments.length > 0) {
      const attachmentsToInsert = input.attachments.map(att => ({
        assignment_id: assignmentId,
        file_name: att.fileName,
        file_url: att.fileUrl,
        file_type: att.fileType,
        order_index: att.orderIndex
      }));
      
      const { error: attachmentsError } = await adminSupabase
        .from("assignment_attachments")
        .insert(attachmentsToInsert);
        
      if (attachmentsError) {
        console.error("Failed to insert attachments:", attachmentsError);
        throw new Error("Failed to save assignment attachments: " + attachmentsError.message);
      }
    }
    
    if (input.assigneeIds && input.assigneeIds.length > 0) {
      const assigneesToInsert = input.assigneeIds.map(id => ({
        assignment_id: assignmentId,
        student_id: id
      }));
      
      const { error: assigneesError } = await supabase
        .from("assignment_assignees")
        .insert(assigneesToInsert);
        
      if (assigneesError) throw new Error(assigneesError.message);

      if (input.publishAt) {
        // Schedule via QStash
        try {
          const { Client } = await import("@upstash/qstash");
          const qstashClient = new Client({ token: process.env.QSTASH_TOKEN! });
          
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://frenchwithsylvie.online';
          const baseUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;
          
          await qstashClient.publishJSON({
            url: `${baseUrl}/api/assignments/publish`,
            body: { assignmentId },
            notBefore: Math.floor(new Date(input.publishAt).getTime() / 1000)
          });
        } catch (error) {
          console.error("Failed to schedule assignment publish with QStash:", error);
        }
      } else {
        // Asynchronously send emails to students who opted in
        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
          Promise.resolve().then(async () => {
            try {
              const resend = new Resend(resendApiKey);
              const { createClient } = await import('@supabase/supabase-js');
              const { data: studentsData, error: queryError } = await adminSupabase
                .from("users")
                .select(`
                  id,
                  full_name,
                  user_notification_settings(email, notify_new_assignment)
                `)
                .in("id", input.assigneeIds);
  
              if (studentsData && studentsData.length > 0) {
                const teacherName = user.full_name || 'Your Teacher';
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://frenchwithsylvie.online';
                const baseUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;
                const assignmentLink = `${baseUrl}/assignment/${assignmentId}`;
  
                for (const student of studentsData) {
                  // 1. Insert In-App Notification
                  const notificationPayload = {
                    user_id: student.id,
                    type: 'new_assignment',
                    title: 'New Assignment',
                    message: `You have a new assignment: ${input.title}`,
                    action_url: `/assignment/${assignmentId}`
                  };
  
                  const { data: insertedNotification, error: insertError } = await adminSupabase
                    .from('in_app_notifications')
                    .insert(notificationPayload)
                    .select()
                    .single();
  
                  if (!insertError && insertedNotification) {
                    // 2. Emit Broadcast Event
                    await adminSupabase.channel(`user_notifications_${student.id}`).send({
                      type: 'broadcast',
                      event: 'new_notification',
                      payload: insertedNotification
                    });
                  } else {
                    console.error("Failed to insert in-app notification:", insertError);
                  }
  
                  // 3. Send Email Notification (if opted in)
                  const settings = Array.isArray(student.user_notification_settings) 
                    ? student.user_notification_settings[0] 
                    : student.user_notification_settings;
                  
                  if (settings?.email && settings?.notify_new_assignment) {
                    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  
                    await resend.emails.send({
                      from: fromEmail,
                      to: settings.email,
                      subject: `New Assignment: ${input.title}`,
                      react: React.createElement(NewAssignmentEmail, {
                        studentName: student.full_name,
                        assignmentTitle: input.title,
                        teacherName: teacherName,
                        assignmentLink: assignmentLink,
                      }),
                    });
                  }
                }
              }
            } catch (error) {
              console.error("Failed to send assignment notifications:", error);
            }
          });
        }
      }
    }

    revalidatePath("/dashboard");
    return assignmentData;
  }
);

export const getAssignments = createSafeAction(
  z.object({}),
  [], // both student and teacher
  async ({ user, supabase }) => {
    if (user.role === 'student') {
      const { data, error } = await supabase
        .from("assignments")
        .select(`
          *,
          assignment_assignees!inner(student_id),
          submissions (id, student_id, grade)
        `)
        .eq('assignment_assignees.student_id', user.id)
        .is('deleted_at', null)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });
        
      if (error) throw new Error(error.message);
      const formattedData = data.map((assignment: any) => {
        const userSubmission = assignment.submissions?.find((sub: any) => sub.student_id === user.id);
        return {
          ...assignment,
          submissions_count: assignment.submissions?.length || 0,
          has_submitted: !!userSubmission,
          grade: userSubmission?.grade || null
        };
      });
      return formattedData;
    } else {
      const { data, error } = await supabase
        .from("assignments")
        .select(`
          *,
          submissions (id, grade),
          assignment_assignees (count)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      const formattedData = data.map((assignment: any) => ({
        ...assignment,
        submissions_count: assignment.submissions?.length || 0,
        ungraded_submissions_count: assignment.submissions?.filter((sub: any) => sub.grade === null).length || 0,
        assignees_count: assignment.assignment_assignees?.[0]?.count || 0
      }));
      return formattedData;
    }
  }
);

export const getAssignmentById = createSafeAction(
  z.object({ id: z.string() }),
  [], // both
  async ({ input, user, supabase }) => {
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await adminSupabase
      .from("assignments")
      .select(`
        *,
        assignment_assignees(student_id),
        assignment_attachments(*)
      `)
      .eq("id", input.id)
      .is("deleted_at", null)
      .single();

    if (error) throw new Error(error.message);

    if (user.role === "student") {
      if (data.is_hidden) throw new Error("Assignment not found");
      
      const isAssigned = data.assignment_assignees?.some(
        (a: any) => a.student_id === user.id
      );
      
      if (!isAssigned) throw new Error("You are not assigned to this assignment.");
    }

    const { assignment_assignees, ...assignmentData } = data;
    return assignmentData;
  }
);

export const getAssignmentDetailsForTeacher = createSafeAction(
  z.object({ assignmentId: z.string() }),
  ["teacher"],
  async ({ input, supabase }) => {
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: assignment, error: assignmentError } = await adminSupabase
      .from("assignments")
      .select("*, assignment_attachments(*)")
      .eq("id", input.assignmentId)
      .single();

    if (assignmentError) throw new Error(assignmentError.message);

    const { data: assigneesData, error: assigneesError } = await adminSupabase
      .from("assignment_assignees")
      .select(`
        student_id,
        users ( full_name, username )
      `)
      .eq("assignment_id", input.assignmentId);

    if (assigneesError) throw new Error(assigneesError.message);

    const { data: submissionsData, error: submissionsError } = await adminSupabase
      .from("submissions")
      .select(`
        *,
        submission_attachments (*)
      `)
      .eq("assignment_id", input.assignmentId);

    if (submissionsError) throw new Error(submissionsError.message);

    const assignees = assigneesData.map((a: any) => {
      const submission = submissionsData.find((s: any) => s.student_id === a.student_id);
      
      // Sort attachments by order_index if they exist
      if (submission && submission.submission_attachments) {
        submission.submission_attachments.sort((attA: any, attB: any) => attA.order_index - attB.order_index);
      }

      return {
        id: a.student_id,
        full_name: a.users.full_name,
        username: a.users.username,
        has_submitted: !!submission,
        submission: submission || null
      };
    });

    return { 
      ...assignment,
      assignees
    };
  }
);

export const updateAssignees = createSafeAction(
  z.object({
    assignmentId: z.string(),
    newAssigneeIds: z.array(z.string())
  }),
  ["teacher"],
  async ({ input, supabase }) => {
    const { error: deleteError } = await supabase.from("assignment_assignees").delete().eq("assignment_id", input.assignmentId);
    if (deleteError) throw new Error(deleteError.message);

    if (input.newAssigneeIds && input.newAssigneeIds.length > 0) {
      const assigneesToInsert = input.newAssigneeIds.map(id => ({
        assignment_id: input.assignmentId,
        student_id: id
      }));
      const { error: insertError } = await supabase.from("assignment_assignees").insert(assigneesToInsert);
      if (insertError) throw new Error(insertError.message);
    }
    
    revalidatePath(`/dashboard/assignment/${input.assignmentId}`);
    return { success: true };
  }
);

export const updateAssignmentTitle = createSafeAction(
  z.object({
    assignmentId: z.string(),
    title: z.string().min(1)
  }),
  ["teacher"],
  async ({ input, supabase }) => {
    const { data, error } = await supabase
      .from("assignments")
      .update({ title: input.title })
      .eq("id", input.assignmentId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/assignment/${input.assignmentId}`);
    revalidatePath(`/dashboard`);
    return data;
  }
);

export const updateAssignmentFormat = createSafeAction(
  z.object({
    assignmentId: z.string(),
    submissionFormat: z.enum(["DOCUMENT", "AUDIO", "BOTH"])
  }),
  ["teacher"],
  async ({ input, supabase }) => {
    // Check if there are any submissions
    const { count, error: countError } = await supabase
      .from("submissions")
      .select("*", { count: "exact", head: true })
      .eq("assignment_id", input.assignmentId);

    if (countError) throw new Error(countError.message);

    if (count && count > 0) {
      throw new Error("Cannot change format because submissions already exist.");
    }

    const { data, error } = await supabase
      .from("assignments")
      .update({ submission_format: input.submissionFormat })
      .eq("id", input.assignmentId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/assignment/${input.assignmentId}`);
    return data;
  }
);

export const toggleHideAssignment = createSafeAction(
  z.object({
    assignmentId: z.string(),
    isHidden: z.boolean()
  }),
  ["teacher"],
  async ({ input, supabase }) => {
    const { error } = await supabase
      .from("assignments")
      .update({ is_hidden: input.isHidden })
      .eq("id", input.assignmentId);

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard`);
    return { success: true };
  }
);

export const moveToTrash = createSafeAction(
  z.object({ assignmentId: z.string() }),
  ["teacher"],
  async ({ input, supabase }) => {
    const { error } = await supabase
      .from("assignments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", input.assignmentId);

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard`);
    return { success: true };
  }
);

export const restoreAssignment = createSafeAction(
  z.object({ assignmentId: z.string() }),
  ["teacher"],
  async ({ input, supabase }) => {
    const { error } = await supabase
      .from("assignments")
      .update({ deleted_at: null })
      .eq("id", input.assignmentId);

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard`);
    return { success: true };
  }
);

export const permanentlyDeleteAssignment = createSafeAction(
  z.object({ assignmentId: z.string() }),
  ["teacher"],
  async ({ input, supabase }) => {
    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", input.assignmentId);

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard`);
    return { success: true };
  }
);

export const getTrashedAssignments = createSafeAction(
  z.object({}),
  ["teacher"],
  async ({ supabase }) => {
    const { data, error } = await supabase
      .from("assignments")
      .select(`
        *,
        submissions (count)
      `)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (error) throw new Error(error.message);

    const formattedData = data.map((assignment: any) => ({
      ...assignment,
      submissions_count: assignment.submissions?.[0]?.count || 0
    }));

    return formattedData;
  }
);
