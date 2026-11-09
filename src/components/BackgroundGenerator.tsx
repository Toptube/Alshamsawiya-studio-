import React, { useState, useRef, useEffect } from 'react';
import { 
  Wand2, Upload, Download, Eye, Sparkles, 
  Sliders, Layers, Move, Palette, SunMedium, Compass,
  CheckCircle2, RotateCcw, ArrowRightLeft, Image as ImageIcon,
  ChevronDown, ChevronUp, Maximize2, Shield, CircleDot,
  Contrast, Sun, RefreshCw
} from 'lucide-react';
import { ProcessedImage, StudioPresetTheme, RembgSettings } from '../types';
import { processImageUnified } from '../services/api';
import { soundEffects } from '../utils/audio';

// Expanded Rich Color Tones & Gradients (16 Studio Themes + Custom)
export const EXTENDED_STUDIO_THEMES: (StudioPresetTheme & { gradientType?: 'linear' | 'radial'; colors?: string[] })[] = [
  // 1. Luxury & Royal
  {
    id: 'marble_luxury',
    name: 'رخام أسود ومدرج ذهبي',
    nameEn: 'Black Marble & Gold Podium',
    description: 'مدرج رخامي أسود فاخر مع عروق وإضاءة ذهبية',
    category: 'luxury',
    prompt: 'Product placed on a sleek black marble podium with delicate gold veins',
    previewBg: 'radial-gradient(circle at 50% 40%, #1e293b 0%, #090d16 100%)',
    ambientColor: '#D48B16',
    shadowColor: 'rgba(0, 0, 0, 0.8)',
    defaultShadowOpacity: 0.85
  },
  {
    id: 'alshams_royal',
    name: 'كحلي الشمساوية الملكي',
    nameEn: 'AlShams Royal Navy Studio',
    description: 'خلفية استوديو ناعمة بتدرجات الكحلي الفاخر وإضاءة سبوت لايت ذهبية',
    category: 'alshams',
    prompt: 'Product on deep royal navy blue with amber golden spotlight',
    previewBg: 'radial-gradient(circle at 50% 50%, #1B3B6F 0%, #081220 100%)',
    ambientColor: '#E59819',
    shadowColor: 'rgba(8, 18, 32, 0.85)',
    defaultShadowOpacity: 0.8
  },
  {
    id: 'burgundy_gold',
    name: 'مخمل عنابي وتوهج كهرماني',
    nameEn: 'Burgundy Velvet & Gold',
    description: 'تدرجات عنابية فاخرة مع هالة كهرمانية دافئة للمنتجات الراقية',
    category: 'luxury',
    prompt: 'Product on luxurious rich burgundy velvet surface with warm ambient amber glow',
    previewBg: 'radial-gradient(circle at 50% 45%, #581c2d 0%, #210810 100%)',
    ambientColor: '#F59E0B',
    shadowColor: 'rgba(33, 8, 16, 0.85)',
    defaultShadowOpacity: 0.75
  },
  {
    id: 'emerald_imperial',
    name: 'زمردي إمبراطوري ومدرج حجري',
    nameEn: 'Imperial Emerald & Gold',
    description: 'خلفية خضراء زمردية ملكية مع انعكاسات إضاءة ذهبية ناعمة',
    category: 'luxury',
    prompt: 'Product on dark imperial emerald polished stone base with gold accents',
    previewBg: 'radial-gradient(circle at 50% 45%, #064e3b 0%, #022018 100%)',
    ambientColor: '#10B981',
    shadowColor: 'rgba(2, 32, 24, 0.8)',
    defaultShadowOpacity: 0.75
  },

  // 2. Nature & Earthy
  {
    id: 'wooden_rustic',
    name: 'خشب السنديان الدافئ',
    nameEn: 'Warm Rustic Oak Wood',
    description: 'طاولة خشبية طبيعية دافئة مع خطوط خشبية وظلال أشعة شمس طبيعية',
    category: 'nature',
    prompt: 'Product on warm oak wooden tabletop with soft natural sunbeams',
    previewBg: 'linear-gradient(to bottom, #78350f, #451a03)',
    ambientColor: '#F59E0B',
    shadowColor: 'rgba(69, 26, 3, 0.75)',
    defaultShadowOpacity: 0.7
  },
  {
    id: 'nature_foliage',
    name: 'حجر الترافرتين وظلال نباتات',
    nameEn: 'Travertine Stone & Leaves',
    description: 'قاعدة حجرية طبيعية مع ظلال أوراق نخيل ونباتات استوائية ناعمة',
    category: 'nature',
    prompt: 'Product on light travertine stone with soft palm leaf botanical shadows',
    previewBg: 'linear-gradient(135deg, #134e4a, #042f2e)',
    ambientColor: '#14B8A6',
    shadowColor: 'rgba(4, 47, 46, 0.7)',
    defaultShadowOpacity: 0.65
  },
  {
    id: 'desert_dunes',
    name: 'رمال الصحراء الذهبية',
    nameEn: 'Warm Desert Dunes',
    description: 'تدرجات الرمال الذهبية الدافئة مع إضاءة شمس نقية',
    category: 'nature',
    prompt: 'Product resting on smooth golden sand dunes with warm sunset glow',
    previewBg: 'linear-gradient(to bottom, #b45309, #78350f, #451a03)',
    ambientColor: '#FBBF24',
    shadowColor: 'rgba(69, 26, 3, 0.7)',
    defaultShadowOpacity: 0.65
  },
  {
    id: 'forest_granite',
    name: 'صخور الجرانيت المنعشة',
    nameEn: 'Mountain Granite Stone',
    description: 'سطح جرانيتي رمادي نقي مع هواء جبلي منتعش',
    category: 'nature',
    prompt: 'Product on textured dark granite rock surface in alpine morning light',
    previewBg: 'linear-gradient(to bottom, #334155, #0f172a)',
    ambientColor: '#94A3B8',
    shadowColor: 'rgba(15, 23, 42, 0.75)',
    defaultShadowOpacity: 0.7
  },

  // 3. Commercial Studio
  {
    id: 'studio_clean',
    name: 'استوديو تصوير إعلاني ناصع',
    nameEn: 'Clean Commercial Studio',
    description: 'إضاءة إعلانية ناعمة وتدرج رمادي فاتح مريح وعصري',
    category: 'studio',
    prompt: 'Clean minimalist commercial product photography studio with dual softbox',
    previewBg: 'linear-gradient(to bottom, #f8fafc, #cbd5e1)',
    ambientColor: '#64748B',
    shadowColor: 'rgba(51, 65, 85, 0.45)',
    defaultShadowOpacity: 0.5
  },
  {
    id: 'slate_cinematic',
    name: 'رمادي سينمائي عصري',
    nameEn: 'Cinematic Slate Studio',
    description: 'تدرج رمادي أنثراسيت عميق ومناسب لكافة ألوان المنتجات',
    category: 'studio',
    prompt: 'Cinematic dark slate gray backdrop with directional soft light',
    previewBg: 'linear-gradient(145deg, #1e293b, #0f172a)',
    ambientColor: '#94A3B8',
    shadowColor: 'rgba(0, 0, 0, 0.65)',
    defaultShadowOpacity: 0.65
  },
  {
    id: 'cerulean_brand',
    name: 'أزرق سيرولين ناعم للعلامات',
    nameEn: 'Soft Cerulean Studio',
    description: 'تدرج أزرق نقي ومشرق يبرز تفاصيل المنتجات المضيئة والجلدية',
    category: 'studio',
    prompt: 'Soft cerulean light blue commercial cyclorama studio backdrop',
    previewBg: 'linear-gradient(to bottom, #0284c7, #075985, #0c4a6e)',
    ambientColor: '#38BDF8',
    shadowColor: 'rgba(12, 74, 110, 0.7)',
    defaultShadowOpacity: 0.6
  },
  {
    id: 'pastel_blush',
    name: 'باستيل روز للعطور والتجميل',
    nameEn: 'Pastel Blush Studio',
    description: 'تدرج وردي دافئ وناعم مخصص لمستحضرات التجميل والمجوهرات',
    category: 'studio',
    prompt: 'Pastel blush pink soft studio background with gentle light falloff',
    previewBg: 'linear-gradient(135deg, #fce7f3, #f472b6, #db2777)',
    ambientColor: '#F472B6',
    shadowColor: 'rgba(157, 23, 77, 0.45)',
    defaultShadowOpacity: 0.5
  },

  // 4. Vibrant Gradients & Modern
  {
    id: 'sunset_warm',
    name: 'ساعة الغروب الذهبية',
    nameEn: 'Golden Hour Sunset',
    description: 'تدرجات الغروب الساحرة من الكهرمان البرتقالي إلى الأصفر الذهبي',
    category: 'modern',
    prompt: 'Golden hour sunset horizon gradient with cinematic warmth',
    previewBg: 'linear-gradient(to top, #7c2d12, #ea580c, #fde047)',
    ambientColor: '#F97316',
    shadowColor: 'rgba(124, 45, 18, 0.7)',
    defaultShadowOpacity: 0.65
  },
  {
    id: 'aurora_cyan',
    name: 'شفق قطبي سماوي وبنفسجي',
    nameEn: 'Northern Aurora Glow',
    description: 'تدرجات لونية ساحرة ومستوحاة من أضواء الشفق القطبي',
    category: 'modern',
    prompt: 'Vibrant northern lights aurora gradient of teal, cyan and deep violet',
    previewBg: 'linear-gradient(135deg, #0f172a, #0e7490, #6d28d9)',
    ambientColor: '#22D3EE',
    shadowColor: 'rgba(15, 23, 42, 0.8)',
    defaultShadowOpacity: 0.7
  },
  {
    id: 'cyber_modern',
    name: 'نيون سايبر مستقبلي',
    nameEn: 'Cyber Futuristic Studio',
    description: 'إضاءة محيطية عصرية بتدرجات زرقاء وبنفسجية أنيقة مع شبكة ضوئية',
    category: 'modern',
    prompt: 'Cyber dark aesthetic with cyan and purple neon floor reflections',
    previewBg: 'radial-gradient(circle at 50% 60%, #1e1b4b, #030712)',
    ambientColor: '#8B5CF6',
    shadowColor: 'rgba(3, 7, 18, 0.85)',
    defaultShadowOpacity: 0.75
  },
  {
    id: 'morning_dawn',
    name: 'شروق الشمس والضوء الصباحي',
    nameEn: 'Morning Dawn Pastel',
    description: 'تدرج صباحي منعش يجمع بين درجات الخوخي والذهبي والأزرق الصباحي',
    category: 'modern',
    prompt: 'Soft morning dawn light gradient with optimistic fresh hues',
    previewBg: 'linear-gradient(to top, #1e3a8a, #f97316, #fef08a)',
    ambientColor: '#FBBF24',
    shadowColor: 'rgba(30, 58, 138, 0.65)',
    defaultShadowOpacity: 0.6
  }
];

interface BackgroundGeneratorProps {
  images: ProcessedImage[];
  selectedInitialImage?: ProcessedImage | null;
  settings: RembgSettings;
  onAddImageToLibrary: (image: ProcessedImage) => void;
  isArabic: boolean;
}

export const BackgroundGenerator: React.FC<BackgroundGeneratorProps> = ({
  images,
  selectedInitialImage,
  settings,
  onAddImageToLibrary,
  isArabic
}) => {
  // Current subject image
  const [subjectImage, setSubjectImage] = useState<ProcessedImage | null>(() => {
    if (selectedInitialImage && selectedInitialImage.processedUrl) return selectedInitialImage;
    const completed = images.find((i) => i.status === 'completed' && i.processedUrl);
    return completed || images[0] || null;
  });

  const [isIsolating, setIsIsolating] = useState(false);

  // Background Theme & Custom Gradient
  const [bgMode, setBgMode] = useState<'preset' | 'customGradient' | 'solid'>('preset');
  const [selectedTheme, setSelectedTheme] = useState<StudioPresetTheme>(EXTENDED_STUDIO_THEMES[0]);
  const [themeCategory, setThemeCategory] = useState<'all' | 'luxury' | 'nature' | 'studio' | 'modern'>('all');
  
  // Custom Gradient Controls
  const [customGradColor1, setCustomGradColor1] = useState('#0F2952'); // AlShams Navy
  const [customGradColor2, setCustomGradColor2] = useState('#D48B16'); // AlShams Gold
  const [customGradAngle, setCustomGradAngle] = useState(135);
  const [customGradType, setCustomGradType] = useState<'linear' | 'radial'>('radial');
  
  // Solid color mode
  const [customSolidColor, setCustomSolidColor] = useState('#0F2952');

  // Transformation states (Scale, Position, 360° Rotation, Flip)
  const [scale, setScale] = useState<number>(85); // 30% to 150%
  const [posX, setPosX] = useState<number>(0); // -150 to +150
  const [posY, setPosY] = useState<number>(20); // -150 to +150
  const [rotation, setRotation] = useState<number>(0); // 0 to 360 deg
  const [isFlippedH, setIsFlippedH] = useState<boolean>(false);

  // Edge Precision & Contours (تحديد الحواف / تنعيم / جعلها حادة / تقليص / زيادة)
  const [edgeFeathering, setEdgeFeathering] = useState<number>(1); // 0px (ultra sharp) to 15px (soft feather)
  const [edgeExpansion, setEdgeExpansion] = useState<number>(0); // -8px (erode) to +8px (expand)
  const [edgeStrokeEnabled, setEdgeStrokeEnabled] = useState<boolean>(false);
  const [edgeStrokeColor, setEdgeStrokeColor] = useState<string>('#FFFFFF');
  const [edgeStrokeWidth, setEdgeStrokeWidth] = useState<number>(3); // 1px to 10px
  const [edgeStrokeGlow, setEdgeStrokeGlow] = useState<number>(4); // 0px to 15px glow

  // Contact ground shadow states
  const [hasShadow, setHasShadow] = useState<boolean>(true);
  const [shadowOpacity, setShadowOpacity] = useState<number>(selectedTheme.defaultShadowOpacity);
  const [shadowBlur, setShadowBlur] = useState<number>(18);
  const [shadowSpreadY, setShadowSpreadY] = useState<number>(14);
  const [shadowTone, setShadowTone] = useState<'neutral' | 'warm' | 'cool'>('neutral');

  // Background effects & lighting
  const [bgBlur, setBgBlur] = useState<number>(3); // depth of field bokeh blur
  const [bgBrightness, setBgBrightness] = useState<number>(100); // 60 to 140
  const [bgContrast, setBgContrast] = useState<number>(100); // 70 to 140

  // Collapsible Accordion Cards State ("مربعات حوارية")
  const [openPanels, setOpenPanels] = useState<{
    scenes: boolean;
    transform: boolean;
    edges: boolean;
    shadow: boolean;
    lighting: boolean;
  }>({
    scenes: true,
    transform: true,
    edges: true,
    shadow: false,
    lighting: false,
  });

  const togglePanel = (panel: keyof typeof openPanels) => {
    setOpenPanels((prev) => ({ ...prev, [panel]: !prev[panel] }));
    soundEffects.playClick();
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Select Theme
  const handleSelectTheme = (theme: StudioPresetTheme) => {
    setBgMode('preset');
    setSelectedTheme(theme);
    setShadowOpacity(theme.defaultShadowOpacity);
    soundEffects.playClick();
  };

  // Upload new image directly to background generator
  const handleUploadNewSubject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (ev) => {
      const originalUrl = ev.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        const newImgItem: ProcessedImage = {
          id: `gen-img-${Date.now()}`,
          name: file.name,
          originalUrl,
          processedUrl: null,
          status: 'processing',
          originalWidth: img.naturalWidth || img.width,
          originalHeight: img.naturalHeight || img.height,
          outputWidth: 0,
          outputHeight: 0,
          originalSize: file.size,
          outputSize: 0,
          processingTimeMs: 0,
          modelUsed: settings.model,
          timestamp: new Date().toLocaleTimeString(),
          customPath: file.name,
          history: []
        };

        setIsIsolating(true);
        try {
          const res = await processImageUnified(newImgItem, settings);
          const completedItem: ProcessedImage = {
            ...newImgItem,
            processedUrl: res.outputUrl,
            status: 'completed',
            outputWidth: res.outputWidth,
            outputHeight: res.outputHeight,
            outputSize: res.outputSize,
            processingTimeMs: res.processingTimeMs
          };
          setSubjectImage(completedItem);
          onAddImageToLibrary(completedItem);
          soundEffects.playCompletionChime();
        } catch (err) {
          console.error('Failed to isolate image for generator:', err);
        } finally {
          setIsIsolating(false);
        }
      };
      img.src = originalUrl;
    };
    reader.readAsDataURL(file);
  };

  // Quick 360 Rotation Increments
  const handleRotateStep = (degDelta: number) => {
    setRotation((prev) => {
      const next = (prev + degDelta) % 360;
      return next < 0 ? next + 360 : next;
    });
    soundEffects.playClick();
  };

  // Render composite onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 800;
    const height = 800;
    canvas.width = width;
    canvas.height = height;

    // 1. Draw Background Scene & Gradients
    ctx.save();
    ctx.filter = `blur(${bgBlur}px) brightness(${bgBrightness}%) contrast(${bgContrast}%)`;

    if (bgMode === 'solid') {
      ctx.fillStyle = customSolidColor;
      ctx.fillRect(0, 0, width, height);
    } else if (bgMode === 'customGradient') {
      if (customGradType === 'radial') {
        const grad = ctx.createRadialGradient(width / 2, height * 0.45, 40, width / 2, height / 2, width * 0.75);
        grad.addColorStop(0, customGradColor2);
        grad.addColorStop(1, customGradColor1);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else {
        const rad = (customGradAngle * Math.PI) / 180;
        const x1 = width / 2 - Math.cos(rad) * (width / 2);
        const y1 = height / 2 - Math.sin(rad) * (height / 2);
        const x2 = width / 2 + Math.cos(rad) * (width / 2);
        const y2 = height / 2 + Math.sin(rad) * (height / 2);
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, customGradColor1);
        grad.addColorStop(1, customGradColor2);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }
    } else {
      // Preset themes
      if (selectedTheme.id === 'marble_luxury') {
        const grad = ctx.createRadialGradient(width / 2, height * 0.42, 80, width / 2, height / 2, width);
        grad.addColorStop(0, '#1E293B');
        grad.addColorStop(0.65, '#0F172A');
        grad.addColorStop(1, '#050B14');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Marble podium
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.ellipse(width / 2, height * 0.74, width * 0.42, height * 0.13, 0, 0, Math.PI * 2);
        ctx.fill();

        // Golden rim
        ctx.strokeStyle = '#D48B16';
        ctx.lineWidth = 4;
        ctx.stroke();
      } else if (selectedTheme.id === 'alshams_royal') {
        const grad = ctx.createRadialGradient(width / 2, height * 0.65, 50, width / 2, height / 2, width * 0.85);
        grad.addColorStop(0, '#1B3B6F');
        grad.addColorStop(0.45, '#0F2952');
        grad.addColorStop(1, '#070F1E');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        const goldGlow = ctx.createRadialGradient(width / 2, height * 0.72, 20, width / 2, height * 0.72, 220);
        goldGlow.addColorStop(0, 'rgba(212, 139, 22, 0.4)');
        goldGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = goldGlow;
        ctx.fillRect(0, 0, width, height);
      } else if (selectedTheme.id === 'burgundy_gold') {
        const grad = ctx.createRadialGradient(width / 2, height * 0.45, 60, width / 2, height / 2, width * 0.8);
        grad.addColorStop(0, '#581C2D');
        grad.addColorStop(0.5, '#2D0A14');
        grad.addColorStop(1, '#110307');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        const glow = ctx.createRadialGradient(width / 2, height * 0.72, 20, width / 2, height * 0.72, 200);
        glow.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      } else if (selectedTheme.id === 'wooden_rustic') {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#78350F');
        grad.addColorStop(0.5, '#451A03');
        grad.addColorStop(1, '#290E02');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.lineWidth = 3;
        for (let y = height * 0.38; y < height; y += 45) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      } else if (selectedTheme.id === 'nature_foliage') {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#134E4A');
        grad.addColorStop(0.6, '#042F2E');
        grad.addColorStop(1, '#021B1A');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.ellipse(width / 2, height * 0.75, width * 0.38, height * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (selectedTheme.id === 'sunset_warm') {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#7C2D12');
        grad.addColorStop(0.45, '#EA580C');
        grad.addColorStop(0.85, '#FDE047');
        grad.addColorStop(1, '#9A3412');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (selectedTheme.id === 'aurora_cyan') {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#0F172A');
        grad.addColorStop(0.4, '#0E7490');
        grad.addColorStop(0.8, '#6D28D9');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (selectedTheme.id === 'cyber_modern') {
        const grad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width);
        grad.addColorStop(0, '#1E1B4B');
        grad.addColorStop(0.7, '#030712');
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = '#06B6D4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(width / 2, height * 0.75, width * 0.4, height * 0.1, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (selectedTheme.id === 'pastel_blush') {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#FCE7F3');
        grad.addColorStop(0.5, '#F472B6');
        grad.addColorStop(1, '#DB2777');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Clean Commercial Studio
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#F8FAFC');
        grad.addColorStop(0.65, '#E2E8F0');
        grad.addColorStop(1, '#94A3B8');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }
    }
    ctx.restore();

    // 2. Draw Realistic Contact Shadow Underneath Subject
    const activeUrl = subjectImage?.processedUrl || subjectImage?.originalUrl;
    if (activeUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Target dimensions
        const baseW = (width * 0.55 * (scale / 100));
        const aspect = img.height / img.width;
        const targetW = baseW + (edgeExpansion * 2);
        const targetH = (baseW * aspect) + (edgeExpansion * 2);

        const centerX = (width / 2) + posX;
        const centerY = (height / 2) + posY;

        // Draw shadow first (if enabled)
        if (hasShadow) {
          ctx.save();
          // Shadow tone color
          let shadowRgb = '0, 0, 0';
          if (shadowTone === 'warm') shadowRgb = '69, 26, 3';
          if (shadowTone === 'cool') shadowRgb = '15, 23, 42';

          ctx.translate(centerX, centerY + (targetH / 2) - 8);
          ctx.scale(1, 0.35); // flatten to ground plane
          ctx.filter = `blur(${shadowBlur}px)`;
          ctx.fillStyle = `rgba(${shadowRgb}, ${shadowOpacity})`;
          ctx.beginPath();
          ctx.arc(0, shadowSpreadY, (targetW / 2) * 0.85, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Draw Foreground Subject with 360° Rotation and Edge Controls
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((rotation * Math.PI) / 180);
        if (isFlippedH) ctx.scale(-1, 1);

        // Edge Feathering / Softness Filter
        if (edgeFeathering > 0) {
          ctx.filter = `blur(${edgeFeathering * 0.4}px)`;
        } else {
          ctx.filter = 'none';
        }

        // Optional Edge Contour Outline / Glow
        if (edgeStrokeEnabled && edgeStrokeWidth > 0) {
          ctx.save();
          ctx.shadowColor = edgeStrokeColor;
          ctx.shadowBlur = edgeStrokeGlow;

          // Multi-offset stroke pass for solid crisp silhouette outline
          const step = Math.max(1, Math.floor(edgeStrokeWidth / 2));
          for (let dx = -edgeStrokeWidth; dx <= edgeStrokeWidth; dx += step) {
            for (let dy = -edgeStrokeWidth; dy <= edgeStrokeWidth; dy += step) {
              if (dx * dx + dy * dy <= edgeStrokeWidth * edgeStrokeWidth) {
                ctx.drawImage(img, -targetW / 2 + dx, -targetH / 2 + dy, targetW, targetH);
              }
            }
          }
          ctx.restore();
        }

        // Draw the primary crisp subject
        ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
        ctx.restore();
      };
      img.src = activeUrl;
    }
  }, [
    subjectImage,
    bgMode,
    selectedTheme,
    customGradColor1,
    customGradColor2,
    customGradAngle,
    customGradType,
    customSolidColor,
    scale,
    posX,
    posY,
    rotation,
    isFlippedH,
    edgeFeathering,
    edgeExpansion,
    edgeStrokeEnabled,
    edgeStrokeColor,
    edgeStrokeWidth,
    edgeStrokeGlow,
    hasShadow,
    shadowOpacity,
    shadowBlur,
    shadowSpreadY,
    shadowTone,
    bgBlur,
    bgBrightness,
    bgContrast
  ]);

  // Download high-res composition
  const handleDownloadComposition = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png', 0.95);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ستوديو_الشمساوية_${selectedTheme.id}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    soundEffects.playCompletionChime();
  };

  const filteredThemes = EXTENDED_STUDIO_THEMES.filter(
    (t) => themeCategory === 'all' || t.category === themeCategory
  );

  const completedImagesList = images.filter((i) => i.status === 'completed' && i.processedUrl);

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#0F2952] via-[#1A3D73] to-[#0B1528] rounded-2xl p-4 sm:p-5 text-white border border-slate-700 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/30">
                {isArabic ? 'استوديو توليد الخلفيات الذكية' : 'AI Background Studio'}
              </span>
              <span className="text-xs text-slate-300">
                {isArabic ? 'ستوديو الشمساوية' : 'AlShams Craft'}
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white">
              {isArabic ? 'مولّد الخلفيات الإعلانية وضبط المشاهد' : 'AI Scene Studio & Background Generator'}
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {isArabic
                ? 'مربع المعاينة ثابت بالكامل مع إمكانية دوران المنتج 360 درجة، وتحديد الحواف، وتدرجات لونية متنوعة، وتحكم انسيابي في الخيارات.'
                : 'Pinned preview viewport with 360° rotation, edge contour tuning, rich gradients, and fluid collapsible control cards.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadNewSubject}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isIsolating}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isIsolating ? (isArabic ? 'جاري العزل الذكي...' : 'Isolating...') : (isArabic ? 'رفع منتج جديد' : 'Upload Product')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Viewport Grid: Fixed/Sticky Canvas on Desktop and Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Fixed / Sticky Canvas Viewport (7 cols on lg) */}
        <div className="lg:col-span-7 lg:sticky lg:top-20 z-20 space-y-4">
          <div className="bg-white dark:bg-[#0B1528] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-md space-y-3">
            
            {/* Viewport Control Strip */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {isArabic ? 'معاينة المشهد الحي (ثابتة لمتابعة التغييرات)' : 'Live Pinned Viewport'}
                </h3>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-1.5">
                {/* 360 Rotation Quick Display */}
                <div className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[11px] font-bold border border-amber-500/20">
                  {rotation}°
                </div>

                {/* Reset button */}
                <button
                  onClick={() => {
                    setScale(85);
                    setPosX(0);
                    setPosY(20);
                    setRotation(0);
                    setIsFlippedH(false);
                    setEdgeFeathering(1);
                    setEdgeExpansion(0);
                    setEdgeStrokeEnabled(false);
                    soundEffects.playClick();
                  }}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs flex items-center gap-1"
                  title={isArabic ? 'إعادة ضبط الوضع' : 'Reset Position'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isArabic ? 'إعادة ضبط' : 'Reset'}</span>
                </button>

                {/* Download Button */}
                <button
                  onClick={handleDownloadComposition}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isArabic ? 'تحميل HD' : 'Download'}</span>
                </button>
              </div>
            </div>

            {/* Canvas Display Viewport */}
            <div className="relative w-full aspect-square max-h-[460px] sm:max-h-[520px] rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-inner group">
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
              />

              {/* Theme Badge Overlay */}
              <div className="absolute top-3 start-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-xs text-[11px] font-semibold text-white pointer-events-none border border-white/10">
                {bgMode === 'preset'
                  ? isArabic ? selectedTheme.name : selectedTheme.nameEn
                  : bgMode === 'customGradient'
                  ? isArabic ? 'تدرج مخصص' : 'Custom Gradient'
                  : isArabic ? 'لون مصمت' : 'Solid Color'}
              </div>

              {/* Quick Flip & Rotate Overlay */}
              <div className="absolute top-3 end-3 flex items-center gap-1">
                <button
                  onClick={() => handleRotateStep(90)}
                  className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white text-xs border border-white/10 transition-colors"
                  title={isArabic ? 'دوران 90 درجة' : 'Rotate 90°'}
                >
                  <RotateCcw className="w-3.5 h-3.5 transform rotate-90" />
                </button>
                <button
                  onClick={() => setIsFlippedH((f) => !f)}
                  className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white text-xs border border-white/10 transition-colors"
                  title={isArabic ? 'عكس الاتجاه أفقياً' : 'Flip Horizontal'}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Subject Selector Strip */}
            {completedImagesList.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 block">
                  {isArabic ? 'اختر منتجاً من المعالجات السابقة:' : 'Choose from your isolated items:'}
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {completedImagesList.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => {
                        setSubjectImage(img);
                        soundEffects.playClick();
                      }}
                      className={`relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border-2 transition-all p-0.5 bg-transparency-grid ${
                        subjectImage?.id === img.id
                          ? 'border-amber-500 ring-2 ring-amber-500/30 scale-105'
                          : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100'
                      }`}
                      title={img.name}
                    >
                      <img src={img.processedUrl || img.originalUrl} alt="" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Column: Fluid Collapsible Interactive Cards ("مربعات حوارية") (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-3.5">
          
          {/* Card 1: تدرجات ألوان الخلفية والمشاهد الإعلانية */}
          <div className="bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all">
            <button
              onClick={() => togglePanel('scenes')}
              className="w-full flex items-center justify-between p-4 bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-start"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {isArabic ? 'تدرجات ألوان الخلفية والمشاهد' : 'Backdrop Scenes & Gradients'}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {isArabic ? '16+ مشهداً وتدرجات ألوان ومدرجات فاخرة' : '16+ Themes, Gradients & Custom Colors'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  {bgMode === 'preset' ? selectedTheme.name : bgMode === 'customGradient' ? 'تدرج مخصص' : 'لون مصمت'}
                </span>
                {openPanels.scenes ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {openPanels.scenes && (
              <div className="p-4 space-y-4 border-t border-slate-100 dark:border-slate-800">
                {/* Mode Selector Tabs */}
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl">
                  <button
                    onClick={() => { setBgMode('preset'); soundEffects.playClick(); }}
                    className={`py-1.5 text-center text-xs font-bold rounded-lg transition-all ${
                      bgMode === 'preset'
                        ? 'bg-white dark:bg-[#0B1528] text-amber-500 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {isArabic ? 'استوديو جاهز' : 'Presets'}
                  </button>
                  <button
                    onClick={() => { setBgMode('customGradient'); soundEffects.playClick(); }}
                    className={`py-1.5 text-center text-xs font-bold rounded-lg transition-all ${
                      bgMode === 'customGradient'
                        ? 'bg-white dark:bg-[#0B1528] text-amber-500 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {isArabic ? 'تدرج مخصص' : 'Custom Gradient'}
                  </button>
                  <button
                    onClick={() => { setBgMode('solid'); soundEffects.playClick(); }}
                    className={`py-1.5 text-center text-xs font-bold rounded-lg transition-all ${
                      bgMode === 'solid'
                        ? 'bg-white dark:bg-[#0B1528] text-amber-500 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    {isArabic ? 'لون مصمت' : 'Solid Color'}
                  </button>
                </div>

                {/* Preset Themes Mode */}
                {bgMode === 'preset' && (
                  <div className="space-y-3">
                    {/* Category Filter */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                      {[
                        { id: 'all', label: isArabic ? 'الكل' : 'All' },
                        { id: 'luxury', label: isArabic ? 'فخامة وملكي' : 'Luxury' },
                        { id: 'nature', label: isArabic ? 'طبيعة وخشب' : 'Nature' },
                        { id: 'studio', label: isArabic ? 'استوديو ناعم' : 'Studio' },
                        { id: 'modern', label: isArabic ? 'تدرجات وغروب' : 'Modern' }
                      ].map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setThemeCategory(c.id as any)}
                          className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors ${
                            themeCategory === c.id
                              ? 'bg-amber-500 text-slate-950 font-bold'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>

                    {/* Presets Grid */}
                    <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pe-1">
                      {filteredThemes.map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => handleSelectTheme(theme)}
                          className={`p-2 rounded-xl border text-start transition-all space-y-1.5 ${
                            selectedTheme.id === theme.id
                              ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold ring-1 ring-amber-500/30'
                              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div 
                            className="w-full h-8 rounded-lg shadow-inner border border-white/10" 
                            style={{ background: theme.previewBg }}
                          />
                          <div className="text-[11px] truncate font-semibold">{isArabic ? theme.name : theme.nameEn}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Gradient Mode */}
                {bgMode === 'customGradient' && (
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-500 block">{isArabic ? 'اللون الأول' : 'Color 1'}</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={customGradColor1}
                            onChange={(e) => setCustomGradColor1(e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700"
                          />
                          <span className="font-mono text-xs">{customGradColor1}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-500 block">{isArabic ? 'اللون الثاني' : 'Color 2'}</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={customGradColor2}
                            onChange={(e) => setCustomGradColor2(e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700"
                          />
                          <span className="font-mono text-xs">{customGradColor2}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">{isArabic ? 'نمط التدرج' : 'Style'}</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setCustomGradType('radial')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            customGradType === 'radial' ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800'
                          }`}
                        >
                          {isArabic ? 'دائري (Radial)' : 'Radial'}
                        </button>
                        <button
                          onClick={() => setCustomGradType('linear')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            customGradType === 'linear' ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800'
                          }`}
                        >
                          {isArabic ? 'خطي (Linear)' : 'Linear'}
                        </button>
                      </div>
                    </div>

                    {customGradType === 'linear' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>{isArabic ? 'زاوية التدرج' : 'Gradient Angle'}</span>
                          <span className="font-mono text-amber-500">{customGradAngle}°</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={customGradAngle}
                          onChange={(e) => setCustomGradAngle(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Solid Color Mode */}
                {bgMode === 'solid' && (
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={customSolidColor}
                        onChange={(e) => setCustomSolidColor(e.target.value)}
                        className="w-10 h-10 rounded-xl cursor-pointer border border-slate-300 dark:border-slate-700"
                      />
                      <div>
                        <span className="text-xs font-bold block">{isArabic ? 'اللون المحدد' : 'Selected Color'}</span>
                        <span className="font-mono text-xs text-slate-400">{customSolidColor}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {[
                        { hex: '#FFFFFF', name: 'أبيض' },
                        { hex: '#0F2952', name: 'كحلي الشمساوية' },
                        { hex: '#D48B16', name: 'ذهبي الشمساوية' },
                        { hex: '#0F172A', name: 'أنثراسيت' },
                        { hex: '#000000', name: 'أسود' }
                      ].map((c) => (
                        <button
                          key={c.hex}
                          onClick={() => setCustomSolidColor(c.hex)}
                          className={`w-7 h-7 rounded-full border-2 transition-transform ${
                            customSolidColor.toUpperCase() === c.hex.toUpperCase() ? 'border-amber-500 scale-110' : 'border-slate-300 dark:border-slate-700'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Card 2: أبعاد وموضع ودوران المنتج 360 درجة */}
          <div className="bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all">
            <button
              onClick={() => togglePanel('transform')}
              className="w-full flex items-center justify-between p-4 bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-start"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {isArabic ? 'دوران 360° وأبعاد وموضع المنتج' : '360° Rotation, Scale & Position'}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {isArabic ? 'تحكم كامل بزاوية الدوران والحجم والموضع' : 'Full 360° rotation dial and positioning'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono">
                  {rotation}° | {scale}%
                </span>
                {openPanels.transform ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {openPanels.transform && (
              <div className="p-4 space-y-4 border-t border-slate-100 dark:border-slate-800">
                
                {/* 360° Rotation Slider & Angle Presets */}
                <div className="space-y-2 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800 dark:text-white">
                      {isArabic ? 'دوران المنتج حول نفسه (360 درجة)' : 'Continuous 360° Rotation'}
                    </span>
                    <span className="font-mono text-amber-500 font-black text-sm">{rotation}°</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />

                  {/* Quick Angle Presets */}
                  <div className="grid grid-cols-6 gap-1 pt-1">
                    {[
                      { angle: 0, label: '0°' },
                      { angle: 45, label: '45°' },
                      { angle: 90, label: '90°' },
                      { angle: 180, label: '180°' },
                      { angle: 270, label: '270°' },
                      { angle: 360, label: '360°' }
                    ].map((p) => (
                      <button
                        key={p.angle}
                        onClick={() => { setRotation(p.angle % 360); soundEffects.playClick(); }}
                        className={`py-1 text-center font-mono text-[11px] font-bold rounded-lg border transition-all ${
                          rotation === (p.angle % 360)
                            ? 'bg-amber-500 text-slate-950 border-amber-500'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Incremental Nudge Buttons */}
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                    <button
                      onClick={() => handleRotateStep(-15)}
                      className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:text-amber-500 font-bold"
                    >
                      -15°
                    </button>
                    <span>{isArabic ? 'تدوير دقيق بالدرجات' : 'Fine Degree Step'}</span>
                    <button
                      onClick={() => handleRotateStep(15)}
                      className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:text-amber-500 font-bold"
                    >
                      +15°
                    </button>
                  </div>
                </div>

                {/* Scale Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{isArabic ? 'حجم وتكبير المنتج (Scale)' : 'Subject Scale'}</span>
                    <span className="font-mono text-amber-500 font-bold">{scale}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="140"
                    value={scale}
                    onChange={(e) => setScale(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Y Axis Position */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{isArabic ? 'الموضع العمودي (ارتفاع المنتج)' : 'Vertical Position (Y)'}</span>
                    <span className="font-mono text-amber-500 font-bold">{posY}px</span>
                  </div>
                  <input
                    type="range"
                    min="-140"
                    max="140"
                    value={posY}
                    onChange={(e) => setPosY(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* X Axis Position */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{isArabic ? 'الموضع الأفقي (اليمين واليسار)' : 'Horizontal Position (X)'}</span>
                    <span className="font-mono text-amber-500 font-bold">{posX}px</span>
                  </div>
                  <input
                    type="range"
                    min="-140"
                    max="140"
                    value={posX}
                    onChange={(e) => setPosX(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

              </div>
            )}
          </div>

          {/* Card 3: معالجة وتحديد حواف المنتج (تنعيم الحواف، جعلها حادة، تقليص / زيادة) */}
          <div className="bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all">
            <button
              onClick={() => togglePanel('edges')}
              className="w-full flex items-center justify-between p-4 bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-start"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {isArabic ? 'تحديد ومعالجة حواف المنتج' : 'Edge Precision & Feathering'}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {isArabic ? 'تنعيم الحواف، جعلها حادة، تقليصها لمنع الهالات، أو وضع إطار' : 'Feathering, sharpness, erosion and edge contour'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono">
                  {edgeFeathering === 0 ? 'حادة' : `${edgeFeathering}px`}
                </span>
                {openPanels.edges ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {openPanels.edges && (
              <div className="p-4 space-y-4 border-t border-slate-100 dark:border-slate-800">
                
                {/* Feathering vs Sharpness */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>
                      {edgeFeathering === 0 
                        ? (isArabic ? 'حدة الحواف: حادة جداً (Crisp Sharp)' : 'Edge Sharpness: Crisp Sharp')
                        : (isArabic ? `تنعيم الحواف: ${edgeFeathering}px (Soft Blend)` : `Feathering: ${edgeFeathering}px`)}
                    </span>
                    <button
                      onClick={() => setEdgeFeathering(edgeFeathering === 0 ? 2 : 0)}
                      className="text-amber-500 font-bold hover:underline"
                    >
                      {edgeFeathering === 0 ? (isArabic ? 'تطبيق تنعيم' : 'Soften') : (isArabic ? 'جعلها حادة' : 'Make Sharp')}
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={edgeFeathering}
                    onChange={(e) => setEdgeFeathering(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{isArabic ? '0 (حادة ودقيقة)' : '0 (Sharp)'}</span>
                    <span>{isArabic ? '10 (ناعمة ومنسابة)' : '10 (Soft)'}</span>
                  </div>
                </div>

                {/* Expansion vs Inset (تقليص لمنع الهالات أو زيادة للاحتفاظ بالشعر) */}
                <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{isArabic ? 'نطاق حدود المنتج (تقليص / زيادة)' : 'Edge Boundary Inset/Expand'}</span>
                    <span className="font-mono text-amber-500 font-bold">
                      {edgeExpansion > 0 ? `+${edgeExpansion}px` : `${edgeExpansion}px`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-8"
                    max="8"
                    step="1"
                    value={edgeExpansion}
                    onChange={(e) => setEdgeExpansion(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{isArabic ? '-8px (تقليص لمنع أي هالة)' : '-8px (Shrink)'}</span>
                    <span>{isArabic ? '+8px (توسيع للشعر الدقيق)' : '+8px (Expand)'}</span>
                  </div>
                </div>

                {/* Optional Edge Contour Stroke / Glow (تحديد إطار أو توهج) */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                        {isArabic ? 'تحديد إطار أو توهج محيطي للمنتج' : 'Product Outline Stroke / Glow'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {isArabic ? 'إبراز المنتج كاستيكر أو إطار ترويجي مضيء' : 'Accent contour for e-commerce badges'}
                      </span>
                    </div>
                    <button
                      onClick={() => setEdgeStrokeEnabled(!edgeStrokeEnabled)}
                      className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                        edgeStrokeEnabled ? 'bg-amber-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </button>
                  </div>

                  {edgeStrokeEnabled && (
                    <div className="space-y-2 ps-2 border-s-2 border-amber-500/40 mt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">{isArabic ? 'لون الإطار' : 'Stroke Color'}</span>
                        <div className="flex items-center gap-1.5">
                          {['#FFFFFF', '#D48B16', '#38BDF8', '#10B981', '#000000'].map((col) => (
                            <button
                              key={col}
                              onClick={() => setEdgeStrokeColor(col)}
                              className={`w-5 h-5 rounded-full border ${edgeStrokeColor === col ? 'ring-2 ring-amber-500' : 'border-slate-400'}`}
                              style={{ backgroundColor: col }}
                            />
                          ))}
                          <input
                            type="color"
                            value={edgeStrokeColor}
                            onChange={(e) => setEdgeStrokeColor(e.target.value)}
                            className="w-5 h-5 rounded cursor-pointer p-0 border-0"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>{isArabic ? 'سُمك الإطار' : 'Stroke Width'}</span>
                          <span className="font-mono text-amber-500">{edgeStrokeWidth}px</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="8"
                          value={edgeStrokeWidth}
                          onChange={(e) => setEdgeStrokeWidth(Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* Card 4: محاكاة الظل الواقعي (Photorealistic Contact Shadow) */}
          <div className="bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all">
            <button
              onClick={() => togglePanel('shadow')}
              className="w-full flex items-center justify-between p-4 bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-start"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <SunMedium className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {isArabic ? 'محاكاة الظل الأرضي الواقعي' : 'Photorealistic Ground Shadow'}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {isArabic ? 'إسقاط ظل طبيعي ثلاثي الأبعاد على السطح' : 'Elliptical ground plane contact shadow'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hasShadow ? 'bg-emerald-500/15 text-emerald-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                  {hasShadow ? (isArabic ? 'مفعل' : 'Active') : (isArabic ? 'معطل' : 'Off')}
                </span>
                {openPanels.shadow ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {openPanels.shadow && (
              <div className="p-4 space-y-3.5 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isArabic ? 'تفعيل محاكاة الظل الأرضي' : 'Enable Contact Shadow'}
                  </span>
                  <button
                    onClick={() => setHasShadow(!hasShadow)}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                      hasShadow ? 'bg-amber-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>

                {hasShadow && (
                  <div className="space-y-3 pt-1">
                    {/* Shadow Opacity */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>{isArabic ? 'شدة قتامة الظل (Opacity)' : 'Shadow Opacity'}</span>
                        <span className="font-mono text-amber-500 font-bold">{Math.round(shadowOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={shadowOpacity}
                        onChange={(e) => setShadowOpacity(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    {/* Shadow Blur & Softness */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>{isArabic ? 'نعومة وانتشار الظل (Blur)' : 'Shadow Softness'}</span>
                        <span className="font-mono text-amber-500 font-bold">{shadowBlur}px</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="40"
                        value={shadowBlur}
                        onChange={(e) => setShadowBlur(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>

                    {/* Shadow Tone */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">{isArabic ? 'نغمة الظل' : 'Shadow Tone'}</span>
                      <div className="flex gap-1.5">
                        {[
                          { id: 'neutral', label: isArabic ? 'طبيعي' : 'Neutral' },
                          { id: 'warm', label: isArabic ? 'دافئ' : 'Warm' },
                          { id: 'cool', label: isArabic ? 'بارد' : 'Cool' }
                        ].map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setShadowTone(t.id as any)}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                              shadowTone === t.id ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Card 5: إضاءة الاستوديو وعمق الميدان (Bokeh) */}
          <div className="bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all">
            <button
              onClick={() => togglePanel('lighting')}
              className="w-full flex items-center justify-between p-4 bg-slate-50/70 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-start"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {isArabic ? 'إضاءة الاستوديو وعزل الخلفية (Bokeh)' : 'Studio Lighting & Bokeh Blur'}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {isArabic ? 'عمق الميدان والسطوع والتباين' : 'Depth of field blur and illumination'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono">
                  {bgBlur}px | {bgBrightness}%
                </span>
                {openPanels.lighting ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {openPanels.lighting && (
              <div className="p-4 space-y-3.5 border-t border-slate-100 dark:border-slate-800">
                {/* Bokeh Blur */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{isArabic ? 'عزل عمق الميدان للخلفية (Bokeh Blur)' : 'Bokeh Depth Blur'}</span>
                    <span className="font-mono text-amber-500 font-bold">{bgBlur}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={bgBlur}
                    onChange={(e) => setBgBlur(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Brightness */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{isArabic ? 'سطوع إضاءة المشهد' : 'Scene Brightness'}</span>
                    <span className="font-mono text-amber-500 font-bold">{bgBrightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="140"
                    value={bgBrightness}
                    onChange={(e) => setBgBrightness(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{isArabic ? 'تباين المشهد (Contrast)' : 'Scene Contrast'}</span>
                    <span className="font-mono text-amber-500 font-bold">{bgContrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="70"
                    max="140"
                    value={bgContrast}
                    onChange={(e) => setBgContrast(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
