"use client";

import { useState, useTransition } from "react";
import { Copy, Plus, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAssignment, uploadFile } from "@/lib/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import Link from "next/link";

interface Student {
  id: string;
  full_name: string;
  username: string;
}

interface DashboardClientProps {
  assignments: any[];
  students: Student[];
}

export default function DashboardClient({ assignments, students }: DashboardClientProps) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents((prev) => 
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !file) {
      toast.error("Please provide both a title and a file.");
      return;
    }
    
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student to assign.");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        
        const uploadResult = await uploadFile(formData, "assignments");
        if (uploadResult.error) {
          toast.error(`Upload failed: ${uploadResult.error}`);
          return;
        }

        const createResult = await createAssignment(title, uploadResult.url!, selectedStudents);
        if (createResult.error) {
          toast.error(`Creation failed: ${createResult.error}`);
          return;
        }

        toast.success("Assignment created successfully!");
        setTitle("");
        setFile(null);
        setSelectedStudents([]);
        const fileInput = document.getElementById('document') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

      } catch (error: any) {
        toast.error(`Error: ${error.message}`);
      }
    });
  };

  const handleCopyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/assignment/${id}`);
    toast.success("Assignment link copied to clipboard!");
  };

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto max-w-6xl p-4 md:p-8 space-y-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
        <p className="text-muted-foreground">Manage your assignments and view student submissions.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_350px]">
        {/* Create Assignment Section */}
        <Card className="md:col-span-1">
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
                  disabled={isPending}
                  required 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="document">Document (PDF/Image)</Label>
                <Input 
                  id="document" 
                  type="file" 
                  accept=".pdf,image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  disabled={isPending}
                  required 
                />
              </div>
              <Button type="submit" className="w-full md:w-auto" disabled={isPending}>
                <Plus className="mr-2 h-4 w-4" /> {isPending ? "Creating..." : "Create Assignment"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Assignees Selection Section */}
        <Card className="md:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Assign Students</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                {selectedStudents.length === students.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <CardDescription>Select who should receive this assignment.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search students..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <ScrollArea className="h-[200px] border rounded-md p-4">
                {filteredStudents.length > 0 ? (
                  <div className="space-y-4">
                    {filteredStudents.map((student) => (
                      <div key={student.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`student-${student.id}`} 
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={() => handleStudentToggle(student.id)}
                        />
                        <label 
                          htmlFor={`student-${student.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {student.full_name} <span className="text-muted-foreground font-normal">(@{student.username})</span>
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground mt-8">
                    No students found.
                  </div>
                )}
              </ScrollArea>
              <div className="text-sm text-muted-foreground text-right">
                {selectedStudents.length} selected
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignments List Section */}
        <Card className="md:col-span-2">
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
                  {assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                          {assignment.title}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(assignment.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-center">{assignment.submissions_count || 0}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCopyLink(assignment.id)}
                        >
                          <Copy className="mr-2 h-4 w-4" /> Copy Link
                        </Button>
                        <Button variant="secondary" size="sm" asChild>
                          <Link href={`/dashboard/assignment/${assignment.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {assignments.length === 0 && (
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
