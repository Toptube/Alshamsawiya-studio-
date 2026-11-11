import React, { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { ArrowDownToLine, Check, Clipboard, RefreshCw, Share2, Type } from 'lucide-react';
import { Image as KonvaImage, Layer, Rect, Stage, Text, Transformer } from 'react-konva';
import type Konva from 'konva';
import '@fontsource/cairo/400.css';
import '@fontsource/cairo/700.css';
import '@fontsource/tajawal/400.css';
import '@fontsource/tajawal/700.css';
import '@fontsource/noto-naskh-arabic/400.css';
import '@fontsource/noto-naskh-arabic/700.css';
import type { StoryboardFrame } from '../board/StoryboardWorkspace';
import type { AdCopySuggestion, ProductDescription } from '../../shared/lib/visionProvider';
import { geminiVisionProvider, getVisionApiKey, setVisionApiKey, visionErrorMessage } from '../../shared/lib/visionProvider';
import { PRODUCT_TYPE_LABELS } from '../scenes/sceneAdvisorData';

type CopyKey = keyof AdCopySuggestion;
interface AdTextLayer extends AdCopySuggestion {
  positions: Record<CopyKey, { x: number; y: number; fontSize: number }>;
  fontFamily: 'Cairo' | 'Tajawal' | 'Noto Naskh Arabic';
  color: string;
  shadow: boolean;
}
interface AdFrameState {
  frameId: string;
  suggestions: AdCopySuggestion[];
  draft: AdCopySuggestion;
  approved: boolean;
  layer: AdTextLayer;
}

interface AdStoryboardProps {
  frames: StoryboardFrame[];
  isArabic: boolean;
  product: ProductDescription;
  dimensions: string;
  initialAdFrames?: Record<string, unknown>[];
  onStateChange: (adFrames: Record<string, unknown>[], adCopy: string) => void;
}

const COPY_KEYS: CopyKey[] = ['headline', 'subline', 'callToAction'];
const TYPE_COPY: Record<string, AdCopySuggestion[]> = {
  cushion: [
    { headline: 'لمسة دفء لبيتك', subline: 'تفاصيل يدوية وخامة مريحة لكل ركن', callToAction: 'اختاري قطعتك الآن' },
    { headline: 'راحة بتفاصيل صنعت بحب', subline: 'كوشن حرفي يضيف روحاً للمكان', callToAction: 'اكتشفي المجموعة' },
    { headline: 'جددي ركنك ببساطة', subline: 'ألوان هادئة ولمسات يدوية مميزة', callToAction: 'اطلبي عبر الرسائل' }
  ],
  macrame: [
    { headline: 'فن يزين جدرانك', subline: 'مكرمية يدوية بتفاصيل طبيعية', callToAction: 'شاهدي التفاصيل' },
    { headline: 'حكاية خيط صنعت يدوياً', subline: 'قطعة فريدة لركن يشبهك', callToAction: 'اطلبي قطعتك' },
    { headline: 'دفء طبيعي لكل مساحة', subline: 'عقد متقنة وخامات مختارة', callToAction: 'تواصلي معنا' }
  ],
  bag: [
    { headline: 'تفاصيل تحمل حكايتك', subline: 'حقيبة يدوية بتشطيب متقن', callToAction: 'اكتشفيها الآن' },
    { headline: 'قطعتك اليومية بطابع خاص', subline: 'تصميم حرفي يجمع الجمال والعملية', callToAction: 'اطلبيها اليوم' },
    { headline: 'صُنعت لترافقك', subline: 'خامة جميلة ولمسات يدوية فريدة', callToAction: 'راسلينا للتفاصيل' }
  ],
  other: [
    { headline: 'صنعة يدوية من القلب', subline: 'تفاصيل فريدة تضيف معنى لمساحتك', callToAction: 'اكتشفي القطعة' },
    { headline: 'قطعة مختلفة لك', subline: 'خامات مختارة وتشطيب بعناية', callToAction: 'اطلبي الآن' },
    { headline: 'الجمال في التفاصيل', subline: 'عمل حرفي صنع بحب وإتقان', callToAction: 'تواصلي معنا' }
  ]
};

const fallbackCopy = (type: string) => TYPE_COPY[type] || TYPE_COPY.other;

const makeLayer = (copy: AdCopySuggestion, frame: StoryboardFrame): AdTextLayer => ({
  ...copy,
  positions: {
    headline: { x: 36, y: frame.aspectRatioNum < 0.8 ? 60 : 38, fontSize: 24 },
    subline: { x: 36, y: frame.aspectRatioNum < 0.8 ? 108 : 76, fontSize: 16 },
    callToAction: { x: 36, y: frame.aspectRatioNum < 0.8 ? 160 : 116, fontSize: 17 }
  },
  fontFamily: 'Cairo',
  color: '#0F2952',
  shadow: true
});

const imageFromUrl = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('تعذر فتح صورة الكادر للتصدير.'));
  image.src = url;
});

const renderAdFrame = async (frame: StoryboardFrame, layer: AdTextLayer) => {
  if (!frame.imageUrl) throw new Error('لا توجد صورة في هذا الكادر.');
  const image = await imageFromUrl(frame.imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || 1080;
  canvas.height = image.naturalHeight || 1350;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('تعذر تجهيز صورة الإعلان.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const sx = canvas.width / 360;
  const sy = sx;
  context.textAlign = 'right';
  context.direction = 'rtl';
  context.shadowColor = layer.shadow ? 'rgba(0,0,0,.24)' : 'transparent';
  context.shadowBlur = layer.shadow ? 8 * sx : 0;
  for (const key of COPY_KEYS) {
    const position = layer.positions[key];
    context.font = `700 ${position.fontSize * sx}px "${layer.fontFamily}"`;
    context.fillStyle = layer.color;
    context.fillText(layer[key], canvas.width - position.x * sx, position.y * sy, canvas.width * 0.76);
  }
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('تعذر تصدير صورة الإعلان.')), 'image/png');
  });
};

const AdCanvas: React.FC<{
  frame: StoryboardFrame;
  state: AdFrameState;
  onChange: (next: AdFrameState) => void;
}> = ({ frame, state, onChange }) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<CopyKey | null>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodesRef = useRef<Partial<Record<CopyKey, Konva.Text>>>({});
  const width = 360;
  const height = width / frame.aspectRatioNum;
  useEffect(() => {
    let active = true;
    if (!frame.imageUrl) {
      setImage(null);
      return;
    }
    void imageFromUrl(frame.imageUrl).then((loaded) => { if (active) setImage(loaded); });
    return () => { active = false; };
  }, [frame.imageUrl]);
  useEffect(() => {
    const node = selectedLayer ? nodesRef.current[selectedLayer] : null;
    if (node && transformerRef.current) {
      transformerRef.current.nodes([node]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedLayer, state]);

  const updatePosition = (key: CopyKey, x: number, y: number, fontSize?: number) => {
    onChange({
      ...state,
      layer: {
        ...state.layer,
        positions: {
          ...state.layer.positions,
          [key]: { ...state.layer.positions[key], x, y, ...(fontSize ? { fontSize } : {}) }
        }
      }
    });
  };

  return (
    <div className="relative mx-auto overflow-hidden rounded-xl border border-slate-300 shadow-lg dark:border-slate-700" style={{ width: 'min(100%, 360px)', aspectRatio: String(frame.aspectRatioNum) }}>
      <Stage width={width} height={height} scaleX={1} scaleY={1} style={{ width: '100%', height: '100%' }}>
        <Layer>
          {image && <KonvaImage image={image} width={width} height={height} />}
          <Rect x={0} y={0} width={width} height={height} fill="transparent" listening={false} />
          {frame.aspectRatioNum < 0.8 && <Rect x={0} y={height * 0.1} width={width} height={height * 0.8} stroke="#D48B16" dash={[6, 5]} opacity={0.55} listening={false} />}
          {COPY_KEYS.map((key) => {
            const position = state.layer.positions[key];
            return (
              <Text
                key={key}
                ref={(node) => { nodesRef.current[key] = node || undefined; }}
                text={state.layer[key]}
                x={position.x}
                y={position.y}
                width={width - position.x - 24}
                fontSize={position.fontSize}
                fontFamily={state.layer.fontFamily}
                fontStyle="bold"
                fill={state.layer.color}
                align="right"
                shadowColor={state.layer.shadow ? '#000000' : undefined}
                shadowBlur={state.layer.shadow ? 5 : 0}
                shadowOpacity={state.layer.shadow ? 0.3 : 0}
                draggable
                onClick={() => setSelectedLayer(key)}
                onTap={() => setSelectedLayer(key)}
                onDragEnd={(event) => updatePosition(key, event.target.x(), event.target.y())}
                onTransformEnd={(event) => {
                  const node = event.target as Konva.Text;
                  const scale = Math.max(0.7, Math.min(2.5, node.scaleX()));
                  node.scaleX(1);
                  node.scaleY(1);
                  updatePosition(key, node.x(), node.y(), Math.round(position.fontSize * scale));
                }}
              />
            );
          })}
          <Transformer ref={transformerRef} rotateEnabled={false} enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']} />
        </Layer>
      </Stage>
    </div>
  );
};

export const AdStoryboard: React.FC<AdStoryboardProps> = ({
  frames,
  isArabic,
  product,
  dimensions,
  initialAdFrames = [],
  onStateChange
}) => {
  const availableFrames = useMemo(() => frames.filter((frame) => frame.imageUrl), [frames]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [frameStates, setFrameStates] = useState<Record<string, AdFrameState>>({});
  const [activeFrameId, setActiveFrameId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState(getVisionApiKey);

  useEffect(() => {
    if (!initialAdFrames.length) return;
    const restored = initialAdFrames.reduce<Record<string, AdFrameState>>((result, value) => {
      const state = value as unknown as AdFrameState;
      if (state.frameId && state.layer) result[state.frameId] = state;
      return result;
    }, {});
    setFrameStates(restored);
    setSelectedIds(Object.keys(restored).slice(0, 5));
    setActiveFrameId(Object.keys(restored)[0] || '');
  }, [initialAdFrames]);

  useEffect(() => {
    const saved = selectedIds.flatMap((id) => frameStates[id] ? [frameStates[id] as unknown as Record<string, unknown>] : []);
    const approvedCopies = selectedIds.flatMap((id) => {
      const state = frameStates[id];
      return state?.approved ? [`${state.draft.headline}\n${state.draft.subline}\n${state.draft.callToAction}`] : [];
    });
    onStateChange(saved, approvedCopies.join('\n\n'));
  }, [selectedIds, frameStates, onStateChange]);

  const updateFrameState = (id: string, update: (current: AdFrameState) => AdFrameState) => {
    setFrameStates((current) => current[id] ? { ...current, [id]: update(current[id]) } : current);
  };

  const toggleFrame = (frame: StoryboardFrame) => {
    setSelectedIds((current) => {
      if (current.includes(frame.id)) {
        const next = current.filter((id) => id !== frame.id);
        if (activeFrameId === frame.id) setActiveFrameId(next[0] || '');
        return next;
      }
      if (current.length >= 5) {
        setNotice(isArabic ? 'يمكن اختيار خمسة كادرات كحد أقصى.' : 'Select up to five frames.');
        return current;
      }
      const initialCopy = fallbackCopy(product.type)[0];
      setFrameStates((previous) => ({
        ...previous,
        [frame.id]: previous[frame.id] || {
          frameId: frame.id,
          suggestions: fallbackCopy(product.type),
          draft: { ...initialCopy },
          approved: false,
          layer: makeLayer(initialCopy, frame)
        }
      }));
      setActiveFrameId(frame.id);
      return [...current, frame.id];
    });
  };

  const generateCopy = async (frameId: string) => {
    const frame = availableFrames.find((item) => item.id === frameId);
    if (!frame) return;
    setIsLoading(true);
    setNotice(null);
    setVisionApiKey(apiKey);
    let suggestions: AdCopySuggestion[];
    try {
      suggestions = await geminiVisionProvider.suggestAdCopy({ product, dimensions, apiKey });
      if (suggestions.length < 3) throw new Error('لم تصل ثلاثة اقتراحات مكتملة.');
      setNotice(isArabic ? 'تم توليد اقتراحات النص.' : 'Copy suggestions generated.');
    } catch (error) {
      suggestions = fallbackCopy(product.type);
      setNotice(visionErrorMessage(error, isArabic));
    } finally {
      setIsLoading(false);
    }
    const next = suggestions.slice(0, 3);
    setFrameStates((current) => {
      const state = current[frameId];
      if (!state) return current;
      const draft = { ...next[0] };
      return {
        ...current,
        [frameId]: {
          ...state,
          suggestions: next,
          draft,
          approved: false,
          layer: makeLayer(draft, frame)
        }
      };
    });
  };

  const downloadPng = async (frame: StoryboardFrame) => {
    const state = frameStates[frame.id];
    if (!state) return;
    const blob = await renderAdFrame(frame, state.layer);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `alshams-ad-${frame.id}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportZip = async () => {
    const zip = new JSZip();
    for (const id of selectedIds) {
      const frame = availableFrames.find((item) => item.id === id);
      const state = frameStates[id];
      if (frame && state?.approved) zip.file(`${id}.png`, await renderAdFrame(frame, state.layer));
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'alshams-ad-storyboard.zip';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const activeFrame = availableFrames.find((frame) => frame.id === activeFrameId);
  const activeState = activeFrame ? frameStates[activeFrame.id] : undefined;

  return (
    <section className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-1">
      <header className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#0B1528]">
        <div>
          <h1 className="text-lg font-bold text-[#0F2952] dark:text-white">{isArabic ? 'إعلان' : 'Ad Storyboard'}</h1>
          <p className="text-sm text-slate-500">{PRODUCT_TYPE_LABELS[product.type] || product.type} · {product.materials.join('، ') || 'خامات غير محددة'} · {dimensions || 'المقاسات غير محددة'}</p>
        </div>
        <button type="button" disabled={!selectedIds.some((id) => frameStates[id]?.approved)} onClick={() => void exportZip()} className="flex min-h-11 items-center gap-2 rounded-lg bg-[#0F2952] px-3 text-sm font-bold text-white disabled:opacity-40">
          <ArrowDownToLine className="h-4 w-4" /> {isArabic ? 'تصدير الكل ZIP' : 'Export all ZIP'}
        </button>
      </header>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {availableFrames.map((frame) => (
          <button key={frame.id} type="button" onClick={() => toggleFrame(frame)} aria-pressed={selectedIds.includes(frame.id)} className={`w-28 shrink-0 overflow-hidden rounded-lg border text-start ${selectedIds.includes(frame.id) ? 'border-[#D48B16] ring-2 ring-[#D48B16]/30' : 'border-slate-300 dark:border-slate-700'}`}>
            <img src={frame.imageUrl || ''} alt="" className="h-20 w-full object-cover" />
            <span className="block truncate px-2 py-1 text-sm">{frame.title}</span>
          </button>
        ))}
      </div>
      {notice && <p role="status" className="text-sm text-amber-700 dark:text-amber-300">{notice}</p>}
      {!selectedIds.length && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
          <Type className="mx-auto mb-2 h-6 w-6 text-[#D48B16]" />
          {availableFrames.length ? (isArabic ? 'اختر من كادر إلى خمسة كادرات لبدء إعداد الإعلان.' : 'Choose one to five frames to start.') : (isArabic ? 'أضف مشاهد في «لوحتي» أولاً.' : 'Add scenes in Board first.')}
        </div>
      )}
      {activeFrame && activeState && (
        <div className="grid gap-3 xl:grid-cols-[minmax(280px,420px)_1fr]">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#0B1528]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-bold">{activeFrame.title}</h2>
              <button type="button" onClick={() => void generateCopy(activeFrame.id)} disabled={isLoading} className="flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> {isArabic ? 'تجديد' : 'Regenerate'}
              </button>
            </div>
            <div className="space-y-2">
              {activeState.suggestions.map((suggestion, index) => (
                <button key={`${suggestion.headline}-${index}`} type="button" onClick={() => updateFrameState(activeFrame.id, (current) => ({ ...current, draft: { ...suggestion }, approved: false, layer: makeLayer(suggestion, activeFrame) }))} className="w-full rounded-lg border border-slate-200 p-2 text-start hover:border-[#D48B16] dark:border-slate-700">
                  <span className="font-bold">{suggestion.headline}</span>
                  <span className="block text-sm text-slate-500">{suggestion.subline}</span>
                  <span className="block text-sm font-semibold text-[#D48B16]">{suggestion.callToAction}</span>
                </button>
              ))}
            </div>
            {COPY_KEYS.map((key) => (
              <label key={key} className="block space-y-1 text-sm font-semibold">
                {key === 'headline' ? 'العنوان' : key === 'subline' ? 'النص الفرعي' : 'الدعوة للإجراء'}
                <input value={activeState.draft[key]} onChange={(event) => updateFrameState(activeFrame.id, (current) => {
                  const draft = { ...current.draft, [key]: event.target.value };
                  return { ...current, draft, layer: { ...current.layer, [key]: event.target.value } };
                })} className="min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700" />
              </label>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">الخط
                <select value={activeState.layer.fontFamily} onChange={(event) => updateFrameState(activeFrame.id, (current) => ({ ...current, layer: { ...current.layer, fontFamily: event.target.value as AdTextLayer['fontFamily'] } }))} className="min-h-11 w-full rounded-lg border bg-transparent px-2 dark:border-slate-700">
                  <option value="Cairo">Cairo</option><option value="Tajawal">Tajawal</option><option value="Noto Naskh Arabic">Noto Naskh</option>
                </select>
              </label>
              <label className="text-sm">اللون
                <input type="color" value={activeState.layer.color} onChange={(event) => updateFrameState(activeFrame.id, (current) => ({ ...current, layer: { ...current.layer, color: event.target.value } }))} className="h-11 w-full rounded-lg border p-1 dark:border-slate-700" />
              </label>
            </div>
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={activeState.layer.shadow} onChange={(event) => updateFrameState(activeFrame.id, (current) => ({ ...current, layer: { ...current.layer, shadow: event.target.checked } }))} /> ظل للنص</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => updateFrameState(activeFrame.id, (current) => ({ ...current, approved: true }))} className="flex min-h-11 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white"><Check className="h-4 w-4" /> اعتماد النص</button>
              <button type="button" onClick={() => void downloadPng(activeFrame)} disabled={!activeState.approved} className="flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm disabled:opacity-40"><ArrowDownToLine className="h-4 w-4" /> PNG</button>
              <button type="button" onClick={() => void navigator.clipboard.writeText(`${activeState.draft.headline}\n${activeState.draft.subline}\n${activeState.draft.callToAction}`)} className="flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm"><Clipboard className="h-4 w-4" /> نسخ</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(`${activeState.draft.headline}\n${activeState.draft.subline}\n${activeState.draft.callToAction}`)}`} target="_blank" rel="noreferrer" className="flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-sm"><Share2 className="h-4 w-4" /> واتساب</a>
            </div>
          </div>
          <div className="space-y-3 rounded-xl bg-slate-100 p-3 dark:bg-slate-900">
            <AdCanvas frame={activeFrame} state={activeState} onChange={(next) => setFrameStates((current) => ({ ...current, [activeFrame.id]: next }))} />
            <p className="text-center text-sm text-slate-500">{activeState.approved ? 'تم اعتماد النص — اسحب العناصر أو كبّرها من المقابض.' : 'اختر اقتراحاً أو عدّل النص ثم اعتمده.'}</p>
          </div>
        </div>
      )}
    </section>
  );
};
