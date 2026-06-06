"use client";

import { useState, useTransition } from "react";
import { Upload, CheckCircle2, GraduationCap, FileText } from "lucide-react";
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
import { uploadFile, submitSolution, removeSubmission } from "@/lib/actions";
import { toast } from "sonner";
import DOMPurify from "isomorphic-dompurify";
import { getRatingInfo } from "@/lib/utils";
import { Trash2 } from "lucide-react";

interface StudentPortalClientProps {
  assignment: any;
  existingSubmission: any | null;
}

export default function StudentPortalClient({ assignment, existingSubmission }: StudentPortalClientProps) {
  const [isSubmitted, setIsSubmitted] = useState(!!existingSubmission);
  const [submission, setSubmission] = useState(existingSubmission);
  const [file, setFile] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<"assignment" | "submission">("assignment");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please provide a solution file.");
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        
        const uploadResult = await uploadFile(formData, "submissions");
        if (uploadResult.error) {
          toast.error(`Upload failed: ${uploadResult.error}`);
          return;
        }

        const submitResult = await submitSolution(assignment.id, uploadResult.url!);
        if (submitResult.error) {
          toast.error(`Submission failed: ${submitResult.error}`);
          return;
        }

        setSubmission(submitResult.data?.[0]);
        setIsSubmitted(true);
      } catch (error: any) {
        toast.error(`Error: ${error.message}`);
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
        const result = await removeSubmission(submission.id, assignment.id);
        if (result.error) {
          toast.error(`Removal failed: ${result.error}`);
          return;
        }

        setSubmission(null);
        setIsSubmitted(false);
        setFile(null);
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
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Left/Top Area: Document Viewer (60%) */}
      <div className="w-full md:w-[60%] border-r bg-white p-4 md:p-8 flex flex-col h-[50vh] md:h-screen">
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col gap-3">
            <h1 className="text-2xl font-bold">{assignment.title}</h1>
            {isSubmitted && submission?.file_url && (
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
          <Button variant="outline" asChild>
            <a href={viewMode === "assignment" ? assignment.file_url : submission.file_url} target="_blank" rel="noopener noreferrer">
              <FileText className="mr-2 h-4 w-4 text-blue-600" />
              View Full Document
            </a>
          </Button>
        </div>
        <div className="flex-1 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative">
          <iframe 
            src={viewMode === "assignment" ? assignment.file_url : submission.file_url} 
            className="absolute inset-0 w-full h-full"
            title={viewMode === "assignment" ? assignment.title : "My Submission"}
          />
        </div>
      </div>

      {/* Right/Bottom Area: Submission Form / Feedback (40%) */}
      <div className="w-full md:w-[40%] p-4 md:p-8 h-auto md:h-screen md:overflow-y-auto">
        <div className="max-w-md mx-auto sticky top-8 space-y-6">
          {!isSubmitted ? (
            <Card className="shadow-lg border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="text-2xl">Submit Your Work</CardTitle>
                <CardDescription>
                  Please attach your completed assignment file below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="solutionFile">Your Solution (PDF/Image)</Label>
                    <Input 
                      id="solutionFile" 
                      type="file" 
                      accept=".pdf,image/*" 
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      disabled={isPending}
                      required 
                      className="cursor-pointer"
                    />
                  </div>
                  <div className="flex w-full gap-4">
                    <Button type="submit" className="w-full text-lg h-12" disabled={isPending}>
                      {isPending ? (
                        "Uploading..."
                      ) : (
                        <><Upload className="mr-2 h-5 w-5" /> Submit</>
                      )}
                    </Button>
                  </div>
                </form>
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
    </div>
  );
}
