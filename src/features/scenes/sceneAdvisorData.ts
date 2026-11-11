import type { ProductType, VisionSceneCandidate } from '../../shared/lib/visionProvider';

export interface SceneRecipe {
  id: string;
  title: string;
  prompt: string;
  background: string;
}

const RECIPES: Record<ProductType, SceneRecipe[]> = {
  cushion: [{
    id: 'boho-sofa',
    title: 'ركن كنبة بوهيمي',
    prompt: 'A handmade cushion styled on the corner of a refined boho sofa, linen upholstery, a calm handcrafted living room.',
    background: 'linear-gradient(145deg,#e9dfd0 0%,#b49a7d 55%,#6f655a 100%)'
  }, {
    id: 'sunlit-reading',
    title: 'جلسة بضوء طبيعي',
    prompt: 'A handmade cushion on a light neutral lounge chair beside a sunlit window and soft woven textiles.',
    background: 'linear-gradient(145deg,#f7f0e4 0%,#ddc9aa 60%,#a18a70 100%)'
  }],
  macrame: [{
    id: 'plant-wall',
    title: 'حائط مع نبات',
    prompt: 'A handmade macrame wall hanging on a warm plaster wall, with a leafy plant beside it and gentle daylight.',
    background: 'linear-gradient(145deg,#e7d8c6 0%,#bfaa92 60%,#817767 100%)'
  }, {
    id: 'studio-wall',
    title: 'حائط حرفي هادئ',
    prompt: 'A handcrafted macrame wall hanging styled on a clean sand-colored wall with subtle natural shadows.',
    background: 'linear-gradient(145deg,#f2e7d8 0%,#c9b394 100%)'
  }],
  bag: [{
    id: 'hand-model',
    title: 'حقيبة في يد موديل',
    prompt: 'A handcrafted bag or clutch carried by a tasteful hand model, cropped editorial composition, neutral outfit, no face visible.',
    background: 'linear-gradient(145deg,#eee4d7 0%,#a99784 100%)'
  }, {
    id: 'bag-podium',
    title: 'عرض أنيق للحقيبة',
    prompt: 'A handcrafted bag displayed on a minimal warm stone pedestal with a soft studio backdrop.',
    background: 'linear-gradient(145deg,#f3eee6 0%,#c6b8a5 100%)'
  }],
  basket: [{
    id: 'basket-console',
    title: 'سلة بديكور طبيعي',
    prompt: 'A handwoven basket styled beside a wooden console with dried flowers and natural linen.',
    background: 'linear-gradient(145deg,#eee4d2 0%,#b79b70 100%)'
  }],
  decor: [{
    id: 'decor-shelf',
    title: 'قطعة ديكور على رف',
    prompt: 'A handmade decor piece styled on a curated shelf with warm plaster, books and a small plant.',
    background: 'linear-gradient(145deg,#eee8df 0%,#c3b39f 100%)'
  }],
  wooden: [{
    id: 'wood-workbench',
    title: 'قطعة خشبية على طاولة',
    prompt: 'A handcrafted wooden item on a light oak workbench with soft directional daylight and a quiet artisan studio.',
    background: 'linear-gradient(145deg,#ead8bf 0%,#a57d54 100%)'
  }],
  other: [{
    id: 'artisan-studio',
    title: 'استوديو حرفي طبيعي',
    prompt: 'A handmade product in a calm artisan studio with neutral natural materials and soft window light.',
    background: 'linear-gradient(145deg,#f4eee5 0%,#c4b8a7 100%)'
  }]
};

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  cushion: 'كوشن',
  macrame: 'مكرمية',
  bag: 'حقيبة / كلاتش',
  basket: 'سلة',
  decor: 'قطعة ديكور',
  wooden: 'قطعة خشبية',
  other: 'أخرى'
};

export const PRODUCT_TYPES = Object.keys(PRODUCT_TYPE_LABELS) as ProductType[];

export function getSceneRecipes(type: ProductType, description: string): SceneRecipe[] {
  return RECIPES[type].map((recipe) => ({
    ...recipe,
    prompt: `${recipe.prompt} Product: ${description || 'handmade artisan item'}. Preserve the product exactly; use it as an unchanged foreground cutout. Soft natural key light, realistic contact shadow, premium handcrafted mood, no text, no watermark.`
  }));
}

export function mergeSceneCandidates(
  type: ProductType,
  description: string,
  generated?: VisionSceneCandidate[]
): SceneRecipe[] {
  const templates = getSceneRecipes(type, description);
  if (!generated?.length) return templates.slice(0, 4);
  return generated.slice(0, 4).map((candidate, index) => ({
    id: candidate.id || `gemini-scene-${index + 1}`,
    title: `مشهد مقترح ${index + 1}`,
    prompt: candidate.prompt || templates[index % templates.length].prompt,
    background: candidate.background || templates[index % templates.length].background
  }));
}
