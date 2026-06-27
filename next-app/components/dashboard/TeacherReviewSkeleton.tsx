import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function TeacherReviewSkeleton() {
  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-8 space-y-6 animate-in fade-in">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10 rounded-md" /> {/* Back Button */}
          <div>
            <Skeleton className="h-8 w-64 mb-2" /> {/* Title */}
            <Skeleton className="h-4 w-48" /> {/* Created on Date */}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-32 rounded-md" /> {/* View Document Button */}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-auto md:h-[calc(100vh-140px)]">
        {/* Left Column: Student List (Col-Span 3) */}
        <Card className="md:col-span-3 h-[400px] md:h-full flex flex-col">
          <CardHeader className="pb-3 border-b shrink-0">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-9 w-full rounded-md" /> {/* Search Input */}
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Split into Top (Document) and Bottom (Grading) (Col-Span 9) */}
        <div className="md:col-span-9 flex flex-col gap-6 h-[800px] md:h-full">
          {/* Top: Document Viewer (60%) */}
          <Card className="h-[400px] md:flex-[3] flex flex-col bg-slate-50/50">
            <CardContent className="p-6 flex-1 flex flex-col justify-center items-center">
              <Skeleton className="h-16 w-16 mb-4 rounded-md" />
              <Skeleton className="h-4 w-48" />
            </CardContent>
          </Card>

          {/* Bottom: Grading/Feedback (40%) */}
          <Card className="h-[400px] md:flex-[2] flex flex-col">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <div className="flex justify-between items-center">
                <div>
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-center items-center">
              <Skeleton className="h-12 w-12 mb-4 rounded-full" />
              <Skeleton className="h-5 w-64" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
