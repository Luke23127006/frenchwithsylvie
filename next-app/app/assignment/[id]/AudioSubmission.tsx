"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Mic, Square, Upload, Play, RefreshCw, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import toast from "react-hot-toast";
import { getSignedUploadUrls } from "@/lib/actions/storage";
import { submitSolution, removeSubmission } from "@/lib/actions/submissions";

interface AudioSubmissionProps {
  assignmentId: string;
  onSuccess: (submissionData: any) => void;
}

export default function AudioSubmission({ assignmentId, onSuccess }: AudioSubmissionProps) {
  // Common states
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [activeMode, setActiveMode] = useState<"record" | "upload">("record");

  // Upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Record states
  const [recordState, setRecordState] = useState<"idle" | "recording" | "review">("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isUploading) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      const message = "Audio is still uploading. Are you sure you want to leave?";
      e.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isUploading]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [recordedUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        setRecordState("review");
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecordState("recording");
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      toast.error("Microphone access denied or not available.");
      console.error(err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const retakeRecording = () => {
    setRecordState("idle");
    setRecordedBlob(null);
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeMode === "upload" && !selectedFile) {
      toast.error("Please select an audio file.");
      return;
    }
    if (activeMode === "record" && !recordedBlob) {
      toast.error("Please record an audio first.");
      return;
    }

    let fileToUpload: File;
    if (activeMode === "upload") {
      fileToUpload = selectedFile!;
    } else {
      // Create a File from Blob
      const ext = recordedBlob!.type.includes("mp4") ? "m4a" : "webm";
      fileToUpload = new File([recordedBlob!], `recording-${Date.now()}.${ext}`, { type: recordedBlob!.type });
    }

    setIsUploading(true);

    try {
      // 1. Get Signed URL
      const fileMetadata = [{ fileName: fileToUpload.name, bucketName: "submissions" }];
      const signedUrlResult = await getSignedUploadUrls({ files: fileMetadata });
      
      if (signedUrlResult.error || !signedUrlResult.data) {
        toast.error(`Failed to initialize upload: ${signedUrlResult.error}`);
        setIsUploading(false);
        return;
      }

      const { path, token, publicUrl } = signedUrlResult.data[0];
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/upload/sign/submissions/${path}?token=${token}`;

      // 2. Upload via XHR
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", url, true);
        xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
        xhr.setRequestHeader("Authorization", `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`);
        xhr.setRequestHeader("Content-Type", fileToUpload.type || "audio/mpeg");

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Failed to upload: ${xhr.statusText}`));
          }
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(fileToUpload);
      });

      // 3. Save submission
      startTransition(async () => {
        const submitResult = await submitSolution({ assignmentId, fileUrl: publicUrl });
        if (submitResult.error) {
          toast.error(`Submission failed: ${submitResult.error}`);
          setIsUploading(false);
          return;
        }

        toast.success("Audio submitted successfully!");
        onSuccess(submitResult.data?.[0]);
        setIsUploading(false);
      });

    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      setIsUploading(false);
    }
  };

  return (
    <Card className="shadow-lg border-t-4 border-t-primary">
      <CardHeader>
        <CardTitle className="text-2xl">Submit Audio</CardTitle>
        <CardDescription>Record your speaking assignment directly in the browser or upload an existing audio file.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="record" className="w-full" onValueChange={(v) => setActiveMode(v as any)}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="record">Record Audio</TabsTrigger>
            <TabsTrigger value="upload">Upload File</TabsTrigger>
          </TabsList>

          <TabsContent value="record">
            <div className="space-y-6 flex flex-col items-center py-4">
              {recordState === "idle" && (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-100">
                    <Mic className="w-10 h-10 text-blue-600" />
                  </div>
                  <p className="text-slate-600 text-sm">Click below to start recording your answer.</p>
                  <Button onClick={startRecording} size="lg" className="w-full rounded-full h-14 text-lg">
                    Start Recording
                  </Button>
                </div>
              )}

              {recordState === "recording" && (
                <div className="text-center space-y-4 w-full">
                  <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-red-100 animate-pulse">
                    <div className="w-6 h-6 bg-red-500 rounded-full" />
                  </div>
                  <div className="text-4xl font-mono text-slate-800 font-semibold tracking-wider">
                    {formatTime(recordingTime)}
                  </div>
                  <p className="text-red-500 text-sm font-medium animate-pulse">Recording...</p>
                  <Button onClick={stopRecording} variant="destructive" size="lg" className="w-full rounded-full h-14 text-lg mt-4">
                    <Square className="mr-2 h-5 w-5 fill-current" /> Stop Recording
                  </Button>
                </div>
              )}

              {recordState === "review" && (
                <div className="w-full space-y-6">
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center space-y-4">
                    <h3 className="font-semibold text-slate-700">Review Recording</h3>
                    <audio src={recordedUrl!} controls className="w-full h-12" />
                    <div className="flex gap-4 pt-2">
                      <Button onClick={retakeRecording} variant="outline" className="flex-1" disabled={isUploading || isPending}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Retake
                      </Button>
                      <Button onClick={handleUploadSubmit} className="flex-1" disabled={isUploading || isPending}>
                        {isUploading || isPending ? "Submitting..." : (
                          <><CheckCircle2 className="mr-2 h-4 w-4" /> Submit</>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload">
            <form onSubmit={handleUploadSubmit} className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="audioFile">Select Audio File (MP3, WAV, M4A)</Label>
                <Input
                  id="audioFile"
                  type="file"
                  accept="audio/mp3, audio/wav, audio/m4a, audio/mpeg, audio/mp4"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  disabled={isUploading || isPending}
                  className="cursor-pointer"
                />
              </div>
              <Button type="submit" className="w-full h-14 text-lg rounded-full" disabled={!selectedFile || isUploading || isPending}>
                {isUploading || isPending ? (
                  "Uploading..."
                ) : (
                  <><Upload className="mr-2 h-5 w-5" /> Submit Audio</>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
