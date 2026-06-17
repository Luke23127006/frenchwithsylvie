import { getAssignmentById } from "@/lib/actions/assignments";
import { getStudentSubmission } from "@/lib/actions/submissions";
import StudentPortalClient from "./StudentPortalClient";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function StudentPortalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const result = await getAssignmentById({ id: id });
  
  if (result?.error || result?.authError) {
    if (result.authError) {
      redirect("/student");
    }
    notFound();
  }

  const assignment = result?.data;
  if (!assignment) notFound();

  const submissionResult = await getStudentSubmission({ assignmentId: assignment.id });
  const existingSubmission = submissionResult?.data;

  return <StudentPortalClient assignment={assignment} existingSubmission={existingSubmission} />;
}
