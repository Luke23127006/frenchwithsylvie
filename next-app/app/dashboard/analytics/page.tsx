import { Suspense } from "react";
import AnalyticsData from "./AnalyticsData";
import AnalyticsSkeleton from "@/components/dashboard/AnalyticsSkeleton";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto max-w-6xl p-4 md:p-8 space-y-8">
      {/* STATIC SHELL: Renders instantly! */}
      <div className="mb-6 flex flex-col gap-4">
        <div>
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-2 -ml-4">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Class Analytics</h1>
          <p className="text-muted-foreground">Monitor student performance and completion rates.</p>
        </div>
      </div>

      {/* GRANULAR SUSPENSE BOUNDARY */}
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsData />
      </Suspense>
    </div>
  );
}
