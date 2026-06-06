import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BookOpen } from "lucide-react"

export default function Page() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 p-6">
      <div className="flex flex-col items-center text-center space-y-6 max-w-lg">
        <div className="bg-primary/10 p-4 rounded-full">
          <BookOpen className="w-12 h-12 text-primary" />
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Welcome to French with Sylvie
        </h1>
        
        <p className="text-lg text-slate-600 leading-relaxed">
          Your personal portal for mastering the French language. Access your assignments, submit your homework, and track your progress all in one place.
        </p>
        
        <div className="pt-4">
          <Button asChild size="lg" className="px-8 text-lg rounded-full">
            <Link href="/login">
              Log In to Your Account
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
