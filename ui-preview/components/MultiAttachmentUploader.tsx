"use client";

import React, { useState, useRef, useCallback } from "react";
import { Mic, Square, FileAudio, File as FileIcon, Plus, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";

export interface StagedAttachment {
  id: string;
  type: 'document' | 'audio';
  file?: File;
  blob?: Blob;
  url: string;
  name: string;
}

function SortableAttachmentItem({ item, onRemove, onRename, uploadProgress }: { item: StagedAttachment, onRemove: (id: string) => void, onRename: (id: string, name: string) => void, uploadProgress?: number }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col gap-3 p-4 border rounded-xl bg-white mb-3 shadow-sm hover:bg-slate-50 transition-colors group relative overflow-hidden">
      {uploadProgress !== undefined && (
        <div 
          className="absolute left-0 top-0 bottom-0 bg-blue-100 z-0 transition-all duration-300"
          style={{ width: `${uploadProgress}%` }}
        />
      )}
      {/* Row 1: File Management */}
      <div className="flex items-center gap-3 w-full relative z-10">
        {/* Drag Handle */}
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 flex-shrink-0">
          <GripVertical className="h-5 w-5" />
        </div>
        
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-slate-100 rounded-md flex items-center justify-center text-slate-500 overflow-hidden">
          {item.type === 'document' ? (
             item.file?.type.startsWith('image/') ? (
               <img src={item.url} alt="preview" className="w-full h-full object-cover" />
             ) : <FileIcon className="h-5 w-5" />
          ) : <FileAudio className="h-5 w-5" />}
        </div>
        
        {/* File Name Input */}
        <div className="flex-grow min-w-0 flex items-center justify-between pr-2">
          <Input 
            value={item.name}
            onChange={(e) => onRename(item.id, e.target.value)}
            className="h-9 text-sm border-transparent hover:border-slate-200 focus:border-blue-300 px-2 bg-transparent w-full disabled:opacity-100 disabled:cursor-not-allowed"
            placeholder="Attachment name"
            disabled={uploadProgress !== undefined}
          />
          {uploadProgress !== undefined && (
            <span className="text-xs font-semibold text-blue-700 ml-2 whitespace-nowrap">
              {uploadProgress}%
            </span>
          )}
        </div>
        
        {/* Delete Button */}
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className="flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 sm:opacity-50 group-hover:opacity-100 transition-opacity" 
          onClick={() => onRemove(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Row 2: Audio Player (Only for audio types) */}
      {item.type === 'audio' && (
        <div className="w-full mt-1 relative z-10">
          <audio src={item.url} controls className="w-full h-12" />
        </div>
      )}
    </div>
  );
}

function SortableImageItem({ item }: { item: StagedAttachment }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition, 
    touchAction: 'none', 
    zIndex: isDragging ? 50 : 1 
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className={`relative aspect-square border-2 rounded-xl bg-slate-100 shadow-sm transition-colors transition-shadow overflow-hidden cursor-grab ${
        isDragging ? 'cursor-grabbing border-blue-500 shadow-2xl scale-105 rotate-2' : 'border-slate-200 hover:border-blue-400 hover:shadow-md'
      }`}
    >
      <img src={item.url} alt={item.name} className="w-full h-full object-cover pointer-events-none" />
    </div>
  );
}

interface MultiAttachmentUploaderProps {
  attachments: StagedAttachment[];
  setAttachments: React.Dispatch<React.SetStateAction<StagedAttachment[]>>;
  uploadProgress: Record<string, number>;
  isUploading: boolean;
  allowRecord?: boolean;
  onRecordingChange?: (isRecording: boolean) => void;
}

export function MultiAttachmentUploader({ attachments, setAttachments, uploadProgress, isUploading, allowRecord = true, onRecordingChange }: MultiAttachmentUploaderProps) {
  // Audio Recording States
  const [recordState, setRecordState] = useState<"idle" | "recording">("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isCombining, setIsCombining] = useState(false);
  const [isCombineModalOpen, setIsCombineModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState<StagedAttachment[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setAttachments((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addFiles = (files: File[]) => {
    const newAtts: StagedAttachment[] = files.map(file => ({
      id: uuidv4(),
      type: file.type.startsWith('audio/') ? 'audio' : 'document',
      file,
      url: URL.createObjectURL(file),
      name: file.name
    }));
    setAttachments(prev => [...prev, ...newAtts]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const item = prev.find(i => i.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return prev.filter(i => i.id !== id);
    });
  };

  const renameAttachment = (id: string, newName: string) => {
    setAttachments(prev => prev.map(item => item.id === id ? { ...item, name: newName } : item));
  };

  // Safari/iOS MediaRecorder Support
  const getSupportedMimeType = () => {
    if (typeof MediaRecorder === 'undefined') return '';
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
    if (MediaRecorder.isTypeSupported('audio/mpeg')) return 'audio/mpeg';
    return '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalMimeType = mediaRecorder.mimeType || "audio/mp4"; // Fallback
        const blob = new Blob(audioChunksRef.current, { type: finalMimeType });
        const ext = finalMimeType.includes("mp4") ? "m4a" : (finalMimeType.includes("webm") ? "webm" : "mp3");
        const filename = `Recording - ${new Date().toLocaleTimeString()}.${ext}`;
        
        const newAtt: StagedAttachment = {
          id: uuidv4(),
          type: 'audio',
          blob,
          url: URL.createObjectURL(blob),
          name: filename
        };
        setAttachments(prev => [...prev, newAtt]);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecordState("recording");
      onRecordingChange?.(true);
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
      setRecordState("idle");
      onRecordingChange?.(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const imageAttachments = attachments.filter(a => a.file && a.file.type.startsWith('image/'));
  const canCombineToPdf = imageAttachments.length >= 1;

  const openCombineModal = () => {
    setModalImages([...imageAttachments]);
    setIsCombineModalOpen(true);
  };

  const confirmCombineImages = async () => {
    setIsCombining(true);
    try {
      const { convertImagesToPDF } = await import('@/lib/pdf');
      const filesToCombine = modalImages.map(a => a.file!);
      const pdfFile = await convertImagesToPDF(filesToCombine);
      
      const imageIds = new Set(modalImages.map(a => a.id));
      
      const newAtt: StagedAttachment = {
        id: uuidv4(),
        type: 'document',
        file: pdfFile,
        url: URL.createObjectURL(pdfFile),
        name: pdfFile.name
      };
      
      setAttachments(prev => [...prev.filter(a => !imageIds.has(a.id)), newAtt]);
      setIsCombineModalOpen(false);
      toast.success("Images combined successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to combine images");
    } finally {
      setIsCombining(false);
    }
  };

  const handleModalDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setModalImages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  }, [isUploading]);

  return (
    <div className="space-y-4">
      {/* Upload Controls */}
      <div 
        className={`grid grid-cols-1 ${allowRecord ? 'md:grid-cols-2' : ''} gap-4`}
      >
        <Card 
          className={`border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer group relative overflow-hidden ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-4 min-h-[160px]">
            <div className="bg-slate-100 p-3 rounded-full group-hover:bg-blue-100 transition-colors">
              <Plus className="h-6 w-6 text-slate-500 group-hover:text-blue-600 group-hover:scale-110 transition-all" />
            </div>
            <div>
              <p className="text-sm font-medium">Add Files</p>
              <p className="text-xs text-slate-500 mt-1">Drag and drop or click to browse</p>
            </div>
            <Input 
              type="file" 
              multiple 
              onChange={(e) => {
                if (e.target.files) {
                  addFiles(Array.from(e.target.files));
                  e.target.value = '';
                }
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </CardContent>
        </Card>

        {allowRecord && (
          <Card 
            onClick={recordState === "idle" ? startRecording : stopRecording}
            className={`border-2 border-dashed transition-colors cursor-pointer group relative overflow-hidden ${isUploading ? 'opacity-50 pointer-events-none' : ''} ${recordState === 'idle' ? 'border-slate-300 hover:border-red-400 hover:bg-red-50' : 'border-red-500 bg-red-50'}`}
          >
            <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-4 min-h-[160px] h-full pointer-events-none">
              {recordState === "idle" ? (
                <>
                  <div className="bg-indigo-50 p-3 rounded-full group-hover:bg-red-100 transition-colors">
                    <Mic className="h-6 w-6 text-indigo-500 group-hover:text-red-600 group-hover:scale-110 transition-all" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Record Audio</p>
                    <p className="text-xs text-slate-500 mt-1">Click to start recording</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-red-100 p-3 rounded-full animate-pulse">
                    <Mic className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-600">Recording...</p>
                    <p className="text-xl font-mono mt-1 text-slate-700">{formatTime(recordingTime)}</p>
                  </div>
                  <div className="flex items-center text-red-600 text-sm font-medium mt-2">
                    <Square className="h-4 w-4 mr-1" /> Click to stop
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {canCombineToPdf && (
        <div className="flex justify-end mb-2 animate-in fade-in">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={openCombineModal}
            disabled={isUploading}
            className="w-full bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 shadow-sm"
          >
            {imageAttachments.length > 1 ? `Combine ${imageAttachments.length} Images to single PDF` : `Convert Image to PDF`}
          </Button>
        </div>
      )}

      {/* Sortable Attachments List */}
      {attachments.length > 0 && (
        <div className="bg-slate-50 border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
              Selected Attachments ({attachments.length})
            </Label>
            <span className="text-xs text-slate-500">Drag to reorder</span>
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={attachments.map(a => a.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {attachments.map((att) => (
                  <SortableAttachmentItem 
                    key={att.id} 
                    item={att} 
                    onRemove={removeAttachment} 
                    onRename={renameAttachment}
                    uploadProgress={uploadProgress[att.id] ?? uploadProgress[att.name]}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Image Sorting Modal */}
      <Dialog open={isCombineModalOpen} onOpenChange={setIsCombineModalOpen}>
        <DialogContent className="sm:max-w-[800px] w-[95vw]">
          <DialogHeader>
            <DialogTitle>Arrange PDF Pages</DialogTitle>
            <DialogDescription>
              Drag and drop the images below to set the order of the pages in your new PDF document.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 max-h-[70vh] overflow-y-auto custom-scrollbar px-1">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModalDragEnd}>
              <SortableContext items={modalImages.map(a => a.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-1">
                  {modalImages.map((att) => (
                    <SortableImageItem key={att.id} item={att} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsCombineModalOpen(false)} disabled={isCombining}>
              Cancel
            </Button>
            <Button onClick={confirmCombineImages} disabled={isCombining}>
              {isCombining ? "Converting..." : "Confirm & Convert to PDF"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
