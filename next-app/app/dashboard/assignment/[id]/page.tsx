import { getAssignmentById, getSubmissionsByAssignment } from "@/lib/actions";
import TeacherReviewClient from "./TeacherReviewClient";
import { notFound } from "next/navigation";

export default async function TeacherReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const [assignmentResult, submissionsResult] = await Promise.all([
    getAssignmentById(id),
    getSubmissionsByAssignment(id)
  ]);

  if (assignmentResult.error || !assignmentResult.data) {
    notFound();
  }

  return (
    <TeacherReviewClient 
      assignment={assignmentResult.data} 
      submissions={submissionsResult.data || []} 
    />
  );
}
