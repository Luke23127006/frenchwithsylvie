"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getFeedbackFileUrl, listFeedbackAttachments } from "@/lib/actions/feedback";
import type { FeedbackAttachment } from "@/lib/feedback";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function FeedbackPdfActions({ attachment }: { attachment: FeedbackAttachment }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function open(download: boolean) {
    setBusy(true);
    try {
      const result = await getFeedbackFileUrl({ attachmentId: attachment.id, download });
      if (result.error || !result.data) throw new Error(result.error || "Unable to open PDF.");
      if (download) {
        const link = document.createElement("a");
        link.href = result.data.url;
        link.download = attachment.file_name;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else setPreview(result.data.url);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to open PDF."); }
    finally { setBusy(false); }
  }
  return <>
    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => open(false)}>Preview</Button>
    <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => open(true)}>Download</Button>
    <Dialog open={!!preview} onOpenChange={(open) => { if (!open) setPreview(null); }}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{attachment.file_name}</DialogTitle>
          <DialogDescription>Teacher feedback PDF. If the preview expires, close it and open it again.</DialogDescription>
        </DialogHeader>
        {preview && <iframe src={preview} title={attachment.file_name} className="w-full h-[70vh] border rounded" />}
      </DialogContent>
    </Dialog>
  </>;
}

export default function FeedbackPdfList({ submissionId }: { submissionId: string }) {
  const [attachments, setAttachments] = useState<FeedbackAttachment[]>([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    listFeedbackAttachments({ submissionId }).then((result) => {
      if (!active) return;
      setError(result.error || "");
      setAttachments(result.data || []);
      setLoaded(true);
    });
    return () => { active = false; };
  }, [submissionId, attempt]);
  if (error) return <div role="alert" className="mt-4 text-sm text-red-600">{error} <Button variant="outline" size="sm" onClick={() => setAttempt(attempt + 1)}>Retry PDFs</Button></div>;
  if (!loaded) return <p className="mt-4 text-sm text-muted-foreground">Loading feedback PDFs…</p>;
  if (!attachments.length) return null;
  return <div className="mt-6 space-y-3">
    <h3 className="font-semibold">Teacher Feedback PDFs</h3>
    {attachments.map((attachment) => <div key={attachment.id} className="rounded-lg border p-3 space-y-2">
      <p className="text-sm font-medium break-all">{attachment.file_name}</p>
      <p className="text-xs text-muted-foreground">{(attachment.file_size / 1024).toFixed(1)} KB</p>
      <div className="flex gap-2"><FeedbackPdfActions attachment={attachment} /></div>
    </div>)}
  </div>;
}
