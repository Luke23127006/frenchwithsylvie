import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function StudentSubmissionSkeleton() {
  return (
    <div className="h-[calc(100vh-65px)] bg-slate-50 flex flex-col md:flex-row animate-in fade-in">
      {/* Left/Top Area: Document Viewer (60%) */}
      <div className="w-full md:w-[60%] border-r bg-white p-4 md:p-8 flex flex-col h-[50vh] md:h-[calc(100vh-65px)] overflow-hidden relative">
        <div className="flex justify-between items-start mb-4 flex-wrap gap-4 shrink-0">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-md -ml-2 shrink-0" />
              <Skeleton className="h-8 w-64" />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-3 shrink-0 mt-2">
          <Skeleton className="h-6 w-32" />
        </div>

        <div className="flex-1 min-h-[40vh] md:min-h-[400px] lg:min-h-[500px] bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden relative mb-4 shrink-0">
          <Skeleton className="absolute inset-0 w-full h-full rounded-lg" />
        </div>
      </div>

      {/* Right/Bottom Area: Submission Form (40%) */}
      <div className="w-full md:w-[40%] p-4 md:p-8 h-auto md:h-full">
        <div className="max-w-md mx-auto space-y-6">
          <Card className="shadow-lg border-t-4 border-t-slate-200">
            <CardHeader>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mt-1" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-40 w-full rounded-xl" />
              </div>
              <Skeleton className="h-14 w-full rounded-full mt-4" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
