import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export default function StudentGridSkeleton() {
  return (
    <div className="animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="flex flex-col h-full border overflow-hidden">
            <CardHeader className="bg-slate-50/50 pb-4 border-b space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="flex-grow p-6 space-y-4 flex flex-col justify-center items-center">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
            <CardFooter className="bg-slate-50/50 p-4 border-t mt-auto">
              <Skeleton className="h-10 w-full rounded-md" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
