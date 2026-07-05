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

  const { profile, submissions, profileError } = result.data!;
  const safeSubmissions = submissions || [];

  if (profileError || !profile) {
    notFound();
  }

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
      <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden print:shadow-none print:border-gray-300">
        <div className="p-6 border-b print:p-4">
          <h3 className="font-semibold text-lg">Submission History</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Assignment</TableHead>
              <TableHead>Submitted On</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeSubmissions.map((sub: any) => {
              const title = Array.isArray(sub.assignments) ? sub.assignments[0]?.title : sub.assignments?.title;
              return (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{title || "Unknown"}</TableCell>
                  <TableCell>{format(new Date(sub.submitted_at), "MMM dd, yyyy HH:mm")}</TableCell>
                  <TableCell>
                    {sub.numeric_grade !== null ? (
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600">Graded</Badge>
                    ) : (
                      <Badge variant="secondary">Pending Review</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {sub.numeric_grade !== null ? `${sub.numeric_grade}/100` : '-'}
                  </TableCell>
                </TableRow>
              );
            })}
            {safeSubmissions.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                  No submissions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
