import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  Sparkles, Download, Copy, Layers, Sliders, ZoomIn,
  Camera, Upload
} from 'lucide-react';
import { Arrow, Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva';
import { ProcessedImage } from '../../types';
import { soundEffects } from '../../shared/lib/audio';

interface DimensionPoint {
  x: number;
  y: number;
}

interface DimensionAnnotation {
  id: 'height' | 'width' | 'depth';
  start: DimensionPoint;
  end: DimensionPoint;
  visible: boolean;
}

interface AlphaBounds {
  width: number;
  height: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const DIMENSION_LABELS = {
  height: { ar: 'الارتفاع', en: 'Height' },
  width: { ar: 'العرض', en: 'Width' },
  depth: { ar: 'العمق', en: 'Depth' }
} as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const imageKey = (url: string) => {
  let hash = 2166136261;
  for (let i = 0; i < url.length; i += Math.max(1, Math.floor(url.length / 4096))) {
    hash = Math.imul(hash ^ url.charCodeAt(i), 16777619);
  }
  return `${url.length}-${(hash >>> 0).toString(36)}`;
};

const readAlphaBounds = (url: string): Promise<AlphaBounds> => new Promise((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      const sampleScale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * sampleScale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * sampleScale));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Could not inspect image transparency.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      let left = canvas.width;
      let top = canvas.height;
      let right = -1;
      let bottom = -1;
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          if (data[(y * canvas.width + x) * 4 + 3] > 8) {
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
          }
        }
      }
      resolve({
        width: canvas.width,
        height: canvas.height,
        left: right < 0 ? 0 : left,
        top: bottom < 0 ? 0 : top,
        right: right < 0 ? canvas.width : right,
        bottom: bottom < 0 ? canvas.height : bottom
      });
    } catch (error) {
      reject(error);
    }
  };
  image.onerror = () => reject(new Error('Could not load image to locate its visible bounds.'));
  image.src = url;
});

const createDefaultAnnotations = (bounds: AlphaBounds, frame: StoryboardFrame): DimensionAnnotation[] => {
  const stageWidth = 400;
  const stageHeight = stageWidth / frame.aspectRatioNum;
  const fitScale = Math.min((stageWidth - 24) / bounds.width, (stageHeight - 24) / bounds.height);
  const imageWidth = bounds.width * fitScale;
  const imageHeight = bounds.height * fitScale;
  const imageX = (stageWidth - imageWidth) / 2;
  const imageY = (stageHeight - imageHeight) / 2;
  const zoom = frame.zoom / 100;
  const toFramePoint = (x: number, y: number): DimensionPoint => ({
    x: clamp((stageWidth / 2 + (imageX + x * fitScale - stageWidth / 2) * zoom + frame.panX * zoom) / stageWidth, 0.04, 0.96),
    y: clamp((stageHeight / 2 + (imageY + y * fitScale - stageHeight / 2) * zoom + frame.panY * zoom) / stageHeight, 0.04, 0.96)
  });
  const productTopLeft = toFramePoint(bounds.left, bounds.top);
  const productBottomRight = toFramePoint(bounds.right, bounds.bottom);
  const offsetX = 24 / stageWidth;
  const offsetY = 24 / stageHeight;
  const heightX = clamp(productTopLeft.x - offsetX, 0.04, 0.96);
  const widthY = clamp(productBottomRight.y + offsetY, 0.04, 0.96);
  const productTopRight = toFramePoint(bounds.right, bounds.top);
  const depthStart = {
    x: clamp(productTopRight.x + offsetX, 0.04, 0.96),
    y: clamp(productTopRight.y - offsetY * 0.25, 0.04, 0.96)
  };
  const depthEnd = {
    x: clamp(productTopRight.x + offsetX * 0.25, 0.04, 0.96),
    y: clamp(productTopRight.y - offsetY, 0.04, 0.96)
  };
  if (Math.hypot(depthEnd.x - depthStart.x, depthEnd.y - depthStart.y) < 0.06) {
    depthStart.x = clamp(productTopRight.x - 0.12, 0.08, 0.9);
    depthStart.y = clamp(productTopRight.y + 0.04, 0.08, 0.9);
    depthEnd.x = clamp(productTopRight.x - 0.04, 0.08, 0.9);
    depthEnd.y = clamp(productTopRight.y + 0.12, 0.08, 0.9);
  }

  return [
    { id: 'height', start: { x: heightX, y: productTopLeft.y }, end: { x: heightX, y: productBottomRight.y }, visible: true },
    { id: 'width', start: { x: productTopLeft.x, y: widthY }, end: { x: productBottomRight.x, y: widthY }, visible: true },
    { id: 'depth', start: depthStart, end: depthEnd, visible: true }
  ];
};

const normalizeDimensionAnnotations = (annotations?: DimensionAnnotation[]): DimensionAnnotation[] | undefined => {
  if (!annotations) return undefined;
  return annotations.map((annotation) => {
    const start = { x: clamp(annotation.start.x, 0.04, 0.96), y: clamp(annotation.start.y, 0.04, 0.96) };
    const end = { x: clamp(annotation.end.x, 0.04, 0.96), y: clamp(annotation.end.y, 0.04, 0.96) };
    if (annotation.id === 'height') end.x = start.x;
    if (annotation.id === 'width') end.y = start.y;
    return { ...annotation, start, end };
  });
};

const isDimensionAnnotation = (value: unknown): value is DimensionAnnotation => {
  if (!value || typeof value !== 'object') return false;
  const annotation = value as Record<string, unknown>;
  const pointIsValid = (point: unknown) => {
    if (!point || typeof point !== 'object') return false;
    const candidate = point as Record<string, unknown>;
    return typeof candidate.x === 'number' && Number.isFinite(candidate.x)
      && typeof candidate.y === 'number' && Number.isFinite(candidate.y);
  };
  return (annotation.id === 'height' || annotation.id === 'width' || annotation.id === 'depth')
    && pointIsValid(annotation.start)
    && pointIsValid(annotation.end)
    && typeof annotation.visible === 'boolean';
};

const isSavedDimensionLayout = (
  value: unknown
): value is Pick<StoryboardFrame, 'dimensionAnnotations' | 'dimensionImageKey'> => {
  if (!value || typeof value !== 'object') return false;
  const layout = value as Record<string, unknown>;
  return (layout.dimensionImageKey === undefined || typeof layout.dimensionImageKey === 'string')
    && (layout.dimensionAnnotations === undefined
      || (Array.isArray(layout.dimensionAnnotations) && layout.dimensionAnnotations.every(isDimensionAnnotation)));
};

interface DimensionStageProps {
  frame: StoryboardFrame;
  width: number;
  height: number;
  isArabic: boolean;
  unitLabel: string;
  color: string;
  thickness: number;
  digits: 'latin' | 'arabic';
  onChange: (id: DimensionAnnotation['id'], update: Partial<DimensionAnnotation>) => void;
}

const DimensionStage: React.FC<DimensionStageProps> = ({
  frame, width, height, isArabic, unitLabel, color, thickness, digits, onChange
}) => {
  const scale = width / 400;
  const values = {
    height: frame.dimHeight ?? 24,
    width: frame.dimWidth ?? 18,
    depth: frame.dimDepth ?? 9
  };
  const formatValue = (value: number) => {
    const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1);
    return digits === 'arabic' ? formatted.replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]) : formatted;
  };

  return (
    <Stage width={width} height={height} className="absolute inset-0">
      <Layer>
        {(frame.dimensionAnnotations || []).map((annotation) => {
          if (!annotation.visible) return null;
          const x1 = annotation.start.x * width;
          const y1 = annotation.start.y * height;
          const x2 = annotation.end.x * width;
          const y2 = annotation.end.y * height;
          const middleX = (x1 + x2) / 2;
          const middleY = (y1 + y2) / 2;
          const label = `${DIMENSION_LABELS[annotation.id][isArabic ? 'ar' : 'en']}: ${formatValue(values[annotation.id])} ${unitLabel}`;
          const fontSize = Math.max(9, 12 * scale);
          const pillWidth = Math.max(84 * scale, label.length * fontSize * 0.58 + 18 * scale);
          const pillHeight = Math.max(24 * scale, 28 * scale);
          const dx = x2 - x1;
          const dy = y2 - y1;
          const length = Math.max(1, Math.hypot(dx, dy));
          const extension = 18 * scale;
          const normalX = (-dy / length) * extension;
          const normalY = (dx / length) * extension;
          const constrainedMove = (point: 'start' | 'end', x: number, y: number) => {
            const other = annotation[point === 'start' ? 'end' : 'start'];
            onChange(annotation.id, {
              [point]: {
                x: annotation.id === 'height' ? other.x : clamp(x / width, 0.04, 0.96),
                y: annotation.id === 'width' ? other.y : clamp(y / height, 0.04, 0.96)
              }
            });
          };
          const groupMove = (event: { currentTarget: { x: () => number; y: () => number; position: (p: { x: number; y: number }) => void } }) => {
            const group = event.currentTarget;
            const requestedShiftX = group.x() / width;
            const requestedShiftY = group.y() / height;
            const shiftX = clamp(
              requestedShiftX,
              0.04 - Math.min(annotation.start.x, annotation.end.x),
              0.96 - Math.max(annotation.start.x, annotation.end.x)
            );
            const shiftY = clamp(
              requestedShiftY,
              0.04 - Math.min(annotation.start.y, annotation.end.y),
              0.96 - Math.max(annotation.start.y, annotation.end.y)
            );
            onChange(annotation.id, {
              start: {
                x: clamp(annotation.start.x + shiftX, 0.04, 0.96),
                y: clamp(annotation.start.y + shiftY, 0.04, 0.96)
              },
              end: {
                x: clamp(annotation.end.x + shiftX, 0.04, 0.96),
                y: clamp(annotation.end.y + shiftY, 0.04, 0.96)
              }
            });
            group.position({ x: 0, y: 0 });
          };

          return (
            <Group key={annotation.id}>
              <Group
                draggable
                onDragEnd={groupMove}
                onMouseEnter={(event) => { event.target.getStage()?.container().style.setProperty('cursor', 'grab'); }}
                onMouseLeave={(event) => { event.target.getStage()?.container().style.setProperty('cursor', 'default'); }}
              >
                <Line points={[x1, y1, x1 + normalX, y1 + normalY]} stroke={color} strokeWidth={thickness * scale} />
                <Line points={[x2, y2, x2 + normalX, y2 + normalY]} stroke={color} strokeWidth={thickness * scale} />
                <Arrow
                  points={[x1, y1, x2, y2]}
                  stroke={color}
                  fill={color}
                  strokeWidth={thickness * scale}
                  pointerLength={8 * scale}
                  pointerWidth={8 * scale}
                  pointerAtBeginning
                  pointerAtEnding
                  hitStrokeWidth={18 * scale}
                />
                <Rect
                  x={middleX - pillWidth / 2}
                  y={middleY - pillHeight / 2}
                  width={pillWidth}
                  height={pillHeight}
                  cornerRadius={8 * scale}
                  fill="#0F2952"
                  stroke={color}
                  strokeWidth={Math.max(1, thickness * scale * 0.65)}
                />
                <Text
                  x={middleX - pillWidth / 2}
                  y={middleY - pillHeight / 2}
                  width={pillWidth}
                  height={pillHeight}
                  text={label}
                  align="center"
                  verticalAlign="middle"
                  fontSize={fontSize}
                  fontStyle="bold"
                  fill="#FFFFFF"
                  listening={false}
                />
              </Group>
              <Circle
                x={x1}
                y={y1}
                radius={7 * scale}
                fill="#FFFFFF"
                stroke={color}
                strokeWidth={2 * scale}
                draggable
                hitStrokeWidth={14 * scale}
                onDragMove={(event) => constrainedMove('start', event.target.x(), event.target.y())}
                onMouseDown={(event) => event.cancelBubble = true}
                onTouchStart={(event) => event.cancelBubble = true}
              />
              <Circle
                x={x2}
                y={y2}
                radius={7 * scale}
                fill="#FFFFFF"
                stroke={color}
                strokeWidth={2 * scale}
                draggable
                hitStrokeWidth={14 * scale}
                onDragMove={(event) => constrainedMove('end', event.target.x(), event.target.y())}
                onMouseDown={(event) => event.cancelBubble = true}
                onTouchStart={(event) => event.cancelBubble = true}
              />
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
};

const ResponsiveDimensionStage: React.FC<Omit<DimensionStageProps, 'width' | 'height'>> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0">
      {size.width > 0 && size.height > 0 && (
        <DimensionStage {...props} width={size.width} height={size.height} />
      )}
    </div>
  );
};

const drawDimensionAnnotations = (
  context: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number; h: number },
  frame: StoryboardFrame,
  isArabic: boolean,
  unitLabel: string,
  color: string,
  thickness: number,
  digits: 'latin' | 'arabic'
) => {
  const scale = rect.w / 400;
  const values = {
    height: frame.dimHeight ?? 24,
    width: frame.dimWidth ?? 18,
    depth: frame.dimDepth ?? 9
  };
  const formatValue = (value: number) => {
    const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1);
    return digits === 'arabic' ? formatted.replace(/\d/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]) : formatted;
  };
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = thickness * scale;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  for (const annotation of frame.dimensionAnnotations || []) {
    if (!annotation.visible) continue;
    const x1 = rect.x + annotation.start.x * rect.w;
    const y1 = rect.y + annotation.start.y * rect.h;
    const x2 = rect.x + annotation.end.x * rect.w;
    const y2 = rect.y + annotation.end.y * rect.h;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.max(1, Math.hypot(dx, dy));
    const normalX = (-dy / length) * 18 * scale;
    const normalY = (dx / length) * 18 * scale;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const label = `${DIMENSION_LABELS[annotation.id][isArabic ? 'ar' : 'en']}: ${formatValue(values[annotation.id])} ${unitLabel}`;
    const fontSize = Math.max(9, 12 * scale);

    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x1 + normalX, y1 + normalY);
    context.moveTo(x2, y2);
    context.lineTo(x2 + normalX, y2 + normalY);
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();

    const arrowHead = (x: number, y: number, towardX: number, towardY: number) => {
      const unitX = (towardX - x) / length;
      const unitY = (towardY - y) / length;
      const arrowLength = 8 * scale;
      const arrowWidth = 5 * scale;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + unitX * arrowLength - unitY * arrowWidth, y + unitY * arrowLength + unitX * arrowWidth);
      context.lineTo(x + unitX * arrowLength + unitY * arrowWidth, y + unitY * arrowLength - unitX * arrowWidth);
      context.closePath();
      context.fill();
    };
    arrowHead(x1, y1, x2, y2);
    arrowHead(x2, y2, x1, y1);

    context.font = `bold ${fontSize}px Cairo, sans-serif`;
    context.direction = isArabic ? 'rtl' : 'ltr';
    const pillWidth = Math.max(84 * scale, context.measureText(label).width + 18 * scale);
    const pillHeight = 28 * scale;
    context.fillStyle = '#0F2952';
    context.beginPath();
    context.roundRect(midX - pillWidth / 2, midY - pillHeight / 2, pillWidth, pillHeight, 8 * scale);
    context.fill();
    context.strokeStyle = color;
    context.lineWidth = Math.max(1, thickness * scale * 0.65);
    context.stroke();
    context.fillStyle = '#FFFFFF';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, midX, midY);

    for (const [x, y] of [[x1, y1], [x2, y2]] as const) {
      context.beginPath();
      context.arc(x, y, 4 * scale, 0, Math.PI * 2);
      context.fillStyle = '#FFFFFF';
      context.fill();
      context.strokeStyle = color;
      context.lineWidth = 2 * scale;
      context.stroke();
    }
  }
  context.restore();
};

export interface StoryboardFrame {
  id: string;
  sceneId?: string;
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
  dimensionAnnotations?: DimensionAnnotation[];
  dimensionImageKey?: string;
  macroCallout?: string;
}

interface StoryboardWorkspaceProps {
  images: ProcessedImage[];
  isArabic: boolean;
  onAddImageToLibrary?: (img: ProcessedImage) => void;
  initialBoardFrames?: StoryboardFrame[];
  initialBoardDimensions?: Record<string, number | string>;
  onBoardStateChange?: (frames: StoryboardFrame[], dimensions: Record<string, number | string>) => void;
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
  onAddImageToLibrary,
  initialBoardFrames,
  initialBoardDimensions,
  onBoardStateChange
}) => {
  const [frames, setFrames] = useState<StoryboardFrame[]>(() => {
    // Populate frames initially with the first available processed images if present
    const completed = images.filter((img) => img.status === 'completed' && img.processedUrl);
    const primaryUrl = completed[0]?.processedUrl || images[0]?.originalUrl || null;
    let savedLayouts: Record<string, Pick<StoryboardFrame, 'dimensionAnnotations' | 'dimensionImageKey'>> = {};
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem('alshams_board_dimensions') || '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        savedLayouts = Object.fromEntries(
          Object.entries(parsed).filter((entry): entry is [string, Pick<StoryboardFrame, 'dimensionAnnotations' | 'dimensionImageKey'>] =>
            isSavedDimensionLayout(entry[1])
          )
        );
      }
    } catch {
      savedLayouts = {};
    }
    const storedFrames = new Map((initialBoardFrames || []).map((frame) => [frame.id, frame]));
    const frameTemplates = initialBoardFrames && initialBoardFrames.length > DEFAULT_FRAMES.length
      ? initialBoardFrames
      : DEFAULT_FRAMES;
    return frameTemplates.map((f, idx) => {
      const savedLayout = savedLayouts[f.id];
      const restoredFrame = storedFrames.get(f.id);
      return {
        ...(DEFAULT_FRAMES.find((defaultFrame) => defaultFrame.id === f.id) || {}),
        ...f,
        ...savedLayout,
        ...restoredFrame,
        imageUrl: completed[idx]?.processedUrl || primaryUrl,
        ...(restoredFrame?.imageUrl ? { imageUrl: restoredFrame.imageUrl } : {}),
        dimensionAnnotations: normalizeDimensionAnnotations(restoredFrame?.dimensionAnnotations || savedLayout?.dimensionAnnotations)
      };
    });
  });

  const [activeFrameId, setActiveFrameId] = useState<string>(String(initialBoardDimensions?.activeFrameId || 'frame-1'));
  const [dragOverFrameId, setDragOverFrameId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [dimensionsVisible, setDimensionsVisible] = useState(Number(initialBoardDimensions?.visible ?? 1) !== 0);
  const [dimensionColor, setDimensionColor] = useState(String(initialBoardDimensions?.color || '#D48B16'));
  const [dimensionThickness, setDimensionThickness] = useState(Number(initialBoardDimensions?.thickness || 2));
  const [digitStyle, setDigitStyle] = useState<'latin' | 'arabic'>(initialBoardDimensions?.digits === 'arabic' ? 'arabic' : 'latin');
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFrame = frames.find((f) => f.id === activeFrameId) || frames[0];
  const completedList = images.filter((img) => img.status === 'completed' && (img.processedUrl || img.originalUrl));
  const hasStoryboardImages = frames.some((frame) => Boolean(frame.imageUrl));
  const dimensionUnitLabel = (unit?: StoryboardFrame['dimUnit']) =>
    unit === 'mm'
      ? (isArabic ? 'مم' : 'mm')
      : unit === 'in'
        ? (isArabic ? 'بوصة' : 'in')
        : (isArabic ? 'سم' : 'cm');
  const imageSignature = useMemo(
    () => frames.map((frame) => `${frame.id}:${frame.imageUrl ? imageKey(frame.imageUrl) : ''}:${frame.dimensionImageKey || ''}`).join('|'),
    [frames]
  );

  useEffect(() => {
    onBoardStateChange?.(frames, {
      activeFrameId,
      visible: dimensionsVisible ? 1 : 0,
      color: dimensionColor,
      thickness: dimensionThickness,
      digits: digitStyle
    });
  }, [onBoardStateChange, frames, activeFrameId, dimensionsVisible, dimensionColor, dimensionThickness, digitStyle]);

  useEffect(() => {
    let cancelled = false;
    const pending = frames.filter((frame) => frame.imageUrl && frame.dimensionImageKey !== imageKey(frame.imageUrl));
    for (const frame of pending) {
      if (!frame.imageUrl) continue;
      const sourceUrl = frame.imageUrl;
      void readAlphaBounds(sourceUrl).then((bounds) => {
        if (cancelled) return;
        setFrames((current) => current.map((item) => item.id === frame.id && item.imageUrl === sourceUrl
          ? {
            ...item,
            dimensionImageKey: imageKey(sourceUrl),
            dimensionAnnotations: createDefaultAnnotations(bounds, item)
          }
          : item));
      }).catch((error: unknown) => {
        if (!cancelled) {
          setExportMessage(error instanceof Error ? error.message : (isArabic ? 'تعذر تحديد حدود المنتج.' : 'Could not detect product bounds.'));
        }
      });
    }
    return () => { cancelled = true; };
  }, [imageSignature, isArabic]);

  useEffect(() => {
    try {
      localStorage.setItem('alshams_board_dimensions', JSON.stringify(Object.fromEntries(
        frames.map((frame) => [frame.id, {
          dimensionImageKey: frame.dimensionImageKey,
          dimensionAnnotations: frame.dimensionAnnotations
        }])
      )));
    } catch {
      setExportMessage(isArabic ? 'تعذر حفظ مواضع القياسات محلياً.' : 'Could not save dimension positions locally.');
    }
  }, [frames, isArabic]);

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

  const updateActiveDimensions = (partial: Partial<Pick<StoryboardFrame, 'dimHeight' | 'dimWidth' | 'dimDepth' | 'dimUnit'>>) => {
    setFrames((prev) => prev.map((frame) => frame.id === activeFrameId ? { ...frame, ...partial } : frame));
  };

  const updateDimensionAnnotation = (frameId: string, annotationId: DimensionAnnotation['id'], update: Partial<DimensionAnnotation>) => {
    setFrames((prev) => prev.map((frame) => frame.id === frameId
      ? {
        ...frame,
        dimensionAnnotations: (frame.dimensionAnnotations || []).map((annotation) =>
          annotation.id === annotationId ? { ...annotation, ...update } : annotation
        )
      }
      : frame));
  };

  const changeDimensionUnit = (unit: NonNullable<StoryboardFrame['dimUnit']>) => {
    const factors = { cm: 1, mm: 10, in: 1 / 2.54 };
    const sourceUnit = activeFrame.dimUnit || 'cm';
    const conversion = factors[unit] / factors[sourceUnit];
    updateActiveDimensions({
      dimUnit: unit,
      dimHeight: Number(((activeFrame.dimHeight ?? 24) * conversion).toFixed(1)),
      dimWidth: Number(((activeFrame.dimWidth ?? 18) * conversion).toFixed(1)),
      dimDepth: Number(((activeFrame.dimDepth ?? 9) * conversion).toFixed(1))
    });
  };

  // Export Combined Composite Storyboard Collage (2400 x 2400 UHD 2x2 Grid via Native Canvas)
  const handleExportComposite = async (copyToClipboard = false) => {
    setIsExporting(true);
    setExportMessage(null);
    soundEffects.playClick();

    try {
      if (!hasStoryboardImages) {
        throw new Error(isArabic ? 'أضف صورة واحدة على الأقل قبل التصدير.' : 'Add at least one image before exporting.');
      }
      const canvas = compositeCanvasRef.current;
      if (!canvas) throw new Error(isArabic ? 'تعذر إنشاء لوحة التصدير.' : 'Could not create the export canvas.');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error(isArabic ? 'تعذر تهيئة لوحة التصدير.' : 'Could not initialize the export canvas.');

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

      ctx.shadowColor = 'rgba(0, 0, 0, 0.42)';
      ctx.shadowBlur = 28;
      ctx.shadowOffsetY = 18;
      ctx.drawImage(imgEl, drawX, drawY, drawW, drawH);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

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

      if (dimensionsVisible) {
        drawDimensionAnnotations(
          ctx,
          rect,
          frameData,
          isArabic,
          dimensionUnitLabel(frameData.dimUnit),
          dimensionColor,
          dimensionThickness,
          digitStyle
        );
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
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            drawImageInFrame(img, rect, frameData);
            resolve();
          };
          img.onerror = () => reject(new Error(isArabic ? `تعذر تحميل صورة ${frameData.title}.` : `Could not load ${frameData.title}.`));
          img.src = url;
        });
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

      if (copyToClipboard) {
        if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
          throw new Error(isArabic ? 'نسخ الصور غير مدعوم في هذا المتصفح أو الاتصال.' : 'Image clipboard is not supported in this browser or connection.');
        }
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (result) => result
              ? resolve(result)
              : reject(new Error(isArabic ? 'تعذر تجهيز الصورة للنسخ.' : 'Could not prepare the image for copying.')),
            'image/png'
          );
        });
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setExportMessage(isArabic ? 'تم نسخ اللوحة' : 'Board copied');
      } else {
        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `ستوديو_الشمساوية_كولاج_المشاهد_2400x2400_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setExportMessage(isArabic ? 'تم تنزيل اللوحة' : 'Board downloaded');
      }
      soundEffects.playCompletionChime();
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : (isArabic ? 'تعذر تصدير اللوحة.' : 'Could not export the board.'));
    } finally {
      setIsExporting(false);
    }
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
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      {/* Hidden File Input for Direct Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      
      <div className="flex shrink-0 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-[#0B1528]">
        <h1 className="text-sm font-bold text-slate-900 dark:text-white">{isArabic ? 'لوحتي' : 'Board'}</h1>
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
            onClick={() => handleExportComposite()}
            disabled={isExporting || !hasStoryboardImages}
            title={isArabic ? 'تصدير اللوحة' : 'Export board'}
            aria-label={isArabic ? 'تصدير اللوحة' : 'Export board'}
            className="rounded-lg p-2 text-[#0F2952] transition-colors hover:bg-slate-100 disabled:opacity-50 dark:text-amber-400 dark:hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleExportComposite(true)}
            disabled={isExporting || !hasStoryboardImages}
            title={isArabic ? 'نسخ اللوحة' : 'Copy board'}
            aria-label={isArabic ? 'نسخ اللوحة' : 'Copy board'}
            className="rounded-lg p-2 text-[#0F2952] transition-colors hover:bg-slate-100 disabled:opacity-50 dark:text-amber-400 dark:hover:bg-slate-800"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>
      {exportMessage && (
        <p role="status" className="shrink-0 px-1 text-xs text-slate-600 dark:text-slate-300">{exportMessage}</p>
      )}

      {/* Hidden Offscreen Canvas for Composite Generation */}
      <canvas ref={compositeCanvasRef} className="hidden" />

      <section className="shrink-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="truncate text-xs font-bold text-slate-800 dark:text-white">
            {isArabic ? activeFrame.title : activeFrame.titleEn}
          </h2>
          <button
            type="button"
            onClick={() => setDimensionsVisible((visible) => !visible)}
            aria-pressed={dimensionsVisible}
            className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors ${
              dimensionsVisible
                ? 'border-[#D48B16] bg-[#D48B16]/10 text-[#D48B16]'
                : 'border-slate-200 text-slate-500 dark:border-slate-700'
            }`}
          >
            {isArabic ? `الأبعاد ${dimensionsVisible ? 'ظاهرة' : 'مخفية'}` : `Dimensions ${dimensionsVisible ? 'on' : 'off'}`}
          </button>
        </div>
        <div className="relative flex h-[35vh] min-h-[180px] max-h-[420px] items-center justify-center overflow-hidden rounded-xl bg-[#0F2952]">
          <div
            className="relative h-full max-w-full overflow-hidden bg-gradient-to-br from-[#1B3B6F] to-[#081220]"
            style={{ aspectRatio: String(activeFrame.aspectRatioNum) }}
          >
            {activeFrame.imageUrl && (
              <img
                src={activeFrame.imageUrl}
                alt={activeFrame.title}
                className="h-full w-full object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.4)]"
                style={{ transform: `scale(${activeFrame.zoom / 100}) translate(${activeFrame.panX}px, ${activeFrame.panY}px)` }}
              />
            )}
            {dimensionsVisible && activeFrame.imageUrl && (
              <div className="hidden">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                  <path d="M12 16V84 M8 18L12 14L16 18 M8 82L12 86L16 82 M18 86H82 M20 82L16 86L20 90 M80 82L84 86L80 90 M70 16L84 28"
                    fill="none" stroke="#D48B16" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
                </svg>
                <span className="self-end rounded bg-[#0F2952]/90 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  ↗ {activeFrame.dimDepth ?? 9} {dimensionUnitLabel(activeFrame.dimUnit)}
                </span>
                <div className="absolute inset-y-5 start-2 flex items-center">
                  <span className="rounded border border-[#D48B16] bg-[#0F2952]/90 px-2 py-1 text-[10px] font-bold text-white [writing-mode:vertical-rl]">
                    ↕ {activeFrame.dimHeight ?? 24} {dimensionUnitLabel(activeFrame.dimUnit)}
                  </span>
                </div>
                <div className="flex items-center justify-center border-t border-[#D48B16] pt-1">
                  <span className="rounded border border-[#D48B16] bg-[#0F2952]/90 px-2 py-0.5 text-[10px] font-bold text-white">
                    ↔ {activeFrame.dimWidth ?? 18} {dimensionUnitLabel(activeFrame.dimUnit)}
                  </span>
                </div>
              </div>
            )}
            {dimensionsVisible && activeFrame.imageUrl && (
              <ResponsiveDimensionStage
                frame={activeFrame}
                isArabic={isArabic}
                unitLabel={dimensionUnitLabel(activeFrame.dimUnit)}
                color={dimensionColor}
                thickness={dimensionThickness}
                digits={digitStyle}
                onChange={(id, update) => updateDimensionAnnotation(activeFrame.id, id, update)}
              />
            )}
          </div>
        </div>
      </section>

      {/* Main Workspace Layout */}
      <div className="min-h-0 flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-4 items-start pe-1">
          {/* Source Assets Selector Strip */}
          <div className="lg:col-span-12 bg-white dark:bg-[#0B1528] rounded-2xl p-2 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {isArabic ? 'صور المنتجات المعزولة:' : 'Isolated product photos:'}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-mono font-bold">
                  {completedList.length} {isArabic ? 'عنصر' : 'items'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                {isArabic ? 'اختر صورة للكادر النشط أو للجميع' : 'Apply a photo to this frame or all frames'}
              </span>
            </div>

            {completedList.length === 0 ? (
              <div className="p-1.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-center border border-dashed border-slate-200 dark:border-slate-800 text-[10px] sm:text-xs text-slate-400">
                {isArabic ? 'ارفع صور منتجاتك من تبويب «عزل» لتظهر هنا.' : 'Upload product photos in the Isolate tab.'}
              </div>
            ) : (
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                {completedList.map((item) => {
                  const itemUrl = item.processedUrl || item.originalUrl;
                  return (
                    <div
                      key={item.id}
                      className="group relative flex flex-shrink-0 flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5 transition-all hover:border-amber-500 dark:border-slate-800 dark:bg-slate-900/60"
                    >
                      <button
                        onClick={() => handleAssignImageToActiveFrame(itemUrl)}
                        className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-transparency-grid p-1"
                        title={isArabic ? 'تطبيق على الكادر النشط' : 'Apply to active frame'}
                      >
                        <img src={itemUrl} alt={item.name} className="max-h-full max-w-full object-contain" />
                      </button>
                      <button
                        onClick={() => handleApplyToAllFrames(itemUrl)}
                        className="text-[10px] font-semibold text-amber-500 hover:underline"
                      >
                        {isArabic ? 'للجميع' : 'All'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4 Storyboard Panels Grid (8 cols on desktop) */}
          <div className="lg:col-span-8 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
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
                  className={`group relative w-[min(84vw,440px)] shrink-0 snap-start rounded-2xl border transition-all overflow-hidden cursor-pointer bg-white dark:bg-[#0B1528] shadow-xs flex flex-col ${
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
                    {dimensionsVisible && frame.imageUrl && (frame.type === 'technical' || frame.id === activeFrameId) && (
                      <div className="hidden">
                        {/* Depth Tag (Top Right) */}
                        <div className="flex justify-end">
                          <div className="px-2 py-0.5 rounded-md bg-[#0F2952]/90 backdrop-blur-xs border border-[#D48B16]/60 text-[9px] font-mono text-amber-300 font-bold shadow-md">
                            ⤢ {isArabic ? 'العمق' : 'Depth'}: {frame.dimDepth || 9} {dimensionUnitLabel(frame.dimUnit)}
                          </div>
                        </div>

                        {/* Height Dimension Line & Arrows (Start/Left) */}
                        <div className="absolute inset-y-6 start-2 flex flex-col items-center justify-between">
                          <div className="w-2.5 h-[1.5px] bg-[#D48B16]" />
                          <div className="relative flex-1 w-[1.5px] bg-[#D48B16] flex items-center justify-center">
                            <div className="absolute top-0 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-[#D48B16]" />
                            <span className="bg-[#0F2952]/95 border border-[#D48B16] text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap transform -rotate-90">
                              ↕ {frame.dimHeight || 24} {dimensionUnitLabel(frame.dimUnit)}
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
                              ↔ {frame.dimWidth || 18} {dimensionUnitLabel(frame.dimUnit)}
                            </span>
                            <div className="absolute end-0 w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-s-[5px] border-s-[#D48B16]" />
                          </div>
                          <div className="h-2.5 w-[1.5px] bg-[#D48B16]" />
                        </div>
                      </div>
                    )}
                    {dimensionsVisible && frame.imageUrl && (
                      <ResponsiveDimensionStage
                        frame={frame}
                        isArabic={isArabic}
                        unitLabel={dimensionUnitLabel(frame.dimUnit)}
                        color={dimensionColor}
                        thickness={dimensionThickness}
                        digits={digitStyle}
                        onChange={(id, update) => updateDimensionAnnotation(frame.id, id, update)}
                      />
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

              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {isArabic ? 'مقاسات المنتج' : 'Product dimensions'}
                    </label>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px]">
                      {(['cm', 'mm', 'in'] as const).map((unit) => (
                        <button
                          key={unit}
                          onClick={() => changeDimensionUnit(unit)}
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
                          onChange={(e) => updateActiveDimensions({ dimHeight: Number(e.target.value) || 0 })}
                          className="w-full pe-7 ps-1 py-2 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-mono text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#D48B16]"
                        />
                        <span className="absolute end-1.5 top-2 text-[9px] text-slate-400 font-mono pointer-events-none">
                          {dimensionUnitLabel(activeFrame.dimUnit)}
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
                          onChange={(e) => updateActiveDimensions({ dimWidth: Number(e.target.value) || 0 })}
                          className="w-full pe-7 ps-1 py-2 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-mono text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#D48B16]"
                        />
                        <span className="absolute end-1.5 top-2 text-[9px] text-slate-400 font-mono pointer-events-none">
                          {dimensionUnitLabel(activeFrame.dimUnit)}
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
                          onChange={(e) => updateActiveDimensions({ dimDepth: Number(e.target.value) || 0 })}
                          className="w-full pe-7 ps-1 py-2 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-mono text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#D48B16]"
                        />
                        <span className="absolute end-1.5 top-2 text-[9px] text-slate-400 font-mono pointer-events-none">
                          {dimensionUnitLabel(activeFrame.dimUnit)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="grid grid-cols-3 gap-1">
                    {(['height', 'width', 'depth'] as const).map((id) => {
                      const annotation = activeFrame.dimensionAnnotations?.find((item) => item.id === id);
                      const visible = annotation?.visible ?? true;
                      return (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={visible}
                          onClick={() => updateDimensionAnnotation(activeFrame.id, id, { visible: !visible })}
                          className={`rounded-lg border px-1 py-1.5 text-[10px] font-semibold ${
                            visible ? 'border-[#D48B16] bg-[#D48B16]/10 text-[#D48B16]' : 'border-slate-200 text-slate-400 dark:border-slate-700'
                          }`}
                        >
                          {DIMENSION_LABELS[id][isArabic ? 'ar' : 'en']}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <label className="text-[11px] text-slate-500">{isArabic ? 'لون الخط' : 'Line color'}</label>
                    <input
                      type="color"
                      aria-label={isArabic ? 'لون خطوط القياس' : 'Dimension line color'}
                      value={dimensionColor}
                      onChange={(event) => setDimensionColor(event.target.value)}
                      className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent"
                    />
                  </div>

                  <label className="block space-y-1">
                    <span className="flex justify-between text-[11px] text-slate-500">
                      <span>{isArabic ? 'سمك الخط' : 'Line thickness'}</span>
                      <span>{dimensionThickness}px</span>
                    </span>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={dimensionThickness}
                      onChange={(event) => setDimensionThickness(Number(event.target.value))}
                      className="w-full accent-[#D48B16]"
                    />
                  </label>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500">{isArabic ? 'شكل الأرقام' : 'Digits'}</span>
                    <div className="flex gap-1">
                      {(['latin', 'arabic'] as const).map((style) => (
                        <button
                          key={style}
                          type="button"
                          aria-pressed={digitStyle === style}
                          onClick={() => setDigitStyle(style)}
                          className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
                            digitStyle === style ? 'bg-[#D48B16] text-slate-950' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                          }`}
                        >
                          {style === 'latin' ? '123' : '١٢٣'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

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

    </div>
  );
};
