import Header from "@/components/Header";
import OnboardingTutorial from "@/components/OnboardingTutorial";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 
        Search and Filters are intentionally excluded here 
        for cognitive load reduction during onboarding.
      */}
      <Header />
      <main className="container mx-auto mt-8">
        <OnboardingTutorial />
      </main>
    </div>
  );
}
