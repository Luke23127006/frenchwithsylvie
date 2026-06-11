"use client";

import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import MockAssignmentCard from "./MockAssignmentCard";
import OnboardingChecklist from "./OnboardingChecklist";
import OnboardingSpotlight from "./OnboardingSpotlight";
import { Input } from "@/components/ui/input";
import { updateOnboardingState } from "@/lib/actions";
import { useRouter } from "next/navigation";

export default function OnboardingTutorial() {
  const router = useRouter();
  const [step, setStep] = useState<'VIEW' | 'SUBMIT' | 'COMPLETED'>('VIEW');
  const [passwordStatus, setPasswordStatus] = useState<'completed' | 'skipped' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSpotlight, setShowSpotlight] = useState(false);

  useEffect(() => {
    // Reset the password status when entering the onboarding page
    localStorage.removeItem("password_status");
    setPasswordStatus(null);
    setShowSpotlight(true);

    const checkStatus = () => {
      const status = localStorage.getItem("password_status");
      if (status === 'completed' || status === 'skipped') {
        setPasswordStatus(status);
        setShowSpotlight(false);
      } else {
        setShowSpotlight(true);
      }
    };
    
    window.addEventListener("password_status_changed", checkStatus);
    return () => window.removeEventListener("password_status_changed", checkStatus);
  }, []);

  const handleCardClick = () => {
    if (step === 'VIEW') setStep('SUBMIT');
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStep('COMPLETED');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      // Update the real backend
      updateOnboardingState().catch(console.error);
    }, 500);
  };

  const handleEnterClassroom = () => {
    router.push('/dashboard');
  };

  return (
    <div data-testid="onboarding-tutorial" className="relative">
      <OnboardingSpotlight 
        isActive={showSpotlight} 
        onNextStep={() => {
          setShowSpotlight(false);
          const status = localStorage.getItem("password_status") as 'completed' | 'skipped' | null;
          setPasswordStatus(status || 'skipped');
        }} 
      />

      {step === 'VIEW' && (
        <div className="container mx-auto max-w-4xl p-4 md:p-8 space-y-8 relative">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
            <p className="text-muted-foreground">View and submit your assignments.</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 relative">
          <div className="relative">
            <MockAssignmentCard onClick={handleCardClick} />
            
            {/* Tooltip pointing to card */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded shadow-lg text-sm whitespace-nowrap animate-bounce z-10">
              Click here to view your first assignment!
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-blue-600" />
            </div>
          </div>
        </div>
        </div>
      )}

      {step === 'SUBMIT' && (
        <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex flex-col md:flex-row" data-testid="mock-detail-view">
          {/* Left/Top Area: Document Viewer (60%) */}
          <div className="w-full md:w-[60%] border-r bg-white p-4 md:p-8 flex flex-col h-[50vh] md:h-[calc(100vh-64px)]">
            <div className="flex justify-between items-start mb-4">
              <div className="flex flex-col gap-3">
                <h1 className="text-2xl font-bold">Mission 0: Getting Started</h1>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center p-8 text-center">
              <h3 className="text-xl font-bold text-slate-500 mb-2">Tutorial Document</h3>
              <p className="text-slate-400">Try uploading any file to get familiar with the process!</p>
            </div>
          </div>

          {/* Right/Bottom Area: Submission Form / Feedback (40%) */}
          <div className="w-full md:w-[40%] p-4 md:p-8 h-auto md:h-[calc(100vh-64px)] md:overflow-y-auto">
            <div className="max-w-md mx-auto sticky top-8 space-y-6">
              <div className="bg-white rounded-xl shadow-lg border-t-4 border-t-primary p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">Submit Your Work</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please attach your completed assignment file below.
                  </p>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="mockSolutionFile" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Your Solution (Any File)
                    </label>
                    <Input 
                      id="mockSolutionFile" 
                      type="file" 
                      disabled={isSubmitting}
                      className="cursor-pointer"
                    />
                  </div>
                  <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting}
                    className="w-full text-lg h-12"
                  >
                    {isSubmitting ? "Processing..." : "Submit"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'COMPLETED' && (
        <div className="container mx-auto max-w-2xl py-12 px-4 relative mt-12">
          <div className="text-center py-12 bg-green-50 rounded-lg border border-green-200 shadow-sm">
            <h2 className="text-3xl font-bold text-green-700 mb-4">You're all set!</h2>
            <p className="text-gray-600 mb-8 text-lg">You've successfully completed the onboarding tutorial.</p>
            <Button onClick={handleEnterClassroom} size="lg" className="bg-green-600 hover:bg-green-700 h-12 px-8 text-lg">
              Enter Classroom
            </Button>
          </div>
        </div>
      )}

      <OnboardingChecklist 
        passwordStatus={passwordStatus}
        assignmentViewed={step === 'SUBMIT' || step === 'COMPLETED'}
        assignmentSubmitted={step === 'COMPLETED'}
      />
    </div>
  );
}
