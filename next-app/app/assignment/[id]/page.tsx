import { getAssignmentById, getStudentSubmission } from "@/lib/actions";
import StudentPortalClient from "./StudentPortalClient";
import { notFound } from "next/navigation";

export default async function StudentPortalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const { data: assignment, error } = await getAssignmentById(id);

  if (error || !assignment) {
    notFound();
  }

  const { data: existingSubmission } = await getStudentSubmission(id);

  return <StudentPortalClient assignment={assignment} existingSubmission={existingSubmission} />;
}
