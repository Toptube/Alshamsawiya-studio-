import React, { useEffect, useRef, useState } from 'react';
import { 
  Upload, Play, Pause, RotateCcw, Trash2, Download, 
  Eye, CheckCircle2, AlertCircle, Clock, Sliders, 
  Image as ImageIcon,
  Wand2, Eraser, Undo2, Pencil, LoaderCircle, MousePointer2, Plus, Minus
} from 'lucide-react';
import { ProcessedImage, RembgSettings, RembgModel } from '../../types';
import { ColorSelection, processColorSelections, sampleColorAt } from '../../shared/lib/colorSelection';
import { processingQueue } from '../../shared/lib/processingQueue';

type RefinementTool = 'brush' | 'wand' | 'markers';
interface ColorMarker extends ColorSelection {
  id: string;
  action: 'remove' | 'keep';
}
interface UndoSnapshot {
  image: string;
  markers: ColorMarker[];
}

interface StudioWorkspaceProps {
  images: ProcessedImage[];
  isProcessing: boolean;
  isPaused: boolean;
  currentProcessingId: string | null;
  overallProgress: number;
  settings: RembgSettings;
  updateSettings: (partial: Partial<RembgSettings>) => void;
  onFilesSelected: (files: FileList | File[]) => void;
  onManualEdit: (id: string, dataUrl: string) => void;
  onStartProcessing: () => void;
  onPauseProcessing: () => void;
  onResumeProcessing: () => void;
  onRevertAll: () => void;
  onClearAll: () => void;
  onInspectImage: (image: ProcessedImage) => void;
  onRestoreOriginal: (id: string) => void;
  onDownloadSingle: (image: ProcessedImage) => void;
  onRemoveImage: (id: string) => void;
  onSendToGenerator?: (image: ProcessedImage) => void;
  onActiveImageChange?: (id: string) => void;
  isArabic: boolean;
}

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  images,
  isProcessing,
  isPaused,
  currentProcessingId,
  overallProgress,
  settings,
  updateSettings,
  onFilesSelected,
  onManualEdit,
  onStartProcessing,
  onPauseProcessing,
  onResumeProcessing,
  onRevertAll,
  onClearAll,
  onInspectImage,
  onRestoreOriginal,
  onDownloadSingle,
  onRemoveImage,
  onSendToGenerator,
  onActiveImageChange,
  isArabic
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectionPreviewRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const restoreImageRef = useRef<HTMLImageElement | null>(null);
  const restoreMaskRef = useRef<HTMLCanvasElement | null>(null);
  const restoreOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const undoStackRef = useRef<UndoSnapshot[]>([]);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const markersRef = useRef<ColorMarker[]>([]);
  const markerBaseRef = useRef<HTMLCanvasElement | null>(null);
  const draggedMarkerRef = useRef<string | null>(null);
  const lastSelectionPointRef = useRef<{ x: number; y: number } | null>(null);
  const selectionTimerRef = useRef<number | null>(null);
  const selectionJobRef = useRef(0);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [refinementTool, setRefinementTool] = useState<RefinementTool>('brush');
  const [brushMode, setBrushMode] = useState<'erase' | 'restore'>('erase');
  const [brushSize, setBrushSize] = useState(32);
  const [magicTolerance, setMagicTolerance] = useState(30);
  const [magicContiguous, setMagicContiguous] = useState(true);
  const [edgeFeather, setEdgeFeather] = useState(0);
  const [markerAction, setMarkerAction] = useState<'remove' | 'keep'>('remove');
  const [markers, setMarkers] = useState<ColorMarker[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectionPreview, setSelectionPreview] = useState<Uint8Array | null>(null);
  const [refinementError, setRefinementError] = useState<string | null>(null);
  const [undoCount, setUndoCount] = useState(0);
  const [isAutoIsolating, setIsAutoIsolating] = useState(false);
  const [autoIsolationProgress, setAutoIsolationProgress] = useState(0);
  const [autoIsolationError, setAutoIsolationError] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [cursorScale, setCursorScale] = useState(1);
  const selectedImage = images.find((image) => image.id === selectedImageId) || images[0] || null;

  useEffect(() => {
    if (selectedImage) onActiveImageChange?.(selectedImage.id);
  }, [selectedImage?.id, onActiveImageChange]);

  const pushUndoSnapshot = (canvas: HTMLCanvasElement) => {
    undoStackRef.current.push({ image: canvas.toDataURL('image/png'), markers: markersRef.current });
    setUndoCount(undoStackRef.current.length);
  };

  const commitColorSelection = async (
    selections: ColorSelection[],
    workingCanvas?: HTMLCanvasElement,
    expectedJob?: number
  ) => {
    const canvas = canvasRef.current;
    const source = restoreImageRef.current;
    if (!canvas || !source || !selectedImage) return;
    const batch = await processColorSelections(source, selections, workingCanvas);
    if (expectedJob !== undefined && expectedJob !== selectionJobRef.current) {
      batch.outputBitmap?.close();
      return;
    }
    if (batch.outputBitmap) {
      const context = canvas.getContext('2d');
      if (!context) {
        batch.outputBitmap.close();
        throw new Error(isArabic ? 'تعذر تحديث قناع الصورة.' : 'Could not update the image mask.');
      }
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(batch.outputBitmap, 0, 0);
      batch.outputBitmap.close();
    } else if (workingCanvas && workingCanvas !== canvas) {
      const context = canvas.getContext('2d');
      if (!context) throw new Error(isArabic ? 'تعذر تحديث قناع الصورة.' : 'Could not update the image mask.');
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(workingCanvas, 0, 0);
    }
    onManualEdit(selectedImage.id, canvas.toDataURL('image/png'));
    return batch.selections;
  };

  const scheduleMarkerPreview = (nextMarkers: ColorMarker[]) => {
    if (selectionTimerRef.current !== null) window.clearTimeout(selectionTimerRef.current);
    const job = ++selectionJobRef.current;
    selectionTimerRef.current = window.setTimeout(async () => {
      const canvas = canvasRef.current;
      const base = markerBaseRef.current;
      const source = restoreImageRef.current;
      const currentImage = selectedImage;
      if (!canvas || !base || !source || !currentImage) return;
      try {
        if (nextMarkers.length === 0) {
          const context = canvas.getContext('2d');
          if (!context) throw new Error(isArabic ? 'تعذر استعادة قناع الصورة.' : 'Could not restore the image mask.');
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(base, 0, 0);
          onManualEdit(currentImage.id, canvas.toDataURL('image/png'));
          setSelectionPreview(null);
          return;
        }
        const working = document.createElement('canvas');
        working.width = base.width;
        working.height = base.height;
        const workingContext = working.getContext('2d');
        if (!workingContext) throw new Error(isArabic ? 'تعذر تجهيز معاينة النقاط.' : 'Could not prepare marker preview.');
        workingContext.drawImage(base, 0, 0);
        const result = await processColorSelections(source, nextMarkers, working);
        if (job !== selectionJobRef.current || selectedImage?.id !== currentImage.id) {
          result.outputBitmap?.close();
          return;
        }
        if (result.outputBitmap) {
          const context = canvas.getContext('2d');
          if (!context) {
            result.outputBitmap.close();
            throw new Error(isArabic ? 'تعذر تحديث معاينة النقاط.' : 'Could not update marker preview.');
          }
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(result.outputBitmap, 0, 0);
          result.outputBitmap.close();
        } else {
          const context = canvas.getContext('2d');
          if (!context) throw new Error(isArabic ? 'تعذر تحديث معاينة النقاط.' : 'Could not update marker preview.');
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(working, 0, 0);
        }
        onManualEdit(currentImage.id, canvas.toDataURL('image/png'));
        setSelectionPreview(null);
      } catch (error) {
        setRefinementError(error instanceof Error ? error.message : (isArabic ? 'تعذر تحديث النقاط.' : 'Could not update markers.'));
      }
    }, 140);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!selectedImage) {
      canvas.width = 0;
      canvas.height = 0;
      undoStackRef.current = [];
      markersRef.current = [];
      markerBaseRef.current = null;
      setMarkers([]);
      setSelectionPreview(null);
      setUndoCount(0);
      return;
    }

    const processedImage = new Image();
    const originalImage = new Image();
    processedImage.onload = () => {
      canvas.width = processedImage.naturalWidth;
      canvas.height = processedImage.naturalHeight;
      const restoreMask = document.createElement('canvas');
      restoreMask.width = canvas.width;
      restoreMask.height = canvas.height;
      restoreMaskRef.current = restoreMask;
      const restoreOverlay = document.createElement('canvas');
      restoreOverlay.width = canvas.width;
      restoreOverlay.height = canvas.height;
      restoreOverlayRef.current = restoreOverlay;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(processedImage, 0, 0);
      const selectionPreviewCanvas = selectionPreviewRef.current;
      if (selectionPreviewCanvas) {
        selectionPreviewCanvas.width = canvas.width;
        selectionPreviewCanvas.height = canvas.height;
      }
    };
    processedImage.src = selectedImage.processedUrl || selectedImage.originalUrl;
    originalImage.src = selectedImage.originalUrl;
    restoreImageRef.current = originalImage;
    undoStackRef.current = [];
    markersRef.current = [];
    markerBaseRef.current = null;
    setMarkers([]);
    setSelectedMarkerId(null);
    setSelectionPreview(null);
    setRefinementError(null);
    setRefinementTool('brush');
    selectionJobRef.current++;
    if (selectionTimerRef.current !== null) window.clearTimeout(selectionTimerRef.current);
    setUndoCount(0);
  }, [selectedImage?.id]);

  useEffect(() => () => {
    if (selectionTimerRef.current !== null) window.clearTimeout(selectionTimerRef.current);
    selectionJobRef.current++;
  }, []);

  useEffect(() => {
    const overlay = selectionPreviewRef.current;
    const imageCanvas = canvasRef.current;
    if (!overlay || !imageCanvas || !imageCanvas.width || !imageCanvas.height) return;
    if (overlay.width !== imageCanvas.width) overlay.width = imageCanvas.width;
    if (overlay.height !== imageCanvas.height) overlay.height = imageCanvas.height;
    const context = overlay.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, overlay.width, overlay.height);
    if (selectionPreview && selectionPreview.length === overlay.width * overlay.height) {
      const preview = context.createImageData(overlay.width, overlay.height);
      for (let pixel = 0; pixel < selectionPreview.length; pixel++) {
        const offset = pixel * 4;
        preview.data[offset] = 212;
        preview.data[offset + 1] = 139;
        preview.data[offset + 2] = 22;
        preview.data[offset + 3] = Math.round(selectionPreview[pixel] * 0.55);
      }
      context.putImageData(preview, 0, 0);
    }

    context.save();
    context.lineWidth = Math.max(2, overlay.width / 500);
    context.font = `bold ${Math.max(14, overlay.width / 35)}px sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    markers.forEach((marker) => {
      const radius = Math.max(12, overlay.width / 45);
      context.beginPath();
      context.arc(marker.x, marker.y, radius, 0, Math.PI * 2);
      context.fillStyle = marker.action === 'remove' ? 'rgba(190, 24, 93, 0.9)' : 'rgba(5, 150, 105, 0.9)';
      context.fill();
      context.strokeStyle = marker.id === selectedMarkerId ? '#D48B16' : '#FFFFFF';
      context.stroke();
      context.fillStyle = '#FFFFFF';
      context.fillText(marker.action === 'remove' ? '×' : '+', marker.x, marker.y);
    });
    context.restore();
  }, [markers, selectionPreview, selectedMarkerId, selectedImage?.id]);

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * (canvas.width / bounds.width),
      y: (event.clientY - bounds.top) * (canvas.height / bounds.height),
    };
  };

  const scheduleMagicPreview = (point: { x: number; y: number }) => {
    lastSelectionPointRef.current = point;
    if (selectionTimerRef.current !== null) window.clearTimeout(selectionTimerRef.current);
    const job = ++selectionJobRef.current;
    selectionTimerRef.current = window.setTimeout(async () => {
      const source = restoreImageRef.current;
      if (!source) return;
      try {
        const [result] = (await processColorSelections(source, [{
          ...point,
          tolerance: magicTolerance,
          contiguous: magicContiguous,
          feather: edgeFeather,
        }])).selections;
        if (job === selectionJobRef.current) setSelectionPreview(result?.mask || null);
      } catch (error) {
        if (job === selectionJobRef.current) {
          setRefinementError(error instanceof Error ? error.message : (isArabic ? 'تعذرت معاينة التحديد.' : 'Selection preview failed.'));
        }
      }
    }, 140);
  };

  useEffect(() => {
    if (refinementTool === 'wand' && lastSelectionPointRef.current) {
      scheduleMagicPreview(lastSelectionPointRef.current);
    }
  }, [magicTolerance, magicContiguous, edgeFeather, refinementTool]);

  const applyMagicSelection = async (point: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    pushUndoSnapshot(canvas);
    setRefinementError(null);
    setSelectionPreview(null);
    const job = ++selectionJobRef.current;
    if (selectionTimerRef.current !== null) window.clearTimeout(selectionTimerRef.current);
    try {
      const working = document.createElement('canvas');
      working.width = canvas.width;
      working.height = canvas.height;
      const workingContext = working.getContext('2d');
      if (!workingContext) throw new Error(isArabic ? 'تعذر تجهيز نسخة التحديد.' : 'Could not prepare a selection copy.');
      workingContext.drawImage(canvas, 0, 0);
      const results = await commitColorSelection([{
        ...point,
        tolerance: magicTolerance,
        contiguous: magicContiguous,
        feather: edgeFeather,
        action: 'remove',
      }], working, job);
      setSelectionPreview(results?.[0]?.mask || null);
    } catch (error) {
      setRefinementError(error instanceof Error ? error.message : (isArabic ? 'تعذر تطبيق العصا السحرية.' : 'Magic wand failed.'));
    }
  };

  const addColorMarker = async (point: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    const source = restoreImageRef.current;
    if (!canvas || !source) return;
    try {
      const color = await sampleColorAt(source, point.x, point.y);
      pushUndoSnapshot(canvas);
      const marker: ColorMarker = {
        id: `marker-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ...point,
        sampleColor: color,
        tolerance: magicTolerance,
        contiguous: false,
        feather: edgeFeather,
        action: markerAction,
      };
      const next = [...markersRef.current, marker];
      markersRef.current = next;
      setMarkers(next);
      setSelectedMarkerId(marker.id);
      setSelectionPreview(null);
      setRefinementError(null);
      scheduleMarkerPreview(next);
    } catch (error) {
      setRefinementError(error instanceof Error ? error.message : (isArabic ? 'تعذر قراءة لون النقطة.' : 'Could not sample marker color.'));
    }
  };

  const updateMarkerPosition = (id: string, point: { x: number; y: number }) => {
    const next = markersRef.current.map((marker) => marker.id === id ? { ...marker, ...point } : marker);
    markersRef.current = next;
    setMarkers(next);
    scheduleMarkerPreview(next);
  };

  const deleteSelectedMarker = () => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedMarkerId) return;
    pushUndoSnapshot(canvas);
    const next = markersRef.current.filter((marker) => marker.id !== selectedMarkerId);
    markersRef.current = next;
    setMarkers(next);
    setSelectedMarkerId(null);
    scheduleMarkerPreview(next);
  };

  const chooseRefinementTool = (tool: RefinementTool) => {
    if (tool === refinementTool) return;
    const canvas = canvasRef.current;
    if (tool === 'markers' && canvas) {
      const base = document.createElement('canvas');
      base.width = canvas.width;
      base.height = canvas.height;
      const context = base.getContext('2d');
      if (!context) {
        setRefinementError(isArabic ? 'تعذر بدء وضع نقاط التحديد.' : 'Could not start marker mode.');
        return;
      }
      context.drawImage(canvas, 0, 0);
      markerBaseRef.current = base;
      markersRef.current = [];
      setMarkers([]);
      setSelectedMarkerId(null);
    } else if (tool !== 'markers') {
      markerBaseRef.current = null;
      markersRef.current = [];
      setMarkers([]);
      setSelectedMarkerId(null);
      selectionJobRef.current++;
    }
    setSelectionPreview(null);
    setRefinementError(null);
    setCursorPosition(null);
    setRefinementTool(tool);
  };

  const paintBrushStroke = (context: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }) => {
    context.save();
    context.lineWidth = brushSize;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(from.x, from.y);
    context.lineTo(to.x, to.y);
    if (brushMode === 'erase') {
      context.globalCompositeOperation = 'destination-out';
      context.stroke();
    } else {
      const originalImage = restoreImageRef.current;
      const mask = restoreMaskRef.current;
      const overlay = restoreOverlayRef.current;
      if (originalImage?.complete && originalImage.naturalWidth > 0 && mask && overlay) {
        const maskContext = mask.getContext('2d');
        const overlayContext = overlay.getContext('2d');
        if (!maskContext || !overlayContext) return;
        maskContext.strokeStyle = '#fff';
        maskContext.lineWidth = brushSize;
        maskContext.lineCap = 'round';
        maskContext.lineJoin = 'round';
        maskContext.beginPath();
        maskContext.moveTo(from.x, from.y);
        maskContext.lineTo(to.x, to.y);
        maskContext.stroke();
        overlayContext.clearRect(0, 0, overlay.width, overlay.height);
        overlayContext.drawImage(originalImage, 0, 0);
        overlayContext.globalCompositeOperation = 'destination-in';
        overlayContext.drawImage(mask, 0, 0);
        overlayContext.globalCompositeOperation = 'source-over';
        context.drawImage(overlay, 0, 0);
      }
    }
    context.restore();
  };

  const handleAutoIsolate = async () => {
    if (!selectedImage || isAutoIsolating || isProcessing) return;
    setIsAutoIsolating(true);
    setAutoIsolationProgress(0);
    setAutoIsolationError(null);
    try {
      const result = await processingQueue.run(async () => {
        const { removeBackground } = await import('@imgly/background-removal');
        return removeBackground(selectedImage.originalUrl, {
          device: 'cpu',
          model: 'isnet_fp16',
          output: { format: 'image/png', quality: 1 },
          progress: (_key, current, total) => {
            if (total > 0) setAutoIsolationProgress(Math.min(100, Math.round((current / total) * 100)));
          },
        });
      });
      setAutoIsolationProgress(100);
      const canvas = canvasRef.current;
      if (!canvas) throw new Error(isArabic ? 'تعذر تحديث معاينة الصورة.' : 'Could not update the image preview.');
      const isolatedBitmap = await createImageBitmap(result);
      canvas.width = isolatedBitmap.width;
      canvas.height = isolatedBitmap.height;
      const context = canvas.getContext('2d');
      if (!context) {
        isolatedBitmap.close();
        throw new Error(isArabic ? 'تعذر تحديث معاينة الصورة.' : 'Could not update the image preview.');
      }
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(isolatedBitmap, 0, 0);
      isolatedBitmap.close();
      const restoreMask = document.createElement('canvas');
      restoreMask.width = canvas.width;
      restoreMask.height = canvas.height;
      restoreMaskRef.current = restoreMask;
      const restoreOverlay = document.createElement('canvas');
      restoreOverlay.width = canvas.width;
      restoreOverlay.height = canvas.height;
      restoreOverlayRef.current = restoreOverlay;
      undoStackRef.current = [];
      setUndoCount(0);
      onManualEdit(selectedImage.id, canvas.toDataURL('image/png'));
    } catch (error) {
      setAutoIsolationError(
        error instanceof Error ? error.message : (isArabic ? 'تعذرت معالجة الصورة.' : 'Image processing failed.')
      );
    } finally {
      setIsAutoIsolating(false);
    }
  };

  const updateBrushCursor = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (refinementTool !== 'brush' || event.pointerType === 'touch' || !previewRef.current || !canvasRef.current) {
      setCursorPosition(null);
      return;
    }
    const previewBounds = previewRef.current.getBoundingClientRect();
    const canvasBounds = canvasRef.current.getBoundingClientRect();
    const scale = Math.min(
      canvasBounds.width / canvasRef.current.width,
      canvasBounds.height / canvasRef.current.height
    );
    setCursorPosition({
      x: event.clientX - previewBounds.left,
      y: event.clientY - previewBounds.top,
    });
    setCursorScale(Number.isFinite(scale) && scale > 0 ? scale : 1);
  };

  const finishBrushStroke = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (canvas && selectedImage) onManualEdit(selectedImage.id, canvas.toDataURL('image/png'));
  };

  const undoBrushStroke = () => {
    const canvas = canvasRef.current;
    const previousState = undoStackRef.current.pop();
    setUndoCount(undoStackRef.current.length);
    if (!canvas || !previousState || !selectedImage) return;
    selectionJobRef.current++;
    if (selectionTimerRef.current !== null) window.clearTimeout(selectionTimerRef.current);
    markersRef.current = previousState.markers;
    setMarkers(previousState.markers);
    setSelectedMarkerId(previousState.markers[previousState.markers.length - 1]?.id || null);
    setSelectionPreview(null);
    const image = new Image();
    image.onload = () => {
      const context = canvas.getContext('2d');
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      onManualEdit(selectedImage.id, canvas.toDataURL('image/png'));
    };
    image.src = previousState.image;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const completedCount = images.filter((i) => i.status === 'completed').length;
  const pendingCount = images.filter((i) => i.status === 'pending').length;
  const errorCount = images.filter((i) => i.status === 'error').length;

  return (
    <div className="h-full min-h-0 flex flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-[#0B1528]">
        <h1 className="text-sm font-bold text-slate-900 dark:text-white">{isArabic ? 'عزل' : 'Isolate'}</h1>
        <button
          onClick={() => fileInputRef.current?.click()}
          title={isArabic ? 'رفع صورة' : 'Upload image'}
          aria-label={isArabic ? 'رفع صورة' : 'Upload image'}
          className="rounded-lg p-2 text-[#0F2952] transition-colors hover:bg-slate-100 dark:text-amber-400 dark:hover:bg-slate-800"
        >
          <Upload className="h-4 w-4" />
        </button>
      </div>

      {selectedImage && (
      <section className="shrink-0 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-[#0B1528] sm:p-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div ref={previewRef} className="relative flex h-[30vh] min-h-[160px] max-h-[560px] w-full min-w-0 items-center justify-center overflow-hidden rounded-xl bg-transparency-grid sm:h-auto sm:max-h-[42vh] sm:min-h-[260px] sm:w-auto sm:flex-1">
            {selectedImage ? (
              <>
              <canvas
                ref={canvasRef}
                onPointerEnter={updateBrushCursor}
                onPointerLeave={() => setCursorPosition(null)}
                onPointerDown={(event) => {
                  if (!canvasRef.current || !selectedImage) return;
                  event.preventDefault();
                  updateBrushCursor(event);
                  const canvas = canvasRef.current;
                  canvas.setPointerCapture(event.pointerId);
                  const point = getCanvasPoint(event);
                  if (refinementTool === 'wand') {
                    void applyMagicSelection(point);
                    return;
                  }
                  if (refinementTool === 'markers') {
                    const hitMarker = [...markersRef.current].reverse().find((marker) => {
                      const distance = Math.hypot(marker.x - point.x, marker.y - point.y);
                      return distance <= Math.max(18, canvas.width / 45);
                    });
                    if (hitMarker) {
                      pushUndoSnapshot(canvas);
                      setSelectedMarkerId(hitMarker.id);
                      draggedMarkerRef.current = hitMarker.id;
                    } else {
                      void addColorMarker(point);
                    }
                    return;
                  }
                  pushUndoSnapshot(canvas);
                  const restoreMaskContext = restoreMaskRef.current?.getContext('2d');
                  if (restoreMaskContext) restoreMaskContext.clearRect(0, 0, canvas.width, canvas.height);
                  lastPointRef.current = point;
                  isDrawingRef.current = true;
                  const context = canvas.getContext('2d');
                  if (context) paintBrushStroke(context, point, { x: point.x + 0.01, y: point.y + 0.01 });
                }}
                onPointerMove={(event) => {
                  updateBrushCursor(event);
                  const point = getCanvasPoint(event);
                  if (draggedMarkerRef.current) {
                    updateMarkerPosition(draggedMarkerRef.current, point);
                    return;
                  }
                  if (refinementTool === 'wand' && !isDrawingRef.current && event.pointerType !== 'touch') {
                    scheduleMagicPreview(point);
                    return;
                  }
                  if (!isDrawingRef.current || !lastPointRef.current || !canvasRef.current) return;
                  const context = canvasRef.current.getContext('2d');
                  if (!context) return;
                  paintBrushStroke(context, lastPointRef.current, point);
                  lastPointRef.current = point;
                }}
                onPointerUp={(event) => {
                  if (draggedMarkerRef.current) {
                    draggedMarkerRef.current = null;
                    return;
                  }
                  if (refinementTool === 'brush') finishBrushStroke();
                  else canvasRef.current?.releasePointerCapture(event.pointerId);
                }}
                onPointerCancel={(event) => {
                  if (draggedMarkerRef.current) {
                    draggedMarkerRef.current = null;
                    return;
                  }
                  if (refinementTool === 'brush') finishBrushStroke();
                  else canvasRef.current?.releasePointerCapture(event.pointerId);
                }}
                className={`h-full max-h-full max-w-full object-contain touch-none ${refinementTool === 'brush' ? 'cursor-none' : 'cursor-crosshair'}`}
                aria-label={isArabic ? 'معاينة الصورة والتنقيح اليدوي' : 'Image preview and manual retouch'}
              />
              <canvas
                ref={selectionPreviewRef}
                aria-hidden="true"
                className="pointer-events-none absolute h-full max-h-full max-w-full object-contain"
              />
              </>
            ) : (
              <p className="text-xs text-slate-500">{isArabic ? 'ارفع صورة لبدء المعاينة والتنقيح' : 'Upload an image to preview and retouch'}</p>
            )}
            {selectedImage && cursorPosition && refinementTool === 'brush' && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute z-10 box-border rounded-full border border-[#D48B16]"
                style={{
                  left: cursorPosition.x,
                  top: cursorPosition.y,
                  width: Math.max(4, brushSize * cursorScale),
                  height: Math.max(4, brushSize * cursorScale),
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {brushMode === 'erase' ? (
                  <Eraser className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-[#D48B16]" />
                ) : (
                  <Pencil className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-[#0F2952]" />
                )}
              </div>
            )}
          </div>
          <div className="flex w-full shrink-0 flex-col justify-center gap-2 sm:w-40 sm:gap-3 sm:py-2 lg:w-52">
            <button
              onClick={handleAutoIsolate}
              disabled={!selectedImage || isAutoIsolating || isProcessing}
              title={isArabic ? 'عزل الخلفية تلقائياً' : 'Automatically remove the background'}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#D48B16] px-3 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAutoIsolating ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              <span>
                {isAutoIsolating
                  ? (isArabic ? 'جارٍ العزل الآلي...' : 'Isolating...')
                  : (isArabic ? 'عزل ذكي' : 'AI cutout')}
              </span>
              {isAutoIsolating && autoIsolationProgress > 0 && (
                <span className="font-mono">{autoIsolationProgress}%</span>
              )}
            </button>
            {isAutoIsolating && (
              <div
                role="progressbar"
                aria-label={isArabic ? 'تقدم تحميل ومعالجة نموذج العزل' : 'Cutout model loading and processing progress'}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={autoIsolationProgress}
                className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
              >
                <div
                  className="h-full bg-[#0F2952] transition-[width] duration-200 dark:bg-[#D48B16]"
                  style={{ width: `${autoIsolationProgress}%` }}
                />
              </div>
            )}
            {autoIsolationError && (
              <p role="alert" className="text-[11px] leading-relaxed text-rose-500">{autoIsolationError}</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setBrushMode('erase');
                  chooseRefinementTool('brush');
                }}
                title={isArabic ? 'ممحاة' : 'Eraser'}
                aria-pressed={refinementTool === 'brush' && brushMode === 'erase'}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-semibold ${refinementTool === 'brush' && brushMode === 'erase' ? 'border-[#D48B16] bg-[#D48B16]/10 text-[#D48B16]' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}
              >
                <Eraser className="h-4 w-4" />
                <span>{isArabic ? 'ممحاة' : 'Erase'}</span>
              </button>
              <button
                onClick={() => {
                  setBrushMode('restore');
                  chooseRefinementTool('brush');
                }}
                title={isArabic ? 'استرجاع' : 'Restore'}
                aria-pressed={refinementTool === 'brush' && brushMode === 'restore'}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-semibold ${refinementTool === 'brush' && brushMode === 'restore' ? 'border-[#D48B16] bg-[#D48B16]/10 text-[#D48B16]' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}
              >
                <Pencil className="h-4 w-4" />
                <span>{isArabic ? 'استرجاع' : 'Restore'}</span>
              </button>
              <button
                onClick={() => chooseRefinementTool('wand')}
                title={isArabic ? 'العصا السحرية' : 'Magic Wand'}
                aria-pressed={refinementTool === 'wand'}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-semibold ${refinementTool === 'wand' ? 'border-[#D48B16] bg-[#D48B16]/10 text-[#D48B16]' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}
              >
                <Wand2 className="h-4 w-4" />
                <span>{isArabic ? 'العصا السحرية' : 'Magic Wand'}</span>
              </button>
              <button
                onClick={() => chooseRefinementTool('markers')}
                title={isArabic ? 'نقاط التحديد' : 'Color markers'}
                aria-pressed={refinementTool === 'markers'}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-semibold ${refinementTool === 'markers' ? 'border-[#D48B16] bg-[#D48B16]/10 text-[#D48B16]' : 'border-slate-200 text-slate-500 dark:border-slate-700'}`}
              >
                <MousePointer2 className="h-4 w-4" />
                <span>{isArabic ? 'نقاط التحديد' : 'Markers'}</span>
              </button>
            </div>
            {refinementTool === 'brush' && (
              <label className="space-y-1 text-[11px] text-slate-500">
                <span className="flex justify-between"><span>{isArabic ? 'حجم الفرشاة' : 'Brush size'}</span><b className="text-[#D48B16]">{brushSize}px</b></span>
                <input type="range" min="4" max="120" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} className="w-full accent-[#D48B16]" />
              </label>
            )}
            {refinementTool !== 'brush' && (
              <div className="space-y-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                <label className="block space-y-1 text-[11px] text-slate-500">
                  <span className="flex justify-between">
                    <span>{isArabic ? 'سماحية اللون' : 'Color tolerance'}</span>
                    <b className="text-[#D48B16]">{magicTolerance}</b>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={magicTolerance}
                    onChange={(event) => setMagicTolerance(Number(event.target.value))}
                    className="w-full accent-[#D48B16]"
                  />
                </label>
                <label className="block space-y-1 text-[11px] text-slate-500">
                  <span className="flex justify-between">
                    <span>{isArabic ? 'تنعيم الحافة' : 'Edge feather'}</span>
                    <b className="text-[#D48B16]">{edgeFeather}px</b>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    value={edgeFeather}
                    onChange={(event) => setEdgeFeather(Number(event.target.value))}
                    className="w-full accent-[#D48B16]"
                  />
                </label>
                {refinementTool === 'wand' ? (
                  <button
                    onClick={() => setMagicContiguous((value) => !value)}
                    aria-pressed={!magicContiguous}
                    className="flex w-full items-center justify-between rounded-md bg-slate-100 px-2 py-1.5 text-[11px] dark:bg-slate-800"
                  >
                    <span>{isArabic ? 'نطاق التحديد' : 'Selection range'}</span>
                    <span className="font-bold text-[#D48B16]">
                      {magicContiguous ? (isArabic ? 'متصل' : 'Contiguous') : (isArabic ? 'كل الصورة' : 'Global')}
                    </span>
                  </button>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => setMarkerAction((action) => action === 'remove' ? 'keep' : 'remove')}
                      aria-label={isArabic ? `تبديل وضع النقطة إلى ${markerAction === 'remove' ? 'استبقاء' : 'إزالة'}` : 'Toggle marker action'}
                      className={`flex w-full items-center justify-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-bold text-white ${markerAction === 'remove' ? 'bg-rose-700' : 'bg-emerald-700'}`}
                    >
                      {markerAction === 'remove' ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      {markerAction === 'remove'
                        ? (isArabic ? '× إزالة اللون' : '× Remove color')
                        : (isArabic ? '＋ استبقاء اللون' : '＋ Keep color')}
                    </button>
                    <button
                      onClick={deleteSelectedMarker}
                      disabled={!selectedMarkerId}
                      className="flex w-full items-center justify-center gap-1 rounded-md border border-slate-200 px-2 py-1.5 text-[11px] text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {isArabic ? 'حذف النقطة المحددة' : 'Delete selected marker'}
                    </button>
                  </div>
                )}
              </div>
            )}
            {refinementError && <p role="alert" className="text-[11px] text-rose-500">{refinementError}</p>}
            <button
              onClick={undoBrushStroke}
              disabled={undoCount === 0}
              title={isArabic ? 'تراجع' : 'Undo'}
              aria-label={isArabic ? 'تراجع' : 'Undo'}
              className="flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            {images.length > 1 && (
              <select
                value={selectedImage?.id || ''}
                disabled={isAutoIsolating}
                onChange={(event) => {
                  setSelectedImageId(event.target.value);
                  undoStackRef.current = [];
                  setUndoCount(0);
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-2 text-xs"
              >
                {images.map((image) => <option key={image.id} value={image.id}>{image.name}</option>)}
              </select>
            )}
          </div>
        </div>
      </section>
      )}

      {/* Main Grid: Upload & Controls + Gallery */}
      <div className="min-h-0 flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pe-1">
        
        {/* Left Column (Settings & Parameters): 4 cols */}
        {selectedImage && (
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-[#0B1528] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            
            {/* Header of Inspector */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isArabic ? 'إعدادات العزل' : 'Isolation settings'}
                </h2>
              </div>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{isArabic ? 'وضوح العزل' : 'Isolation quality'}</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  {isArabic ? 'فائق الدقة' : 'High Precision'}
                </span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'u2net', label: isArabic ? 'دقة عالية' : 'High detail' },
                  { id: 'u2netp', label: isArabic ? 'معالجة سريعة' : 'Fast' },
                  { id: 'silueta', label: isArabic ? 'حواف دقيقة' : 'Clean edges' },
                  { id: 'isnet-general-use', label: isArabic ? 'تفاصيل دقيقة' : 'Fine detail' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => updateSettings({ model: m.id as RembgModel })}
                    className={`px-2.5 py-2 text-start rounded-xl border text-xs transition-all ${
                      settings.model === m.id
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="truncate">{m.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Alpha Matting Toggle & Sliders */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    {isArabic ? 'تحسين حواف الصورة' : 'Refine image edges'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isArabic ? 'لإظهار تفاصيل المنتج بوضوح' : 'Keep fine product details'}
                  </span>
                </div>
                <button
                  onClick={() => updateSettings({ alphaMatting: !settings.alphaMatting })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    settings.alphaMatting ? 'bg-amber-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
                </button>
              </div>

              {settings.alphaMatting && (
                <div className="space-y-3 ps-2 border-s-2 border-amber-500/40 mt-2">
                  {/* Foreground threshold (af) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{isArabic ? 'إبراز المنتج' : 'Keep product detail'}</span>
                      <span className="font-mono text-amber-500 font-bold">{settings.af}</span>
                    </div>
                    <input
                      type="range"
                      min="150"
                      max="255"
                      value={settings.af}
                      onChange={(e) => updateSettings({ af: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  {/* Background threshold (ab) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{isArabic ? 'إزالة الخلفية' : 'Remove background'}</span>
                      <span className="font-mono text-amber-500 font-bold">{settings.ab}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.ab}
                      onChange={(e) => updateSettings({ ab: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  {/* Erode size (ae) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{isArabic ? 'تنقية الحواف' : 'Clean edge halo'}</span>
                      <span className="font-mono text-amber-500 font-bold">{settings.ae}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={settings.ae}
                      onChange={(e) => updateSettings({ ae: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Edge Feathering Slider */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>{isArabic ? 'نعومة الأطراف' : 'Edge softness'}</span>
                  <span className="font-mono text-amber-500 font-bold">{settings.edgeFeathering}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  value={settings.edgeFeathering}
                  onChange={(e) => updateSettings({ edgeFeathering: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>

            {/* Output Background Customization */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{isArabic ? 'خلفية الصورة الناتجة' : 'Output Background Style'}</span>
              </label>

              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'transparent', label: isArabic ? 'شفاف' : 'Transparent' },
                  { id: 'color', label: isArabic ? 'لون مصمت' : 'Solid Color' },
                  { id: 'gradient', label: isArabic ? 'تدرج' : 'Gradient' },
                  { id: 'studio', label: isArabic ? 'استوديو' : 'Studio' }
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => updateSettings({ backgroundType: b.id as any })}
                    className={`py-1.5 text-center text-xs rounded-lg border transition-all ${
                      settings.backgroundType === b.id
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              {settings.backgroundType === 'color' && (
                <div className="flex items-center gap-2 pt-1">
                  {[
                    { hex: '#FFFFFF', name: 'White' },
                    { hex: '#0F2952', name: 'AlShams Navy' },
                    { hex: '#D48B16', name: 'AlShams Gold' },
                    { hex: '#000000', name: 'Black' }
                  ].map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => updateSettings({ backgroundColor: c.hex })}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        settings.backgroundColor.toUpperCase() === c.hex
                          ? 'border-amber-500 scale-110'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                    className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-700 cursor-pointer overflow-hidden p-0"
                    title="Custom Color"
                  />
                  <span className="font-mono text-xs text-slate-500">{settings.backgroundColor}</span>
                </div>
              )}
            </div>

            {/* Automation & Auto-Save */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    {isArabic ? 'الحفظ التلقائي للنتائج' : 'Auto-Save Results'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isArabic ? 'تنزيل النتيجة فور اكتمال معالجة كل صورة' : 'Auto-download upon processing'}
                  </span>
                </div>
                <button
                  onClick={() => updateSettings({ autoSave: !settings.autoSave })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    settings.autoSave ? 'bg-amber-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
                </button>
              </div>

              {/* Engine Mode */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    {isArabic ? 'المعالجة دون إنترنت' : 'Work offline'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isArabic ? 'تتم المعالجة على جهازك' : 'Process on this device'}
                  </span>
                </div>
                <button
                  onClick={() =>
                    updateSettings({
                      engineMode: settings.engineMode === 'offline' ? 'server' : 'offline',
                    })
                  }
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    settings.engineMode === 'offline' ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
                </button>
              </div>
            </div>

          </div>
        </div>
        )}

        {/* Right Column: Upload Zone, Batch Controls, Gallery: 8 cols */}
        <div className={`${selectedImage ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-4`}>
          
          {/* Dropzone Area */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`flex min-h-[38vh] items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500/80 rounded-2xl p-6 text-center bg-white/60 dark:bg-[#0B1528]/60 transition-colors cursor-pointer group ${selectedImage ? 'sm:min-h-0' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onFilesSelected(e.target.files);
                }
              }}
            />
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isArabic ? 'اسحب الصور إلى هنا أو انقر للاختيار' : 'Drag & drop images here or browse'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isArabic
                    ? 'يدعم معالجة مئات الصور دفعة واحدة بصيغ PNG, JPG, WebP, BMP'
                    : 'Supports batch upload for hundreds of PNG, JPG, WebP, BMP images'}
                </p>
              </div>

            </div>
          </div>

          {/* Batch Status and Controls Bar */}
          {images.length > 0 && (
            <div className="bg-white dark:bg-[#0B1528] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Stats counter */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {isArabic ? 'إجمالي الدفعة: ' : 'Total: '}
                    <span className="font-mono text-amber-500 font-bold">{images.length}</span>
                  </span>
                  <span>·</span>
                  <span className="text-emerald-500 font-medium">
                    {isArabic ? 'مكتمل: ' : 'Done: '}
                    <span className="font-mono">{completedCount}</span>
                  </span>
                  <span>·</span>
                  <span className="text-blue-400 font-medium">
                    {isArabic ? 'بانتظار: ' : 'Pending: '}
                    <span className="font-mono">{pendingCount}</span>
                  </span>
                  {errorCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-rose-500 font-medium">
                        {isArabic ? 'أخطاء: ' : 'Errors: '}
                        <span className="font-mono">{errorCount}</span>
                      </span>
                    </>
                  )}
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2">
                  {!isProcessing ? (
                    <button
                      onClick={onStartProcessing}
                      disabled={pendingCount === 0}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isArabic ? 'بدء معالجة الدفعة' : 'Start Processing Batch'}</span>
                    </button>
                  ) : isPaused ? (
                    <button
                      onClick={onResumeProcessing}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isArabic ? 'استئناف' : 'Resume'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={onPauseProcessing}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-sm transition-all"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>{isArabic ? 'إيقاف مؤقت' : 'Pause'}</span>
                    </button>
                  )}

                  <button
                    onClick={onRevertAll}
                    title={isArabic ? 'تراجع واستعادة الصور الأصلية' : 'Revert All to Original'}
                    className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={onClearAll}
                    title={isArabic ? 'تفريغ القائمة' : 'Clear Queue'}
                    className="p-2 text-rose-500 hover:text-rose-600 rounded-xl hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Overall Progress Bar */}
              {isProcessing && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>{isArabic ? 'جاري عزل خلفيات الصور...' : 'Processing batch...'}</span>
                    <span>{Math.round(overallProgress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300 rounded-full"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Image Cards Grid */}
          {images.length === 0 ? (
            <div className="bg-white/40 dark:bg-[#0B1528]/40 rounded-2xl p-12 text-center border border-slate-200/60 dark:border-slate-800/60">
              <ImageIcon className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-40" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                {isArabic ? 'لا توجد صور في قائمة المعالجة الحالية' : 'No images in queue'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {isArabic ? 'ارفع صور منتجاتك لبدء العمل' : 'Upload your product photos to get started'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {images.map((item) => {
                const isCurrent = item.id === currentProcessingId;
                const isCompleted = item.status === 'completed';
                const isError = item.status === 'error';

                return (
                  <div
                    key={item.id}
                    className={`group relative bg-white dark:bg-[#0B1528] rounded-2xl border overflow-hidden transition-all shadow-xs ${
                      isCurrent
                        ? 'border-amber-500 ring-2 ring-amber-500/20'
                        : isCompleted
                        ? 'border-emerald-500/40 dark:border-emerald-500/30'
                        : isError
                        ? 'border-rose-500/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Thumbnail Viewport */}
                    <div 
                      onClick={() => onInspectImage(item)}
                      className="relative h-44 w-full bg-transparency-grid overflow-hidden flex items-center justify-center cursor-pointer"
                    >
                      <img
                        src={item.processedUrl || item.originalUrl}
                        alt={item.name}
                        className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
                      />

                      {/* Status Tag Overlay */}
                      <div className="absolute top-2 start-2">
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/90 text-white shadow-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            {isArabic ? 'تم العزل' : 'Done'}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/90 text-slate-950 animate-pulse shadow-xs">
                            <Clock className="w-3 h-3" />
                            {isArabic ? 'جاري المعالجة...' : 'Processing...'}
                          </span>
                        )}
                        {item.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-slate-300 backdrop-blur-xs">
                            {isArabic ? 'بانتظار البدء' : 'Pending'}
                          </span>
                        )}
                        {isError && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/90 text-white shadow-xs">
                            <AlertCircle className="w-3 h-3" />
                            {isArabic ? 'خطأ' : 'Error'}
                          </span>
                        )}
                      </div>

                      {/* Hover Quick Inspect Button */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectImage(item);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/90 text-slate-900 text-xs font-bold shadow-md hover:bg-white flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isArabic ? 'معاينة ومقارنة' : 'Compare'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Metadata & Actions Footer */}
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[160px]" title={item.name}>
                          {item.name}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400">
                          {(item.originalSize / 1024).toFixed(0)} KB
                        </span>
                      </div>

                      {isCompleted && (
                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          <span>{item.outputWidth}x{item.outputHeight}</span>
                          <span className="text-emerald-500 font-semibold">{item.processingTimeMs}ms</span>
                        </div>
                      )}

                      {/* Card Button Strip */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-1">
                          {isCompleted && (
                            <button
                              onClick={() => onRestoreOriginal(item.id)}
                              title={isArabic ? 'تراجع واستعادة الأصلية' : 'Revert to Original'}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onRemoveImage(item.id)}
                            title={isArabic ? 'حذف من القائمة' : 'Remove from list'}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {isCompleted && onSendToGenerator && (
                            <button
                              onClick={() => onSendToGenerator(item)}
                              title={isArabic ? 'توليد خلفية جديدة لهذا المنتج' : 'Generate Background for this'}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-slate-950 transition-colors"
                            >
                              <Wand2 className="w-3 h-3 text-amber-500" />
                              <span>{isArabic ? 'توليد مشهد' : 'Scene'}</span>
                            </button>
                          )}

                          {isCompleted && (
                            <button
                              onClick={() => onDownloadSingle(item)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              <span>PNG</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
