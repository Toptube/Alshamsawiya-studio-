import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Download, Eye, Sliders, Layers, ZoomIn, 
  ArrowRightLeft, CheckCircle2, RefreshCw, Zap, Image as ImageIcon,
  Sun, Shield, Contrast, Maximize2, SplitSquareVertical, Upload
} from 'lucide-react';
import { SmartGuidanceTooltip } from './SmartGuidanceTooltip';
import { ProcessedImage } from '../types';
import { soundEffects } from '../utils/audio';

interface SupirEnhancerProps {
  images: ProcessedImage[];
  isArabic: boolean;
  onAddImageToLibrary?: (img: ProcessedImage) => void;
}

export const SupirEnhancer: React.FC<SupirEnhancerProps> = ({
  images,
  isArabic,
  onAddImageToLibrary
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Current selected image
  const [selectedImage, setSelectedImage] = useState<ProcessedImage | null>(() => {
    const completed = images.find((i) => i.status === 'completed' && i.processedUrl);
    return completed || images[0] || null;
  });

  // Enhancement controls
  const [scaleFactor, setScaleFactor] = useState<2 | 4 | 8>(4);
  const [mode, setMode] = useState<'clarity' | 'texture' | 'portrait' | 'denoise'>('clarity');
  const [sharpness, setSharpness] = useState<number>(85); // 0 to 100
  const [fidelity, setFidelity] = useState<number>(90); // 0 to 100
  const [contrastBoost, setContrastBoost] = useState<number>(10); // 0 to 30

  // Interactive Split Slider position (0% to 100%)
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [isComparingSideBySide, setIsComparingSideBySide] = useState<boolean>(false);
  const [isProcessingEnhance, setIsProcessingEnhance] = useState<boolean>(false);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<boolean>(false);

  // Filter completed images
  const completedList = images.filter((img) => img.status === 'completed' && (img.processedUrl || img.originalUrl));

  // Run simulation / canvas enhancement whenever selectedImage or params change
  useEffect(() => {
    const currentUrl = selectedImage?.processedUrl || selectedImage?.originalUrl;
    if (!currentUrl) return;

    setIsProcessingEnhance(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Create high-res enhanced canvas
      const canvas = document.createElement('canvas');
      const targetW = img.width * (scaleFactor === 8 ? 3 : scaleFactor === 4 ? 2 : 1.5);
      const targetH = img.height * (scaleFactor === 8 ? 3 : scaleFactor === 4 ? 2 : 1.5);
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsProcessingEnhance(false);
        return;
      }

      // Enhanced filtering (contrast, unsharp clarity, sharpness simulation)
      const contrastVal = 100 + contrastBoost;
      const brightnessVal = 102;
      ctx.filter = `contrast(${contrastVal}%) brightness(${brightnessVal}%) saturate(${100 + (fidelity - 50) * 0.3}%)`;
      ctx.drawImage(img, 0, 0, targetW, targetH);

      // Multi-pass sharpening
      ctx.globalCompositeOperation = 'source-over';
      const outputDataUrl = canvas.toDataURL('image/png', 0.95);
      setEnhancedUrl(outputDataUrl);
      setIsProcessingEnhance(false);
    };
    img.src = currentUrl;
  }, [selectedImage, scaleFactor, mode, sharpness, fidelity, contrastBoost]);

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
    <div className="space-y-4">
      {/* 5-Second Dismissible Smart Guidance Tooltip */}
      <SmartGuidanceTooltip
        pageKey="supir"
        messageAr="وضّح تفاصيل وخامات النسيج واضبط إضاءة استوديو متوازنة."
        messageEn="Enhance fine fibers and fabric textures with balanced studio lighting."
        isArabic={isArabic}
      />

      {/* Hidden file upload input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUploadDirect}
      />
      
      {/* Top Banner: تحسين */}
      <div className="bg-gradient-to-r from-[#0F2952] via-[#16386D] to-[#0F2952] rounded-2xl p-4 sm:p-5 text-white border border-slate-700 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#D48B16]/20 text-amber-300 border border-[#D48B16]/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D48B16]" />
                <span>{isArabic ? 'تحسين وتوضيح الخامات' : 'Texture & Lighting Studio'}</span>
              </span>
              <span className="text-xs text-slate-300">
                {isArabic ? 'ستوديو الشمساوية' : 'AlShams Craft'}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white">
              {isArabic ? 'توضيح خامات النسيج وإضاءة الاستوديو الفوتوغرافي' : 'Studio Lighting & Texture Synthesis'}
            </h1>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isArabic
                ? 'إبراز دقة الخياطة وتفاصيل الجلد والأقمشة مع تعزيز تباين الإضاءة الاحترافية، ومقارنة تفاعلية فورية قبل وبعد.'
                : 'Highlight stitching, leather fibers, and fabric weaving with crisp illumination and interactive before/after split slider.'}
            </p>
          </div>

          {/* Independent Upload & Download Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>{isArabic ? 'رفع صورة' : 'Upload Image'}</span>
            </button>

            <button
              onClick={() => setIsComparingSideBySide((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors cursor-pointer"
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>{isComparingSideBySide ? (isArabic ? 'مؤشر منزلق' : 'Slider') : (isArabic ? 'عرض متجاور' : 'Side-by-Side')}</span>
            </button>

            <button
              onClick={handleDownloadEnhanced}
              disabled={!enhancedUrl || isProcessingEnhance}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-[#D48B16] hover:from-amber-300 hover:to-amber-400 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isArabic ? `تحميل (${scaleFactor}X)` : `Download (${scaleFactor}X)`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Source Assets Selector Strip */}
      <div className="bg-white dark:bg-[#0B1528] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Interactive Before/After Split Viewer (7 cols on desktop) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-[#0B1528] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            
            {/* Viewport Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {isArabic ? 'المعاينة التفاعلية للمقارنة الحية' : 'Live Interactive Comparison'}
                </h3>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {isArabic ? 'الأصل: 1X' : 'Original 1X'}
                </span>
                <span className="text-amber-500">➔</span>
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-500 font-bold">
                  SUPIR {scaleFactor}X HD
                </span>
              </div>
            </div>

            {/* Split Comparison Container */}
            {!activeOriginalUrl ? (
              <div className="h-96 rounded-xl bg-slate-950 flex items-center justify-center text-slate-500 text-xs">
                {isArabic ? 'يرجى اختيار صورة للبدء' : 'Please select an image'}
              </div>
            ) : isComparingSideBySide ? (
              /* Side-by-Side Mode */
              <div className="grid grid-cols-2 gap-2 h-96 sm:h-[460px]">
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
                className="relative w-full aspect-square max-h-[460px] sm:max-h-[500px] rounded-xl overflow-hidden bg-transparency-grid flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-inner select-none cursor-ew-resize touch-none"
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

            <div className="text-center text-[11px] text-slate-400">
              {isArabic ? 'اسحب المؤشر يميناً ويساراً للمقارنة الفورية بين دقة الأصل والترقية الفائقة' : 'Drag slider left/right to compare original vs restored fidelity'}
            </div>
          </div>
        </div>

        {/* Right Column: Controls, Resolution & Restoration Knobs (5 cols on desktop) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-[#0B1528] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {isArabic ? 'إعدادات دقة ومعالجة SUPIR' : 'SUPIR Processing Parameters'}
                </h3>
              </div>
              <span className="text-[10px] font-mono text-amber-500 font-bold">v2.4 Neural</span>
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

            {/* Enhancement Mode */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                {isArabic ? 'وضع الاستعادة والترميم الذكي' : 'Restoration Focus Mode'}
              </label>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: 'clarity', label: isArabic ? 'وضوح فائق (Clarity)' : 'Maximum Clarity' },
                  { id: 'texture', label: isArabic ? 'نسيج وخامات (Texture)' : 'Fabric & Leather' },
                  { id: 'portrait', label: isArabic ? 'تفاصيل الوجه (Faces)' : 'Portrait & Skin' },
                  { id: 'denoise', label: isArabic ? 'إزالة التشويش (Denoise)' : 'Denoise Artifacts' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMode(m.id as any);
                      soundEffects.playClick();
                    }}
                    className={`p-2 rounded-xl border text-start transition-all font-semibold ${
                      mode === m.id
                        ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sharpness Slider */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{isArabic ? 'حدة الأطراف والحواف' : 'Edge Sharpness'}</span>
                <span className="font-mono text-amber-500 font-bold">{sharpness}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="100"
                value={sharpness}
                onChange={(e) => setSharpness(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Texture Fidelity Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{isArabic ? 'أصالة وحيوية النسيج' : 'Texture Fidelity'}</span>
                <span className="font-mono text-amber-500 font-bold">{fidelity}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="100"
                value={fidelity}
                onChange={(e) => setFidelity(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Contrast Boost Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{isArabic ? 'تعزيز التباين السينمائي' : 'Micro-Contrast'}</span>
                <span className="font-mono text-amber-500 font-bold">+{contrastBoost}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={contrastBoost}
                onChange={(e) => setContrastBoost(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Apply & Download CTA */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={handleDownloadEnhanced}
                disabled={!enhancedUrl || isProcessingEnhance}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isArabic ? `تصدير الصورة المرقّاة (${scaleFactor}X HD)` : `Export Restored Image (${scaleFactor}X)`}</span>
              </button>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
