"use client";

import { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import MockAssignmentCard from "./MockAssignmentCard";
import OnboardingChecklist from "./OnboardingChecklist";
import { Input } from "@/components/ui/input";
import { updateOnboardingStatus } from "@/lib/mockApi";
import { useRouter } from "next/navigation";

export default function OnboardingTutorial() {
  const router = useRouter();
  const [step, setStep] = useState<'VIEW' | 'SUBMIT' | 'COMPLETED'>('VIEW');
  const [passwordStatus, setPasswordStatus] = useState<'completed' | 'skipped' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const status = localStorage.getItem("password_status");
    if (status === 'completed' || status === 'skipped') {
      setPasswordStatus(status);
    }
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
      updateOnboardingStatus('COMPLETED').catch(console.error);
    }, 500);
  };

  const handleEnterClassroom = () => {
    router.push('/dashboard');
  };

  return (
    <div className="relative max-w-4xl mx-auto py-12 px-4" data-testid="onboarding-tutorial">
      {step === 'VIEW' && (
        <div className="relative inline-block w-full max-w-md">
          <MockAssignmentCard onClick={handleCardClick} />
          
          {/* Tooltip pointing to card */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded shadow-lg text-sm whitespace-nowrap animate-bounce z-10">
            Click here to view your first assignment!
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-blue-600" />
          </div>
        </div>
      )}

      {step === 'SUBMIT' && (
        <div className="bg-white p-6 rounded-lg shadow border" data-testid="mock-detail-view">
          <h2 className="text-2xl font-bold mb-2">Mission 0: Getting Started</h2>
          <p className="text-gray-600 mb-6">Try uploading any file to get familiar with the process!</p>
          
          <div className="space-y-4 max-w-sm">
            <Input type="file" />
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Processing..." : "Submit"}
            </Button>
          </div>
        </div>
      )}

      {step === 'COMPLETED' && (
        <div className="text-center py-12 bg-green-50 rounded-lg border border-green-200">
          <h2 className="text-3xl font-bold text-green-700 mb-4">You're all set!</h2>
          <p className="text-gray-600 mb-8">You've successfully completed the onboarding tutorial.</p>
          <Button onClick={handleEnterClassroom} size="lg" className="bg-green-600 hover:bg-green-700">
            Enter Classroom
          </Button>
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
