"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { gradeSubmission, removeSubmissionReview } from "@/lib/actions/submissions";
import { listFeedbackAttachments, prepareFeedbackUpload } from "@/lib/actions/feedback";
import { feedbackUploadSchema, MAX_FEEDBACK_FILES, reviewGradeSchema, type FeedbackAttachment } from "@/lib/feedback";
import { FeedbackPdfActions } from "@/components/FeedbackPdfList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { getRatingInfo } from "@/lib/utils";

type Review = { id: string; grade: string | null; feedback: string | null };
type DraftPdf = { key: string; file: File; uploadedId?: string; progress?: number };

export default function ReviewEditor({ submission, onSaved, onDirtyChange, onBusyChange }: {
  submission: Review;
  onSaved: (review: Review) => void;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [grade, setGrade] = useState(submission.grade || "");
  const [feedback, setFeedback] = useState(submission.feedback || "");
  const [baseline, setBaseline] = useState({ grade: submission.grade || "", feedback: submission.feedback || "", ids: [] as string[] });
  const [attachments, setAttachments] = useState<FeedbackAttachment[]>([]);
  const [drafts, setDrafts] = useState<DraftPdf[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const dirty = grade !== baseline.grade || feedback !== baseline.feedback || drafts.length > 0 ||
    attachments.map((a) => a.id).join() !== baseline.ids.join();

  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty || busy) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);
  useEffect(() => {
    let active = true;
    listFeedbackAttachments({ submissionId: submission.id }).then((result) => {
      if (!active) return;
      if (result.error) { setLoadError(result.error); return; }
      const files = result.data || [];
      setAttachments(files);
      setBaseline((previous) => ({ ...previous, ids: files.map((a) => a.id) }));
      setLoaded(true);
      setLoadError("");
    });
    return () => { active = false; };
  }, [submission.id, attempt]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function addFiles(files: File[]) {
    if (busy || !loaded) return;
    setError("");
    if (files.length + drafts.length + attachments.length > MAX_FEEDBACK_FILES) {
      setError("You can attach up to 3 PDFs to a review."); return;
    }
    for (const file of files) {
      const parsed = feedbackUploadSchema.safeParse({ submissionId: submission.id, fileName: file.name, fileSize: file.size });
      if (!parsed.success || (file.type && file.type !== "application/pdf")) {
        setError(`${file.name}: choose a PDF of 5 MB or smaller.`); return;
      }
    }
    setDrafts((previous) => [...previous, ...files.map((file) => ({ key: crypto.randomUUID(), file }))]);
  }

  function updateDraft(key: string, update: Partial<DraftPdf>) {
    setDrafts((previous) => previous.map((draft) => draft.key === key ? { ...draft, ...update } : draft));
  }

  async function save() {
    const validGrade = reviewGradeSchema.safeParse(grade);
    if (!validGrade.success) { setError("A whole-number grade from 0 to 100 is required to save the review."); return; }
    if (busy || !loaded) return;
    setBusy(true); setError("");
    try {
      const ids = attachments.map((a) => a.id);
      for (const draft of drafts) {
        if (draft.uploadedId) { ids.push(draft.uploadedId); continue; }
        const result = await prepareFeedbackUpload({ submissionId: submission.id, fileName: draft.file.name, fileSize: draft.file.size });
        if (result.error || !result.data) throw new Error(result.error || "Unable to start upload.");
        const { id, signedUrl } = result.data;
        updateDraft(draft.key, { progress: 0 });
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", signedUrl);
          xhr.setRequestHeader("Content-Type", "application/pdf");
          xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
          xhr.timeout = 120000;
          xhr.upload.onprogress = (event) => { if (event.lengthComputable) updateDraft(draft.key, { progress: Math.round(event.loaded / event.total * 100) }); };
          xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed for ${draft.file.name}. Retry saving.`));
          xhr.onerror = () => reject(new Error(`Network error uploading ${draft.file.name}. Retry saving.`));
          xhr.ontimeout = () => reject(new Error(`Upload timed out for ${draft.file.name}. Retry saving.`));
          xhr.send(draft.file);
        });
        ids.push(id);
        updateDraft(draft.key, { uploadedId: id, progress: 100 });
      }
      const result = await gradeSubmission({ submissionId: submission.id, grade: validGrade.data, feedback, attachmentIds: ids });
      if (result.error || !result.data) throw new Error(result.error || "Unable to save review.");
      const saved = result.data;
      setAttachments(saved.feedback_attachments);
      setDrafts([]);
      setGrade(saved.grade || "");
      setBaseline({ grade: saved.grade || "", feedback: saved.feedback || "", ids: saved.feedback_attachments.map((a) => a.id) });
      onSaved(saved);
      toast.success("Grade, feedback, and PDFs saved.");
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save review."); }
    finally { setBusy(false); }
  }

  async function removeReview() {
    if (busy || !window.confirm("Remove this review, including its grade, written feedback, and all feedback PDFs?")) return;
    setBusy(true); setError("");
    try {
      const result = await removeSubmissionReview({ submissionId: submission.id });
      if (result.error || !result.data) throw new Error(result.error || "Unable to remove review.");
      setGrade(""); setFeedback(""); setAttachments([]); setDrafts([]);
      setBaseline({ grade: "", feedback: "", ids: [] });
      onSaved(result.data);
      toast.success("Review removed.");
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to remove review."); }
    finally { setBusy(false); }
  }

  return <Card role="region" aria-label="Grading and feedback" className="w-full flex-shrink-0">
    <CardHeader><CardTitle className="text-lg">Grading & Feedback</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="grade">Grade / Score (0–100, required)</Label>
        <Input id="grade" type="number" min="0" max="100" step="1" required value={grade} onChange={(event) => setGrade(event.target.value)} disabled={busy} className="w-28" />
        {getRatingInfo(grade) && <Badge className={getRatingInfo(grade)?.color}>{getRatingInfo(grade)?.label}</Badge>}
      </div>
      <div className="space-y-2">
        <Label>Feedback (Rich Text)</Label>
        <RichTextEditor value={feedback} onChange={setFeedback} disabled={busy} />
      </div>
      <div className="space-y-3">
        <Label htmlFor="feedback-pdfs">Feedback PDFs</Label>
        <p className="text-sm text-muted-foreground">Up to 3 PDFs, 5 MB each. Files are shared with the student when you save the review.</p>
        {loadError ? <div role="alert">{loadError} <Button variant="outline" onClick={() => setAttempt(attempt + 1)}>Retry loading PDFs</Button></div> : !loaded ? <p>Loading feedback PDFs…</p> : null}
        <div className="rounded-lg border-2 border-dashed p-4 text-center space-y-2" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addFiles(Array.from(event.dataTransfer.files)); }}>
          <p className="text-sm text-muted-foreground">Drop PDFs here or choose files</p>
          <input id="feedback-pdfs" ref={fileInput} type="file" accept=".pdf,application/pdf" multiple className="sr-only" disabled={busy || !loaded} onChange={(event) => { addFiles(Array.from(event.target.files || [])); event.target.value = ""; }} />
          <Button type="button" variant="outline" disabled={busy || !loaded} onClick={() => fileInput.current?.click()}>Add PDFs</Button>
        </div>
        {attachments.map((attachment) => <div key={attachment.id} className="rounded border p-3 space-y-2">
          <p className="text-sm break-all">{attachment.file_name} · {(attachment.file_size / 1024).toFixed(1)} KB</p>
          <div className="flex flex-wrap gap-2"><FeedbackPdfActions attachment={attachment} /><Button variant="ghost" size="sm" disabled={busy} onClick={() => setAttachments(attachments.filter((a) => a.id !== attachment.id))}>Remove PDF</Button></div>
        </div>)}
        {drafts.map((draft) => <div key={draft.key} className="rounded border p-3 space-y-2">
          <p className="text-sm break-all">{draft.file.name} · {(draft.file.size / 1024).toFixed(1)} KB · Not saved</p>
          {draft.progress !== undefined && <div className="flex items-center gap-2"><progress aria-label={`Upload progress for ${draft.file.name}`} value={draft.progress} max="100" className="flex-1" /><span className="text-xs">{draft.progress}%</span></div>}
          <div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => setPreview(URL.createObjectURL(draft.file))}>Preview</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => setDrafts(drafts.filter((d) => d.key !== draft.key))}>Remove PDF</Button></div>
        </div>)}
        {preview && <div className="space-y-2"><Button variant="outline" size="sm" onClick={() => setPreview(null)}>Close preview</Button><iframe title="Unsaved feedback PDF preview" src={preview} className="w-full h-96 border rounded" /></div>}
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        {(baseline.grade || baseline.feedback || baseline.ids.length > 0) && <Button variant="destructive" disabled={busy || !loaded} onClick={removeReview}>Remove Review</Button>}
        <Button disabled={busy || !loaded} onClick={save}>{busy ? "Saving review…" : "Save Review"}</Button>
      </div>
    </CardContent>
  </Card>;
}
