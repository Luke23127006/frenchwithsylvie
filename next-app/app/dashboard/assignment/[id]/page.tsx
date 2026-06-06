import { getAssignmentDetailsForTeacher, getAllStudents } from "@/lib/actions";
import TeacherReviewClient from "./TeacherReviewClient";
import { notFound } from "next/navigation";

export default async function TeacherReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const [assignmentResult, studentsResult] = await Promise.all([
    getAssignmentDetailsForTeacher(id),
    getAllStudents()
  ]);

  if (assignmentResult.error || !assignmentResult.data) {
    notFound();
  }

  return (
    <TeacherReviewClient 
      assignmentData={assignmentResult.data} 
      allStudents={studentsResult.data || []} 
    />
  );
}
