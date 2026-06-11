import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowRight } from "lucide-react";

export default function MockAssignmentCard({ onClick }: { onClick?: () => void }) {
  return (
    <Card 
      className="flex flex-col transition-colors hover:border-primary relative cursor-pointer"
      data-testid="mock-assignment-card"
      onClick={onClick}
    >
      <div className="absolute top-0 right-0 bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-bl-lg z-10">
        Tutorial
      </div>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Mission 0: Getting Started
          </CardTitle>
        </div>
        <CardDescription>
          Posted on {new Date().toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex items-end">
        <Button 
          variant="default" 
          className="w-full mt-4"
        >
          Start Assignment <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
