"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, CheckCircle2, Clock, FileText, Search, UserMinus, Save, Pencil, X, Trash2, Mic } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import Link from "next/link";
import { updateAssignees, updateAssignmentTitle } from "@/lib/actions/assignments";
import { gradeSubmission } from "@/lib/actions/submissions";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { getRatingInfo } from "@/lib/utils";

interface Student {
  id: string;
  full_name: string;
  username: string;
}

interface SubmissionAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: 'document' | 'audio';
  order_index: number;
}

interface Submission {
  id: string;
  student_id: string;
  assignment_id: string;
  grade: string | null;
  feedback: string | null;
  submitted_at: string;
  file_url?: string | null; // legacy
  audio_url?: string | null; // legacy
  submission_attachments?: SubmissionAttachment[];
}

interface Assignee extends Student {
  has_submitted: boolean;
  submission: Submission | null;
}

interface AssignmentAttachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: 'document' | 'audio';
  order_index: number;
}

interface TeacherReviewClientProps {
  assignmentData: {
    id: string;
    title: string;
    file_url: string | null;
    audio_urls?: string[];
    submission_format: 'DOCUMENT' | 'AUDIO' | 'BOTH';
    created_at: string;
    assignees: Assignee[];
    assignment_attachments?: AssignmentAttachment[];
  };
  allStudents: Student[];
}

export default function TeacherReviewClient({ assignmentData, allStudents }: TeacherReviewClientProps) {
  const [selectedAssignee, setSelectedAssignee] = useState<Assignee | null>(null);
  const [selectedPreviewDocUrl, setSelectedPreviewDocUrl] = useState<string | null>(null);
  
  // Edit Assignees State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    assignmentData.assignees.map(a => a.id)
  );
  
  // Grading State
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");

  const [isPending, startTransition] = useTransition();

  // Update grading state when assignee changes
  const handleSelectAssignee = (assignee: Assignee) => {
    setSelectedAssignee(assignee);
    setSelectedPreviewDocUrl(null);
    if (assignee.submission) {
      setGrade(assignee.submission.grade || "");
      setFeedback(assignee.submission.feedback || "");
    }
  };

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
        const result = await updateAssignees({ assignmentId: assignmentData.id, newAssigneeIds: selectedStudentIds });
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

  const handleSaveGrade = () => {
    if (!selectedAssignee || !selectedAssignee.submission) return;
    
    // Validation
    const gradeNum = parseInt(grade, 10);
    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100) {
      toast.error("Grade must be an integer between 0 and 100.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await gradeSubmission({ submissionId: selectedAssignee.submission!.id, grade: gradeNum.toString(), feedback: feedback });
        if (result.error) {
          toast.error("Failed to save grade: " + result.error);
        } else {
          toast.success("Grade and feedback saved successfully!");
          // Update local state to reflect changes without a full page reload
          setSelectedAssignee({
            ...selectedAssignee,
            submission: {
              ...selectedAssignee.submission!,
              grade,
              feedback
            } as Submission
          });
        }
      } catch (e: any) {
        toast.error("Error: " + e.message);
      }
    });
  };
  const handleRemoveGrade = () => {
    if (!selectedAssignee || !selectedAssignee.submission) return;

    if (!window.confirm("Are you sure you want to remove the grade and feedback for this submission?")) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await gradeSubmission({ submissionId: selectedAssignee.submission!.id, grade: null, feedback: null });
        if (result.error) {
          toast.error("Failed to remove grade: " + result.error);
        } else {
          toast.success("Grade and feedback removed successfully!");
          setGrade("");
          setFeedback("");
          setSelectedAssignee({
            ...selectedAssignee,
            submission: {
              ...selectedAssignee.submission!,
              grade: null,
              feedback: null
            } as Submission
          });
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

  // Edit Title State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(assignmentData.title);
  const [currentTitle, setCurrentTitle] = useState(assignmentData.title);

  const handleSaveTitle = () => {
    if (!titleInput.trim() || titleInput.trim() === currentTitle) {
      setIsEditingTitle(false);
      setTitleInput(currentTitle);
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateAssignmentTitle({ assignmentId: assignmentData.id, title: titleInput.trim() });
        if (result.error) {
          toast.error("Failed to update title: " + result.error);
        } else {
          toast.success("Title updated successfully!");
          setCurrentTitle(titleInput.trim());
          setIsEditingTitle(false);
        }
      } catch (e: any) {
        toast.error("Error: " + e.message);
      }
    });
  };

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
            {isEditingTitle ? (
              <div className="flex items-center space-x-2">
                <Input 
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="text-2xl font-bold h-auto py-1"
                  autoFocus
                  disabled={isPending}
                />
                <Button size="icon" variant="ghost" onClick={handleSaveTitle} disabled={isPending}>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setIsEditingTitle(false); setTitleInput(currentTitle); }} disabled={isPending}>
                  <X className="h-5 w-5 text-red-600" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 group">
                <h1 className="text-3xl font-bold tracking-tight">{currentTitle}</h1>
                <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setIsEditingTitle(true)}>
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-3 mt-2 text-muted-foreground">
              <span className="text-sm">
                Created on {new Date(assignmentData.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(() => {
            const attachments = assignmentData.assignment_attachments || [];
            const sortedAttachments = [...attachments].sort((a: any, b: any) => a.order_index - b.order_index);
            
            return sortedAttachments.map((att: any, idx: number) => (
              <Button key={att.id || idx} variant="outline" asChild>
                <a href={att.file_url} target="_blank" rel="noopener noreferrer">
                  {att.file_type === 'document' ? (
                    <FileText className="mr-2 h-4 w-4 text-blue-600" />
                  ) : (
                    <Mic className="mr-2 h-4 w-4 text-indigo-600" />
                  )}
                  {att.file_name}
                </a>
              </Button>
            ));
          })()}
          
          {/* Legacy fallback */}
          {(!assignmentData.assignment_attachments || assignmentData.assignment_attachments.length === 0) && assignmentData.file_url && (
            <Button variant="outline" asChild>
              <a href={assignmentData.file_url} target="_blank" rel="noopener noreferrer">
                <FileText className="mr-2 h-4 w-4 text-blue-600" />
                View Document
              </a>
            </Button>
          )}
          
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
      </div>

      {assignmentData.audio_urls && assignmentData.audio_urls.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Listening Audio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {assignmentData.audio_urls.map((audioUrl: string, index: number) => (
                <audio key={index} controls className="w-full h-10" src={audioUrl}>
                  Your browser does not support the audio element.
                </audio>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative items-start">
        {/* Left Panel: Assignees List */}
        <Card className="md:col-span-3 flex flex-col h-[calc(100vh-8rem)] overflow-hidden sticky top-8">
          <CardHeader className="pb-3 border-b bg-slate-50/50">
            <CardTitle className="text-lg flex justify-between items-center">
              Assigned
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
                    onClick={() => handleSelectAssignee(assignee)}
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

        {/* Right Panel: Submission Viewer & Grading */}
        <div className="md:col-span-9 flex flex-col gap-6 items-start">
          {!selectedAssignee ? (
            <Card className="w-full flex flex-col items-center justify-center text-muted-foreground p-8 min-h-[500px] bg-slate-50/50">
              <FileText className="h-16 w-16 mb-4 opacity-20" />
              <h3 className="text-xl font-medium text-slate-700 mb-1">Select a Student</h3>
              <p className="text-center max-w-sm">
                Click on a student from the left panel to view their submission status and submitted files.
              </p>
            </Card>
          ) : !selectedAssignee.has_submitted || !selectedAssignee.submission ? (
            <Card className="w-full flex flex-col items-center justify-center text-muted-foreground p-8 min-h-[500px] bg-slate-50/50">
              <Clock className="h-16 w-16 mb-4 opacity-20" />
              <h3 className="text-xl font-medium text-slate-700 mb-1">Waiting for Submission</h3>
              <p className="text-center max-w-sm">
                {selectedAssignee.full_name} hasn't submitted their work for this assignment yet.
              </p>
            </Card>
          ) : (
            <>
              {/* Submission Viewer */}
              <Card className="w-full flex flex-col overflow-hidden bg-slate-50/50 flex-shrink-0">
                <CardHeader className="pb-3 border-b bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{selectedAssignee.full_name}'s Submission</CardTitle>
                      <CardDescription>
                        Submitted on {new Date(selectedAssignee.submission.submitted_at).toLocaleString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <div className="bg-slate-50/50 p-6 flex flex-col gap-6">
                  {(() => {
                    const attachments = selectedAssignee.submission!.submission_attachments || [];
                    const documents = attachments.filter(a => a.file_type === 'document');
                    const audios = attachments.filter(a => a.file_type === 'audio');
                    
                    const hasLegacyFile = !attachments.length && selectedAssignee.submission!.file_url;
                    const hasLegacyAudio = !attachments.length && selectedAssignee.submission!.audio_url;

                    if (!attachments.length && !hasLegacyFile && !hasLegacyAudio) {
                      return <p className="text-muted-foreground text-center mt-10">No attachments found.</p>;
                    }

                    const defaultPreviewUrl = documents.length > 0 ? documents[0].file_url : (hasLegacyFile ? selectedAssignee.submission!.file_url : null);
                    const activePreviewUrl = selectedPreviewDocUrl || defaultPreviewUrl;

                    return (
                      <div className="flex flex-col gap-6">
                        <Card className="shadow-sm border border-slate-200 bg-white">
                          <CardHeader className="bg-slate-50/80 border-b pb-4 pt-5 px-6">
                            <CardTitle className="text-lg font-semibold text-slate-800">Attachments</CardTitle>
                          </CardHeader>
                          <CardContent className="p-0 flex flex-col divide-y divide-slate-100">
                            
                            {/* Audio Playlist Section */}
                            {(audios.length > 0 || hasLegacyAudio) && (
                              <div className="p-6">
                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Audio Playlist</h4>
                                <div className="flex flex-col gap-4">
                                  {audios.map((audio, i) => (
                                    <div key={audio.id || i} className="flex flex-col gap-3 p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                                      <div className="flex items-center gap-3">
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold px-2.5">#{i + 1}</Badge>
                                        <Mic className="h-5 w-5 text-indigo-500" />
                                        <span className="font-semibold text-slate-700">{audio.file_name}</span>
                                      </div>
                                      <audio controls className="w-full h-12" src={audio.file_url}>
                                        Your browser does not support the audio element.
                                      </audio>
                                    </div>
                                  ))}
                                  {hasLegacyAudio && (
                                    <div className="flex flex-col gap-3 p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                                      <div className="flex items-center gap-3">
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold px-2.5">#1</Badge>
                                        <Mic className="h-5 w-5 text-indigo-500" />
                                        <span className="font-semibold text-slate-700">Recorded Audio</span>
                                      </div>
                                      <audio controls className="w-full h-12" src={selectedAssignee.submission!.audio_url!}>
                                        Your browser does not support the audio element.
                                      </audio>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Documents Section */}
                            {(documents.length > 0 || hasLegacyFile) && (
                              <div className="p-6">
                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Documents</h4>
                                <div className="flex flex-col gap-3">
                                  {documents.map((doc, i) => (
                                    <div key={doc.id || i} className={`flex items-center justify-between p-3 rounded-lg border transition-colors group ${selectedPreviewDocUrl === doc.file_url || (!selectedPreviewDocUrl && i === 0) ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                                      <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="bg-blue-100 p-2 rounded-md shrink-0">
                                          <FileText className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <span className="font-medium text-sm text-slate-700 truncate">{doc.file_name}</span>
                                      </div>
                                      <Button variant="ghost" size="sm" className="shrink-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100" onClick={() => setSelectedPreviewDocUrl(doc.file_url)}>
                                        Preview
                                      </Button>
                                    </div>
                                  ))}
                                  {hasLegacyFile && (
                                    <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors group ${selectedPreviewDocUrl === selectedAssignee.submission!.file_url! || (!selectedPreviewDocUrl && documents.length === 0) ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                                      <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="bg-blue-100 p-2 rounded-md shrink-0">
                                          <FileText className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <span className="font-medium text-sm text-slate-700 truncate">Uploaded Document</span>
                                      </div>
                                      <Button variant="ghost" size="sm" className="shrink-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100" onClick={() => setSelectedPreviewDocUrl(selectedAssignee.submission!.file_url!)}>
                                        Preview
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        {/* Document Viewer */}
                        {activePreviewUrl && (
                          <Card className="flex flex-col overflow-hidden bg-white shadow-sm h-[550px]">
                            <iframe src={`${activePreviewUrl}#toolbar=1&navpanes=0`} className="w-full h-full border-0" />
                          </Card>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </Card>

              {/* Grading Panel */}
              <Card className="w-full flex-shrink-0">
                  <CardHeader className="py-4">
                    <CardTitle className="text-lg">Grading & Feedback</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="grade">Grade / Score (0-100)</Label>
                        <div className="flex space-x-2 items-center">
                          <Input 
                            id="grade" 
                            type="number"
                            min="0"
                            max="100"
                            placeholder="e.g. 95" 
                            value={grade}
                            onChange={(e) => setGrade(e.target.value)}
                            disabled={isPending}
                            className="w-24"
                          />
                          <span className="text-muted-foreground">/ 100</span>
                        </div>
                        {getRatingInfo(grade) && (
                          <div className="mt-2">
                            <Badge className={getRatingInfo(grade)?.color}>
                              {getRatingInfo(grade)?.label}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Feedback (Rich Text)</Label>
                        <RichTextEditor 
                          value={feedback} 
                          onChange={setFeedback}
                          disabled={isPending}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      {(selectedAssignee.submission.grade || selectedAssignee.submission.feedback) && (
                        <Button variant="destructive" onClick={handleRemoveGrade} disabled={isPending}>
                          <Trash2 className="mr-2 h-4 w-4" /> {isPending ? "Removing..." : "Remove"}
                        </Button>
                      )}
                      <Button onClick={handleSaveGrade} disabled={isPending}>
                        <Save className="mr-2 h-4 w-4" /> {isPending ? "Saving..." : "Save Grade"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
