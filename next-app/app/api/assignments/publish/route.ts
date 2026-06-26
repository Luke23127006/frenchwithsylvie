import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { NewAssignmentEmail } from "@/emails/NewAssignmentEmail";
import * as React from "react";

// The verifySignatureAppRouter middleware automatically handles validating 
// the Upstash QStash request signatures using your env keys.
async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { assignmentId } = body;

    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Unhide the assignment and clear publish_at
    const { data: assignmentData, error: assignmentError } = await adminSupabase
      .from("assignments")
      .update({ 
        is_hidden: false, 
        publish_at: null 
      })
      .eq("id", assignmentId)
      .select(`
        *,
        users!assignments_created_by_fkey (full_name)
      `)
      .single();

    if (assignmentError || !assignmentData) {
      console.error("Failed to unhide assignment:", assignmentError);
      return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
    }

    // 2. Fetch assignees to send notifications
    const { data: assigneesData, error: assigneesError } = await adminSupabase
      .from("assignment_assignees")
      .select("student_id")
      .eq("assignment_id", assignmentId);

    if (assigneesError || !assigneesData) {
      console.error("Failed to fetch assignees:", assigneesError);
      return NextResponse.json({ error: "Failed to fetch assignees" }, { status: 500 });
    }

    const assigneeIds = assigneesData.map(a => a.student_id);

    if (assigneeIds.length > 0) {
      const { data: studentsData, error: queryError } = await adminSupabase
        .from("users")
        .select(`
          id,
          full_name,
          user_notification_settings(email, notify_new_assignment)
        `)
        .in("id", assigneeIds);

      if (studentsData && studentsData.length > 0) {
        const teacherName = assignmentData.users?.full_name || 'Your Teacher';
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://frenchwithsylvie.online';
        const baseUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;
        const assignmentLink = `${baseUrl}/assignment/${assignmentId}`;

        const resendApiKey = process.env.RESEND_API_KEY;
        const resend = resendApiKey ? new Resend(resendApiKey) : null;

        for (const student of studentsData) {
          // 1. Insert In-App Notification
          const notificationPayload = {
            user_id: student.id,
            type: 'new_assignment',
            title: 'New Assignment',
            message: `You have a new assignment: ${assignmentData.title}`,
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
          if (resend) {
            const settings = Array.isArray(student.user_notification_settings) 
              ? student.user_notification_settings[0] 
              : student.user_notification_settings;
            
            if (settings?.email && settings?.notify_new_assignment) {
              const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

              try {
                await resend.emails.send({
                  from: fromEmail,
                  to: settings.email,
                  subject: `New Assignment: ${assignmentData.title}`,
                  react: React.createElement(NewAssignmentEmail, {
                    studentName: student.full_name,
                    assignmentTitle: assignmentData.title,
                    teacherName: teacherName,
                    assignmentLink: assignmentLink,
                  }),
                });
              } catch (emailError) {
                console.error("Failed to send email to", settings.email, emailError);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Wrap the POST handler with Upstash signature verification.
export const POST = verifySignatureAppRouter(handler);
