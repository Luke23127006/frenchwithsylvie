"use client";

import { useState, useEffect } from "react";
import { Joyride, EventData, STATUS, Step } from "react-joyride";
import { getSeenFeatures, markFeatureAsSeen } from "@/lib/actions/features";

export default function FeatureTourProvider() {
  const [run, setRun] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Check screen width
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!isMounted || isMobile) return;

    const fetchFeatures = async () => {
      try {
        const result = await getSeenFeatures({});
        const seenFeatures = result.data || [];

        // Check if the user has seen the notification center feature
        if (!seenFeatures.includes("notif_center_v1")) {
          setSteps([
            {
              target: ".joyride-notif-bell",
              content: "New: Notification Center! Click the gear icon to customize your email notifications.",
              skipBeacon: true,
              placement: "bottom-end",
              hideOverlay: true, // Do not dim the screen or block interaction
            },
          ]);
          // Short delay to ensure the target element is rendered
          setTimeout(() => setRun(true), 500);
        }
      } catch (error) {
        console.error("Failed to check feature tours:", error);
      }
    };

    fetchFeatures();
  }, [isMounted, isMobile]);

  const handleJoyrideCallback = async (data: EventData) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      try {
        await markFeatureAsSeen({ featureKey: "notif_center_v1" });
      } catch (error) {
        console.error("Failed to mark feature as seen:", error);
      }
    }
  };

  // Do not render Joyride on server or mobile to avoid hydration mismatch and UX issues
  if (!isMounted || isMobile) return null;

  return (
    <Joyride
      onEvent={handleJoyrideCallback}
      continuous={false}
      run={run}
      steps={steps}
      scrollToFirstStep={false}
      locale={{
        last: "Got it", // Change button text to "Got it"
      }}
      options={{
        primaryColor: "oklch(0.65 0.14 230)", // --primary
        backgroundColor: "oklch(1 0 0)",      // --card
        textColor: "oklch(0.25 0.04 230)",    // --card-foreground
        arrowColor: "oklch(1 0 0)",           // matches card
        zIndex: 10000,
        skipScroll: true,
        overlayClickAction: false,
        width: 320 // Narrower width for a more compact look
      }}
      styles={{
        tooltip: {
          borderRadius: "0.625rem", // --radius
          border: "1px solid oklch(0.90 0.03 230)", // --border
          padding: "0.75rem", // Less padding
        },
        tooltipContent: {
          fontSize: "0.875rem", // text-sm
          padding: "0.25rem 0 0.75rem 0", // Tighter spacing
          textAlign: "left", // Left align text
        },
        buttonClose: {
          color: "oklch(0.55 0.04 230)", // --muted-foreground
          marginTop: "-0.25rem",
          marginRight: "-0.25rem",
          transform: "scale(0.8)", // Make the X icon slightly smaller
        },
        buttonPrimary: {
          borderRadius: "calc(0.625rem * 0.8)", // --radius-md
          fontWeight: 500,
          fontSize: "0.75rem", // text-xs
          padding: "0.4rem 0.75rem", // Smaller button
        }
      }}
    />
  );
}
