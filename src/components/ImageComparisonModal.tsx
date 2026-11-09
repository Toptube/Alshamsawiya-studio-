import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Download, RotateCcw, ZoomIn, ZoomOut, Maximize2, 
  Check, Sparkles, Sliders, SplitSquareVertical
} from 'lucide-react';
import { ProcessedImage } from '../types';

interface ImageComparisonModalProps {
  image: ProcessedImage | null;
  onClose: () => void;
  onRestoreOriginal: (id: string) => void;
  onDownload: (image: ProcessedImage) => void;
  isArabic: boolean;
}

export const ImageComparisonModal: React.FC<ImageComparisonModalProps> = ({
  image,
  onClose,
  onRestoreOriginal,
  onDownload,
  isArabic
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50); // percentage 0-100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'split' | 'side-by-side' | 'only-processed'>('split');
  const containerRef = useRef<HTMLDivElement>(null);

  if (!image) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updateSlider(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateSlider(e.clientX);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const updateSlider = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  };

  const reductionPct = image.originalSize && image.outputSize
    ? Math.round(((image.originalSize - image.outputSize) / image.originalSize) * 100)
    : 0;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md transition-opacity"
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div 
        className="relative w-full max-w-5xl bg-white dark:bg-[#0B1528] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-[#091120]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <SplitSquareVertical className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                {image.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                <span>{image.originalWidth}x{image.originalHeight}</span>
                <span>·</span>
                <span>{image.modelUsed || (isArabic ? 'العزل الذكي' : 'Smart AI')}</span>
                <span>·</span>
                <span>{image.processingTimeMs ? `${image.processingTimeMs}ms` : ''}</span>
              </div>
            </div>
          </div>

          {/* Top toolbar buttons */}
          <div className="flex items-center gap-2">
            {/* View mode buttons */}
            <div className="hidden sm:flex items-center p-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs">
              <button
                onClick={() => setViewMode('split')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  viewMode === 'split' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {isArabic ? 'انقسام قبل/بعد' : 'Split Slider'}
              </button>
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  viewMode === 'side-by-side' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {isArabic ? 'جنباً إلى جنب' : 'Side-by-Side'}
              </button>
              <button
                onClick={() => setViewMode('only-processed')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  viewMode === 'only-processed' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {isArabic ? 'النتيجة فقط' : 'Processed Only'}
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 border-s border-slate-200 dark:border-slate-800 ps-2">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-slate-500 w-10 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Canvas area */}
        <div className="relative flex-1 bg-slate-900 min-h-[350px] sm:min-h-[480px] overflow-hidden flex items-center justify-center p-4 select-none">
          {viewMode === 'split' && (
            <div 
              ref={containerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              className="relative max-w-full max-h-[60vh] aspect-auto cursor-ew-resize overflow-hidden rounded-xl shadow-lg ring-1 ring-slate-700/50"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.15s ease-out'
              }}
            >
              {/* Processed Image (Background layer with transparent checkerboard) */}
              <div className="relative bg-transparency-grid">
                <img
                  src={image.processedUrl || image.originalUrl}
                  alt="Processed Output"
                  className="max-h-[58vh] max-w-full object-contain pointer-events-none block"
                />
              </div>

              {/* Original Image (Clipped overlay on top) */}
              <div 
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{
                  clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`
                }}
              >
                <img
                  src={image.originalUrl}
                  alt="Original"
                  className="max-h-[58vh] max-w-full object-contain pointer-events-none block"
                />
              </div>

              {/* Divider Line & Handle */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-400 pointer-events-none z-20 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg border-2 border-white text-[10px] font-bold">
                  ⇄
                </div>
              </div>

              {/* Floating Labels */}
              <div className="absolute bottom-3 start-3 px-2 py-1 rounded bg-black/60 backdrop-blur-xs text-[11px] font-medium text-white pointer-events-none">
                {isArabic ? 'الأصلية قبل العزل' : 'Original'}
              </div>
              <div className="absolute bottom-3 end-3 px-2 py-1 rounded bg-black/60 backdrop-blur-xs text-[11px] font-medium text-amber-300 pointer-events-none">
                {isArabic ? 'النتيجة بعد العزل' : 'Processed'}
              </div>
            </div>
          )}

          {viewMode === 'side-by-side' && (
            <div 
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-full max-h-[60vh] overflow-auto"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
            >
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">
                  {isArabic ? 'الأصلية' : 'Original'}
                </span>
                <div className="rounded-xl overflow-hidden ring-1 ring-slate-700 bg-slate-950 max-h-[50vh]">
                  <img src={image.originalUrl} alt="Original" className="max-h-[50vh] object-contain" />
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-amber-400">
                  {isArabic ? 'بدون خلفية' : 'No Background'}
                </span>
                <div className="rounded-xl overflow-hidden ring-1 ring-slate-700 bg-transparency-grid max-h-[50vh]">
                  <img src={image.processedUrl || image.originalUrl} alt="Processed" className="max-h-[50vh] object-contain" />
                </div>
              </div>
            </div>
          )}

          {viewMode === 'only-processed' && (
            <div 
              className="rounded-xl overflow-hidden ring-1 ring-slate-700 bg-transparency-grid max-h-[60vh]"
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
            >
              <img src={image.processedUrl || image.originalUrl} alt="Processed" className="max-h-[60vh] object-contain" />
            </div>
          )}
        </div>

        {/* Bottom Actions and Technical Specifications Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#091120]">
          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            <div>
              <span className="text-slate-400 dark:text-slate-500">{isArabic ? 'الحجم الأصلي: ' : 'Original: '}</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {(image.originalSize / 1024).toFixed(1)} KB
              </span>
            </div>
            <span>·</span>
            <div>
              <span className="text-slate-400 dark:text-slate-500">{isArabic ? 'حجم النتيجة: ' : 'Processed: '}</span>
              <span className="font-mono font-medium text-amber-600 dark:text-amber-400">
                {image.outputSize ? `${(image.outputSize / 1024).toFixed(1)} KB` : '-'}
              </span>
            </div>
            {reductionPct !== 0 && (
              <>
                <span>·</span>
                <span className="text-emerald-500 font-bold">
                  {reductionPct > 0 ? `-${reductionPct}%` : `+${Math.abs(reductionPct)}%`}
                </span>
              </>
            )}
            <span>·</span>
            <div>
              <span className="text-slate-400 dark:text-slate-500">{isArabic ? 'المسار: ' : 'Path: '}</span>
              <span className="font-mono text-[11px] truncate max-w-[150px] inline-block align-bottom">
                {image.customPath || image.name}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRestoreOriginal(image.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isArabic ? 'تراجع واستعادة الأصلية' : 'Revert to Original'}</span>
            </button>

            <button
              onClick={() => onDownload(image)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isArabic ? 'تحميل الصورة الناتجة (PNG)' : 'Download PNG'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
