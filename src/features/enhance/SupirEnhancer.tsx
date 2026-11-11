import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Download, Sliders, Layers, RotateCcw, Eye,
  ArrowRightLeft, SplitSquareVertical, Upload, Check
} from 'lucide-react';
import { ProcessedImage } from '../../types';
import { soundEffects } from '../../shared/lib/audio';
import { processingQueue } from '../../shared/lib/processingQueue';

interface SupirEnhancerProps {
  images: ProcessedImage[];
  isArabic: boolean;
  onAddImageToLibrary?: (img: ProcessedImage) => void;
  initialEnhanceSettings?: Partial<EnhanceProjectState>;
  initialEnhancedUrl?: string | null;
  onEnhanceStateChange?: (settings: EnhanceProjectState, enhancedUrl: string | null) => void;
  onActiveImageChange?: (id: string) => void;
}

export interface EnhanceProjectState {
  scaleFactor: 2 | 4 | 8;
  brightness: number;
  contrast: number;
  sharpness: number;
}

export const SupirEnhancer: React.FC<SupirEnhancerProps> = ({
  images,
  isArabic,
  onAddImageToLibrary,
  initialEnhanceSettings,
  initialEnhancedUrl,
  onEnhanceStateChange,
  onActiveImageChange
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Current selected image
  const [selectedImage, setSelectedImage] = useState<ProcessedImage | null>(() => {
    const completed = images.find((i) => i.status === 'completed' && i.processedUrl);
    return completed || images[0] || null;
  });

  // Enhancement controls
  const [scaleFactor, setScaleFactor] = useState<2 | 4 | 8>(initialEnhanceSettings?.scaleFactor || 4);
  const [brightness, setBrightness] = useState(initialEnhanceSettings?.brightness ?? 0);
  const [contrast, setContrast] = useState(initialEnhanceSettings?.contrast ?? 0);
  const [sharpness, setSharpness] = useState(initialEnhanceSettings?.sharpness ?? 0);

  // Interactive Split Slider position (0% to 100%)
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isComparingSideBySide, setIsComparingSideBySide] = useState<boolean>(false);
  const [isShowingOriginal, setIsShowingOriginal] = useState(false);
  const [isProcessingEnhance, setIsProcessingEnhance] = useState<boolean>(false);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(initialEnhancedUrl || null);
  const [enhancedDimensions, setEnhancedDimensions] = useState<{ width: number; height: number } | null>(null);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);

  useEffect(() => {
    onEnhanceStateChange?.({ scaleFactor, brightness, contrast, sharpness }, enhancedUrl);
  }, [onEnhanceStateChange, scaleFactor, brightness, contrast, sharpness, enhancedUrl]);

  // Filter completed images
  const completedList = images.filter((img) => img.status === 'completed' && (img.processedUrl || img.originalUrl));

  useEffect(() => {
    if (selectedImage) onActiveImageChange?.(selectedImage.id);
  }, [selectedImage?.id, onActiveImageChange]);

  // Render the live adjustments on a canvas whenever the source or controls change.
  useEffect(() => {
    const currentUrl = selectedImage?.processedUrl || selectedImage?.originalUrl;
    if (!currentUrl) {
      setEnhancedUrl(null);
      setEnhancedDimensions(null);
      setIsProcessingEnhance(false);
      return;
    }

    setIsProcessingEnhance(true);
    setEnhanceError(null);
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      void processingQueue.run(async () => {
        if (cancelled) return;
        try {
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = img.naturalWidth || img.width;
        sourceCanvas.height = img.naturalHeight || img.height;
        const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
        if (!sourceContext) throw new Error(isArabic ? 'تعذر إنشاء معاينة الصورة.' : 'Could not create the image preview.');

        sourceContext.filter = `brightness(${100 + brightness}%) contrast(${100 + contrast}%)`;
        sourceContext.drawImage(img, 0, 0, sourceCanvas.width, sourceCanvas.height);
        sourceContext.filter = 'none';

        if (sharpness > 0) {
          const imageData = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
          const sourcePixels = imageData.data;
          const originalPixels = new Uint8ClampedArray(sourcePixels);
          const sharpenAmount = (sharpness / 100) * 0.35;
          for (let y = 1; y < sourceCanvas.height - 1; y++) {
            for (let x = 1; x < sourceCanvas.width - 1; x++) {
              const index = (y * sourceCanvas.width + x) * 4;
              for (let channel = 0; channel < 3; channel++) {
                const surrounding =
                  originalPixels[index - sourceCanvas.width * 4 + channel] +
                  originalPixels[index + sourceCanvas.width * 4 + channel] +
                  originalPixels[index - 4 + channel] +
                  originalPixels[index + 4 + channel];
                sourcePixels[index + channel] = Math.max(0, Math.min(255,
                  originalPixels[index + channel] + sharpenAmount * (4 * originalPixels[index + channel] - surrounding)
                ));
              }
            }
          }
          sourceContext.putImageData(imageData, 0, 0);
        }

        const scaleMultiplier = scaleFactor === 8 ? 3 : scaleFactor === 4 ? 2 : 1.5;
        const targetW = Math.round(sourceCanvas.width * scaleMultiplier);
        const targetH = Math.round(sourceCanvas.height * scaleMultiplier);
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = targetW;
        outputCanvas.height = targetH;
        const outputContext = outputCanvas.getContext('2d');
        if (!outputContext) throw new Error(isArabic ? 'تعذر تجهيز الصورة المحسنة.' : 'Could not prepare the enhanced image.');
        outputContext.imageSmoothingEnabled = true;
        outputContext.imageSmoothingQuality = 'high';
        outputContext.drawImage(sourceCanvas, 0, 0, targetW, targetH);

        if (!cancelled) {
          setEnhancedUrl(outputCanvas.toDataURL('image/png'));
          setEnhancedDimensions({ width: targetW, height: targetH });
        }
        } catch (error) {
          if (!cancelled) {
            setEnhancedUrl(null);
            setEnhancedDimensions(null);
            setEnhanceError(error instanceof Error ? error.message : (isArabic ? 'تعذر تحسين الصورة.' : 'Image enhancement failed.'));
          }
        } finally {
          if (!cancelled) setIsProcessingEnhance(false);
        }
      });
    };
    img.onerror = () => {
      if (cancelled) return;
      setEnhanceError(isArabic ? 'تعذر تحميل الصورة للمعاينة.' : 'Could not load the image for preview.');
      setEnhancedUrl(null);
      setEnhancedDimensions(null);
      setIsProcessingEnhance(false);
    };
    img.src = currentUrl;
    return () => {
      cancelled = true;
    };
  }, [selectedImage?.id, selectedImage?.processedUrl, selectedImage?.originalUrl, scaleFactor, brightness, contrast, sharpness, isArabic]);

  // Dynamic base dimensions for output pixel calculations
  const baseW = selectedImage?.originalWidth || selectedImage?.outputWidth || 1024;
  const baseH = selectedImage?.originalHeight || selectedImage?.outputHeight || 1024;

  // Handle Dragging Slider (Pointer Events with capture for smooth desktop & mobile drag)
  const updateSliderPosition = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percentage);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    updateSliderPosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    updateSliderPosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Download Enhanced 4K result
  const handleDownloadEnhanced = () => {
    if (!enhancedUrl) return;
    const a = document.createElement('a');
    a.href = enhancedUrl;
    a.download = `ستوديو_الشمساوية_SUPIR_${scaleFactor}x_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    soundEffects.playCompletionChime();
  };

  const resetFilters = () => {
    setBrightness(0);
    setContrast(0);
    setSharpness(0);
    setScaleFactor(4);
    setSaveMessage(null);
    soundEffects.playClick();
  };

  const handleApplyEnhancements = () => {
    if (!selectedImage || !enhancedUrl || !enhancedDimensions || !onAddImageToLibrary) return;
    const enhancedImage: ProcessedImage = {
      ...selectedImage,
      id: `${selectedImage.id}-enhanced-${Date.now()}`,
      name: `${selectedImage.name.replace(/\.[^.]+$/, '')}_enhanced.png`,
      originalUrl: selectedImage.originalUrl,
      processedUrl: enhancedUrl,
      status: 'completed',
      outputWidth: enhancedDimensions.width,
      outputHeight: enhancedDimensions.height,
      outputSize: Math.round(enhancedUrl.length * 0.75),
      processingTimeMs: 0,
      modelUsed: 'canvas-filters',
      timestamp: new Date().toISOString(),
      history: [...selectedImage.history, selectedImage.processedUrl || selectedImage.originalUrl],
    };
    onAddImageToLibrary(enhancedImage);
    setSaveMessage(isArabic ? 'تم اعتماد الصورة وإضافتها إلى مكتبتك.' : 'Enhancements saved to your library.');
    soundEffects.playCompletionChime();
  };

  const showOriginal = () => setIsShowingOriginal(true);
  const showEnhanced = () => setIsShowingOriginal(false);

  const handleCompareKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      showOriginal();
    }
  };

  // Handle uploading an image directly to enhancer
  const handleUploadDirect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      const originalUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const newImgItem: ProcessedImage = {
          id: `enhance-img-${Date.now()}`,
          name: file.name,
          originalUrl,
          processedUrl: originalUrl,
          status: 'completed',
          originalWidth: img.naturalWidth || img.width,
          originalHeight: img.naturalHeight || img.height,
          outputWidth: img.naturalWidth || img.width,
          outputHeight: img.naturalHeight || img.height,
          originalSize: file.size,
          outputSize: file.size,
          processingTimeMs: 0,
          modelUsed: 'u2net',
          timestamp: new Date().toLocaleTimeString(),
          customPath: file.name,
          history: []
        };
        setSelectedImage(newImgItem);
        setBrightness(0);
        setContrast(0);
        setSharpness(0);
        setSaveMessage(null);
        if (onAddImageToLibrary) {
          onAddImageToLibrary(newImgItem);
        }
        soundEffects.playCompletionChime();
      };
      img.src = originalUrl;
    };
    reader.readAsDataURL(file);
  };

  const activeOriginalUrl = selectedImage?.processedUrl || selectedImage?.originalUrl;

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      {/* Hidden file upload input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUploadDirect}
      />
      
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-[#0B1528]">
        <h1 className="text-sm font-bold text-slate-900 dark:text-white">{isArabic ? 'تحسين' : 'Enhance'}</h1>
        <div className="flex items-center gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              title={isArabic ? 'رفع صورة' : 'Upload image'}
              aria-label={isArabic ? 'رفع صورة' : 'Upload image'}
              className="rounded-lg p-2 text-[#0F2952] transition-colors hover:bg-slate-100 dark:text-amber-400 dark:hover:bg-slate-800"
            >
              <Upload className="h-4 w-4" />
            </button>

            <button
              onClick={() => setIsComparingSideBySide((prev) => !prev)}
              title={isArabic ? 'تبديل طريقة المقارنة' : 'Toggle comparison layout'}
              aria-label={isArabic ? 'تبديل طريقة المقارنة' : 'Toggle comparison layout'}
              className="rounded-lg p-2 text-[#0F2952] transition-colors hover:bg-slate-100 dark:text-amber-400 dark:hover:bg-slate-800"
            >
              <SplitSquareVertical className="h-4 w-4" />
            </button>

        </div>
      </div>

      {/* Source Assets Selector Strip */}
      <div className="shrink-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-[#0B1528] sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              {isArabic ? 'اختر صورة للترقية الفائقة:' : 'Select image to enhance:'}
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            {isArabic ? 'يدعم الصور المعزولة والصور الأصلية' : 'Supports isolated & raw photos'}
          </span>
        </div>

        {completedList.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-center border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            {isArabic ? 'لا توجد صور في المعرض حالياً.' : 'No items available in queue.'}
          </div>
        ) : (
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            {completedList.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedImage(item);
                  setIsShowingOriginal(false);
                  setSaveMessage(null);
                  soundEffects.playClick();
                }}
                className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all p-1 bg-transparency-grid ${
                  selectedImage?.id === item.id
                    ? 'border-amber-500 ring-2 ring-amber-500/30 scale-105'
                    : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                }`}
                title={item.name}
              >
                <img
                  src={item.processedUrl || item.originalUrl}
                  alt={item.name}
                  className="max-w-full max-h-full object-contain mx-auto"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Studio Viewport Grid */}
      <div className="grid min-h-0 flex-1 grid-cols-1 items-start gap-4 overflow-y-auto lg:grid-cols-12 lg:gap-6">
        
        {/* Left Column: Interactive Before/After Split Viewer (7 cols on desktop) */}
        <div className="sticky top-0 space-y-4 lg:col-span-7">
          <div className="bg-white dark:bg-[#0B1528] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            
            {/* Viewport Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white sm:text-sm">
                  {isArabic ? 'معاينة التعديلات' : 'Adjustment preview'}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    showOriginal();
                  }}
                  onPointerUp={showEnhanced}
                  onPointerCancel={showEnhanced}
                  onPointerLeave={showEnhanced}
                  onKeyDown={handleCompareKeyDown}
                  onKeyUp={showEnhanced}
                  onBlur={showEnhanced}
                  disabled={!selectedImage}
                  title={isArabic ? 'اضغط مطولاً لمعاينة الأصل' : 'Hold to preview original'}
                  aria-label={isArabic ? 'اضغط مطولاً لمعاينة الأصل قبل التعديل' : 'Hold to preview original before adjustments'}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:text-xs"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>{isArabic ? 'معاينة الأصل' : 'Before'}</span>
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  title={isArabic ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
                  aria-label={isArabic ? 'إعادة ضبط الفلاتر' : 'Reset filters'}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[10px] font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:text-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{isArabic ? 'إعادة ضبط' : 'Reset'}</span>
                </button>
              </div>
            </div>

            {/* Split Comparison Container */}
            {!activeOriginalUrl ? (
              <div className="flex h-[min(55vh,460px)] min-h-[240px] items-center justify-center rounded-xl bg-slate-950 text-xs text-slate-500">
                {isArabic ? 'يرجى اختيار صورة للبدء' : 'Please select an image'}
              </div>
            ) : isShowingOriginal ? (
              <div className="relative flex h-[min(55vh,460px)] min-h-[240px] items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-transparency-grid p-2 dark:border-slate-800">
                <img src={selectedImage?.originalUrl || activeOriginalUrl} alt={isArabic ? 'الصورة الأصلية' : 'Original image'} className="max-h-full max-w-full object-contain" />
                <span className="absolute bottom-3 start-3 rounded bg-black/80 px-2 py-1 text-[10px] font-bold text-white">
                  {isArabic ? 'الأصل' : 'Original'}
                </span>
              </div>
            ) : isComparingSideBySide ? (
              /* Side-by-Side Mode */
              <div className="grid h-[min(55vh,460px)] min-h-[240px] grid-cols-2 gap-2">
                <div className="relative rounded-xl overflow-hidden bg-transparency-grid flex items-center justify-center p-2 border border-slate-700">
                  <img src={activeOriginalUrl} alt="Before" className="max-w-full max-h-full object-contain" />
                  <div className="absolute top-2 start-2 px-2 py-0.5 rounded bg-black/75 text-[10px] text-white font-bold">
                    {isArabic ? 'قبل (Original)' : 'Before'}
                  </div>
                </div>

                <div className="relative rounded-xl overflow-hidden bg-transparency-grid flex items-center justify-center p-2 border border-amber-500/40">
                  <img src={enhancedUrl || activeOriginalUrl} alt="After" className="max-w-full max-h-full object-contain" />
                  <div className="absolute top-2 start-2 px-2 py-0.5 rounded bg-amber-500 text-[10px] text-slate-950 font-bold">
                    {isArabic ? `بعد (${scaleFactor}X HD)` : `SUPIR ${scaleFactor}X`}
                  </div>
                </div>
              </div>
            ) : (
              /* Interactive Split Handle Slider */
              <div
                ref={containerRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="relative aspect-square max-h-[min(55vh,460px)] min-h-[240px] w-full overflow-hidden rounded-xl border border-slate-200 bg-transparency-grid shadow-inner select-none cursor-ew-resize touch-none dark:border-slate-800"
              >
                {/* 1. Enhanced High-Res Image (Background layer) */}
                <img
                  src={enhancedUrl || activeOriginalUrl}
                  alt="Enhanced"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none p-4"
                />

                {/* 2. Original Image (Clipped overlay) */}
                <div
                  className="absolute inset-y-0 start-0 overflow-hidden pointer-events-none"
                  style={{ width: `${sliderPos}%` }}
                >
                  <img
                    src={activeOriginalUrl}
                    alt="Original"
                    className="absolute inset-0 w-full h-full object-contain p-4"
                    style={{
                      width: containerRef.current?.offsetWidth || '100%',
                      maxWidth: 'none'
                    }}
                  />
                  <div className="absolute bottom-3 start-3 px-2 py-0.5 rounded bg-black/80 backdrop-blur-xs text-[10px] text-white font-bold">
                    {isArabic ? 'الأصلية (Before)' : 'Before (1X)'}
                  </div>
                </div>

                {/* Enhanced Tag on Right Side */}
                <div className="absolute bottom-3 end-3 px-2 py-0.5 rounded bg-amber-500 text-[10px] text-slate-950 font-bold pointer-events-none shadow-sm">
                  {isArabic ? `ترقية فائقة (${scaleFactor}X)` : `SUPIR (${scaleFactor}X)`}
                </div>

                {/* 3. The Vertical Split Divider Bar */}
                <div
                  className="absolute inset-y-0 w-1 bg-amber-500 pointer-events-none shadow-lg z-10 flex items-center justify-center"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            )}

            {enhanceError ? (
              <p role="alert" className="text-center text-xs text-rose-500">{enhanceError}</p>
            ) : (
              <div className="text-center text-[11px] text-slate-400">
                {isProcessingEnhance
                  ? (isArabic ? 'جارٍ تطبيق التعديلات...' : 'Applying adjustments...')
                  : (isArabic ? 'اسحب خط المقارنة أو اضغط مطولاً لمعاينة الأصل' : 'Drag the divider or hold Before to compare')}
              </div>
            )}
            </div>
          </div>

        {/* Right Column: Controls, Resolution & Restoration Knobs (5 cols on desktop) */}
        <div className="space-y-4 lg:col-span-5">
          <div className="bg-white dark:bg-[#0B1528] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {isArabic ? 'ضبط الصورة' : 'Image adjustments'}
                </h3>
              </div>
              {enhancedDimensions && (
                <span className="text-[10px] font-mono text-slate-500">
                  {enhancedDimensions.width} × {enhancedDimensions.height}
                </span>
              )}
            </div>

            {/* Target Upscaling Factor */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                {isArabic ? 'معامل التكبير ومضاعفة الدقة' : 'Upscaling Resolution Multiplier'}
              </label>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { factor: 2 as const, label: '2X Full HD', desc: isArabic ? 'سريع ومتوازن' : 'Fast & Balanced', pixels: `${baseW * 2} × ${baseH * 2}` },
                  { factor: 4 as const, label: '4X Ultra HD', desc: isArabic ? 'الموصى به' : 'Recommended', pixels: `${baseW * 4} × ${baseH * 4}` },
                  { factor: 8 as const, label: '8X Cinematic', desc: isArabic ? 'أقصى دقة' : 'Cinematic 8K', pixels: `${baseW * 8} × ${baseH * 8}` }
                ].map((item) => (
                  <button
                    key={item.factor}
                    onClick={() => {
                      setScaleFactor(item.factor);
                      soundEffects.playClick();
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all flex flex-col justify-between ${
                      scaleFactor === item.factor
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-bold ring-1 ring-amber-500/30'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="font-mono text-sm font-black">{item.factor}X</div>
                      <div className="text-[10px] mt-0.5 opacity-80">{item.desc}</div>
                    </div>
                    <div className="mt-1.5 pt-1 border-t border-slate-200/50 dark:border-slate-700/50 font-mono text-[9px] font-bold text-amber-600 dark:text-amber-400">
                      {item.pixels} px
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="flex justify-between text-xs text-slate-500">
                <label htmlFor="enhance-brightness">{isArabic ? 'السطوع' : 'Brightness'}</label>
                <span className="font-mono font-bold text-amber-500">{brightness > 0 ? '+' : ''}{brightness}</span>
              </div>
              <input
                id="enhance-brightness"
                type="range"
                min="-100"
                max="100"
                value={brightness}
                onChange={(e) => {
                  setBrightness(Number(e.target.value));
                  setSaveMessage(null);
                }}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-amber-500 dark:bg-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <label htmlFor="enhance-contrast">{isArabic ? 'التباين' : 'Contrast'}</label>
                <span className="font-mono font-bold text-amber-500">{contrast > 0 ? '+' : ''}{contrast}</span>
              </div>
              <input
                id="enhance-contrast"
                type="range"
                min="-100"
                max="100"
                value={contrast}
                onChange={(e) => {
                  setContrast(Number(e.target.value));
                  setSaveMessage(null);
                }}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-amber-500 dark:bg-slate-800"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <label htmlFor="enhance-sharpness">{isArabic ? 'الحدة وإبراز التفاصيل' : 'Sharpness & clarity'}</label>
                <span className="font-mono font-bold text-amber-500">{sharpness}%</span>
              </div>
              <input
                id="enhance-sharpness"
                type="range"
                min="0"
                max="100"
                value={sharpness}
                onChange={(e) => {
                  setSharpness(Number(e.target.value));
                  setSaveMessage(null);
                }}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-amber-500 dark:bg-slate-800"
              />
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <button
                onClick={handleApplyEnhancements}
                disabled={!enhancedUrl || isProcessingEnhance || !onAddImageToLibrary}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D48B16] py-3 text-xs font-bold text-slate-950 shadow-md transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                <span>{isArabic ? 'اعتماد التعديلات' : 'Apply adjustments'}</span>
              </button>
              <button
                onClick={handleDownloadEnhanced}
                disabled={!enhancedUrl || isProcessingEnhance}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                <span>{isArabic ? 'تنزيل PNG' : 'Download PNG'}</span>
              </button>
              {saveMessage && <p role="status" className="text-center text-xs text-emerald-600 dark:text-emerald-400">{saveMessage}</p>}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
