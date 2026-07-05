"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface TableRowData {
  id: string;
  assignment_id: string;
  title: string;
  submitted_at: string | null;
  status: "graded" | "pending" | "missing";
  grade: number | null;
  isMissing: boolean;
  timestamp: number;
}

interface StudentSubmissionsTableProps {
  data: TableRowData[];
}

export default function StudentSubmissionsTable({ data }: StudentSubmissionsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc"); // Default: submission time descending

  const processedData = useMemo(() => {
    let filtered = data.filter((item) => {
      // Apply text search
      if (search && !item.title.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Apply status filter
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === "date_desc") {
        return b.timestamp - a.timestamp;
      }
      if (sortBy === "date_asc") {
        return a.timestamp - b.timestamp;
      }
      if (sortBy === "grade_desc") {
        const gradeA = a.grade !== null ? a.grade : -1;
        const gradeB = b.grade !== null ? b.grade : -1;
        return gradeB - gradeA;
      }
      if (sortBy === "grade_asc") {
        const gradeA = a.grade !== null ? a.grade : -1;
        const gradeB = b.grade !== null ? b.grade : -1;
        return gradeA - gradeB;
      }
      return 0;
    });

    return filtered;
  }, [data, search, statusFilter, sortBy]);

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow overflow-hidden print:shadow-none print:border-gray-300">
      <div className="p-6 border-b print:p-4">
        <h3 className="font-semibold text-lg mb-4">Submission History</h3>
        
        <div className="flex flex-col sm:flex-row gap-4 print:hidden">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search assignments..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" sideOffset={4}>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="graded">Graded</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="missing">Missing</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" sideOffset={4}>
              <SelectItem value="date_desc">Newest First</SelectItem>
              <SelectItem value="date_asc">Oldest First</SelectItem>
              <SelectItem value="grade_desc">Highest Grade</SelectItem>
              <SelectItem value="grade_asc">Lowest Grade</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Assignment</TableHead>
            <TableHead>Submitted On</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Grade</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {processedData.map((row) => (
            <TableRow 
              key={row.id} 
              className={row.isMissing ? "bg-red-50/50 dark:bg-red-950/20" : ""}
            >
              <TableCell className={`font-medium ${row.isMissing ? "text-red-600 dark:text-red-400" : ""}`}>
                {row.title || "Unknown"}
              </TableCell>
              <TableCell className={row.isMissing ? "text-muted-foreground" : ""}>
                {row.submitted_at ? format(new Date(row.submitted_at), "MMM dd, yyyy HH:mm") : "-"}
              </TableCell>
              <TableCell>
                {row.status === "graded" && (
                  <Badge variant="default" className="bg-green-500 hover:bg-green-600">Graded</Badge>
                )}
                {row.status === "pending" && (
                  <Badge variant="secondary">Pending Review</Badge>
                )}
                {row.status === "missing" && (
                  <Badge variant="destructive">Missing</Badge>
                )}
              </TableCell>
              <TableCell className={`text-right font-medium ${row.isMissing ? "text-muted-foreground" : ""}`}>
                {row.grade !== null ? `${row.grade}/100` : '-'}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="secondary" size="sm" asChild>
                  <Link href={`/dashboard/assignment/${row.assignment_id}`}>View</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {processedData.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                No assignments match your filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
