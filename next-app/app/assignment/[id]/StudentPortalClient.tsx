"use client";

import { useState, useTransition } from "react";
import { Upload, CheckCircle2 } from "lucide-react";
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
import { uploadFile, submitSolution } from "@/lib/actions";
import { toast } from "sonner";

interface StudentPortalClientProps {
  assignment: any;
}

export default function StudentPortalClient({ assignment }: StudentPortalClientProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
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

        setIsSubmitted(true);
      } catch (error: any) {
        toast.error(`Error: ${error.message}`);
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Left/Top Area: Document Viewer (60%) */}
      <div className="w-full md:w-[60%] border-r bg-white p-4 md:p-8 flex flex-col h-[50vh] md:h-screen">
        <h1 className="text-2xl font-bold mb-4">{assignment.title}</h1>
        <div className="flex-1 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden relative">
          <iframe 
            src={assignment.file_url} 
            className="absolute inset-0 w-full h-full"
            title={assignment.title}
          />
        </div>
      </div>

      {/* Right/Bottom Area: Submission Form (40%) */}
      <div className="w-full md:w-[40%] p-4 md:p-8 h-auto md:h-screen md:overflow-y-auto">
        <div className="max-w-md mx-auto sticky top-8">
          {!isSubmitted ? (
            <Card className="shadow-lg border-t-4 border-t-primary">
              <CardHeader>
                <CardTitle className="text-2xl">Submit Your Work</CardTitle>
                <CardDescription>
                  Please fill out the form below and attach your completed assignment file.
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
                  <Button type="submit" className="w-full text-lg h-12" disabled={isPending}>
                    {isPending ? (
                      "Uploading..."
                    ) : (
                      <><Upload className="mr-2 h-5 w-5" /> Submit Assignment</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-green-200 bg-green-50 text-center py-8 shadow-lg">
              <CardContent className="space-y-4 pt-6">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-green-800">Submitted Successfully!</CardTitle>
                <p className="text-green-700">
                  Thank you! Your work has been sent to the teacher.
                </p>
                <Button variant="outline" className="mt-4" onClick={() => {
                  setIsSubmitted(false);
                  setFile(null);
                }}>
                  Submit Another File
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
