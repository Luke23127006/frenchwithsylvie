import { getAssignmentDetailsForTeacher } from "@/lib/actions/assignments";
import { getAllStudents } from "@/lib/actions/users";
import TeacherReviewClient from "./TeacherReviewClient";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

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
