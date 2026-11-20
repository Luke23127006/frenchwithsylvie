"use server";

import { revalidatePath } from "next/cache";
import { findAssignment, findSubmission, makeSubmission, previewData, studentSubmission, success, failure, type Upload } from "../mock-data";

export async function getStudentSubmission({ assignmentId }: { assignmentId: string }) {
  return success(studentSubmission(assignmentId) ?? null);
}

export async function submitSolution({ assignmentId, attachments }: { assignmentId: string; attachments: Upload[] }) {
  if (!findAssignment(assignmentId)) return failure("Assignment not found.");
  const existing = studentSubmission(assignmentId);
  const submission = makeSubmission(assignmentId, "camille", attachments);
  previewData.submissions = [...previewData.submissions.filter(({ id }) => id !== existing?.id), submission];
  revalidatePath("/student");
  return success([submission]);
}

export async function removeSubmission({ submissionId }: { submissionId: string; assignmentId: string }) {
  previewData.submissions = previewData.submissions.filter(({ id }) => id !== submissionId);
  revalidatePath("/student");
  return success(null);
}

export async function gradeSubmission({ submissionId, grade, feedback, attachmentIds }: { submissionId: string; grade: string | null; feedback: string | null; attachmentIds: string[] }) {
  const submission = findSubmission(submissionId);
  if (!submission) return failure("Submission not found.");
  submission.grade = grade;
  submission.feedback = feedback;
  submission.feedback_attachments = attachmentIds.flatMap((id) => {
    const pending = previewData.feedbackUploads.get(id);
    const file = submission.feedback_attachments.find((item) => item.id === id) ??
      (pending?.submissionId === submissionId && previewData.files.has(id) ? pending : undefined);
    return file ? [{ id, file_name: file.file_name, file_size: file.file_size }] : [];
  });
  revalidatePath("/student");
  return success(submission);
}

export async function removeSubmissionReview({ submissionId }: { submissionId: string }) {
  return gradeSubmission({ submissionId, grade: null, feedback: null, attachmentIds: [] });
}
