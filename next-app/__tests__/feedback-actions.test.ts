/** @jest-environment node */
import { prepareFeedbackUpload } from "../lib/actions/feedback";
import { requireFeedbackAccess, feedbackClient } from "../lib/feedback-server";

jest.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "student-token" }) }) }));
jest.mock("next/server", () => ({ after: jest.fn() }));
jest.mock("../lib/auth", () => ({ verifyToken: async () => ({ id: "student", role: "student" }) }));
jest.mock("../lib/supabase", () => ({ createClient: jest.fn() }));
jest.mock("../lib/feedback-server", () => ({
  requireFeedbackAccess: jest.fn(), feedbackClient: jest.fn(), cleanupFeedbackFiles: jest.fn(),
}));

it("rejects a student at the upload action itself before accessing storage or the database", async () => {
  const result = await prepareFeedbackUpload({
    submissionId: "211a804d-70c4-43a7-981f-4550372c6129", fileName: "feedback.pdf", fileSize: 100,
  });
  expect(result).toEqual({ error: "Unauthorized", authError: "Unauthorized" });
  expect(requireFeedbackAccess).not.toHaveBeenCalled();
  expect(feedbackClient).not.toHaveBeenCalled();
});
