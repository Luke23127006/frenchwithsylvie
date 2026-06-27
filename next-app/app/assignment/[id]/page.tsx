import { Suspense } from "react";
import StudentSubmissionData from "./StudentSubmissionData";
import StudentSubmissionSkeleton from "@/components/student/StudentSubmissionSkeleton";

export const dynamic = "force-dynamic";

export default async function StudentPortalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <Suspense fallback={<StudentSubmissionSkeleton />}>
      <StudentSubmissionData id={id} />
    </Suspense>
  );
}
