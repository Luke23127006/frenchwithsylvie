"use client";

import { useState, useTransition } from "react";
import { Copy, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout, createAssignment, uploadFile } from "@/lib/actions";
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
import Link from "next/link";

interface DashboardClientProps {
  assignments: any[];
}

export default function DashboardClient({ assignments }: DashboardClientProps) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !file) {
      toast.error("Please provide both a title and a file.");
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

        const createResult = await createAssignment(title, uploadResult.url!);
        if (createResult.error) {
          toast.error(`Creation failed: ${createResult.error}`);
          return;
        }

        toast.success("Assignment created successfully!");
        setTitle("");
        setFile(null);
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

  return (
    <div className="container mx-auto max-w-6xl p-4 md:p-8 space-y-8">
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Manage your assignments and view student submissions.</p>
        </div>
        <form action={logout}>
          <Button variant="outline" type="submit">
            Logout
          </Button>
        </form>
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
