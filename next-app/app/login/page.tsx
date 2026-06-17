"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { handleLogin } from "@/lib/actions/auth";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Wiring up the Server Action to handle form submission
  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      setError(null);
      
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get("redirect");
      if (redirectUrl) {
        formData.append("redirectUrl", redirectUrl);
      }

      const username = formData.get("username") as string;
      const password = formData.get("password") as string;
      const redirectUrlStr = redirectUrl || undefined;

      const result = await handleLogin({
        username,
        password,
        redirectUrl: redirectUrlStr
      });
      console.log("LOGIN RESULT:", JSON.stringify(result));
      
      if (result?.error) {
        // Render the error state UI
        setError(result.error);
      } else if (result?.data?.redirectUrl) {
        window.location.href = result.data.redirectUrl;
      } else {
        // Default to student if undefined, though it shouldn't be
        window.location.href = "/student";
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                name="username" 
                placeholder="Enter your username" 
                required 
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                placeholder="Enter your password" 
                required 
                disabled={isPending}
              />
            </div>
            
            {/* Placeholder Error State UI */}
            {error && (
              <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md text-center">
                {error}
              </div>
            )}
            
            <Button type="submit" className="w-full h-11 text-base mt-2" disabled={isPending}>
              {isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
