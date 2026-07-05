import { getClassOverviewData } from "@/lib/actions/analytics";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default async function AnalyticsData() {
  const result = await getClassOverviewData({});

  if (result.authError) {
    redirect("/login");
  }

  if (result.error) {
    return (
      <div className="p-8 text-center text-red-500">
        <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
        <p>{result.error}</p>
      </div>
    );
  }

  const overviewData = result.data || [];

  const classAvg = overviewData.length > 0 
    ? overviewData.reduce((acc: number, row: any) => acc + (row.average_grade || 0), 0) / overviewData.filter((r:any) => r.average_grade !== null).length || 0 
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border bg-card p-6 text-card-foreground shadow">
          <h3 className="font-semibold text-lg">Total Students</h3>
          <p className="text-3xl font-bold mt-2">{overviewData.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-6 text-card-foreground shadow">
          <h3 className="font-semibold text-lg">Class Average</h3>
          <p className="text-3xl font-bold mt-2">{classAvg.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border bg-card p-6 text-card-foreground shadow">
          <h3 className="font-semibold text-lg">Completion Rate Avg</h3>
          <p className="text-3xl font-bold mt-2">
            {(overviewData.reduce((acc: number, row: any) => acc + (row.completion_rate || 0), 0) / (overviewData.length || 1)).toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student Name</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Completion Rate</TableHead>
              <TableHead>Average Grade</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {overviewData.map((student: any) => (
              <TableRow key={student.student_id}>
                <TableCell className="font-medium">{student.student_name}</TableCell>
                <TableCell>{student.total_assigned}</TableCell>
                <TableCell>{student.total_submitted}</TableCell>
                <TableCell>{student.completion_rate ? Number(student.completion_rate).toFixed(1) : 0}%</TableCell>
                <TableCell>{student.average_grade ? Number(student.average_grade).toFixed(2) : 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/dashboard/analytics/${student.student_id}`}>
                    <Button variant="outline" size="sm">View Report</Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {overviewData.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  No students found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
