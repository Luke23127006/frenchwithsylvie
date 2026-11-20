import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRatingInfo(gradeStr: string | null | undefined) {
  if (!gradeStr) return null;
  const grade = parseInt(gradeStr, 10);
  if (isNaN(grade)) return null;

  if (grade >= 90) return { label: "Excellent", color: "bg-emerald-600 hover:bg-emerald-700 text-white" };
  if (grade >= 80) return { label: "Good", color: "bg-blue-600 hover:bg-blue-700 text-white" };
  if (grade >= 70) return { label: "Average", color: "bg-yellow-600 hover:bg-yellow-700 text-white" };
  if (grade >= 60) return { label: "Poor", color: "bg-orange-600 hover:bg-orange-700 text-white" };
  return { label: "Fail", color: "bg-red-600 hover:bg-red-700 text-white" };
}
