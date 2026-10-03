import "server-only";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";
import type { TokenPayload } from "./auth";
import { FEEDBACK_BUCKET, MAX_FEEDBACK_FILE_SIZE, type FeedbackAttachment } from "./feedback";

export function feedbackClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type FeedbackClient = ReturnType<typeof feedbackClient>;

export async function requireFeedbackAccess(client: FeedbackClient, user: TokenPayload, submissionId: string, write = false) {
  const { data: submission, error } = await client.from("submissions")
    .select("id, student_id, assignment_id, assignments!inner(created_by)").eq("id", submissionId).single();
  if (error || !submission) throw new Error("Submission not found or access denied.");
  const relation = submission.assignments as unknown as { created_by: string } | { created_by: string }[];
  const assignment = Array.isArray(relation) ? relation[0] : relation;
  const isTeacher = user.role === "teacher" && assignment?.created_by === user.id;
  const isStudent = !write && user.role === "student" && submission.student_id === user.id;
  if (!isTeacher && !isStudent) throw new Error("You cannot access this feedback.");
  return submission;
}

export async function validateFeedbackPdf(bytes: Uint8Array, expectedSize: number) {
  if (bytes.length !== expectedSize || bytes.length > MAX_FEEDBACK_FILE_SIZE ||
      new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
    throw new Error("The uploaded file is not a valid PDF or its size does not match.");
  }
  try {
    const document = await PDFDocument.load(bytes, { updateMetadata: false });
    if (document.getPageCount() === 0) throw new Error("Empty PDF");
  } catch {
    throw new Error("This PDF cannot be opened. Upload a valid PDF without password protection.");
  }
}

export type SavedReview = {
  id: string; student_id: string | null; assignment_id: string;
  grade: string | null; feedback: string | null;
  assignments: { title: string };
  feedback_attachments: FeedbackAttachment[];
};

export async function saveFeedbackReview(user: TokenPayload, input: {
  submissionId: string; grade: string | null; feedback: string | null; attachmentIds: string[];
}): Promise<SavedReview> {
  const client = feedbackClient();
  await requireFeedbackAccess(client, user, input.submissionId, true);
  if (input.attachmentIds.length) {
    const { data: attachments, error } = await client.from("feedback_attachments").select("*")
      .eq("submission_id", input.submissionId).in("id", input.attachmentIds);
    if (error) throw new Error(error.message);
    if (attachments.length !== input.attachmentIds.length) throw new Error("Attachment not found.");
    for (const attachment of attachments) {
      if (attachment.published_at) continue;
      if (attachment.uploaded_by !== user.id) throw new Error("Attachment access denied.");
      const { data: file, error: downloadError } = await client.storage.from(FEEDBACK_BUCKET).download(attachment.storage_path);
      if (downloadError || !file) throw new Error("PDF upload is incomplete. Please retry.");
      await validateFeedbackPdf(new Uint8Array(await file.arrayBuffer()), attachment.file_size);
      const { error: verifyError } = await client.from("feedback_attachments")
        .update({ verified_at: new Date().toISOString() }).eq("id", attachment.id);
      if (verifyError) throw new Error(verifyError.message);
    }
  }
  const { data, error } = await client.rpc("save_submission_review", {
    p_submission_id: input.submissionId, p_teacher_id: user.id,
    p_grade: input.grade === null ? null : String(Number(input.grade)),
    p_feedback: input.feedback, p_attachment_ids: input.attachmentIds,
  });
  if (error) throw new Error(error.message);
  return data as SavedReview;
}

// Run after review activity; the optional scheduled endpoint also drains this queue.
export async function cleanupFeedbackFiles() {
  const client = feedbackClient();
  const { error: pruneError } = await client.from("feedback_attachments").delete()
    .is("published_at", null).lt("created_at", new Date(Date.now() - 86400000).toISOString());
  if (pruneError) throw new Error(pruneError.message);
  const { data, error } = await client.from("feedback_storage_cleanup").select("storage_path")
    .lte("delete_after", new Date().toISOString()).limit(100);
  if (error) throw new Error(error.message);
  if (!data.length) return;
  const paths = data.map((row) => row.storage_path);
  const { error: storageError } = await client.storage.from(FEEDBACK_BUCKET).remove(paths);
  if (storageError) throw new Error(storageError.message);
  const { error: queueError } = await client.from("feedback_storage_cleanup").delete().in("storage_path", paths);
  if (queueError) throw new Error(queueError.message);
}
