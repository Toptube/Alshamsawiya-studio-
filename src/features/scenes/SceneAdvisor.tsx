import React, { useEffect, useMemo, useState } from 'react';
import { Check, KeyRound, Sparkles } from 'lucide-react';
import type { ProductType, ProductDescription, VisionSceneCandidate } from '../../shared/lib/visionProvider';
import { geminiVisionProvider, getVisionApiKey, setVisionApiKey, visionErrorMessage } from '../../shared/lib/visionProvider';
import { mergeSceneCandidates, PRODUCT_TYPES, PRODUCT_TYPE_LABELS, type SceneRecipe } from './sceneAdvisorData';

interface SceneAdvisorProps {
  imageUrl: string | null;
  imageBlob: Blob | null;
  selectedType: ProductType;
  initialDescription?: string;
  onTypeChange: (type: ProductType) => void;
  onDescriptionChange: (description: ProductDescription) => void;
  onChoose: (scene: { id: string; title: string; imageUrl: string; prompt: string; type: ProductType }) => void;
  isArabic: boolean;
}

const imageBlobFromUrl = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('تعذر فتح صورة المنتج.');
  return response.blob();
};

const renderCandidate = async (productUrl: string, recipe: SceneRecipe, index: number) => {
  const bitmap = await createImageBitmap(await imageBlobFromUrl(productUrl));
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('تعذر إنشاء معاينة المشهد.');
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    if (recipe.background.includes('linear-gradient')) {
      const colors = recipe.background.match(/#[0-9a-f]{3,8}/gi) || ['#f4eee5', '#c4b8a7'];
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(1, colors[colors.length - 1]);
    } else {
      gradient.addColorStop(0, '#f4eee5');
      gradient.addColorStop(1, '#c4b8a7');
    }
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    const recipeId = recipe.id;
    if (recipeId.includes('sofa') || recipeId.includes('reading')) {
      context.fillStyle = 'rgba(255,255,255,.38)';
      context.fillRect(0, 760, 1080, 590);
      context.fillStyle = '#b9a58f';
      context.beginPath();
      context.roundRect(120, 790, 840, 330, 100);
      context.fill();
      context.fillStyle = '#8f806f';
      context.fillRect(175, 1050, 730, 190);
    } else if (recipeId.includes('wall') || recipeId.includes('plant')) {
      context.fillStyle = 'rgba(255,255,255,.25)';
      context.fillRect(0, 0, 1080, 1350);
      context.fillStyle = '#65806a';
      for (let leaf = 0; leaf < 8; leaf += 1) {
        context.beginPath();
        context.ellipse(850 + Math.sin(leaf) * 55, 770 - leaf * 46, 26, 90, leaf * 0.4, 0, Math.PI * 2);
        context.fill();
      }
      context.fillStyle = '#8b6346';
      context.fillRect(838, 930, 30, 240);
    } else if (recipeId.includes('hand')) {
      context.fillStyle = '#d4ae91';
      context.beginPath();
      context.ellipse(845, 785, 52, 200, -0.3, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(255,255,255,.25)';
      context.fillRect(0, 1060, 1080, 290);
    } else {
      context.fillStyle = 'rgba(40,34,27,.16)';
      context.beginPath();
      context.ellipse(540, 1160, 350, 50, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#d8d1c7';
      context.fillRect(170, 1040, 740, 210);
    }

    const fitScale = Math.min(720 / bitmap.width, 760 / bitmap.height);
    const scale = fitScale * (index % 2 === 0 ? 1 : 0.94);
    const width = bitmap.width * scale;
    const height = bitmap.height * scale;
    const x = (canvas.width - width) / 2 + (index % 2 ? 52 : -28);
    const y = 600 - height / 2;
    context.save();
    context.shadowColor = 'rgba(30,25,20,.32)';
    context.shadowBlur = 30;
    context.shadowOffsetX = 12;
    context.shadowOffsetY = 24;
    context.drawImage(bitmap, x, y, width, height);
    context.restore();
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('تعذر تجهيز صورة المشهد.')), 'image/png');
    });
  } finally {
    bitmap.close();
  }
};

export const SceneAdvisor: React.FC<SceneAdvisorProps> = ({
  imageUrl,
  imageBlob,
  selectedType,
  initialDescription = '',
  onTypeChange,
  onDescriptionChange,
  onChoose,
  isArabic
}) => {
  const [description, setDescription] = useState<ProductDescription>({
    type: selectedType,
    description: initialDescription,
    materials: []
  });
  const [apiKey, setApiKey] = useState(getVisionApiKey);
  const [candidates, setCandidates] = useState<Array<SceneRecipe & { previewUrl: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const templates = useMemo(() => mergeSceneCandidates(selectedType, description.description), [selectedType, description.description]);

  useEffect(() => {
    setDescription((current) => ({ ...current, type: selectedType }));
  }, [selectedType]);

  useEffect(() => {
    if (initialDescription) setDescription((current) => ({ ...current, description: initialDescription }));
  }, [initialDescription]);

  const handleGenerate = async () => {
    if (!imageUrl) {
      setNotice(isArabic ? 'ارفع صورة معزولة أولاً لتجهيز مشهد مناسب.' : 'Upload an isolated product first.');
      return;
    }
    setIsLoading(true);
    setNotice(null);
    setCandidates([]);
    setVisionApiKey(apiKey);
    let generated: VisionSceneCandidate[] | undefined;
    try {
      const source = imageBlob || await imageBlobFromUrl(imageUrl);
      const classified = await geminiVisionProvider.classifyProduct(source, apiKey);
      const adjusted = { ...classified, type: selectedType };
      setDescription(adjusted);
      onDescriptionChange(adjusted);
      const suggestions = await geminiVisionProvider.generateSceneCandidates({ image: source, product: adjusted, apiKey });
      generated = suggestions;
      setNotice(isArabic ? 'أنشأ Gemini وصف المشاهد؛ تم تركيب المنتج الأصلي دون تغيير على المعاينات.' : 'Gemini suggested scenes; the original cutout is composited unchanged.');
    } catch (error) {
      setNotice(visionErrorMessage(error, isArabic));
      onDescriptionChange(description);
    }
    try {
      const recipes = mergeSceneCandidates(selectedType, description.description, generated);
      const previews = await Promise.all(recipes.slice(0, 4).map(async (recipe, index) => {
        const blob = await renderCandidate(imageUrl, recipe, index);
        return { ...recipe, previewUrl: URL.createObjectURL(blob) };
      }));
      setCandidates(previews);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : (isArabic ? 'تعذر إنشاء معاينة المشاهد.' : 'Could not create scene previews.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#0B1528]">
      <header className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-[#D48B16]" />
        <div>
          <h2 className="font-bold text-[#0F2952] dark:text-white">{isArabic ? 'مستشار المشاهد' : 'Scene advisor'}</h2>
          <p className="text-sm text-slate-500">{isArabic ? 'اختيار بيئة مناسبة لمنتجك مع الحفاظ على صورة المنتج.' : 'Choose a fitting setting while preserving the product cutout.'}</p>
        </div>
      </header>
      <div className="flex flex-wrap gap-2">
        {PRODUCT_TYPES.map((type) => (
          <button key={type} type="button" onClick={() => { onTypeChange(type); setDescription((current) => ({ ...current, type })); }} aria-pressed={selectedType === type} className={`min-h-11 rounded-full border px-3 text-sm font-semibold ${selectedType === type ? 'border-[#D48B16] bg-[#D48B16]/15 text-[#0F2952] dark:text-amber-300' : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'}`}>
            {PRODUCT_TYPE_LABELS[type]}
          </button>
        ))}
      </div>
      <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 dark:border-slate-700">
        <KeyRound className="h-4 w-4 shrink-0 text-slate-400" />
        <input type="password" autoComplete="off" value={apiKey} onChange={(event) => { setApiKey(event.target.value); setVisionApiKey(event.target.value); }} placeholder={isArabic ? 'مفتاح Gemini اختياري — أو GEMINI_API_KEY في الخادم' : 'Optional Gemini key, or set GEMINI_API_KEY on server'} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
      </label>
      <button type="button" disabled={isLoading || !imageUrl} onClick={() => void handleGenerate()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#0F2952] px-4 text-sm font-bold text-white disabled:opacity-50">
        {isLoading ? <span className="animate-spin">◌</span> : <Sparkles className="h-4 w-4" />}
        {isArabic ? (isLoading ? 'جارٍ إعداد المشاهد...' : 'اقترح مشاهد مناسبة') : (isLoading ? 'Preparing scenes...' : 'Suggest fitting scenes')}
      </button>
      {notice && <p role="status" className="text-sm text-amber-700 dark:text-amber-300">{notice}</p>}
      {candidates.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {candidates.map((candidate) => (
            <article key={candidate.id} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
              <img src={candidate.previewUrl} alt={candidate.title} className="aspect-[4/5] w-full bg-slate-100 object-cover" />
              <div className="space-y-2 p-3">
                <h3 className="font-bold text-slate-800 dark:text-white">{candidate.title}</h3>
                <p className="line-clamp-3 text-sm text-slate-500" dir="ltr">{candidate.prompt}</p>
                <button type="button" onClick={() => onChoose({ id: candidate.id, title: candidate.title, imageUrl: candidate.previewUrl, prompt: candidate.prompt, type: selectedType })} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#D48B16] px-3 text-sm font-bold text-[#0F2952]">
                  <Check className="h-4 w-4" />
                  {isArabic ? 'اختيار وحفظ للمشروع' : 'Choose and save to project'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {!candidates.length && !isLoading && <p className="text-sm text-slate-500">{isArabic ? 'ستظهر هنا قوالب مجانية مناسبة لنوع المنتج عند طلب الاقتراح.' : 'Free matching templates appear here when you request suggestions.'}</p>}
      <div className="sr-only">{templates.length} templates</div>
    </section>
  );
};
