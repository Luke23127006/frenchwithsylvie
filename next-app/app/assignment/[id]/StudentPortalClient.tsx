"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Upload, CheckCircle2, GraduationCap, FileText, ArrowLeft, ArrowRight, RefreshCw, Mic, Square, Trash2, GripVertical, FileAudio, File as FileIcon, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getSignedUploadUrls } from "@/lib/actions/storage";
import { submitSolution, removeSubmission } from "@/lib/actions/submissions";
import toast from "react-hot-toast";
import DOMPurify from "isomorphic-dompurify";
import { getRatingInfo } from "@/lib/utils";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { v4 as uuidv4 } from "uuid";
import { MultiAttachmentUploader, StagedAttachment } from "@/components/MultiAttachmentUploader";



interface StudentPortalClientProps {
  assignment: any;
  existingSubmission: any | null;
}

export default function StudentPortalClient({ assignment, existingSubmission }: StudentPortalClientProps) {
  const [submission, setSubmission] = useState(existingSubmission);
  
  const isFullySubmitted = () => {
    if (!submission) return false;
    return true; // With multi-attachments, any submission record means they submitted.
  };

  const [stagedAttachments, setStagedAttachments] = useState<StagedAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [viewMode, setViewMode] = useState<"assignment" | "submission">("assignment");
  const [selectedPreviewAttId, setSelectedPreviewAttId] = useState<string | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPending, startTransition] = useTransition();



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (stagedAttachments.length === 0) {
      toast.error("Please add at least one file or recording.");
      return;
    }

    setIsUploading(true);
    setUploadProgress({});

    startTransition(async () => {
      try {
        const uploadedAttachments: { fileName: string, fileUrl: string, fileType: string, orderIndex: number }[] = [];

        // Upload sequentially or map with Promise.all
        for (let i = 0; i < stagedAttachments.length; i++) {
          const att = stagedAttachments[i];
          const fileToUpload = att.file || new File([att.blob!], att.name, { type: att.blob!.type });
          
          const fileMetadata = [{ fileName: fileToUpload.name, bucketName: "submissions" }];
          const signedUrlResult = await getSignedUploadUrls({ files: fileMetadata });
          
          if (signedUrlResult.error || !signedUrlResult.data) {
            throw new Error(`Failed to initialize upload for ${att.name}`);
          }

          const { path, token, publicUrl } = signedUrlResult.data[0];
          const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/upload/sign/submissions/${path}?token=${token}`;

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", url, true);
            xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
            xhr.setRequestHeader("Authorization", `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`);
            xhr.setRequestHeader("Content-Type", fileToUpload.type || "application/octet-stream");

            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const percentage = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(prev => ({ ...prev, [att.id]: percentage }));
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                setUploadProgress(prev => ({ ...prev, [att.id]: 100 }));
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

        const submitResult = await submitSolution({ 
          assignmentId: assignment.id, 
          attachments: uploadedAttachments 
        });

        if (submitResult.error) {
          throw new Error(submitResult.error);
        }

        setSubmission(submitResult.data?.[0]);
        setStagedAttachments([]); // Clear staging area
        setIsUploading(false);
        toast.success("Submission successful!");
      } catch (error: any) {
        toast.error(`Error: ${error.message}`);
        setIsUploading(false);
      }
    });
  };

  const handleRemove = () => {
    if (!submission) return;
    if (!window.confirm("Are you sure you want to remove your submission? This action cannot be undone.")) return;

    startTransition(async () => {
      try {
        const result = await removeSubmission({ submissionId: submission.id, assignmentId: assignment.id });
        if (result.error) {
          toast.error(`Removal failed: ${result.error}`);
          return;
        }

        setSubmission(null);
        setViewMode("assignment");
        toast.success("Submission removed successfully.");
      } catch (error: any) {
        toast.error(`Error: ${error.message}`);
      }
    });
  };

  const createMarkup = (html: string) => {
    return {
      __html: DOMPurify.sanitize(html)
    };
  };

  // Safe checks for arrays
  const submittedAttachments = submission?.submission_attachments || [];
  const submittedDocs = submittedAttachments.filter((a: any) => a.file_type === 'document');
  const submittedAudios = submittedAttachments.filter((a: any) => a.file_type === 'audio');
  
  const previewUrl = viewMode === "assignment" 
    ? assignment.file_url 
    : (submittedDocs.find((a: any) => a.id === selectedPreviewAttId)?.file_url || submittedDocs[0]?.file_url);

  return (
    <div className="h-[calc(100vh-65px)] bg-slate-50 flex flex-col md:flex-row">
      {/* Left/Top Area: Document Viewer (60%) */}
      <div className="w-full md:w-[60%] border-r bg-white p-4 md:p-8 flex flex-col h-[50vh] md:h-full">
        <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
          <div className="flex flex-col gap-3">
            <h1 className="text-2xl font-bold">{assignment.title}</h1>
            {isFullySubmitted() && (
              <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
                <Button 
                  variant={viewMode === "assignment" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("assignment")}
                  className="rounded-md"
                >
                  Assignment
                </Button>
                <Button 
                  variant={viewMode === "submission" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("submission")}
                  className="rounded-md"
                >
                  My Submission
                </Button>
              </div>
            )}
          </div>
          {previewUrl && (
            <Button variant="outline" asChild>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <FileText className="mr-2 h-4 w-4 text-blue-600" />
                View Full
              </a>
            </Button>
          )}
        </div>

        {viewMode === "assignment" && assignment.audio_urls && assignment.audio_urls.length > 0 && (
          <div className="mb-4 space-y-3">
            <h3 className="font-semibold text-slate-700">Listening Audio</h3>
            <div className="flex flex-col gap-2">
              {assignment.audio_urls.map((audioUrl: string, index: number) => (
                <audio key={index} controls className="w-full h-10" src={audioUrl}>
                  Your browser does not support the audio element.
                </audio>
              ))}
            </div>
          </div>
        )}

        {viewMode === "submission" && submittedAudios.length > 0 && (
          <div className="mb-4 space-y-3">
            <h3 className="font-semibold text-slate-700">My Speaking Audio</h3>
            <div className="flex flex-col gap-2">
              {submittedAudios.map((att: any) => (
                <div key={att.id} className="flex flex-col gap-1">
                  <span className="text-sm text-slate-500 font-medium">{att.file_name}</span>
                  <audio controls className="w-full h-10" src={att.file_url}>
                    Your browser does not support the audio element.
                  </audio>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Thumbnail Selector for Multiple Documents in Submission Mode */}
        {viewMode === "submission" && submittedDocs.length > 1 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {submittedDocs.map((att: any, index: number) => (
              <button 
                key={att.id}
                onClick={() => setSelectedPreviewAttId(att.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${selectedPreviewAttId === att.id ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white hover:bg-slate-50 text-slate-600'}`}
              >
                {att.file_name || `Document ${index + 1}`}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative">
          {previewUrl ? (
            <iframe 
              src={previewUrl} 
              className="absolute inset-0 w-full h-full"
              title={viewMode === "assignment" ? assignment.title : "Preview"}
            />
          ) : (
            <div className="text-muted-foreground flex flex-col items-center p-8 text-center">
              <FileText className="h-16 w-16 mb-4 opacity-20" />
              <p>No document provided for this {viewMode}.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right/Bottom Area: Submission Form / Feedback (40%) */}
      <div className="w-full md:w-[40%] p-4 md:p-8 h-auto md:h-full md:overflow-y-auto">
        <div className="max-w-md mx-auto space-y-6">
          {!isFullySubmitted() ? (
            <Card className="shadow-lg border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="text-2xl">Submit Your Work</CardTitle>
                <CardDescription>
                  Upload documents, images, or record audio clips. Drag and drop to reorder before submitting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <MultiAttachmentUploader
                  attachments={stagedAttachments}
                  setAttachments={setStagedAttachments}
                  uploadProgress={uploadProgress}
                  isUploading={isUploading}
                  allowRecord={true}
                  onRecordingChange={setIsRecording}
                />

                {/* Submit Button */}
                <Button 
                  type="button" 
                  onClick={handleSubmit}
                  className="w-full text-lg h-14 rounded-full mt-4" 
                  disabled={isPending || isUploading || stagedAttachments.length === 0 || isRecording}
                >
                  {isUploading ? "Uploading..." : isPending ? "Submitting..." : (
                    <><CheckCircle2 className="mr-2 h-5 w-5" /> Submit Assignment</>
                  )}
                </Button>

                {/* Upload Progress */}
                {Object.entries(uploadProgress).length > 0 && (
                  <div className="space-y-3 mt-4 p-4 border rounded-md bg-secondary/20">
                    <p className="text-sm font-medium mb-1 flex items-center">
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Uploading...
                    </p>
                    {stagedAttachments.map((att) => {
                      const progress = uploadProgress[att.id] || 0;
                      return (
                        <div key={att.id} className="space-y-1.5">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span className="truncate max-w-[200px]">{att.name}</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-primary h-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-green-200 bg-green-50 text-center py-6 shadow-sm">
                <CardContent className="space-y-4 pt-6">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <CardTitle className="text-2xl text-green-800">Submitted Successfully!</CardTitle>
                  <p className="text-green-700 font-medium">
                    {submittedAttachments.length} attachments submitted.
                  </p>
                  <div className="flex justify-center space-x-4 mt-4">
                    <Button variant="destructive" disabled={isPending} onClick={handleRemove}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isPending ? "Removing..." : "Remove Submission"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Grading and Feedback Section */}
              {submission && (submission.grade || submission.feedback) && (
                <Card className="border-t-4 border-t-blue-500 shadow-md">
                  <CardHeader className="bg-blue-50/50 pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center text-blue-900">
                        <GraduationCap className="w-5 h-5 mr-2 text-blue-600" />
                        Teacher's Feedback
                      </CardTitle>
                      {submission.grade && (
                        <div className="flex flex-col items-end gap-1">
                          <Badge className="bg-blue-600 hover:bg-blue-700 text-sm px-3 py-1">
                            Score: {submission.grade} / 100
                          </Badge>
                          {getRatingInfo(submission.grade) && (
                            <Badge className={getRatingInfo(submission.grade)?.color}>
                              {getRatingInfo(submission.grade)?.label}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {submission.feedback ? (
                      <div 
                        className="prose prose-sm max-w-none text-slate-700 prose-p:leading-relaxed"
                        dangerouslySetInnerHTML={createMarkup(submission.feedback)}
                      />
                    ) : (
                      <p className="text-muted-foreground italic">No written feedback provided.</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
