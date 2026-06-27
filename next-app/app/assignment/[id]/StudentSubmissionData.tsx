import { getAssignmentById } from "@/lib/actions/assignments";
import { getStudentSubmission } from "@/lib/actions/submissions";
import StudentPortalClient from "./StudentPortalClient";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

export default async function StudentSubmissionData({ id }: { id: string }) {
  const [result, submissionResult] = await Promise.all([
    getAssignmentById({ id }),
    getStudentSubmission({ assignmentId: id })
  ]);

  if (result?.error || result?.authError) {
    if (result.authError) {
      redirect("/student");
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="text-center max-w-md bg-white p-8 rounded-xl shadow-sm border">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
          <p className="text-slate-600 mb-6">{result.error}</p>
          <Link href="/student" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const assignment = result?.data;
  if (!assignment) {
    notFound();
  }

  const existingSubmission = submissionResult?.data;

  return <StudentPortalClient assignment={assignment} existingSubmission={existingSubmission} />;
}
