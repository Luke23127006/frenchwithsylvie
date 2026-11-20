"use server";

import { revalidatePath } from "next/cache";
import { findAssignment, makeAssignment, previewData, studentSubmission, students, success, failure, type Upload } from "../mock-data";

function withCounts(assignment: ReturnType<typeof makeAssignment>) {
  const submissions = previewData.submissions.filter((row) => row.assignment_id === assignment.id);
  return {
    ...assignment,
    assignees_count: assignment.assigneeIds.length,
    submissions_count: submissions.length,
    ungraded_submissions_count: submissions.filter((row) => row.grade === null).length,
  };
}

export async function getAssignments(_input: object) {
  return success(previewData.assignments.filter((row) => !row.deleted_at).map(withCounts));
}

export async function getTrashedAssignments(_input: object) {
  return success(previewData.assignments.filter((row) => row.deleted_at).map(withCounts));
}

export async function getStudentAssignments() {
  return success(previewData.assignments
    .filter((row) => !row.deleted_at && !row.is_hidden && !row.publish_at && row.assigneeIds.includes("camille"))
    .map((row) => {
      const submission = studentSubmission(row.id);
      return { ...row, has_submitted: !!submission, grade: submission?.grade ?? null };
    }));
}

export async function getAssignmentById({ id }: { id: string }) {
  return success(findAssignment(id) ?? null);
}

export async function getAssignmentDetailsForTeacher({ assignmentId }: { assignmentId: string }) {
  const assignment = findAssignment(assignmentId);
  if (!assignment) return failure("Assignment not found.");
  const assignees = students.filter(({ id }) => assignment.assigneeIds.includes(id)).map((student) => {
    const submission = studentSubmission(assignmentId, student.id) ?? null;
    return { ...student, submission, has_submitted: !!submission };
  });
  return success({ ...assignment, assignees });
}

export async function createAssignment(input: {
  title: string;
  submissionFormat: "DOCUMENT" | "AUDIO" | "BOTH";
  assigneeIds: string[];
  attachments: Upload[];
  publishAt?: string;
}) {
  const assignment = makeAssignment(crypto.randomUUID(), input.title, input.submissionFormat, input.assigneeIds, input.attachments);
  assignment.publish_at = input.publishAt ?? null;
  previewData.assignments.unshift(assignment);
  revalidatePath("/dashboard");
  return success(assignment);
}

function update(assignmentId: string, changes: Partial<ReturnType<typeof makeAssignment>>) {
  const assignment = findAssignment(assignmentId);
  if (!assignment) return failure("Assignment not found.");
  Object.assign(assignment, changes);
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/assignment/${assignmentId}`);
  return success(assignment);
}

export async function toggleHideAssignment({ assignmentId, isHidden }: { assignmentId: string; isHidden: boolean }) {
  return update(assignmentId, { is_hidden: isHidden });
}

export async function moveToTrash({ assignmentId }: { assignmentId: string }) {
  return update(assignmentId, { deleted_at: new Date().toISOString() });
}

export async function restoreAssignment({ assignmentId }: { assignmentId: string }) {
  return update(assignmentId, { deleted_at: null });
}

export async function permanentlyDeleteAssignment({ assignmentId }: { assignmentId: string }) {
  previewData.assignments = previewData.assignments.filter(({ id }) => id !== assignmentId);
  previewData.submissions = previewData.submissions.filter(({ assignment_id }) => assignment_id !== assignmentId);
  revalidatePath("/dashboard");
  return success(null);
}

export async function updateAssignees({ assignmentId, newAssigneeIds }: { assignmentId: string; newAssigneeIds: string[] }) {
  return update(assignmentId, { assigneeIds: newAssigneeIds });
}

export async function updateAssignmentTitle({ assignmentId, title }: { assignmentId: string; title: string }) {
  return update(assignmentId, { title });
}
