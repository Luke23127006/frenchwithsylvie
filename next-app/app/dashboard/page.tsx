import { Suspense } from "react";
import TeacherDashboardData from "./TeacherDashboardData";
import TeacherDashboardSkeleton from "@/components/dashboard/TeacherDashboardSkeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <div className="container mx-auto max-w-6xl p-4 md:p-8 space-y-8">
      {/* STATIC SHELL: Renders instantly! */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Manage your assignments and view student submissions.</p>
        </div>
        <Link href="/dashboard/analytics">
          <Button>Class Analytics</Button>
        </Link>
      </div>

      {/* GRANULAR SUSPENSE BOUNDARY */}
      <Suspense fallback={<TeacherDashboardSkeleton />}>
        <TeacherDashboardData />
      </Suspense>
    </div>
  );
}
