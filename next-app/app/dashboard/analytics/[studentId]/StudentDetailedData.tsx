import { createClient } from "@/lib/supabase";
import GradeTrendChart from "@/components/dashboard/GradeTrendChart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { getStudentDetailedAnalytics } from "@/lib/actions/analytics";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import StudentSubmissionsTable from "@/components/dashboard/StudentSubmissionsTable";

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
  const safeSubmissions = submissions || [];
  const safeAssigned = assigned || [];

  if (profileError || !profile) {
    notFound();
  }

  const submittedAssignmentIds = new Set(safeSubmissions.map((s: any) => s.assignment_id));
  const missingAssignments = safeAssigned
    .map((a: any) => a.assignments)
    .filter((a: any) => a && !a.is_hidden && !submittedAssignmentIds.has(a.id));

  const gradedSubmissions = safeSubmissions.filter((s: any) => s.numeric_grade !== null);
  const overallAverage = gradedSubmissions.length > 0 
    ? gradedSubmissions.reduce((acc: any, curr: any) => acc + curr.numeric_grade, 0) / gradedSubmissions.length 
    : 0;

  // Format data for chart
  const chartData = safeSubmissions.map((s: any) => ({
    id: s.id,
    assignment_title: Array.isArray(s.assignments) ? s.assignments[0]?.title : s.assignments?.title || "Unknown Assignment",
    submitted_at: s.submitted_at,
    numeric_grade: s.numeric_grade
  }));

  const allItems = [
    ...safeSubmissions.map((s: any) => ({
      id: s.id,
      assignment_id: s.assignment_id,
      title: Array.isArray(s.assignments) ? s.assignments[0]?.title : s.assignments?.title,
      submitted_at: s.submitted_at,
      status: s.numeric_grade !== null ? "graded" : "pending",
      grade: s.numeric_grade,
      isMissing: false,
      timestamp: new Date(s.submitted_at).getTime()
    })),
    ...missingAssignments.map((a: any) => ({
      id: `missing-${a.id}`,
      assignment_id: a.id,
      title: a.title,
      submitted_at: null,
      status: "missing",
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
          <p className="text-3xl font-bold">{overallAverage > 0 ? overallAverage.toFixed(2) : 'N/A'}</p>
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
