import type { FeedbackAttachment } from "./feedback";

export type Upload = { fileName: string; fileUrl: string; fileType: string; orderIndex: number };
type AssignmentFormat = "DOCUMENT" | "AUDIO" | "BOTH";

export function attachments(uploads: Upload[]) {
  return uploads.map(({ fileName, fileUrl, fileType, orderIndex }) => ({
    id: crypto.randomUUID(),
    file_name: fileName,
    file_url: fileUrl,
    file_type: fileType === "audio" ? "audio" as const : "document" as const,
    order_index: orderIndex,
  }));
}

export const students = [
  { id: "camille", full_name: "Camille Laurent", username: "camille" },
  { id: "noah", full_name: "Noah Bernard", username: "noah" },
  { id: "lea", full_name: "Léa Thomas", username: "lea" },
];

export function makeAssignment(id: string, title: string, format: AssignmentFormat, assigneeIds: string[], uploads: Upload[], createdAt = new Date().toISOString()) {
  return {
    id,
    title,
    submission_format: format,
    created_at: createdAt,
    is_hidden: false,
    deleted_at: null as string | null,
    publish_at: null as string | null,
    file_url: null,
    audio_urls: [] as string[],
    assignment_attachments: attachments(uploads),
    assigneeIds,
  };
}

export function makeSubmission(assignmentId: string, studentId: string, uploads: Upload[], grade: string | null = null) {
  return {
    id: crypto.randomUUID(),
    assignment_id: assignmentId,
    student_id: studentId,
    grade,
    feedback: grade ? "<p>Good work! Practice the final conjugation one more time.</p>" : null as string | null,
    submitted_at: new Date().toISOString(),
    submission_attachments: attachments(uploads),
    feedback_attachments: [] as FeedbackAttachment[],
  };
}

const sampleDocument: Upload = { fileName: "French practice.pdf", fileUrl: "/sample-assignment.pdf", fileType: "document", orderIndex: 0 };
const sampleAudio: Upload = { fileName: "Sample audio.wav", fileUrl: "/sample-audio.wav", fileType: "audio", orderIndex: 1 };

function seed() {
  const assigneeIds = students.map(({ id }) => id);
  const assignments = [
    makeAssignment("listening", "Listening practice", "AUDIO", assigneeIds, [sampleAudio], "2026-11-18T10:00:00Z"),
    makeAssignment("introductions", "Introduce yourself", "BOTH", assigneeIds, [sampleDocument, sampleAudio], "2026-11-15T10:00:00Z"),
    makeAssignment("verbs", "Present tense verbs", "DOCUMENT", assigneeIds, [sampleDocument], "2026-11-12T10:00:00Z"),
    { ...makeAssignment("writing", "Writing practice", "DOCUMENT", assigneeIds, [sampleDocument]), deleted_at: "2026-11-19T10:00:00Z" },
  ];
  const submissions = [
    makeSubmission("introductions", "camille", [sampleAudio]),
    makeSubmission("verbs", "camille", [sampleDocument], "92"),
    makeSubmission("verbs", "noah", [sampleDocument]),
    makeSubmission("listening", "lea", [sampleAudio], "88"),
  ];
  const id = crypto.randomUUID();
  submissions[1].feedback_attachments.push({ id, file_name: "Teacher feedback.pdf", file_size: 4096 });
  return {
    assignments,
    submissions,
    feedbackUploads: new Map<string, FeedbackAttachment & { submissionId: string }>(),
    sampleFeedbackId: id,
    files: new Map<string, { bytes: ArrayBuffer; type: string }>(),
    seen: new Set<string>(),
    notifications: [{
      id: "sample-notification",
      title: "Assignment graded",
      message: "Present tense verbs has been graded.",
      action_url: "/assignment/verbs",
      created_at: new Date().toISOString(),
      is_read: false,
    }],
    settings: {
      email: null as string | null,
      notify_new_assignment: true,
      notify_assignment_graded: true,
      notify_deadline_reminder: true,
      notify_submission_received: true,
    },
  };
}

const previewGlobal = globalThis as typeof globalThis & { previewData?: ReturnType<typeof seed> };
export const previewData = previewGlobal.previewData ??= seed();

export function findAssignment(id: string) {
  return previewData.assignments.find((assignment) => assignment.id === id);
}

export function findSubmission(id: string) {
  return previewData.submissions.find((submission) => submission.id === id);
}

export function studentSubmission(assignmentId: string, studentId = "camille") {
  return previewData.submissions.find((submission) => submission.assignment_id === assignmentId && submission.student_id === studentId);
}

export function success<T>(data: T) {
  return { data, error: null, authError: false };
}

export function failure(error: string) {
  return { data: null, error, authError: false };
}
