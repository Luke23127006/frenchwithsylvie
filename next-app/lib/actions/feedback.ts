"use server";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { z } from "zod";
import { createSafeAction } from "../safe-action";
import { FEEDBACK_BUCKET, feedbackUploadSchema, type FeedbackAttachment } from "../feedback";
import { cleanupFeedbackFiles, feedbackClient, requireFeedbackAccess } from "../feedback-server";

export const prepareFeedbackUpload = createSafeAction(feedbackUploadSchema, ["teacher"], async ({ input, user }) => {
  const client = feedbackClient();
  await requireFeedbackAccess(client, user, input.submissionId, true);
  const id = randomUUID();
  const path = `${input.submissionId}/${id}.pdf`;
  const { error } = await client.from("feedback_attachments").insert({
    id, submission_id: input.submissionId, uploaded_by: user.id,
    storage_path: path, file_name: input.fileName, file_size: input.fileSize,
  });
  if (error) throw new Error(error.message);
  after(async () => { try { await cleanupFeedbackFiles(); } catch (error) { console.error("Feedback cleanup:", error); } });
  const { data, error: uploadError } = await client.storage.from(FEEDBACK_BUCKET).createSignedUploadUrl(path);
  if (uploadError) throw new Error(uploadError.message);
  return { id, signedUrl: data.signedUrl };
});

export const listFeedbackAttachments = createSafeAction(
  z.object({ submissionId: z.string().uuid() }), ["teacher", "student"], async ({ input, user }) => {
    const client = feedbackClient();
    await requireFeedbackAccess(client, user, input.submissionId);
    const { data, error } = await client.from("feedback_attachments").select("id, file_name, file_size")
      .eq("submission_id", input.submissionId).not("published_at", "is", null).order("created_at");
    if (error) throw new Error(error.message);
    return data as FeedbackAttachment[];
  }
);

export const getFeedbackFileUrl = createSafeAction(
  z.object({ attachmentId: z.string().uuid(), download: z.boolean().default(false) }),
  ["teacher", "student"], async ({ input, user }) => {
    const client = feedbackClient();
    const { data: attachment, error } = await client.from("feedback_attachments")
      .select("submission_id, storage_path, file_name").eq("id", input.attachmentId)
      .not("published_at", "is", null).single();
    if (error || !attachment) throw new Error("Feedback PDF not found.");
    await requireFeedbackAccess(client, user, attachment.submission_id);
    const { data, error: urlError } = await client.storage.from(FEEDBACK_BUCKET)
      .createSignedUrl(attachment.storage_path, 300, input.download ? { download: attachment.file_name } : undefined);
    if (urlError) throw new Error(urlError.message);
    return { url: data.signedUrl };
  }
);
