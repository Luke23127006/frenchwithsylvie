"use client";

import { useState } from "react";
import { User, FileCheck2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mock Submissions
const MOCK_SUBMISSIONS = [
  { id: "s1", studentName: "Alice Smith", timestamp: "2026-06-04 10:30 AM", fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
  { id: "s2", studentName: "Bob Johnson", timestamp: "2026-06-04 11:15 AM", fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
  { id: "s3", studentName: "Charlie Brown", timestamp: "2026-06-04 02:45 PM", fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
];

export default function TeacherReviewDashboard() {
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  const selectedSubmission = MOCK_SUBMISSIONS.find(s => s.id === selectedSubmissionId);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left Sidebar: Submissions List (25%) */}
      <div className="w-full md:w-1/4 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b bg-background flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <a href="/dashboard"><ArrowLeft className="w-5 h-5" /></a>
          </Button>
          <div>
            <h2 className="font-semibold text-lg">Submissions</h2>
            <p className="text-xs text-muted-foreground">{MOCK_SUBMISSIONS.length} received</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {MOCK_SUBMISSIONS.map((sub) => (
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
                <p className="font-medium truncate">{sub.studentName}</p>
                <p className="text-xs text-muted-foreground mt-1">{sub.timestamp}</p>
              </div>
            </button>
          ))}
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
                  <h3 className="font-semibold text-lg">{selectedSubmission.studentName}'s Submission</h3>
                  <p className="text-sm text-muted-foreground">Submitted at {selectedSubmission.timestamp}</p>
                </div>
              </div>
              <Button variant="outline">Grade (Coming Soon)</Button>
            </div>
            <div className="flex-1 p-6 relative">
              <div className="absolute inset-6 bg-white rounded-xl border shadow-sm overflow-hidden">
                <iframe 
                  src={selectedSubmission.fileUrl} 
                  className="w-full h-full border-0"
                  title={`${selectedSubmission.studentName}'s Submission`}
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
