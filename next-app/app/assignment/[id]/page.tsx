import { getAssignmentById, getStudentSubmission } from "@/lib/actions";
import StudentPortalClient from "./StudentPortalClient";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StudentPortalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const { data: assignment, error, authError } = await getAssignmentById(id);

  if (authError) {
    redirect("/student?error=not_assigned");
  }

  if (error || !assignment) {
    notFound();
  }

  const { data: existingSubmission } = await getStudentSubmission(id);

  return <StudentPortalClient assignment={assignment} existingSubmission={existingSubmission} />;
}
