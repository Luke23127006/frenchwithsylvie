"use client";

import { useState, useTransition, useEffect } from "react";
import { Copy, FileText, Search, Eye, EyeOff, Trash2, RefreshCw, Plus, Mic, FileAudio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createAssignment, toggleHideAssignment, moveToTrash, restoreAssignment, permanentlyDeleteAssignment } from "@/lib/actions/assignments";
import { getSignedUploadUrls } from "@/lib/actions/storage";
import { createClient } from "@supabase/supabase-js";
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
import toast from "react-hot-toast";
import Link from "next/link";
import { MultiAttachmentUploader, StagedAttachment } from "@/components/MultiAttachmentUploader";

interface Student {
  id: string;
  full_name: string;
  username: string;
}

interface DashboardClientProps {
  assignments: any[];
  students: Student[];
  trashedAssignments?: any[];
}

export default function DashboardClient({ assignments, students, trashedAssignments = [] }: DashboardClientProps) {
  const [title, setTitle] = useState("");
  const [stagedAttachments, setStagedAttachments] = useState<StagedAttachment[]>([]);
  const [submissionFormat, setSubmissionFormat] = useState<"DOCUMENT" | "AUDIO" | "BOTH">("DOCUMENT");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "trash">("active");
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    if (!isUploading) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      const message = "Files are still uploading. Are you sure you want to leave and cancel the upload?";
      e.returnValue = message; 
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isUploading]);

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
    
    if (selectedStudents.length === 0) {
      toast.error("Please select at least one student to assign.");
      return;
    }

    if (!title) {
      toast.error("Please provide a title for the assignment.");
      return;
    }

    setIsUploading(true);
    setUploadProgress({});

    try {
      const uploadedAttachments: { fileName: string, fileUrl: string, fileType: "document" | "audio", orderIndex: number }[] = [];

      for (let i = 0; i < stagedAttachments.length; i++) {
        const att = stagedAttachments[i];
        const fileToUpload = att.file || new File([att.blob!], att.name, { type: att.blob!.type });
        
        const fileMetadata = [{ fileName: fileToUpload.name, bucketName: "assignments" }];
        const signedUrlResult = await getSignedUploadUrls({ files: fileMetadata });
        
        if (signedUrlResult.error || !signedUrlResult.data) {
          throw new Error(`Failed to initialize upload for ${att.name}`);
        }

        const { path, token, publicUrl } = signedUrlResult.data[0];
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/upload/sign/assignments/${path}?token=${token}`;

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", url, true);
          xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
          xhr.setRequestHeader("Authorization", `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`);
          xhr.setRequestHeader("Content-Type", fileToUpload.type || "application/octet-stream");

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentage = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(prev => ({ ...prev, [att.name]: percentage }));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setUploadProgress(prev => ({ ...prev, [att.name]: 100 }));
              resolve();
            } else {
              reject(new Error(`Failed to upload ${att.name}`));
            }
          };
          xhr.onerror = () => reject(new Error(`Network error uploading ${att.name}`));
          xhr.send(fileToUpload);
        });

        uploadedAttachments.push({
          fileName: att.name,
          fileUrl: publicUrl,
          fileType: att.type,
          orderIndex: i
        });
      }

      // 4. Create assignment
      startTransition(async () => {
        const createResult = await createAssignment({ 
          title, 
          attachments: uploadedAttachments, 
          submissionFormat, 
          assigneeIds: selectedStudents 
        });
        if (createResult.error) {
          toast.error(`Creation failed: ${createResult.error}`);
          setIsUploading(false);
          return;
        }

        toast.success("Assignment created successfully!");
        setTitle("");
        setStagedAttachments([]);
        setSubmissionFormat("DOCUMENT");
        setSelectedStudents([]);
        
        setIsUploading(false);
        setUploadProgress({});
      });

    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      setIsUploading(false);
    }
  };

  const handleCopyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/assignment/${id}`);
    toast.success("Assignment link copied to clipboard!");
  };

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleHide = (id: string, isHidden: boolean) => {
    startTransition(async () => {
      const result = await toggleHideAssignment({ assignmentId: id, isHidden });
      if (result.error) toast.error(result.error);
      else toast.success(isHidden ? "Assignment hidden from students." : "Assignment is now visible.");
    });
  };

  const handleTrash = (id: string) => {
    if (!window.confirm("Move this assignment to the trash? It will be hidden from students.")) return;
    startTransition(async () => {
      const result = await moveToTrash({ assignmentId: id });
      if (result.error) toast.error(result.error);
      else toast.success("Assignment moved to trash.");
    });
  };

  const handleRestore = (id: string) => {
    startTransition(async () => {
      const result = await restoreAssignment({ assignmentId: id });
      if (result.error) toast.error(result.error);
      else toast.success("Assignment restored.");
    });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Are you sure you want to completely delete this assignment and all its student submissions? This action cannot be undone.")) return;
    startTransition(async () => {
      const result = await permanentlyDeleteAssignment({ assignmentId: id });
      if (result.error) toast.error(result.error);
      else toast.success("Assignment permanently deleted.");
    });
  };

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
                <Label>Expected Student Submission</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div 
                    onClick={() => setSubmissionFormat("DOCUMENT")}
                    className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center text-center space-y-2 transition-all ${
                      submissionFormat === "DOCUMENT" 
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20" 
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <FileText className={`h-8 w-8 ${submissionFormat === "DOCUMENT" ? "text-blue-600" : "text-slate-400"}`} />
                    <div>
                      <div className="font-semibold text-slate-800">Document</div>
                      <div className="text-xs text-slate-500">PDF or Images</div>
                    </div>
                  </div>
                  
                  <div 
                    onClick={() => setSubmissionFormat("AUDIO")}
                    className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center text-center space-y-2 transition-all ${
                      submissionFormat === "AUDIO" 
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20" 
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <Mic className={`h-8 w-8 ${submissionFormat === "AUDIO" ? "text-blue-600" : "text-slate-400"}`} />
                    <div>
                      <div className="font-semibold text-slate-800">Audio</div>
                      <div className="text-xs text-slate-500">Voice recording</div>
                    </div>
                  </div>

                  <div 
                    onClick={() => setSubmissionFormat("BOTH")}
                    className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center text-center space-y-2 transition-all ${
                      submissionFormat === "BOTH" 
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20" 
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <FileAudio className={`h-8 w-8 ${submissionFormat === "BOTH" ? "text-blue-600" : "text-slate-400"}`} />
                    <div>
                      <div className="font-semibold text-slate-800">Both</div>
                      <div className="text-xs text-slate-500">Document + Audio</div>
                    </div>
                  </div>
                </div>
              </div>
              <MultiAttachmentUploader
                attachments={stagedAttachments}
                setAttachments={setStagedAttachments}
                uploadProgress={uploadProgress}
                isUploading={isUploading}
                allowRecord={false}
                onRecordingChange={setIsRecording}
              />
              <Button 
                type="button" 
                onClick={(e: any) => handleCreateAssignment(e)} 
                className="w-full md:w-auto" 
                disabled={isPending || isUploading || isRecording}
              >
                <Plus className="mr-2 h-4 w-4" /> {isUploading ? "Uploading..." : isPending ? "Creating..." : "Create Assignment"}
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
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Assignments</CardTitle>
              <CardDescription>Manage your created assignments.</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant={activeTab === "active" ? "default" : "outline"} 
                size="sm" 
                onClick={() => setActiveTab("active")}
              >
                Active
              </Button>
              <Button 
                variant={activeTab === "trash" ? "default" : "outline"} 
                size="sm" 
                onClick={() => setActiveTab("trash")}
              >
                Trash
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border mt-4">
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
                  {activeTab === "active" && assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          {assignment.submission_format === 'AUDIO' ? (
                            <Mic className="mr-2 h-4 w-4 text-muted-foreground" />
                          ) : assignment.submission_format === 'BOTH' ? (
                            <FileAudio className="mr-2 h-4 w-4 text-muted-foreground" />
                          ) : (
                            <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                          )}
                          <span className={assignment.is_hidden ? "text-muted-foreground" : ""}>
                            {assignment.title}
                          </span>
                          {assignment.is_hidden && (
                            <span className="ml-2 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                              Hidden
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(assignment.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-center">{assignment.submissions_count || 0}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          title={assignment.is_hidden ? "Unhide" : "Hide from students"}
                          onClick={() => handleHide(assignment.id, !assignment.is_hidden)}
                          disabled={isPending}
                        >
                          {assignment.is_hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive"
                          title="Move to Trash"
                          onClick={() => handleTrash(assignment.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                  
                  {activeTab === "trash" && trashedAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center text-muted-foreground">
                          {assignment.submission_format === 'AUDIO' ? (
                            <Mic className="mr-2 h-4 w-4" />
                          ) : assignment.submission_format === 'BOTH' ? (
                            <FileAudio className="mr-2 h-4 w-4" />
                          ) : (
                            <FileText className="mr-2 h-4 w-4" />
                          )}
                          <span className="line-through">{assignment.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        Deleted: {new Date(assignment.deleted_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">{assignment.submissions_count || 0}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRestore(assignment.id)}
                          disabled={isPending}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" /> Restore
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleDelete(assignment.id)}
                          disabled={isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {activeTab === "active" && assignments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No active assignments found.
                      </TableCell>
                    </TableRow>
                  )}
                  {activeTab === "trash" && trashedAssignments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Trash is empty.
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
