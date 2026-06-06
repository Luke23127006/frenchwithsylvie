import { getAssignments } from "@/lib/actions";
import StudentDashboardClient from "./StudentDashboardClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const { data: assignments, error } = await getAssignments();

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="p-8 text-center">Loading dashboard...</div>}>
      <StudentDashboardClient assignments={assignments || []} />
    </Suspense>
  );
}
