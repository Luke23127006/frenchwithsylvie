import GradeTrendChart from "@/components/dashboard/GradeTrendChart";
import { getStudentDetailedAnalytics } from "@/lib/actions/analytics";
import { notFound, redirect } from "next/navigation";
import { getSubmissionReview } from "@/lib/submission-review";

import StudentSubmissionsTable from "@/components/dashboard/StudentSubmissionsTable";

function getAssignmentTitle(assignments: { title: string } | { title: string }[] | null) {
  const assignment = Array.isArray(assignments) ? assignments[0] : assignments;
  return assignment?.title || "Unknown Assignment";
}

export default async function StudentDetailedData({ studentId }: { studentId: string }) {
  const result = await getStudentDetailedAnalytics({ studentId });

  if (result.authError) {
    redirect("/login");
  }

  if (result.error) {
    return (
      <div className="p-8 text-center text-red-500">
        <h2 className="text-2xl font-bold mb-2">Error Loading Report</h2>
        <p>{result.error}</p>
      </div>
    );
  }

  const { profile, submissions, profileError, assigned } = result.data!;
  const safeSubmissions = (submissions || []).map((submission) => ({
    ...submission,
    review: getSubmissionReview(submission),
  }));
  const safeAssigned = assigned || [];

  if (profileError || !profile) {
    notFound();
  }

  const submittedAssignmentIds = new Set(safeSubmissions.map((s) => s.assignment_id));
  const missingAssignments = safeAssigned
    .flatMap((a) => a.assignments || [])
    .filter((a) => !a.is_hidden && !submittedAssignmentIds.has(a.id));

  const gradedSubmissions = safeSubmissions.filter((s) => s.review.numericGrade !== null);
  const overallAverage = gradedSubmissions.length > 0 
    ? gradedSubmissions.reduce((acc, curr) => acc + curr.review.numericGrade!, 0) / gradedSubmissions.length
    : 0;

  // Format data for chart
  const chartData = safeSubmissions.map((s) => ({
    id: s.id,
    assignment_title: getAssignmentTitle(s.assignments),
    submitted_at: s.submitted_at,
    numeric_grade: s.review.numericGrade
  }));

  const allItems = [
    ...safeSubmissions.map((s) => ({
      id: s.id,
      assignment_id: s.assignment_id,
      title: getAssignmentTitle(s.assignments),
      submitted_at: s.submitted_at,
      status: s.review.status,
      grade: s.review.numericGrade,
      isMissing: false,
      timestamp: new Date(s.submitted_at).getTime()
    })),
    ...missingAssignments.map((a) => ({
      id: `missing-${a.id}`,
      assignment_id: a.id,
      title: a.title,
      submitted_at: null,
      status: getSubmissionReview(null).status,
      grade: null,
      isMissing: true,
      timestamp: new Date(a.created_at).getTime()
    }))
  ];

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Profile Header */}
      <div className="flex items-center space-x-4 mb-6 print:mb-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
          {profile.full_name.charAt(0)}
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{profile.full_name}</h2>
          <p className="text-muted-foreground">@{profile.username}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-sm text-muted-foreground">Overall Average</p>
          <p className="text-3xl font-bold">{gradedSubmissions.length > 0 ? overallAverage.toFixed(2) : 'N/A'}</p>
        </div>
      </div>

      {/* Grade Trend Chart */}
      <div className="rounded-xl border bg-card p-6 text-card-foreground shadow print:shadow-none print:border-gray-300">
        <h3 className="font-semibold text-lg mb-4">Grade Trend</h3>
        <GradeTrendChart data={chartData} />
      </div>

      {/* Submissions History Table */}
      <StudentSubmissionsTable data={allItems} />
    </div>
  );
}
