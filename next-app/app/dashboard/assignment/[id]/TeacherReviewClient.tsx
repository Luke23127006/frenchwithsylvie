"use client";

import { useState } from "react";
import { User, FileCheck2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Submission {
  id: string;
  student_name: string;
  file_url: string;
  submitted_at: string;
}

interface TeacherReviewClientProps {
  assignment: any;
  submissions: Submission[];
}

export default function TeacherReviewClient({ assignment, submissions }: TeacherReviewClientProps) {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const selectedSubmission = submissions.find(s => s.id === selectedSubmissionId);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left Sidebar: Submissions List (25%) */}
      <div className="w-full md:w-1/4 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b bg-background flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div className="overflow-hidden">
            <h2 className="font-semibold text-lg truncate" title={assignment.title}>{assignment.title} Submissions</h2>
            <p className="text-xs text-muted-foreground">{submissions.length} received</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {submissions.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubmissionId(sub.id)}
              className={`w-full text-left p-4 border-b hover:bg-accent hover:text-accent-foreground transition-colors flex items-start space-x-3 ${
                selectedSubmissionId === sub.id ? 'bg-accent/50 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'
              }`}
            >
              <div className="bg-primary/10 p-2 rounded-full mt-1">
                <User className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-medium truncate">{sub.student_name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(sub.submitted_at).toLocaleString()}
                </p>
              </div>
            </button>
          ))}
          {submissions.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No submissions yet.
            </div>
          )}
        </div>
      </div>

      {/* Right Area: Document Viewer (75%) */}
      <div className="hidden md:flex flex-col flex-1 bg-slate-50">
        {selectedSubmission ? (
          <>
            <div className="p-4 border-b bg-white flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3">
                <FileCheck2 className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-lg">{selectedSubmission.student_name}'s Submission</h3>
                  <p className="text-sm text-muted-foreground">Submitted at {new Date(selectedSubmission.submitted_at).toLocaleString()}</p>
                </div>
              </div>
              <Button variant="outline">Grade (Coming Soon)</Button>
            </div>
            <div className="flex-1 p-6 relative">
              <div className="absolute inset-6 bg-white rounded-xl border shadow-sm overflow-hidden">
                <iframe 
                  src={selectedSubmission.file_url} 
                  className="w-full h-full border-0"
                  title={`${selectedSubmission.student_name}'s Submission`}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <FileCheck2 className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-xl font-medium text-slate-400">No Submission Selected</h3>
            <p className="text-sm text-slate-400 mt-2">Select a student from the sidebar to view their work.</p>
          </div>
        )}
      </div>
    </div>
  );
}
