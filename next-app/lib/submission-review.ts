export type SubmissionStatus = "graded" | "reviewed" | "pending" | "missing";

type ReviewFields = {
  grade: string | null;
  feedback: string | null;
};

// grade and feedback are the fields saved (and cleared) by the review form.
// numeric_grade is a legacy snapshot and can be stale or absent.
export function getSubmissionReview(submission: ReviewFields | null): {
  status: SubmissionStatus;
  numericGrade: number | null;
} {
  if (!submission) return { status: "missing", numericGrade: null };

  const grade = submission.grade?.trim() || "";
  const feedback = submission.feedback?.trim() || "";
  const score = /^\d+(?:\.\d+)?$/.test(grade) ? Number(grade) : NaN;

  return {
    status: grade ? "graded" : feedback ? "reviewed" : "pending",
    numericGrade: Number.isFinite(score) && score >= 0 && score <= 100 ? score : null,
  };
}
