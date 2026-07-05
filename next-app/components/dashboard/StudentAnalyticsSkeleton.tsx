import { Skeleton } from "@/components/ui/skeleton";

export default function StudentAnalyticsSkeleton() {
  return (
    <div className="space-y-6 print:hidden">
      <div className="flex items-center space-x-4 mb-6">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-[200px]" />
          <Skeleton className="h-4 w-[150px]" />
        </div>
      </div>
      
      <div className="rounded-xl border bg-card p-6">
        <Skeleton className="h-[300px] w-full" />
      </div>

      <div className="rounded-xl border bg-card p-6">
        <Skeleton className="h-8 w-[200px] mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}
