import { Suspense } from "react";
import TeacherDashboardData from "./TeacherDashboardData";
import TeacherDashboardSkeleton from "@/components/dashboard/TeacherDashboardSkeleton";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <div className="container mx-auto max-w-6xl p-4 md:p-8 space-y-8">
      {/* STATIC SHELL: Renders instantly! */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
        <p className="text-muted-foreground">Manage your assignments and view student submissions.</p>
      </div>

      {/* GRANULAR SUSPENSE BOUNDARY */}
      <Suspense fallback={<TeacherDashboardSkeleton />}>
        <TeacherDashboardData />
      </Suspense>
    </div>
  );
}
