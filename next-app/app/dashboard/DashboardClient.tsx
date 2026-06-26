"use client";

import { useState, useTransition, useEffect } from "react";
import { Copy, FileText, Search, Eye, EyeOff, Trash2, RefreshCw, Plus, Mic, FileAudio, MoreHorizontal } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "trash">("active");
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isRecording, setIsRecording] = useState(false);
  
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "needs_grading" | "waiting" | "completed" | "scheduled">("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "title_asc" | "title_desc">("date_desc");
  const [isScheduled, setIsScheduled] = useState(false);
  const [publishAt, setPublishAt] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    // Format to YYYY-MM-DDTHH:mm for datetime-local input
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    return new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
  });

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

    const hasImages = stagedAttachments.some(att => att.file?.type.startsWith('image/'));
    if (hasImages) {
      toast.error("Please convert your images to a PDF before creating the assignment.");
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
          submissionFormat: "BOTH", 
          assigneeIds: selectedStudents,
          publishAt: isScheduled ? new Date(publishAt).toISOString() : undefined
        });
        if (createResult.error) {
          toast.error(`Creation failed: ${createResult.error}`);
          setIsUploading(false);
          return;
        }

        toast.success("Assignment created successfully!");
        setTitle("");
        setStagedAttachments([]);
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

  const getAssignmentState = (assignment: any) => {
    if (assignment.publish_at) return "scheduled";
    
    const ungraded = assignment.ungraded_submissions_count || 0;
    const submissions = assignment.submissions_count || 0;
    const assignees = assignment.assignees_count || 0;
    
    if (ungraded > 0) return "needs_grading";
    if (assignees > 0 && submissions === assignees && ungraded === 0) return "completed";
    if (submissions < assignees) return "waiting";
    return "no_assignees";
  };

  const processedAssignments = assignments
    .filter(a => {
      if (assignmentSearch && !a.title.toLowerCase().includes(assignmentSearch.toLowerCase())) return false;
      if (statusFilter !== "all") {
        if (getAssignmentState(a) !== statusFilter) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "date_desc") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "date_asc") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "title_asc") return a.title.localeCompare(b.title);
      if (sortBy === "title_desc") return b.title.localeCompare(a.title);
      return 0;
    });

  const processedTrashedAssignments = trashedAssignments
    .filter(a => {
      if (assignmentSearch && !a.title.toLowerCase().includes(assignmentSearch.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "date_desc") return new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime();
      if (sortBy === "date_asc") return new Date(a.deleted_at).getTime() - new Date(b.deleted_at).getTime();
      if (sortBy === "title_asc") return a.title.localeCompare(b.title);
      if (sortBy === "title_desc") return b.title.localeCompare(a.title);
      return 0;
    });

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
              
              <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <Label>Schedule Assignment</Label>
                  <p className="text-xs text-muted-foreground">Publish this assignment at a later time</p>
                </div>
                <Switch checked={isScheduled} onCheckedChange={setIsScheduled} disabled={isPending || isUploading} />
              </div>
              
              {isScheduled && (
                <div className="grid gap-2">
                  <Label htmlFor="publishAt">Publish Date & Time</Label>
                  <Input 
                    id="publishAt" 
                    type="datetime-local" 
                    value={publishAt}
                    onChange={(e) => setPublishAt(e.target.value)}
                    disabled={isPending || isUploading}
                    required={isScheduled}
                  />
                </div>
              )}

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
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search assignments..."
                  className="pl-8"
                  value={assignmentSearch}
                  onChange={(e) => setAssignmentSearch(e.target.value)}
                />
              </div>
              {activeTab === "active" && (
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" sideOffset={4}>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="needs_grading">Needs Grading</SelectItem>
                    <SelectItem value="waiting">Waiting</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" sideOffset={4}>
                  <SelectItem value="date_desc">Newest First</SelectItem>
                  <SelectItem value="date_asc">Oldest First</SelectItem>
                  <SelectItem value="title_asc">Title (A-Z)</SelectItem>
                  <SelectItem value="title_desc">Title (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="rounded-md border mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead className="text-center">Submissions</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTab === "active" && processedAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center flex-wrap gap-2">
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
                          </div>
                          {assignment.is_hidden && (
                            <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-semibold">
                              Hidden
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{new Date(assignment.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-center">{assignment.submissions_count || 0} / {assignment.assignees_count || 0}</TableCell>
                      <TableCell className="text-center">
                        {(() => {
                          const stateVal = getAssignmentState(assignment);
                          
                          let label = "No Assignees";
                          let color = "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
                          
                          if (stateVal === "scheduled") {
                            const timeStr = new Date(assignment.publish_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
                            label = `Scheduled: ${timeStr}`;
                            color = "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300";
                          } else if (stateVal === "needs_grading") {
                            label = "Needs Grading";
                            color = "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
                          } else if (stateVal === "completed") {
                            label = "Completed";
                            color = "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
                          } else if (stateVal === "waiting") {
                            label = "Waiting";
                            color = "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
                          }
                          
                          return (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${color}`}>
                              {label}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-right flex justify-end gap-2 items-center">
                        <Button variant="secondary" size="sm" asChild>
                          <Link href={`/dashboard/assignment/${assignment.id}`}>View</Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleCopyLink(assignment.id)} className="cursor-pointer">
                              <Copy className="mr-2 h-4 w-4" /> Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleHide(assignment.id, !assignment.is_hidden)}
                              disabled={isPending}
                              className="cursor-pointer"
                            >
                              {assignment.is_hidden ? (
                                <><Eye className="mr-2 h-4 w-4" /> Unhide</>
                              ) : (
                                <><EyeOff className="mr-2 h-4 w-4" /> Hide from students</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleTrash(assignment.id)}
                              disabled={isPending}
                              className="text-destructive focus:text-destructive cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Move to Trash
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {activeTab === "trash" && processedTrashedAssignments.map((assignment) => (
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
                      <TableCell className="text-center text-muted-foreground">-</TableCell>
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

                  {activeTab === "active" && processedAssignments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No active assignments found.
                      </TableCell>
                    </TableRow>
                  )}
                  {activeTab === "trash" && processedTrashedAssignments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
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
