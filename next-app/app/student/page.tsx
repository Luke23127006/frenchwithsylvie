import { Suspense } from "react";
import StudentDashboardData from "./StudentDashboardData";
import StudentGridSkeleton from "@/components/student/StudentGridSkeleton";

export const dynamic = "force-dynamic";

export default function StudentDashboardPage() {
  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8 space-y-8">
      {/* STATIC SHELL: Renders instantly! */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
        <p className="text-muted-foreground">View and submit your assignments.</p>
      </div>

      {/* GRANULAR SUSPENSE BOUNDARY */}
      <Suspense fallback={<StudentGridSkeleton />}>
        <StudentDashboardData />
      </Suspense>
    </div>
  );
}
