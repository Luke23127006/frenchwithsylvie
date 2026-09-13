import { getSubmissionReview } from "../lib/submission-review";

describe("analytics submission review", () => {
  it("marks an assignment with no submission as missing", () => {
    expect(getSubmissionReview(null)).toEqual({ status: "missing", numericGrade: null });
  });

  it.each([
    { grade: null, feedback: null },
    { grade: "", feedback: "" },
    { grade: "  ", feedback: "\n " },
  ])("keeps unreviewed work pending: %j", (submission) => {
    expect(getSubmissionReview(submission)).toEqual({ status: "pending", numericGrade: null });
  });

  it("recognizes a saved grade even when the legacy numeric grade is absent", () => {
    const submission = { grade: "98", feedback: null, numeric_grade: null };
    expect(getSubmissionReview(submission)).toEqual({ status: "graded", numericGrade: 98 });
  });

  it("returns to pending after review removal despite a stale numeric grade", () => {
    const submission = { grade: null, feedback: null, numeric_grade: 100 };
    expect(getSubmissionReview(submission)).toEqual({ status: "pending", numericGrade: null });
  });

  it("uses an edited grade instead of the old numeric grade", () => {
    const submission = { grade: "75.5", feedback: "Updated", numeric_grade: 100 };
    expect(getSubmissionReview(submission)).toEqual({ status: "graded", numericGrade: 75.5 });
  });

  it("recognizes feedback without inventing a numeric score", () => {
    expect(getSubmissionReview({ grade: null, feedback: "Good pronunciation" }))
      .toEqual({ status: "reviewed", numericGrade: null });
  });

  it("includes zero as a valid grade", () => {
    expect(getSubmissionReview({ grade: "0", feedback: null }))
      .toEqual({ status: "graded", numericGrade: 0 });
  });

  it.each(["A", "85/100", "Infinity", "101", "-1"])("does not invent a score for %s", (grade) => {
    expect(getSubmissionReview({ grade, feedback: null }))
      .toEqual({ status: "graded", numericGrade: null });
  });
});
