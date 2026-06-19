"use client";

import { useTransition } from "react";
import { FileText, Mic, FileAudio, Lock, ChevronDown, Loader2 } from "lucide-react";
import { updateAssignmentFormat } from "@/lib/actions/assignments";
import toast from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";

interface FormatBadgeEditorProps {
  assignmentId: string;
  currentFormat: 'document' | 'audio' | 'both';
  hasSubmissions: boolean;
}

export default function FormatBadgeEditor({ assignmentId, currentFormat, hasSubmissions }: FormatBadgeEditorProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const getFormatDetails = (format: 'document' | 'audio' | 'both') => {
    switch (format) {
      case 'audio': return { icon: Mic, label: 'Audio Only', color: 'text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100' };
      case 'both': return { icon: FileAudio, label: 'Document + Audio', color: 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200 hover:bg-fuchsia-100' };
      default: return { icon: FileText, label: 'Document Only', color: 'text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100' };
    }
  };

  const { icon: Icon, label, color } = getFormatDetails(currentFormat);

  const handleSelect = (newFormat: 'document' | 'audio' | 'both') => {
    if (newFormat === currentFormat || hasSubmissions) return;

    startTransition(async () => {
      try {
        const result = await updateAssignmentFormat({ assignmentId, submissionFormat: newFormat });
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Assignment format updated!");
          router.refresh();
        }
      } catch (err: any) {
        toast.error("Error updating format");
      }
    });
  };

  if (hasSubmissions) {
    return (
      <div 
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border opacity-70 cursor-not-allowed ${color}`}
        title="Format cannot be changed because students have already submitted."
      >
        <Icon className="w-3.5 h-3.5" />
        {label}
        <Lock className="w-3 h-3 ml-1 opacity-70" />
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <Select value={currentFormat} onValueChange={(val: any) => handleSelect(val)} disabled={isPending}>
        <SelectTrigger 
          className={`h-7 px-3 py-1 rounded-full text-xs font-medium border transition-colors focus:ring-0 focus:ring-offset-0 ${color}`}
        >
          {isPending ? (
            <div className="flex items-center gap-1.5 mr-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Updating...</span>
            </div>
          ) : (
            <SelectValue />
          )}
        </SelectTrigger>
        <SelectContent position="popper" side="bottom" sideOffset={4}>
          <SelectItem value="document" className="cursor-pointer">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Document Only</span>
            </div>
          </SelectItem>
          <SelectItem value="audio" className="cursor-pointer">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-indigo-600" />
              <span>Audio Only</span>
            </div>
          </SelectItem>
          <SelectItem value="both" className="cursor-pointer">
            <div className="flex items-center gap-2">
              <FileAudio className="w-4 h-4 text-fuchsia-600" />
              <span>Document + Audio</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
