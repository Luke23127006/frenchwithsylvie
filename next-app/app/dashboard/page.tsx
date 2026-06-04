import { getAssignments } from "@/lib/actions";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const { data: assignments, error } = await getAssignments();

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        <h2 className="text-2xl font-bold mb-2">Error Loading Dashboard</h2>
        <p>{error}</p>
      </div>
    );
  }

  return <DashboardClient assignments={assignments || []} />;
}
