"use client";

import { useState } from "react";
import { Copy, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

// Mock Data
const MOCK_ASSIGNMENTS = [
  { id: "1", title: "French Basics - Week 1", createdDate: "2026-06-01", submissions: 12 },
  { id: "2", title: "Verbs Conjugation Practice", createdDate: "2026-06-03", submissions: 5 },
  { id: "3", title: "Vocabulary Quiz #2", createdDate: "2026-06-04", submissions: 0 },
];

export default function DashboardPage() {
  const [title, setTitle] = useState("");
  
  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    toast("Assignment created successfully!");
    setTitle("");
  };

  const handleCopyLink = (id: string) => {
    // Mock copying to clipboard
    navigator.clipboard.writeText(`http://localhost:3000/assignment/${id}`);
    toast("Assignment link copied to clipboard!");
  };

  return (
    <div className="container mx-auto max-w-6xl p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
        <p className="text-muted-foreground">Manage your assignments and view student submissions.</p>
      </div>

      <div className="grid gap-8">
        {/* Create Assignment Section */}
        <Card>
          <CardHeader>
            <CardTitle>Create New Assignment</CardTitle>
            <CardDescription>Upload a new PDF or image document for your students.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Assignment Title</Label>
                <Input 
                  id="title" 
                  placeholder="e.g., Chapter 1 Homework" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="document">Document (PDF/Image)</Label>
                <Input id="document" type="file" accept=".pdf,image/*" required />
              </div>
              <Button type="submit" className="w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Create Assignment
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Assignments List Section */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Assignments</CardTitle>
            <CardDescription>A list of all your created assignments.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead className="text-center">Submissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_ASSIGNMENTS.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                          {assignment.title}
                        </div>
                      </TableCell>
                      <TableCell>{assignment.createdDate}</TableCell>
                      <TableCell className="text-center">{assignment.submissions}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCopyLink(assignment.id)}
                        >
                          <Copy className="mr-2 h-4 w-4" /> Copy Link
                        </Button>
                        <Button variant="secondary" size="sm" asChild>
                          <a href={`/dashboard/assignment/${assignment.id}`}>View</a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {MOCK_ASSIGNMENTS.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No assignments found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
