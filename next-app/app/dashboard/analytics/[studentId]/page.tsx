import { Suspense } from "react";
import StudentDetailedData from "./StudentDetailedData";
import StudentAnalyticsSkeleton from "@/components/dashboard/StudentAnalyticsSkeleton";
import Link from "next/link";
import { ChevronLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

import PrintButton from "@/components/dashboard/PrintButton";

export const dynamic = "force-dynamic";

export default async function StudentAnalyticsPage({ params }: { params: Promise<{ studentId: string }> }) {
  const resolvedParams = await params;
  const studentId = resolvedParams.studentId;

  return (
    <div className="container mx-auto max-w-6xl p-4 md:p-8 space-y-8 print:w-full print:max-w-none print:m-0 print:p-0 print:space-y-4">
      {/* STATIC SHELL: Renders instantly! */}
      <div className="mb-6 flex flex-col gap-4 print:hidden">
        <div className="flex justify-between items-start">
          <div>
            <Link href="/dashboard/analytics">
              <Button variant="ghost" className="mb-2 -ml-4">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Class Analytics
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">Student Report</h1>
            <p className="text-muted-foreground">Detailed performance analysis and submission history.</p>
          </div>
          
          {/* <PrintButton /> temporarily disabled */}
        </div>
      </div>

      {/* GRANULAR SUSPENSE BOUNDARY */}
      <Suspense fallback={<StudentAnalyticsSkeleton />}>
        <StudentDetailedData studentId={studentId} />
      </Suspense>
    </div>
  );
}
