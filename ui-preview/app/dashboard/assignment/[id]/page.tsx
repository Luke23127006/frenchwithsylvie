import { Suspense } from "react";
import TeacherReviewData from "./TeacherReviewData";
import TeacherReviewSkeleton from "@/components/dashboard/TeacherReviewSkeleton";

export const dynamic = "force-dynamic";

export default async function TeacherReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <Suspense fallback={<TeacherReviewSkeleton />}>
      <TeacherReviewData id={id} />
    </Suspense>
  );
}
