"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, CheckCircle2, Clock, FileText, Search, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import { updateAssignees } from "@/lib/actions";

interface Student {
  id: string;
  full_name: string;
  username: string;
}

interface Assignee extends Student {
  has_submitted: boolean;
  submission: any | null;
}

interface TeacherReviewClientProps {
  assignmentData: {
    id: string;
    title: string;
    file_url: string;
    created_at: string;
    assignees: Assignee[];
  };
  allStudents: Student[];
}

export default function TeacherReviewClient({ assignmentData, allStudents }: TeacherReviewClientProps) {
  const [selectedAssignee, setSelectedAssignee] = useState<Assignee | null>(null);
  
  // Edit Assignees State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    assignmentData.assignees.map(a => a.id)
  );
  const [isPending, startTransition] = useTransition();

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudentIds((prev) => 
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSaveAssignees = () => {
    startTransition(async () => {
      try {
        const result = await updateAssignees(assignmentData.id, selectedStudentIds);
        if (result.error) {
          toast.error("Failed to update assignees: " + result.error);
        } else {
          toast.success("Assignees updated successfully!");
          setIsEditDialogOpen(false);
        }
      } catch (e: any) {
        toast.error("Error: " + e.message);
      }
    });
  };

  const filteredStudents = allStudents.filter(s => 
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto max-w-7xl p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{assignmentData.title}</h1>
            <p className="text-muted-foreground">
              Created on {new Date(assignmentData.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Edit Assignees</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Assignees</DialogTitle>
              <DialogDescription>
                Select which students should be assigned to this task.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
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
              <ScrollArea className="h-[250px] border rounded-md p-4">
                {filteredStudents.length > 0 ? (
                  <div className="space-y-4">
                    {filteredStudents.map((student) => (
                      <div key={student.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`edit-student-${student.id}`} 
                          checked={selectedStudentIds.includes(student.id)}
                          onCheckedChange={() => handleStudentToggle(student.id)}
                        />
                        <label 
                          htmlFor={`edit-student-${student.id}`}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {student.full_name} <span className="text-muted-foreground">(@{student.username})</span>
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
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{selectedStudentIds.length} selected</span>
                <Button onClick={handleSaveAssignees} disabled={isPending}>
                  {isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[80vh]">
        {/* Left Panel: Assignees List */}
        <Card className="md:col-span-4 flex flex-col h-full overflow-hidden">
          <CardHeader className="pb-3 border-b bg-slate-50/50">
            <CardTitle className="text-lg flex justify-between items-center">
              Assigned Students
              <Badge variant="secondary">{assignmentData.assignees.length}</Badge>
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {assignmentData.assignees.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                  <UserMinus className="h-10 w-10 mb-2 opacity-20" />
                  <p>No students assigned.</p>
                </div>
              ) : (
                assignmentData.assignees.map((assignee) => (
                  <button
                    key={assignee.id}
                    onClick={() => setSelectedAssignee(assignee)}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group ${
                      selectedAssignee?.id === assignee.id ? "bg-primary/5 border-l-4 border-l-primary" : "border-l-4 border-l-transparent"
                    }`}
                  >
                    <div>
                      <p className="font-medium text-slate-900 group-hover:text-primary transition-colors">
                        {assignee.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{assignee.username}
                      </p>
                    </div>
                    {assignee.has_submitted ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Submitted
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500 border-slate-200">
                        <Clock className="h-3 w-3 mr-1" /> Pending
                      </Badge>
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Right Panel: Submission Viewer */}
        <Card className="md:col-span-8 flex flex-col h-full overflow-hidden bg-slate-50/50">
          {selectedAssignee ? (
            selectedAssignee.has_submitted ? (
              <>
                <CardHeader className="pb-3 border-b bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{selectedAssignee.full_name}'s Submission</CardTitle>
                      <CardDescription>
                        Submitted on {new Date(selectedAssignee.submission.submitted_at).toLocaleString()}
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={selectedAssignee.submission.file_url} target="_blank" rel="noopener noreferrer">
                        Open Original
                      </a>
                    </Button>
                  </div>
                </CardHeader>
                <div className="flex-1 bg-slate-100/50 p-4">
                  <div className="w-full h-full bg-white rounded-lg border shadow-sm overflow-hidden relative">
                    <iframe 
                      src={selectedAssignee.submission.file_url} 
                      className="absolute inset-0 w-full h-full"
                      title={`${selectedAssignee.full_name} submission`}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                <Clock className="h-16 w-16 mb-4 opacity-20" />
                <h3 className="text-xl font-medium text-slate-700 mb-1">Waiting for Submission</h3>
                <p className="text-center max-w-sm">
                  {selectedAssignee.full_name} hasn't submitted their work for this assignment yet.
                </p>
              </div>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
              <FileText className="h-16 w-16 mb-4 opacity-20" />
              <h3 className="text-xl font-medium text-slate-700 mb-1">Select a Student</h3>
              <p className="text-center max-w-sm">
                Click on a student from the left panel to view their submission status and submitted files.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
