export type ProductType =
  | 'cushion'
  | 'macrame'
  | 'bag'
  | 'basket'
  | 'decor'
  | 'wooden'
  | 'other';

export interface ProductDescription {
  type: ProductType;
  description: string;
  materials: string[];
}

export interface AdCopySuggestion {
  headline: string;
  subline: string;
  callToAction: string;
}

export interface VisionSceneCandidate {
  id: string;
  prompt: string;
  background?: string;
}

export interface VisionProvider {
  classifyProduct(image: Blob, apiKey?: string): Promise<ProductDescription>;
  generateSceneCandidates(input: {
    image: Blob;
    product: ProductDescription;
    apiKey?: string;
  }): Promise<VisionSceneCandidate[]>;
  suggestAdCopy(input: {
    product: ProductDescription;
    dimensions: string;
    apiKey?: string;
  }): Promise<AdCopySuggestion[]>;
}

export const getVisionApiKey = () => sessionStorage.getItem('alshams_gemini_key') || '';

export const setVisionApiKey = (key: string) => {
  if (key.trim()) sessionStorage.setItem('alshams_gemini_key', key.trim());
  else sessionStorage.removeItem('alshams_gemini_key');
};

const requestVision = async <T>(task: string, payload: Record<string, unknown>, apiKey?: string): Promise<T> => {
  const response = await fetch('/api/vision/task', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, ...payload, ...(apiKey?.trim() ? { apiKey: apiKey.trim() } : {}) })
  });
  const result = await response.json() as { success?: boolean; result?: T; error?: string; code?: string };
  if (!response.ok || !result.success || !result.result) {
    const error = new Error(result.error || 'تعذر الاتصال بمساعد الذكاء الاصطناعي.');
    Object.assign(error, { code: result.code || (response.status === 429 ? 'RATE_LIMIT' : 'PROVIDER_ERROR') });
    throw error;
  }
  return result.result;
};

const blobAsDataUrl = async (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('تعذر تجهيز الصورة.'));
  reader.onerror = () => reject(new Error('تعذر قراءة الصورة.'));
  reader.readAsDataURL(blob);
});

export const geminiVisionProvider: VisionProvider = {
  classifyProduct: async (image, apiKey) => requestVision<ProductDescription>(
    'classify',
    { image: await blobAsDataUrl(image) },
    apiKey
  ),
  generateSceneCandidates: async (input) => requestVision<VisionSceneCandidate[]>(
    'scenes',
    { image: await blobAsDataUrl(input.image), product: input.product },
    input.apiKey
  ),
  suggestAdCopy: (input) => requestVision<AdCopySuggestion[]>(
    'ad-copy',
    { product: input.product, dimensions: input.dimensions },
    input.apiKey
  )
};

export function visionErrorMessage(error: unknown, isArabic = true): string {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code === 'NO_API_KEY') {
    return isArabic
      ? 'لم يتم ضبط مفتاح Gemini. اختر نوع المنتج يدوياً لاستخدام القوالب المجانية، أو أضف المفتاح في الإعدادات.'
      : 'Gemini key is not configured. Choose a product type for free templates, or add a key in settings.';
  }
  if (code === 'RATE_LIMIT') {
    return isArabic
      ? 'وصلنا إلى حد الطلبات المؤقت. انتظر قليلاً أو استخدم القوالب المجانية.'
      : 'The temporary request limit was reached. Wait a moment or use free templates.';
  }
  return error instanceof Error
    ? error.message
    : isArabic ? 'تعذر تنفيذ طلب الذكاء الاصطناعي.' : 'The AI request could not be completed.';
}
