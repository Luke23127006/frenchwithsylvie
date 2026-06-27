import { getAssignments } from "@/lib/actions/assignments";
import StudentDashboardClient from "./StudentDashboardClient";

export default async function StudentDashboardData() {
  const { data: assignments, error } = await getAssignments({});

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
        <p>{error}</p>
      </div>
    );
  }

  return <StudentDashboardClient assignments={assignments || []} />;
}
