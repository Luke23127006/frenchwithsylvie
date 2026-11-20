import { getAssignments, getTrashedAssignments } from "@/lib/actions/assignments";
import { getAllStudents } from "@/lib/actions/users";
import DashboardClient from "./DashboardClient";

export default async function TeacherDashboardData() {
  // Use Promise.all to fetch data concurrently
  const [assignmentsRes, studentsRes, trashedRes] = await Promise.all([
    getAssignments({}),
    getAllStudents({}),
    getTrashedAssignments({})
  ]);

  if (assignmentsRes.error) {
    return (
      <div className="p-8 text-center text-red-500">
        <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
        <p>{assignmentsRes.error}</p>
      </div>
    );
  }

  return (
    <DashboardClient 
      assignments={assignmentsRes.data || []} 
      students={studentsRes.data || []} 
      trashedAssignments={trashedRes.data || []} 
    />
  );
}
