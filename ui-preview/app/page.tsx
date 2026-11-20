import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { getPreviewRole } from "@/lib/mock-session"

export default async function Page() {
  const role = await getPreviewRole()

  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 p-6 pb-32">
      <div className="flex flex-col items-center text-center space-y-6 max-w-3xl w-full">
        <div className="p-4">
          <Image 
            src="/logo.jpg" 
            alt="French with Sylvie" 
            width={150} 
            height={150} 
            className="rounded-full shadow-lg"
            priority
          />
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Welcome to French with Sylvie
        </h1>
        
        <p className="text-lg text-slate-600 leading-relaxed max-w-xl mx-auto">
          Your personal portal for mastering the French language. Access your assignments, submit your homework, and track your progress all in one place.
        </p>
        
        <div className="pt-4">
          {role ? (
            <Button asChild size="lg" className="px-8 text-lg rounded-full">
              <Link href={role === "student" ? "/student" : "/dashboard"}>
                Go to Dashboard
              </Link>
            </Button>
          ) : (
            <Button asChild size="lg" className="px-8 text-lg rounded-full">
              <Link href="/login">
                Log In to Your Account
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}