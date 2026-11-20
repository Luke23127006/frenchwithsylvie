"use server";

import { failure, findSubmission, previewData, success } from "../mock-data";

export async function listFeedbackAttachments({ submissionId }: { submissionId: string }) {
  return success(findSubmission(submissionId)?.feedback_attachments ?? []);
}

export async function prepareFeedbackUpload({ submissionId, fileName, fileSize }: { submissionId: string; fileName: string; fileSize: number }) {
  if (!findSubmission(submissionId)) return failure("Submission not found.");
  const id = crypto.randomUUID();
  previewData.feedbackUploads.set(id, { id, submissionId, file_name: fileName, file_size: fileSize });
  return success({ id, signedUrl: `/api/preview-files/${id}` });
}

export async function getFeedbackFileUrl({ attachmentId }: { attachmentId: string; download?: boolean }) {
  if (!previewData.submissions.some((submission) => submission.feedback_attachments.some(({ id }) => id === attachmentId))) {
    return failure("Feedback attachment not found.");
  }
  const url = attachmentId === previewData.sampleFeedbackId ? "/sample-assignment.pdf" : `/api/preview-files/${attachmentId}`;
  return success({ url });
}
