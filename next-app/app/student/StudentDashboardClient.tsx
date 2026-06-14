"use client";

import { FileText, ArrowRight, CheckCircle2 } from "lucide-react";
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
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StudentDashboardClientProps {
  assignments: any[];
}

export default function StudentDashboardClient({ assignments }: StudentDashboardClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, submitted, unsubmitted
  const [sortOrder, setSortOrder] = useState("newest"); // newest, oldest, a-z, z-a

  useEffect(() => {
    if (searchParams.get("error") === "not_assigned") {
      toast.error("You do not have access to this assignment.", { id: "not_assigned_error" });
      router.replace("/student"); // clean the URL
    }
  }, [searchParams, router]);

  const filteredAndSortedAssignments = assignments
    .filter((assignment) => {
      const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filterStatus === "submitted") return assignment.has_submitted;
      if (filterStatus === "unsubmitted") return !assignment.has_submitted;
      return true;
    })
    .sort((a, b) => {
      switch (sortOrder) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "a-z":
          return a.title.localeCompare(b.title);
        case "z-a":
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8 space-y-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
        <p className="text-muted-foreground">View and submit your assignments.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search assignments..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" sideOffset={4}>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
              <SelectItem value="unsubmitted">Not Submitted</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" sideOffset={4}>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="a-z">Title (A-Z)</SelectItem>
              <SelectItem value="z-a">Title (Z-A)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {filteredAndSortedAssignments.map((assignment) => {
          const isSubmitted = assignment.has_submitted;
          return (
            <Card key={assignment.id} className={`flex flex-col transition-colors ${isSubmitted ? 'border-green-200 bg-green-50/30' : 'hover:border-primary'}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className={`h-5 w-5 ${isSubmitted ? 'text-green-600' : 'text-primary'}`} />
                    {assignment.title}
                  </CardTitle>
                  {isSubmitted && (
                    <div className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Submitted
                    </div>
                  )}
                </div>
                <CardDescription>
                  Posted on {new Date(assignment.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex items-end">
                <Button 
                  asChild 
                  variant={isSubmitted ? "outline" : "default"} 
                  className={`w-full mt-4 ${isSubmitted ? 'border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800' : ''}`}
                >
                  <Link href={`/assignment/${assignment.id}`}>
                    {isSubmitted ? "View Submission" : "Start Assignment"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
        
        {filteredAndSortedAssignments.length === 0 && (
          <div className="col-span-full p-12 text-center text-muted-foreground border rounded-lg bg-slate-50">
            {assignments.length === 0 ? "No assignments available yet." : "No assignments match your search/filter criteria."}
          </div>
        )}
      </div>
    </div>
  );
}
