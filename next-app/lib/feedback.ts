import { z } from "zod";

export const FEEDBACK_BUCKET = "feedback";
export const MAX_FEEDBACK_FILES = 3;
export const MAX_FEEDBACK_FILE_SIZE = 5 * 1024 * 1024;

export type FeedbackAttachment = {
  id: string;
  file_name: string;
  file_size: number;
};

export const reviewGradeSchema = z.string().trim()
  .regex(/^\d+$/, "Grade must be a whole number from 0 to 100.")
  .refine((value) => Number(value) <= 100, "Grade must be a whole number from 0 to 100.");

export const saveReviewSchema = z.object({
  submissionId: z.string().uuid(),
  grade: reviewGradeSchema,
  feedback: z.string().max(100000).nullable(),
  attachmentIds: z.array(z.string().uuid()).max(MAX_FEEDBACK_FILES)
    .refine((ids) => new Set(ids).size === ids.length, "Duplicate attachment."),
});

export const feedbackUploadSchema = z.object({
  submissionId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(255).regex(/\.pdf$/i, "Choose a PDF file."),
  fileSize: z.number().int().positive().max(MAX_FEEDBACK_FILE_SIZE, "PDFs must be 5 MB or smaller."),
});
