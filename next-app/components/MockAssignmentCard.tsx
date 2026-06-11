import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MockAssignmentCard({ onClick }: { onClick?: () => void }) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden group border-orange-200"
      onClick={onClick}
      data-testid="mock-assignment-card"
    >
      <div className="absolute top-0 right-0 bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-bl-lg">
        Tutorial
      </div>
      <CardHeader>
        <CardTitle className="text-xl">Mission 0: Getting Started</CardTitle>
        <CardDescription>Try uploading any file to get familiar with the process!</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mt-2">
          <Badge variant="outline" className="text-gray-500">Pending</Badge>
          <span className="text-sm text-blue-600 font-medium group-hover:underline">Click to view &rarr;</span>
        </div>
      </CardContent>
    </Card>
  );
}
