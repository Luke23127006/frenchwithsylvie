import { getAssignmentDetailsForTeacher } from "@/lib/actions/assignments";
import { getAllStudents } from "@/lib/actions/users";
import TeacherReviewClient from "./TeacherReviewClient";
import { notFound } from "next/navigation";

export default async function TeacherReviewData({ id }: { id: string }) {
  const [assignmentResult, studentsResult] = await Promise.all([
    getAssignmentDetailsForTeacher({ assignmentId: id }),
    getAllStudents({})
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
