import { getSubmissionReview } from "./submission-review";

export function getAverageGrade(grades: (number | null)[]): number | null {
  const scores = grades.filter((grade): grade is number => grade !== null);
  return scores.length ? scores.reduce((sum, grade) => sum + grade, 0) / scores.length : null;
}

type StudentAnalyticsInput = {
  id: string;
  full_name: string;
  assignment_assignees: { assignment_id: string }[] | null;
  submissions: { assignment_id: string; grade: string | null }[] | null;
};

export function getStudentOverview(student: StudentAnalyticsInput) {
  const assignedIds = new Set((student.assignment_assignees || []).map((a) => a.assignment_id));
  const submissions = student.submissions || [];
  const submittedCount = submissions.filter((s) => assignedIds.has(s.assignment_id)).length;

  return {
    student_id: student.id,
    student_name: student.full_name,
    total_assigned: assignedIds.size,
    total_submitted: submittedCount,
    completion_rate: assignedIds.size ? submittedCount / assignedIds.size * 100 : 0,
    // Match the detail report's full submission history, including past assignments.
    average_grade: getAverageGrade(submissions.map((s) =>
      getSubmissionReview({ grade: s.grade, feedback: null }).numericGrade
    )),
  };
}
