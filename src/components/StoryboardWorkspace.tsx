import React, { useState, useRef } from 'react';
import { 
  Film, Sparkles, Download, Layers, Eye, RefreshCw,
  Plus, Check, Sliders, LayoutGrid, Network, Move,
  Maximize2, Tag, Ruler, ArrowRight, Share2, ZoomIn, 
  ChevronRight, Camera, Palette, Upload
} from 'lucide-react';
import { SmartGuidanceTooltip } from './SmartGuidanceTooltip';
import { ProcessedImage } from '../types';
import { soundEffects } from '../utils/audio';

export interface StoryboardFrame {
  id: string;
  type: 'hero' | 'macro' | 'technical' | 'lifestyle';
  title: string;
  titleEn: string;
  aspectRatioLabel: string;
  aspectRatioClass: string;
  aspectRatioNum: number; // width / height
  description: string;
  imageUrl: string | null;
  zoom: number; // 50 to 250%
  panX: number;
  panY: number;
  backdrop: 'navy' | 'gold' | 'marble' | 'clean' | 'transparent';
  caption: string;
  tag: string;
  // Interactive Dimensions
  dimHeight?: number;
  dimWidth?: number;
  dimDepth?: number;
  dimUnit?: 'cm' | 'mm' | 'in';
  macroCallout?: string;
}

interface StoryboardWorkspaceProps {
  images: ProcessedImage[];
  isArabic: boolean;
  onAddImageToLibrary?: (img: ProcessedImage) => void;
}

const DEFAULT_FRAMES: StoryboardFrame[] = [
  {
    id: 'frame-1',
    type: 'hero',
    title: 'الكادر 1: لقطة رئيسية',
    titleEn: 'Frame 1: Hero Angle',
    aspectRatioLabel: '1:1 مربع',
    aspectRatioClass: 'aspect-square',
    aspectRatioNum: 1,
    description: 'الزاوية الإعلانية البصرية الرئيسية للمنتج مع تركيز كلي على الهوية',
    imageUrl: null,
    zoom: 100,
    panX: 0,
    panY: 0,
    backdrop: 'navy',
    caption: 'المنتج الأصلي - لقطة استعراضية بزاوية أمامية كاملة',
    tag: 'Hero View'
  },
  {
    id: 'frame-2',
    type: 'macro',
    title: 'الكادر 2: تفاصيل الخامة والنسيج',
    titleEn: 'Frame 2: Macro Details',
    aspectRatioLabel: '1:1 ماكرو',
    aspectRatioClass: 'aspect-square',
    aspectRatioNum: 1,
    description: 'لقطة مقربة بدقة فائقة لإبراز جودة الصنع والخامات والخياطة اليدوية',
    imageUrl: null,
    zoom: 180,
    panX: 15,
    panY: -10,
    backdrop: 'gold',
    caption: 'تفاصيل النسيج والخامات الطبيعية وتشطيبات الشمس كرافت',
    tag: 'Macro 200%',
    macroCallout: 'دقة الحياكة واللمسات الذهبية'
  },
  {
    id: 'frame-3',
    type: 'technical',
    title: 'الكادر 3: الأبعاد والمقاسات',
    titleEn: 'Frame 3: Technical Specs',
    aspectRatioLabel: '4:5 تقني',
    aspectRatioClass: 'aspect-[4/5]',
    aspectRatioNum: 4 / 5,
    description: 'عرض المخطط الهندسي وأبعاد الارتفاع والعرض والعمق بالملم',
    imageUrl: null,
    zoom: 90,
    panX: 0,
    panY: 15,
    backdrop: 'marble',
    caption: 'المواصفات القياسية والارتفاع والحجم الفعلي للاستخدام اليومي',
    tag: 'Dimensions',
    dimHeight: 24,
    dimWidth: 18,
    dimDepth: 9,
    dimUnit: 'cm'
  },
  {
    id: 'frame-4',
    type: 'lifestyle',
    title: 'الكادر 4: بيئة الاستخدام الحقيقية',
    titleEn: 'Frame 4: Lifestyle Mockup',
    aspectRatioLabel: '16:9 سينمائي',
    aspectRatioClass: 'aspect-video',
    aspectRatioNum: 16 / 9,
    description: 'وضع المنتج في بيئة حياتية حقيقية واقعية مع إضاءة محيطية دافئة',
    imageUrl: null,
    zoom: 95,
    panX: 0,
    panY: 0,
    backdrop: 'clean',
    caption: 'التجربة العملية للمنتج في الحياة الواقعية والمظهر النهائي',
    tag: 'Lifestyle'
  }
];

export const StoryboardWorkspace: React.FC<StoryboardWorkspaceProps> = ({
  images,
  isArabic,
  onAddImageToLibrary
}) => {
  const [frames, setFrames] = useState<StoryboardFrame[]>(() => {
    // Populate frames initially with the first available processed images if present
    const completed = images.filter((img) => img.status === 'completed' && img.processedUrl);
    const primaryUrl = completed[0]?.processedUrl || images[0]?.originalUrl || null;
    return DEFAULT_FRAMES.map((f, idx) => ({
      ...f,
      imageUrl: completed[idx]?.processedUrl || primaryUrl
    }));
  });

  const [activeFrameId, setActiveFrameId] = useState<string>('frame-1');
  const [dragOverFrameId, setDragOverFrameId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'pipeline'>('grid');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const compositeCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFrame = frames.find((f) => f.id === activeFrameId) || frames[0];
  const completedList = images.filter((img) => img.status === 'completed' && (img.processedUrl || img.originalUrl));

  // Handle direct file upload in Storyboard
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const newItem: ProcessedImage = {
          id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          originalUrl: url,
          processedUrl: url,
          status: 'completed',
          originalWidth: img.naturalWidth || img.width,
          originalHeight: img.naturalHeight || img.height,
          outputWidth: img.naturalWidth || img.width,
          outputHeight: img.naturalHeight || img.height,
          originalSize: file.size,
          outputSize: file.size,
          processingTimeMs: 0,
          modelUsed: 'u2net',
          timestamp: new Date().toISOString(),
          customPath: file.name,
          history: [],
        };
        if (onAddImageToLibrary) {
          onAddImageToLibrary(newItem);
        }
        setFrames((prev) =>
          prev.map((f) => (f.id === activeFrameId ? { ...f, imageUrl: url } : f))
        );
        soundEffects.playCompletionChime();
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Assign image to active frame
  const handleAssignImageToActiveFrame = (imageUrl: string) => {
    setFrames((prev) =>
      prev.map((f) => (f.id === activeFrameId ? { ...f, imageUrl } : f))
    );
    soundEffects.playClick();
  };

  // Apply single image to all 4 storyboard frames at once
  const handleApplyToAllFrames = (imageUrl: string) => {
    setFrames((prev) => prev.map((f) => ({ ...f, imageUrl })));
    soundEffects.playCompletionChime();
  };

  // Update active frame parameter
  const updateActiveFrame = (partial: Partial<StoryboardFrame>) => {
    setFrames((prev) =>
      prev.map((f) => (f.id === activeFrameId ? { ...f, ...partial } : f))
    );
  };

  // Export Combined Composite Storyboard Collage (2400 x 2400 UHD 2x2 Grid via Native Canvas)
  const handleExportComposite = async () => {
    setIsExporting(true);
    soundEffects.playClick();

    const canvas = compositeCanvasRef.current;
    if (!canvas) {
      setIsExporting(false);
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsExporting(false);
      return;
    }

    // Set canvas dimensions: 2400 x 2400 High-Res Master Storyboard Collage
    const canvasW = 2400;
    const canvasH = 2400;
    canvas.width = canvasW;
    canvas.height = canvasH;

    // Background: Rich Brand Navy Gradient (#070E1A -> #0B1B36 -> #0F2952)
    const bgGrad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
    bgGrad.addColorStop(0, '#070E1A');
    bgGrad.addColorStop(0.4, '#0B1B36');
    bgGrad.addColorStop(1, '#0F2952');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Decorative Header Banner
    ctx.fillStyle = 'rgba(212, 139, 22, 0.12)';
    ctx.fillRect(0, 0, canvasW, 180);
    ctx.strokeStyle = '#D48B16';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 180);
    ctx.lineTo(canvasW, 180);
    ctx.stroke();

    // Brand Title & Watermark
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 52px Cairo, sans-serif';
    ctx.fillText('ستوديو الشمساوية · قصة المنتج الإعلانية (Commercial Storyboard)', 80, 105);

    ctx.fillStyle = '#D48B16';
    ctx.font = '600 26px Cairo, sans-serif';
    ctx.fillText('AlShams Craft Studio · 4-Frame 2×2 Visual Narrative Collage (2400 × 2400 UHD)', canvasW - 980, 105);

    // 2x2 Grid Coordinates for the 4 Frames
    // Top Row: Frame 1 (Hero) and Frame 2 (Macro)
    // Bottom Row: Frame 3 (Dimensions) and Frame 4 (Lifestyle)
    const frameRects = [
      { id: 'frame-1', x: 80, y: 230, w: 1080, h: 940, label: 'Hero Angle 1:1' },
      { id: 'frame-2', x: 1240, y: 230, w: 1080, h: 940, label: 'Macro Texture 1:1' },
      { id: 'frame-3', x: 80, y: 1230, w: 1080, h: 940, label: 'Technical Specs 4:5' },
      { id: 'frame-4', x: 1240, y: 1230, w: 1080, h: 940, label: 'Lifestyle Context 16:9' }
    ];

    // Helper to draw an image inside a frame with zoom/pan
    const drawImageInFrame = (imgEl: HTMLImageElement, rect: typeof frameRects[0], frameData: StoryboardFrame) => {
      ctx.save();
      // Clip to rounded rectangle
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 24);
      ctx.clip();

      // Draw backdrop
      if (frameData.backdrop === 'navy') {
        const grad = ctx.createRadialGradient(rect.x + rect.w / 2, rect.y + rect.h / 2, 40, rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w);
        grad.addColorStop(0, '#1B3B6F');
        grad.addColorStop(1, '#081220');
        ctx.fillStyle = grad;
      } else if (frameData.backdrop === 'gold') {
        const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
        grad.addColorStop(0, '#451A03');
        grad.addColorStop(1, '#1A0800');
        ctx.fillStyle = grad;
      } else if (frameData.backdrop === 'marble') {
        ctx.fillStyle = '#0F172A';
      } else {
        ctx.fillStyle = '#1E293B';
      }
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

      // Draw image with zoom and pan
      const scaleVal = frameData.zoom / 100;
      const aspect = imgEl.height / imgEl.width;
      let drawW = rect.w * 0.72 * scaleVal;
      let drawH = drawW * aspect;

      const drawX = rect.x + (rect.w - drawW) / 2 + frameData.panX * 3;
      const drawY = rect.y + (rect.h - drawH) / 2 + frameData.panY * 3;

      ctx.drawImage(imgEl, drawX, drawY, drawW, drawH);

      // Frame specific overlays
      if (frameData.type === 'macro') {
        ctx.strokeStyle = 'rgba(212, 139, 22, 0.85)';
        ctx.lineWidth = 4;
        ctx.strokeRect(rect.x + 40, rect.y + 40, rect.w - 80, rect.h - 80);

        if (frameData.macroCallout) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.beginPath();
          ctx.roundRect(rect.x + 50, rect.y + rect.h - 85, rect.w - 100, 50, 10);
          ctx.fill();
          ctx.fillStyle = '#D48B16';
          ctx.font = 'bold 22px Cairo, sans-serif';
          ctx.fillText(`🔍 ${frameData.macroCallout}`, rect.x + 70, rect.y + rect.h - 52);
        }
      }

      if (frameData.type === 'technical') {
        const hVal = frameData.dimHeight || 24;
        const wVal = frameData.dimWidth || 18;
        const dVal = frameData.dimDepth || 9;
        const unit = frameData.dimUnit || 'cm';

        // 1. Vertical Height Dimension Line & Arrows (Left side)
        const vLineX = rect.x + 80;
        const vTopY = rect.y + 120;
        const vBottomY = rect.y + rect.h - 120;

        ctx.strokeStyle = '#D48B16';
        ctx.lineWidth = 3;
        // Main vertical line
        ctx.beginPath();
        ctx.moveTo(vLineX, vTopY);
        ctx.lineTo(vLineX, vBottomY);
        // Top tick
        ctx.moveTo(vLineX - 15, vTopY);
        ctx.lineTo(vLineX + 15, vTopY);
        // Bottom tick
        ctx.moveTo(vLineX - 15, vBottomY);
        ctx.lineTo(vLineX + 15, vBottomY);
        ctx.stroke();

        // Top arrow head
        ctx.fillStyle = '#D48B16';
        ctx.beginPath();
        ctx.moveTo(vLineX, vTopY);
        ctx.lineTo(vLineX - 8, vTopY + 16);
        ctx.lineTo(vLineX + 8, vTopY + 16);
        ctx.closePath();
        ctx.fill();

        // Bottom arrow head
        ctx.beginPath();
        ctx.moveTo(vLineX, vBottomY);
        ctx.lineTo(vLineX - 8, vBottomY - 16);
        ctx.lineTo(vLineX + 8, vBottomY - 16);
        ctx.closePath();
        ctx.fill();

        // Height label badge
        ctx.save();
        ctx.translate(vLineX - 25, (vTopY + vBottomY) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = 'rgba(15, 41, 82, 0.9)';
        ctx.beginPath();
        ctx.roundRect(-90, -18, 180, 36, 8);
        ctx.fill();
        ctx.strokeStyle = '#D48B16';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`↕ ${hVal} ${unit}`, 0, 7);
        ctx.restore();

        // 2. Horizontal Width Dimension Line & Arrows (Bottom)
        const hLineY = rect.y + rect.h - 90;
        const hLeftX = rect.x + 140;
        const hRightX = rect.x + rect.w - 140;

        ctx.strokeStyle = '#D48B16';
        ctx.lineWidth = 3;
        // Main horizontal line
        ctx.beginPath();
        ctx.moveTo(hLeftX, hLineY);
        ctx.lineTo(hRightX, hLineY);
        // Left tick
        ctx.moveTo(hLeftX, hLineY - 15);
        ctx.lineTo(hLeftX, hLineY + 15);
        // Right tick
        ctx.moveTo(hRightX, hLineY - 15);
        ctx.lineTo(hRightX, hLineY + 15);
        ctx.stroke();

        // Left arrow head
        ctx.fillStyle = '#D48B16';
        ctx.beginPath();
        ctx.moveTo(hLeftX, hLineY);
        ctx.lineTo(hLeftX + 16, hLineY - 8);
        ctx.lineTo(hLeftX + 16, hLineY + 8);
        ctx.closePath();
        ctx.fill();

        // Right arrow head
        ctx.beginPath();
        ctx.moveTo(hRightX, hLineY);
        ctx.lineTo(hRightX - 16, hLineY - 8);
        ctx.lineTo(hRightX - 16, hLineY + 8);
        ctx.closePath();
        ctx.fill();

        // Width label badge
        ctx.fillStyle = 'rgba(15, 41, 82, 0.9)';
        ctx.beginPath();
        ctx.roundRect((hLeftX + hRightX) / 2 - 90, hLineY - 18, 180, 36, 8);
        ctx.fill();
        ctx.strokeStyle = '#D48B16';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`↔ ${wVal} ${unit}`, (hLeftX + hRightX) / 2, hLineY + 7);

        // 3. Depth Badge (Top Right Corner)
        ctx.fillStyle = 'rgba(15, 41, 82, 0.95)';
        ctx.beginPath();
        ctx.roundRect(rect.x + rect.w - 240, rect.y + 40, 200, 48, 10);
        ctx.fill();
        ctx.strokeStyle = '#D48B16';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#D48B16';
        ctx.font = 'bold 20px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`⤢ العمق: ${dVal} ${unit}`, rect.x + rect.w - 140, rect.y + 71);
        ctx.textAlign = 'start';
      }

      ctx.restore();

      // Outer gold border
      ctx.strokeStyle = '#D48B16';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 24);
      ctx.stroke();

      // Title badge
      ctx.fillStyle = '#D48B16';
      ctx.beginPath();
      ctx.roundRect(rect.x + 24, rect.y + 24, 260, 48, 12);
      ctx.fill();
      ctx.fillStyle = '#081220';
      ctx.font = 'bold 20px Cairo, sans-serif';
      ctx.fillText(frameData.tag, rect.x + 40, rect.y + 56);
    };

    // Load and render images sequentially onto canvas
    for (let i = 0; i < frameRects.length; i++) {
      const rect = frameRects[i];
      const frameData = frames[i];
      const url = frameData.imageUrl;

      if (url) {
        try {
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              drawImageInFrame(img, rect, frameData);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = url;
          });
        } catch {
          // ignore
        }
      }
    }

    // Bottom Master Footer Banner (y: 2230 - 2360)
    ctx.fillStyle = 'rgba(11, 27, 54, 0.95)';
    ctx.beginPath();
    ctx.roundRect(80, 2230, 2240, 110, 16);
    ctx.fill();
    ctx.strokeStyle = '#D48B16';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px Cairo, sans-serif';
    ctx.fillText('ستوديو الشمساوية © الشمس كرافت · AlShams Craft Studio', 120, 2295);

    ctx.fillStyle = '#D48B16';
    ctx.font = '600 20px Cairo, sans-serif';
    ctx.fillText('2×2 Multi-Panel Assembly · Commercial HD Master Composite (2400 × 2400)', canvasW - 840, 2295);

    // Download compiled 2400x2400 image
    const dataUrl = canvas.toDataURL('image/png', 0.95);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `ستوديو_الشمساوية_كولاج_المشاهد_2400x2400_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setIsExporting(false);
    soundEffects.playCompletionChime();
  };

  // Download individual frame
  const handleDownloadSingleFrame = (frame: StoryboardFrame) => {
    if (!frame.imageUrl) return;
    const a = document.createElement('a');
    a.href = frame.imageUrl;
    a.download = `ستوديو_الشمساوية_${frame.type}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    soundEffects.playClick();
  };

  return (
    <div className="space-y-6">
      {/* 5-Second Dismissible Smart Guidance Tooltip */}
      <SmartGuidanceTooltip
        pageKey="storyboard"
        messageAr="جمّع زوايا ومقاسات منتجك في لوحة عرض موحدة بجودة تجارية."
        messageEn="Assemble product angles and dimensions into a unified commercial board."
        isArabic={isArabic}
      />

      {/* Hidden File Input for Direct Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      
      {/* Top Banner: ComfyUI Storyboard Integration */}
      <div className="bg-gradient-to-r from-[#0F2952] via-[#16386D] to-[#0B1B36] rounded-2xl p-4 sm:p-6 text-white border border-slate-700 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" />
                <span>{isArabic ? 'لوحة المشاهد ComfyUI Storyboard' : 'ComfyUI Storyboard Node Engine'}</span>
              </span>
              <span className="text-xs text-slate-300">
                {isArabic ? 'سرد بصري متكامل للمنتج في 4 كوادر' : '4-Panel Product Storyboard'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">
              {isArabic ? 'لوحة المشاهد وتنسيق الكوادر الإعلانية المتزامنة' : 'Commercial Storyboard & Multi-Panel Node Studio'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              {isArabic
                ? 'تحويل صور المنتج المعزولة إلى قصة بصرية إعلانية متكاملة: لقطة رئيسية Hero، تفاصيل الماكرو للنسيج، الأبعاد الفنية القياسية، وبيئة الاستخدام الحياتية في لوحة موحدة فائقة الجودة.'
                : 'Arrange isolated product assets into aligned narrative storyboard panels: Hero Angle, Macro Details, Technical Dimensions, and Lifestyle Context.'}
            </p>
          </div>

          {/* Action Strip: View Mode, Upload & Export */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* View Mode Switcher: Grid vs Node Workflow */}
            <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>{isArabic ? 'شبكة الكوادر' : 'Grid'}</span>
              </button>
              <button
                onClick={() => setViewMode('pipeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'pipeline'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Network className="w-3.5 h-3.5" />
                <span>{isArabic ? 'مخطط العقد (Nodes)' : 'Nodes'}</span>
              </button>
            </div>

            {/* Direct Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>{isArabic ? 'رفع صورة' : 'Upload Image'}</span>
            </button>

            {/* Export Master Collage Button */}
            <button
              onClick={handleExportComposite}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? (isArabic ? 'جاري التجميع والتصدير...' : 'Exporting...') : (isArabic ? 'تصدير لوحة الكولاج 4K' : 'Export 4K Composite')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hidden Offscreen Canvas for Composite Generation */}
      <canvas ref={compositeCanvasRef} className="hidden" />

      {/* Source Assets Selector Strip: Isolated Images Gallery */}
      <div className="bg-white dark:bg-[#0B1528] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              {isArabic ? 'أصول المنتجات المعزولة المتاحة لمشروعك:' : 'Available Isolated Product Assets:'}
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-mono font-bold">
              {completedList.length} {isArabic ? 'عنصر' : 'items'}
            </span>
          </div>

          <span className="text-[11px] text-slate-400">
            {isArabic ? 'انقر على أي صورة لتطبيقها على الكادر النشط' : 'Click image to insert into active frame'}
          </span>
        </div>

        {completedList.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-center border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            {isArabic
              ? 'لم يتم عزل صور بعد. توجه إلى تبويب "إزالة الخلفية" لمعالجة منتجاتك، أو يمكنك استخدام الصور التجريبية.'
              : 'No isolated items yet. Process photos in "Removal" tab or use samples.'}
          </div>
        ) : (
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            {completedList.map((item) => {
              const itemUrl = item.processedUrl || item.originalUrl;
              return (
                <div
                  key={item.id}
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', itemUrl);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="group relative flex-shrink-0 flex flex-col items-center gap-1.5 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 transition-all bg-slate-50 dark:bg-slate-900/60 cursor-grab active:cursor-grabbing select-none"
                  title={isArabic ? 'اسحب هذا المنتج وأفلته داخل أي كادر، أو انقر للاختيار' : 'Drag into any frame or click to assign'}
                >
                  <div 
                    onClick={() => handleAssignImageToActiveFrame(itemUrl)}
                    className="w-16 h-16 rounded-lg overflow-hidden bg-transparency-grid flex items-center justify-center p-1 group-hover:scale-105 transition-transform"
                  >
                    <img
                      src={itemUrl}
                      alt={item.name}
                      className="max-w-full max-h-full object-contain pointer-events-none"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAssignImageToActiveFrame(itemUrl)}
                      className="text-[10px] text-slate-500 hover:text-amber-500 font-semibold"
                    >
                      {isArabic ? 'اختيار' : 'Pick'}
                    </button>
                    <span className="text-[9px] text-slate-400">·</span>
                    <button
                      onClick={() => handleApplyToAllFrames(itemUrl)}
                      className="text-[10px] text-amber-500 hover:underline font-semibold"
                    >
                      {isArabic ? 'للجميع' : 'All'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Workspace Layout */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* 4 Storyboard Panels Grid (8 cols on desktop) */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {frames.map((frame) => {
              const isActive = frame.id === activeFrameId;
              const isDragOver = dragOverFrameId === frame.id;

              return (
                <div
                  key={frame.id}
                  onClick={() => {
                    setActiveFrameId(frame.id);
                    soundEffects.playClick();
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    if (dragOverFrameId !== frame.id) {
                      setDragOverFrameId(frame.id);
                    }
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    if (dragOverFrameId === frame.id) {
                      setDragOverFrameId(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverFrameId(null);
                    const droppedUrl = e.dataTransfer.getData('text/plain');
                    if (droppedUrl) {
                      setFrames((prev) =>
                        prev.map((f) => (f.id === frame.id ? { ...f, imageUrl: droppedUrl } : f))
                      );
                      setActiveFrameId(frame.id);
                      soundEffects.playCompletionChime();
                    }
                  }}
                  className={`group relative rounded-2xl border transition-all overflow-hidden cursor-pointer bg-white dark:bg-[#0B1528] shadow-xs flex flex-col ${
                    isDragOver
                      ? 'border-[#D48B16] ring-4 ring-[#D48B16]/50 bg-[#D48B16]/10 scale-[1.02] shadow-xl shadow-amber-500/20'
                      : isActive
                      ? 'border-amber-500 ring-2 ring-amber-500/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Visual Drop Overlay Highlight */}
                  {isDragOver && (
                    <div className="absolute inset-0 z-30 bg-[#0F2952]/90 backdrop-blur-xs border-2 border-dashed border-[#D48B16] rounded-2xl flex flex-col items-center justify-center gap-2 pointer-events-none animate-pulse">
                      <Sparkles className="w-9 h-9 text-[#D48B16]" />
                      <span className="text-xs font-bold text-white bg-black/80 px-3.5 py-1.5 rounded-full border border-[#D48B16]/60 shadow-lg">
                        {isArabic ? `أفلت هنا للتعيين في ${frame.title}` : `Drop into ${frame.titleEn}`}
                      </span>
                    </div>
                  )}
                  {/* Frame Header Bar */}
                  <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-[#070E1A] border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`} />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {isArabic ? frame.title : frame.titleEn}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                        {frame.aspectRatioLabel}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSingleFrame(frame);
                        }}
                        className="p-1 text-slate-400 hover:text-amber-500 rounded hover:bg-slate-200 dark:hover:bg-slate-800"
                        title={isArabic ? 'تنزيل الكادر' : 'Download Frame'}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Frame Viewport */}
                  <div className={`relative w-full ${frame.aspectRatioClass} overflow-hidden bg-slate-950 flex items-center justify-center p-3`}>
                    {/* Backdrop Gradient */}
                    {frame.backdrop === 'navy' && (
                      <div className="absolute inset-0 bg-radial from-[#1B3B6F] to-[#081220]" />
                    )}
                    {frame.backdrop === 'gold' && (
                      <div className="absolute inset-0 bg-gradient-to-b from-[#451A03] to-[#1A0800]" />
                    )}
                    {frame.backdrop === 'marble' && (
                      <div className="absolute inset-0 bg-gradient-to-tr from-[#0F172A] via-[#1E293B] to-[#0A0F1D]" />
                    )}
                    {frame.backdrop === 'clean' && (
                      <div className="absolute inset-0 bg-gradient-to-b from-[#334155] to-[#0F172A]" />
                    )}

                    {/* Image Render with Zoom and Position */}
                    {frame.imageUrl ? (
                      <div
                        className="relative w-full h-full flex items-center justify-center transition-transform"
                        style={{
                          transform: `scale(${frame.zoom / 100}) translate(${frame.panX}px, ${frame.panY}px)`
                        }}
                      >
                        <img
                          src={frame.imageUrl}
                          alt={frame.title}
                          className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-2xl"
                        />
                      </div>
                    ) : (
                      <div className="relative text-center p-4 space-y-2 text-slate-500">
                        <Camera className="w-8 h-8 mx-auto opacity-40" />
                        <span className="text-xs block">
                          {isArabic ? 'انقر لاختيار صورة لهذا الكادر' : 'Click to assign image'}
                        </span>
                      </div>
                    )}

                    {/* Macro Texture Lens Callout (Frame 2) */}
                    {frame.type === 'macro' && frame.imageUrl && (
                      <div className="absolute bottom-2.5 start-2.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-xs text-[10px] text-amber-400 font-bold border border-amber-500/30 flex items-center gap-1">
                        <ZoomIn className="w-3 h-3 text-amber-400" />
                        <span>{frame.macroCallout || 'Macro 180%'}</span>
                      </div>
                    )}

                    {/* Interactive Architectural Dimensions Overlay with Lines & Arrows */}
                    {frame.type === 'technical' && frame.imageUrl && (
                      <div className="absolute inset-0 pointer-events-none p-2 flex flex-col justify-between">
                        {/* Depth Tag (Top Right) */}
                        <div className="flex justify-end">
                          <div className="px-2 py-0.5 rounded-md bg-[#0F2952]/90 backdrop-blur-xs border border-[#D48B16]/60 text-[9px] font-mono text-amber-300 font-bold shadow-md">
                            ⤢ {isArabic ? 'العمق' : 'Depth'}: {frame.dimDepth || 9} {frame.dimUnit === 'in' ? 'in' : frame.dimUnit === 'mm' ? 'مم' : 'سم'}
                          </div>
                        </div>

                        {/* Height Dimension Line & Arrows (Start/Left) */}
                        <div className="absolute inset-y-6 start-2 flex flex-col items-center justify-between">
                          <div className="w-2.5 h-[1.5px] bg-[#D48B16]" />
                          <div className="relative flex-1 w-[1.5px] bg-[#D48B16] flex items-center justify-center">
                            <div className="absolute top-0 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-[#D48B16]" />
                            <span className="bg-[#0F2952]/95 border border-[#D48B16] text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap transform -rotate-90">
                              ↕ {frame.dimHeight || 24} {frame.dimUnit === 'in' ? 'in' : frame.dimUnit === 'mm' ? 'مم' : 'سم'}
                            </span>
                            <div className="absolute bottom-0 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[5px] border-t-[#D48B16]" />
                          </div>
                          <div className="w-2.5 h-[1.5px] bg-[#D48B16]" />
                        </div>

                        {/* Width Dimension Line & Arrows (Bottom) */}
                        <div className="mt-auto ps-6 pe-2 pb-1 flex items-center justify-between">
                          <div className="h-2.5 w-[1.5px] bg-[#D48B16]" />
                          <div className="relative flex-1 h-[1.5px] bg-[#D48B16] flex items-center justify-center mx-1">
                            <div className="absolute start-0 w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-e-[5px] border-e-[#D48B16]" />
                            <span className="bg-[#0F2952]/95 border border-[#D48B16] text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                              ↔ {frame.dimWidth || 18} {frame.dimUnit === 'in' ? 'in' : frame.dimUnit === 'mm' ? 'مم' : 'سم'}
                            </span>
                            <div className="absolute end-0 w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-s-[5px] border-s-[#D48B16]" />
                          </div>
                          <div className="h-2.5 w-[1.5px] bg-[#D48B16]" />
                        </div>
                      </div>
                    )}

                    {/* Lifestyle Badge (Frame 4) */}
                    {frame.type === 'lifestyle' && frame.imageUrl && (
                      <div className="absolute top-2.5 end-2.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 backdrop-blur-xs text-[10px] text-amber-300 font-bold border border-amber-500/30">
                        AlShams Craft Mockup
                      </div>
                    )}
                  </div>

                  {/* Frame Footer Caption */}
                  <div className="p-3 bg-white dark:bg-[#0B1528] border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-1">
                      {frame.caption}
                    </p>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      {frame.description}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Frame Inspector & Tuning Sidebar (4 cols on desktop) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white dark:bg-[#0B1528] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isArabic ? 'ضبط الكادر النشط' : 'Active Frame Inspector'}
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  {activeFrame.aspectRatioLabel}
                </span>
              </div>

              {/* Title & Tag */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isArabic ? 'وصف الكادر' : 'Frame Caption'}
                </label>
                <input
                  type="text"
                  value={activeFrame.caption}
                  onChange={(e) => updateActiveFrame({ caption: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Zoom Scale */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>{isArabic ? 'تكبير وتكثيف اللقطة (Zoom)' : 'Frame Zoom'}</span>
                  <span className="font-mono text-amber-500 font-bold">{activeFrame.zoom}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="250"
                  value={activeFrame.zoom}
                  onChange={(e) => updateActiveFrame({ zoom: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Pan Position X / Y */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500">{isArabic ? 'إزاحة أفقية (X)' : 'Pan X'}</span>
                  <input
                    type="range"
                    min="-60"
                    max="60"
                    value={activeFrame.panX}
                    onChange={(e) => updateActiveFrame({ panX: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500">{isArabic ? 'إزاحة رأسية (Y)' : 'Pan Y'}</span>
                  <input
                    type="range"
                    min="-60"
                    max="60"
                    value={activeFrame.panY}
                    onChange={(e) => updateActiveFrame({ panY: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              </div>

              {/* Frame Backdrop Style */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  {isArabic ? 'خلفية الكادر' : 'Frame Backdrop Atmosphere'}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'navy', label: isArabic ? 'كحلي' : 'Navy' },
                    { id: 'gold', label: isArabic ? 'كهرماني' : 'Amber' },
                    { id: 'marble', label: isArabic ? 'رخام' : 'Marble' },
                    { id: 'clean', label: isArabic ? 'استوديو' : 'Studio' }
                  ].map((b) => (
                    <button
                      key={b.id}
                      onClick={() => updateActiveFrame({ backdrop: b.id as any })}
                      className={`py-1.5 text-center text-xs rounded-xl border transition-all ${
                        activeFrame.backdrop === b.id
                          ? 'border-amber-500 bg-amber-500/10 text-amber-500 font-bold'
                          : 'border-slate-200 dark:border-slate-800 text-slate-500'
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific frame tuning: Dimensions (Frame 3) */}
              {activeFrame.type === 'technical' && (
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isArabic ? 'المقاسات والأبعاد الهندسية' : 'Product Dimensions'}
                    </label>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px]">
                      {(['cm', 'mm', 'in'] as const).map((unit) => (
                        <button
                          key={unit}
                          onClick={() => updateActiveFrame({ dimUnit: unit })}
                          className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                            (activeFrame.dimUnit || 'cm') === unit
                              ? 'bg-[#D48B16] text-slate-950 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                          }`}
                        >
                          {unit === 'cm' ? (isArabic ? 'سم' : 'cm') : unit === 'mm' ? (isArabic ? 'مم' : 'mm') : (isArabic ? 'بوصة' : 'in')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* الارتفاع (Height) */}
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500 block">
                        {isArabic ? 'الارتفاع' : 'Height'}
                      </span>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={activeFrame.dimHeight ?? 24}
                          onChange={(e) => updateActiveFrame({ dimHeight: Number(e.target.value) || 0 })}
                          className="w-full p-2 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-mono text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#D48B16]"
                        />
                        <span className="absolute end-1.5 top-2 text-[9px] text-slate-400 font-mono pointer-events-none">
                          {activeFrame.dimUnit || 'cm'}
                        </span>
                      </div>
                    </div>

                    {/* العرض (Width) */}
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500 block">
                        {isArabic ? 'العرض' : 'Width'}
                      </span>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={activeFrame.dimWidth ?? 18}
                          onChange={(e) => updateActiveFrame({ dimWidth: Number(e.target.value) || 0 })}
                          className="w-full p-2 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-mono text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#D48B16]"
                        />
                        <span className="absolute end-1.5 top-2 text-[9px] text-slate-400 font-mono pointer-events-none">
                          {activeFrame.dimUnit || 'cm'}
                        </span>
                      </div>
                    </div>

                    {/* العمق (Depth) */}
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500 block">
                        {isArabic ? 'العمق' : 'Depth'}
                      </span>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="999"
                          value={activeFrame.dimDepth ?? 9}
                          onChange={(e) => updateActiveFrame({ dimDepth: Number(e.target.value) || 0 })}
                          className="w-full p-2 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-mono text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#D48B16]"
                        />
                        <span className="absolute end-1.5 top-2 text-[9px] text-slate-400 font-mono pointer-events-none">
                          {activeFrame.dimUnit || 'cm'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Specific frame tuning: Macro callout (Frame 2) */}
              {activeFrame.type === 'macro' && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isArabic ? 'نص التركيز على الخامة' : 'Macro Material Callout'}
                  </label>
                  <input
                    type="text"
                    value={activeFrame.macroCallout || ''}
                    onChange={(e) => updateActiveFrame({ macroCallout: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              )}

            </div>
          </div>

        </div>
      ) : (
        /* ComfyUI Node Pipeline Flow Visualization */
        <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 text-white space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-white">
                {isArabic ? 'مخطط تدفق العقد التفاعلي (Comfy_Storyboard Node Pipeline)' : 'Node-Based Pipeline Graph'}
              </h3>
            </div>
            <span className="text-xs font-mono text-amber-400">4 Active Output Nodes</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
            {/* Node 1: Input Asset */}
            <div className="bg-[#0B1528] rounded-xl p-4 border border-amber-500/40 space-y-2">
              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Node #1: Input Subject</div>
              <div className="text-xs font-semibold text-white">عزل المنتج وتفريغ القناع</div>
              <p className="text-[10px] text-slate-400">AlShams Neural Matting Output</p>
              <div className="pt-2">
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono">Status: Connected</span>
              </div>
            </div>

            {/* Node 2: Frame Splitter */}
            <div className="bg-[#0B1528] rounded-xl p-4 border border-blue-500/40 space-y-2">
              <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Node #2: Aspect Aligner</div>
              <div className="text-xs font-semibold text-white">توزيع الكوادر والنسب 1:1, 4:5, 16:9</div>
              <p className="text-[10px] text-slate-400">Auto Panel Rescaling</p>
              <div className="pt-2">
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-mono">4 Sub-Frames</span>
              </div>
            </div>

            {/* Node 3: Macro & Technical Injector */}
            <div className="bg-[#0B1528] rounded-xl p-4 border border-purple-500/40 space-y-2">
              <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Node #3: Macro & Specs</div>
              <div className="text-xs font-semibold text-white">تكبير النسيج والأبعاد الهندسية</div>
              <p className="text-[10px] text-slate-400">Layer Overlays & Labels</p>
              <div className="pt-2">
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-mono">Render: Active</span>
              </div>
            </div>

            {/* Node 4: 4K Composite Stitcher */}
            <div className="bg-[#0B1528] rounded-xl p-4 border border-emerald-500/40 space-y-2">
              <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Node #4: Composite Stitcher</div>
              <div className="text-xs font-semibold text-white">دمج الكولاج الموحد 4K</div>
              <p className="text-[10px] text-slate-400">AlShams Craft Brand Collage</p>
              <div className="pt-2">
                <button
                  onClick={handleExportComposite}
                  className="text-[10px] bg-emerald-500 text-slate-950 font-bold px-2.5 py-1 rounded-lg hover:bg-emerald-400 transition-colors"
                >
                  {isArabic ? 'تشغيل وتصدير' : 'Run Export'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
