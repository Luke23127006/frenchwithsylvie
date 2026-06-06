"use client";

import { FileText, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

interface StudentDashboardClientProps {
  assignments: any[];
}

export default function StudentDashboardClient({ assignments }: StudentDashboardClientProps) {
  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8 space-y-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
        <p className="text-muted-foreground">View and submit your assignments.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {assignments.map((assignment) => (
          <Card key={assignment.id} className="flex flex-col hover:border-primary transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {assignment.title}
              </CardTitle>
              <CardDescription>
                Posted on {new Date(assignment.created_at).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-end">
              <Button asChild className="w-full mt-4">
                <Link href={`/assignment/${assignment.id}`}>
                  Start Assignment <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        
        {assignments.length === 0 && (
          <div className="col-span-full p-12 text-center text-muted-foreground border rounded-lg bg-slate-50">
            No assignments available yet.
          </div>
        )}
      </div>
    </div>
  );
}
