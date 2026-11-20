"use server";

import { getStudentOverview } from "../analytics";
import { findAssignment, previewData, students, success } from "../mock-data";

function assigned(studentId: string) {
  return previewData.assignments.filter((row) => !row.deleted_at && row.assigneeIds.includes(studentId));
}

function submitted(studentId: string) {
  return previewData.submissions.filter(({ student_id }) => student_id === studentId);
}

export async function getClassOverviewData(_input: object) {
  return success(students.map((student) => getStudentOverview({
    ...student,
    assignment_assignees: assigned(student.id).map(({ id }) => ({ assignment_id: id })),
    submissions: submitted(student.id),
  })));
}

export async function getStudentDetailedAnalytics({ studentId }: { studentId: string }) {
  return success({
    profile: students.find(({ id }) => id === studentId) ?? null,
    profileError: null,
    submissions: submitted(studentId).map((submission) => ({
      ...submission,
      assignments: findAssignment(submission.assignment_id) ?? null,
    })),
    assigned: assigned(studentId).map((assignments) => ({ assignments })),
  });
}
