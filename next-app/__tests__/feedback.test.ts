/** @jest-environment node */
import { PDFDocument } from "pdf-lib";
import { feedbackUploadSchema, saveReviewSchema, MAX_FEEDBACK_FILE_SIZE } from "../lib/feedback";
import { requireFeedbackAccess, validateFeedbackPdf } from "../lib/feedback-server";
import type { TokenPayload } from "../lib/auth";

jest.mock("server-only", () => ({}), { virtual: true });

const submissionId = "211a804d-70c4-43a7-981f-4550372c6129";
const review = { submissionId, grade: "90", feedback: "Well done", attachmentIds: [] };

describe("required review grade", () => {
  it.each(["", " ", "-1", "101", "1.5", "95abc", null, undefined])("rejects %s even with feedback", (grade) => {
    expect(saveReviewSchema.safeParse({ ...review, grade }).success).toBe(false);
  });
  it.each(["0", "100", " 90 "])("accepts %s", (grade) => {
    expect(saveReviewSchema.safeParse({ ...review, grade }).success).toBe(true);
  });
  it("rejects duplicate or too many attachments", () => {
    expect(saveReviewSchema.safeParse({ ...review, attachmentIds: [submissionId, submissionId] }).success).toBe(false);
    expect(saveReviewSchema.safeParse({ ...review, attachmentIds: Array(4).fill(submissionId) }).success).toBe(false);
  });
});

describe("feedback PDF validation", () => {
  it("checks file limits and extension before requesting an upload", () => {
    const file = { submissionId, fileName: "feedback.pdf", fileSize: 100 };
    expect(feedbackUploadSchema.safeParse(file).success).toBe(true);
    expect(feedbackUploadSchema.safeParse({ ...file, fileName: "feedback.exe" }).success).toBe(false);
    expect(feedbackUploadSchema.safeParse({ ...file, fileSize: MAX_FEEDBACK_FILE_SIZE + 1 }).success).toBe(false);
    expect(feedbackUploadSchema.safeParse({ ...file, fileSize: 0 }).success).toBe(false);
  });
  it("accepts a real PDF and rejects renamed, corrupt, or mismatched files", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    const bytes = await pdf.save();
    await expect(validateFeedbackPdf(bytes, bytes.length)).resolves.toBeUndefined();
    await expect(validateFeedbackPdf(bytes, bytes.length + 1)).rejects.toThrow();
    const fake = new TextEncoder().encode("<html>not a PDF</html>");
    await expect(validateFeedbackPdf(fake, fake.length)).rejects.toThrow();
    const corrupt = new TextEncoder().encode("%PDF-broken");
    await expect(validateFeedbackPdf(corrupt, corrupt.length)).rejects.toThrow();
  });
});

describe("feedback authorization with custom JWTs", () => {
  function client() {
    const query = { select: jest.fn(), eq: jest.fn(), single: jest.fn().mockResolvedValue({
      data: { id: submissionId, student_id: "student", assignments: { created_by: "teacher" } }, error: null,
    }) };
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query);
    return { from: jest.fn().mockReturnValue(query) } as unknown as Parameters<typeof requireFeedbackAccess>[0];
  }
  const user = (id: string, role: TokenPayload["role"]) => ({ id, role }) as TokenPayload;
  it("allows the assignment teacher to write and the submission owner to read", async () => {
    await expect(requireFeedbackAccess(client(), user("teacher", "teacher"), submissionId, true)).resolves.toBeDefined();
    await expect(requireFeedbackAccess(client(), user("student", "student"), submissionId)).resolves.toBeDefined();
  });
  it("denies students writing reviews and access to other people's feedback", async () => {
    await expect(requireFeedbackAccess(client(), user("student", "student"), submissionId, true)).rejects.toThrow();
    await expect(requireFeedbackAccess(client(), user("other", "student"), submissionId)).rejects.toThrow();
    await expect(requireFeedbackAccess(client(), user("other", "teacher"), submissionId, true)).rejects.toThrow();
  });
});
