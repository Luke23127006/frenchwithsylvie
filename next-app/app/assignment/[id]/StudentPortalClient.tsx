"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Upload, CheckCircle2, GraduationCap, FileText, ArrowLeft, ArrowRight, ImagePlus, RefreshCw } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { getSignedUploadUrls } from "@/lib/actions/storage";
import { submitSolution, removeSubmission } from "@/lib/actions/submissions";
import toast from "react-hot-toast";
import DOMPurify from "isomorphic-dompurify";
import { getRatingInfo } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { convertImagesToPDF } from "@/lib/pdf";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import AudioSubmission from "./AudioSubmission";

interface StudentPortalClientProps {
  assignment: any;
  existingSubmission: any | null;
}

export default function StudentPortalClient({ assignment, existingSubmission }: StudentPortalClientProps) {
  const [submission, setSubmission] = useState(existingSubmission);
  
  const isFullySubmitted = () => {
    if (!submission) return false;
    if (assignment.submission_format === 'BOTH') {
      return !!submission.file_url && !!submission.audio_url;
    }
    return true;
  };
  const [files, setFiles] = useState<File[]>([]);
  const [objectUrls, setObjectUrls] = useState<string[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [viewMode, setViewMode] = useState<"assignment" | "submission">("assignment");
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'left' | 'right' | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    // Update object URLs whenever files change
    const urls = files.map(file => URL.createObjectURL(file));
    setObjectUrls(urls);

    // Cleanup function to revoke old URLs
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [files]);

  const handleRemoveImage = (indexToRemove: number) => {
    setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    
    // Auto-scroll logic
    if (scrollContainerRef.current) {
      const { top, bottom } = scrollContainerRef.current.getBoundingClientRect();
      const y = e.clientY;
      const scrollThreshold = 100;
      const scrollSpeed = 15;

      if (y - top < scrollThreshold) {
        scrollContainerRef.current.scrollTop -= scrollSpeed;
      } else if (bottom - y < scrollThreshold) {
        scrollContainerRef.current.scrollTop += scrollSpeed;
      }
    }

    // Determine if closer to left or right half of the image
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeft = x < rect.width / 2;
    const position = isLeft ? 'left' : 'right';

    if (dragOverIndex !== index || dropPosition !== position) {
      setDragOverIndex(index);
      setDropPosition(position);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setDropPosition(null);
    setIsOverTrash(false);
  };

  const handleTrashDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isOverTrash) setIsOverTrash(true);
  };

  const handleTrashDragLeave = (e: React.DragEvent) => {
    setIsOverTrash(false);
  };

  const handleTrashDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverTrash(false);
    if (draggedIndex !== null) {
      handleRemoveImage(draggedIndex);
      setDraggedIndex(null);
      setDragOverIndex(null);
      setDropPosition(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const pos = dropPosition;
    setDragOverIndex(null);
    setDropPosition(null);

    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    setFiles(prev => {
      const newFiles = [...prev];
      const [movedItem] = newFiles.splice(draggedIndex, 1);
      
      let insertIndex = targetIndex;
      if (pos === 'right') insertIndex += 1;
      
      if (draggedIndex < insertIndex) {
        insertIndex -= 1;
      }
      
      newFiles.splice(insertIndex, 0, movedItem);
      return newFiles;
    });
    setDraggedIndex(null);
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      setFiles(prev => [...prev, ...selected]);
      setIsPreviewModalOpen(true);
    }
    // Clear input so the same files can be selected again
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent, type: 'pdf' | 'images') => {
    e.preventDefault();
    if (files.length === 0) {
      toast.error("Please provide a solution file.");
      return;
    }

    setIsUploading(true);
    setUploadProgress({});

    startTransition(async () => {
      try {
        let finalFile: File;

        if (type === 'pdf') {
          if (files[0].type !== 'application/pdf') {
            toast.error("Please select a valid PDF file.");
            setIsUploading(false);
            return;
          }
          finalFile = files[0];
        } else {
          // It's one or more images, convert to PDF
          const hasNonImage = files.some(f => !f.type.startsWith('image/'));
          if (hasNonImage) {
            toast.error("Please select only image files.");
            setIsUploading(false);
            return;
          }
          setIsConverting(true);
          finalFile = await convertImagesToPDF(files);
          setIsConverting(false);
        }

        // 1. Get Signed URL
        const fileMetadata = [{ fileName: finalFile.name, bucketName: "submissions" }];
        const signedUrlResult = await getSignedUploadUrls({ files: fileMetadata });
        
        if (signedUrlResult.error || !signedUrlResult.data) {
          toast.error(`Failed to initialize upload: ${signedUrlResult.error}`);
          setIsUploading(false);
          return;
        }

        const { path, token, publicUrl } = signedUrlResult.data[0];
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/upload/sign/submissions/${path}?token=${token}`;

        // 2. Upload via XHR
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", url, true);
          xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
          xhr.setRequestHeader("Authorization", `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`);
          xhr.setRequestHeader("Content-Type", finalFile.type || "application/pdf");

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentage = Math.round((event.loaded / event.total) * 100);
              setUploadProgress({ [finalFile.name]: percentage });
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setUploadProgress({ [finalFile.name]: 100 });
              resolve();
            } else {
              reject(new Error(`Failed to upload ${finalFile.name}: ${xhr.statusText}`));
            }
          };
          xhr.onerror = () => reject(new Error(`Network error uploading ${finalFile.name}`));
          xhr.send(finalFile);
        });

        const submitResult = await submitSolution({ assignmentId: assignment.id, fileUrl: publicUrl });
        if (submitResult.error) {
          toast.error(`Submission failed: ${submitResult.error}`);
          setIsUploading(false);
          return;
        }

        setSubmission(submitResult.data?.[0]);
        setIsUploading(false);
      } catch (error: any) {
        toast.error(`Error: ${error.message}`);
        setIsUploading(false);
      }
    });
  };

  const handleRemove = () => {
    if (!submission) return;
    
    if (!window.confirm("Are you sure you want to remove your submission? This action cannot be undone.")) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await removeSubmission({ submissionId: existingSubmission.id, assignmentId: assignment.id });
        if (result.error) {
          toast.error(`Removal failed: ${result.error}`);
          return;
        }

        setSubmission(null);
        setFiles([]);
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

  return (
    <div className="h-[calc(100vh-65px)] bg-slate-50 flex flex-col md:flex-row">
      {/* Left/Top Area: Document Viewer (60%) */}
      <div className="w-full md:w-[60%] border-r bg-white p-4 md:p-8 flex flex-col h-[50vh] md:h-full">
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col gap-3">
            <h1 className="text-2xl font-bold">{assignment.title}</h1>
            {isFullySubmitted() && (submission?.file_url || submission?.audio_url) && (
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
          {(viewMode === "assignment" ? assignment.file_url : submission?.file_url) && (
            <Button variant="outline" asChild>
              <a href={viewMode === "assignment" ? assignment.file_url : submission?.file_url} target="_blank" rel="noopener noreferrer">
                <FileText className="mr-2 h-4 w-4 text-blue-600" />
                View Full Document
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

        {viewMode === "submission" && submission?.audio_url && (
          <div className="mb-4 space-y-3">
            <h3 className="font-semibold text-slate-700">My Speaking Audio</h3>
            <audio controls className="w-full h-10" src={submission.audio_url}>
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        <div className="flex-1 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative">
          {(viewMode === "assignment" ? assignment.file_url : submission?.file_url) ? (
            <iframe 
              src={viewMode === "assignment" ? assignment.file_url : submission?.file_url} 
              className="absolute inset-0 w-full h-full"
              title={viewMode === "assignment" ? assignment.title : "My Submission"}
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
            <div className="space-y-6">
              {assignment.submission_format === 'BOTH' && (submission?.file_url || submission?.audio_url) && !isFullySubmitted() && (
                 <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm text-center shadow-sm">
                   <p className="font-semibold mb-1">Incomplete Submission</p>
                   You have submitted part of your assignment. Please complete the remaining section to finish.
                 </div>
              )}

              {(assignment.submission_format === 'DOCUMENT' || assignment.submission_format === 'BOTH') && !submission?.file_url && (
                <Card className="shadow-lg border-t-4 border-t-primary">
                  <CardHeader>
                    <CardTitle className="text-2xl">Submit Document</CardTitle>
                    <CardDescription>
                      Please attach your completed assignment document below.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                <Tabs defaultValue="pdf" className="w-full" onValueChange={() => setFiles([])}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="pdf">Submit PDF</TabsTrigger>
                    <TabsTrigger value="images">Submit Images</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="pdf">
                    <form onSubmit={(e) => handleSubmit(e, 'pdf')} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="solutionFilePdf">Your Solution (Single PDF)</Label>
                        <Input 
                          id="solutionFilePdf" 
                          type="file" 
                          accept=".pdf" 
                          onChange={(e) => {
                            const selected = Array.from(e.target.files || []);
                            setFiles(selected);
                          }}
                          disabled={isPending || isConverting}
                          required 
                          className="cursor-pointer"
                        />
                      </div>
                      <div className="flex w-full gap-4">
                        <Button type="submit" className="w-full text-lg h-12" disabled={isPending || isConverting || isUploading}>
                          {isUploading ? (
                            "Uploading..."
                          ) : isPending ? (
                            "Submitting..."
                          ) : (
                            <><Upload className="mr-2 h-5 w-5" /> Submit</>
                          )}
                        </Button>
                      </div>
                      {Object.entries(uploadProgress).length > 0 && (
                        <div className="space-y-3 mt-4 p-4 border rounded-md bg-secondary/20">
                          <p className="text-sm font-medium mb-1 flex items-center">
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Uploading Document...
                          </p>
                          {Object.entries(uploadProgress).map(([filename, progress]) => (
                            <div key={filename} className="space-y-1.5">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span className="truncate max-w-[200px]">{filename}</span>
                                <span>{progress}%</span>
                              </div>
                              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-primary h-full transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="images">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label>Your Solution (Multiple Images)</Label>
                        {!files.length ? (
                          <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 text-center hover:bg-slate-50 transition-colors">
                            <Input 
                              id="solutionFileImages" 
                              type="file" 
                              multiple
                              accept="image/png,image/jpeg,image/jpg" 
                              onChange={handleFilesSelected}
                              disabled={isPending || isConverting}
                              className="hidden"
                            />
                            <Label htmlFor="solutionFileImages" className="cursor-pointer flex flex-col items-center">
                              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                <Upload className="w-8 h-8 text-blue-600" />
                              </div>
                              <span className="text-lg font-medium text-slate-700">Click to select images</span>
                              <span className="text-sm text-slate-500 mt-2">JPG, PNG supported</span>
                            </Label>
                          </div>
                        ) : (
                          <div className="border rounded-lg p-6 flex flex-col items-center justify-center space-y-4 bg-slate-50">
                            <div className="flex -space-x-4">
                              {objectUrls.slice(0, 3).map((url, i) => (
                                <div key={i} className="w-16 h-16 rounded-lg border-2 border-white overflow-hidden shadow-sm">
                                  <img src={url} className="w-full h-full object-cover" alt="" />
                                </div>
                              ))}
                              {files.length > 3 && (
                                <div className="w-16 h-16 rounded-lg border-2 border-white bg-slate-200 flex items-center justify-center shadow-sm z-10">
                                  <span className="font-bold text-slate-600">+{files.length - 3}</span>
                                </div>
                              )}
                            </div>
                            <p className="font-medium text-slate-700">{files.length} image{files.length !== 1 && 's'} selected</p>
                            <Button type="button" variant="outline" onClick={() => setIsPreviewModalOpen(true)} className="w-full">
                              Preview & Edit Selection
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex w-full gap-4">
                        <Button 
                          type="button"
                          className="w-full text-lg h-12" 
                          disabled={isPending || isConverting || isUploading || files.length === 0}
                          onClick={() => setIsPreviewModalOpen(true)}
                        >
                          {isConverting ? (
                            "Converting images to PDF..."
                          ) : isUploading ? (
                            "Uploading..."
                          ) : isPending ? (
                            "Submitting..."
                          ) : (
                            <><CheckCircle2 className="mr-2 h-5 w-5" /> Submit {files.length ? `${files.length} Image${files.length !== 1 ? 's' : ''}` : ''}</>
                          )}
                        </Button>
                      </div>
                      {Object.entries(uploadProgress).length > 0 && (
                        <div className="space-y-3 mt-4 p-4 border rounded-md bg-secondary/20">
                          <p className="text-sm font-medium mb-1 flex items-center">
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Uploading Document...
                          </p>
                          {Object.entries(uploadProgress).map(([filename, progress]) => (
                            <div key={filename} className="space-y-1.5">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span className="truncate max-w-[200px]">{filename}</span>
                                <span>{progress}%</span>
                              </div>
                              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                                <div 
                                  className="bg-primary h-full transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
              )}

              {(assignment.submission_format === 'AUDIO' || assignment.submission_format === 'BOTH') && !submission?.audio_url && (
                <AudioSubmission 
                  assignmentId={assignment.id} 
                  onSuccess={(data) => {
                    setSubmission(data);
                  }} 
                />
              )}
            </div>
          ) : (
            <>
              <Card className="border-green-200 bg-green-50 text-center py-6 shadow-sm">
                <CardContent className="space-y-4 pt-6">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <CardTitle className="text-2xl text-green-800">Submitted Successfully!</CardTitle>
                  <p className="text-green-700">
                    Thank you! Your work has been sent to the teacher.
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
      {/* Preview and Confirm Modal */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-[95vw] lg:max-w-6xl h-[95vh] max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview & Reorder Images</DialogTitle>
            <DialogDescription>
              Drag and drop to reorder. You can also add more images or remove existing ones.
            </DialogDescription>
          </DialogHeader>
          
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-2 bg-slate-50 rounded-md border my-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {files.map((file, index) => (
                <div 
                  key={`${file.name}-${index}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, index)}
                  className="p-3 relative cursor-grab active:cursor-grabbing"
                >
                  <div className={`relative group rounded-xl border-2 bg-white hover:border-blue-400 transition-all aspect-[3/4] shadow-sm ${
                    draggedIndex === index 
                      ? 'opacity-50 border-blue-500 scale-95' 
                      : 'opacity-100'
                  }`}>
                    {/* Left Gap Indicator */}
                    {dragOverIndex === index && dropPosition === 'left' && draggedIndex !== index && (
                      <div className="absolute top-1/2 -translate-y-1/2 -left-3 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-xl z-50 pointer-events-none whitespace-nowrap animate-in zoom-in duration-150">
                        Move here
                      </div>
                    )}
                    {/* Right Gap Indicator */}
                    {dragOverIndex === index && dropPosition === 'right' && draggedIndex !== index && (
                      <div className="absolute top-1/2 -translate-y-1/2 -right-3 translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-xl z-50 pointer-events-none whitespace-nowrap animate-in zoom-in duration-150">
                        Move here
                      </div>
                    )}

                    <img src={objectUrls[index]} className="w-full h-full object-cover pointer-events-none rounded-[10px]" alt={file.name} />
                    
                    {/* Overlay */}
                    <div className={`absolute inset-0 rounded-[10px] bg-black/40 transition-opacity flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100`}>
                      <span className="text-white font-medium px-3 py-1 bg-black/50 rounded-full flex items-center gap-2">
                        Drag to move
                      </span>
                    </div>

                    <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        type="button"
                        size="icon" 
                        variant="destructive" 
                        className="h-8 w-8 rounded-full shadow-md" 
                        onClick={() => handleRemoveImage(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-md z-10">
                      {index + 1}
                    </div>
                  </div>
                </div>
              ))}

              {/* Add more placeholder */}
              <div className="p-3">
                <div className="relative rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-colors aspect-[3/4] flex flex-col items-center justify-center cursor-pointer bg-white">
                  <Input 
                    type="file" 
                    multiple
                    accept="image/png,image/jpeg,image/jpg" 
                    onChange={(e) => {
                      const selected = Array.from(e.target.files || []);
                      if (selected.length > 0) {
                        setFiles(prev => [...prev, ...selected]);
                      }
                      if (e.target) e.target.value = '';
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="font-medium text-slate-600">Add More</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-row items-center w-full gap-4 sm:justify-between">
            <div className="flex-1 hidden sm:block">
              <span className="text-sm text-slate-500 font-medium">{files.length} image{files.length !== 1 && 's'} selected</span>
            </div>
            
            {/* Small Trash Dropzone */}
            <div className="flex justify-center">
              <div 
                className={`transition-all duration-300 ${draggedIndex !== null ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}
              >
                <div 
                  onDragOver={handleTrashDragOver}
                  onDragLeave={handleTrashDragLeave}
                  onDrop={handleTrashDrop}
                  className={`h-10 rounded-full border-2 border-dashed flex items-center justify-center px-6 transition-all duration-200 cursor-pointer ${isOverTrash ? 'bg-red-100 border-red-500 text-red-600 scale-[1.02] shadow-sm' : 'bg-red-50 border-red-300 text-red-500'}`}
                >
                  <Trash2 className={`w-4 h-4 mr-2 ${isOverTrash ? 'animate-bounce' : ''}`} />
                  <span className="font-semibold text-sm whitespace-nowrap">Drop to delete</span>
                </div>
              </div>
            </div>

            <div className="flex-1 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsPreviewModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={(e) => {
                  setIsPreviewModalOpen(false);
                  handleSubmit(e, 'images');
                }}
                disabled={isPending || isConverting || isUploading || files.length === 0}
              >
                {isConverting ? "Converting..." : isUploading ? "Uploading..." : isPending ? "Submitting..." : "Confirm & Submit"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
