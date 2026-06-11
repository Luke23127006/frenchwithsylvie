"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface OnboardingSpotlightProps {
  isActive: boolean;
  onNextStep: () => void;
}

export default function OnboardingSpotlight({
  isActive,
  onNextStep,
}: OnboardingSpotlightProps) {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (isActive && !isUpdating) {
      const element = document.getElementById("change-password-btn");
      if (element) {
        setTargetElement(element);
        
        // Save original styles to revert later
        const originalZIndex = element.style.zIndex;
        const originalPosition = element.style.position;
        const originalPointerEvents = element.style.pointerEvents;

        // Apply spotlight styles
        element.style.zIndex = "61";
        element.style.position = "relative";
        element.style.pointerEvents = "auto";

        const rect = element.getBoundingClientRect();
        
        // Position tooltip below the button
        setTooltipPos({
          top: rect.bottom + 16,
          left: rect.left,
        });

        return () => {
          element.style.zIndex = originalZIndex;
          element.style.position = originalPosition;
          element.style.pointerEvents = originalPointerEvents;
        };
      }
    }
  }, [isActive, isUpdating]);

  if (!isActive || isUpdating) return null;

  return (
    <>
      {/* Dark backdrop */}
      <div 
        data-testid="spotlight-backdrop"
        className="fixed inset-0 bg-black/70 z-[60]"
      />
      
      {/* Tooltip */}
      {targetElement && (
        <div
          data-testid="spotlight-tooltip"
          className="fixed z-[61] bg-white rounded-lg shadow-lg p-4 w-72 flex flex-col gap-3"
          style={{
            top: `${tooltipPos.top}px`,
            // Adjust left if it goes off-screen, a simple fallback for now
            left: `min(${tooltipPos.left}px, calc(100vw - 300px))`,
          }}
        >
          <div className="absolute -top-2 left-4 w-4 h-4 bg-white rotate-45" />
          <p className="text-sm text-gray-700 font-medium relative z-10">
            Secure your account! Please update your default password.
          </p>
          <div className="flex gap-2 justify-end relative z-10">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                localStorage.setItem("password_status", "skipped");
                onNextStep();
              }}
            >
              I'll change later
            </Button>
            <Button 
              size="sm" 
              onClick={() => {
                targetElement.click();
                setIsUpdating(true);
              }}
            >
              Update Now
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
