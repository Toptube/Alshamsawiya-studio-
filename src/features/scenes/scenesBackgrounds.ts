export type SceneBackgroundCategory = 'studio' | 'wall' | 'wood' | 'gradient';

export interface SceneBackgroundPreset {
  id: string;
  label: string;
  category: SceneBackgroundCategory;
  background: string;
  colorStops: [number, string][];
  texture?: 'plaster' | 'wood' | 'marble';
}

export const SCENES_BACKGROUNDS: SceneBackgroundPreset[] = [
  { id: 'studio-white', label: 'أبيض ناصع', category: 'studio', background: '#FFFFFF', colorStops: [[0, '#FFFFFF'], [1, '#FFFFFF']] },
  { id: 'studio-soft-white', label: 'أبيض استوديو', category: 'studio', background: 'linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 72%, #DCE3EA 100%)', colorStops: [[0, '#FFFFFF'], [0.72, '#F1F5F9'], [1, '#DCE3EA']] },
  { id: 'studio-light-gray', label: 'رمادي فاتح', category: 'studio', background: 'linear-gradient(180deg, #F8FAFC 0%, #D1D5DB 100%)', colorStops: [[0, '#F8FAFC'], [1, '#D1D5DB']] },
  { id: 'studio-warm-beige', label: 'بيج دافئ', category: 'studio', background: 'linear-gradient(180deg, #FBF3E7 0%, #D9C2A0 100%)', colorStops: [[0, '#FBF3E7'], [1, '#D9C2A0']] },
  { id: 'studio-cool-gray', label: 'رمادي ضبابي', category: 'studio', background: 'linear-gradient(145deg, #EEF2F5 0%, #AEBBC7 100%)', colorStops: [[0, '#EEF2F5'], [1, '#AEBBC7']] },
  { id: 'studio-ivory', label: 'عاجي ناعم', category: 'studio', background: 'linear-gradient(180deg, #FFFDF7 0%, #E8DFC9 100%)', colorStops: [[0, '#FFFDF7'], [1, '#E8DFC9']] },

  { id: 'wall-warm-plaster', label: 'جص دافئ', category: 'wall', background: 'linear-gradient(180deg, #F4E6D3 0%, #D6B895 72%, #B99168 72%, #9C754F 100%)', colorStops: [[0, '#F4E6D3'], [0.72, '#D6B895'], [0.73, '#B99168'], [1, '#9C754F']], texture: 'plaster' },
  { id: 'wall-terracotta', label: 'طوبي ترابي', category: 'wall', background: 'linear-gradient(180deg, #D98968 0%, #A8513D 72%, #774133 72%, #5B3027 100%)', colorStops: [[0, '#D98968'], [0.72, '#A8513D'], [0.73, '#774133'], [1, '#5B3027']], texture: 'plaster' },
  { id: 'wall-sage', label: 'أخضر مريمي', category: 'wall', background: 'linear-gradient(180deg, #D9E2D2 0%, #A9B79E 72%, #87957D 72%, #697761 100%)', colorStops: [[0, '#D9E2D2'], [0.72, '#A9B79E'], [0.73, '#87957D'], [1, '#697761']], texture: 'plaster' },
  { id: 'wall-sandstone', label: 'حجر رملي', category: 'wall', background: 'linear-gradient(180deg, #E9D5B7 0%, #C9A97D 72%, #A9835A 72%, #806344 100%)', colorStops: [[0, '#E9D5B7'], [0.72, '#C9A97D'], [0.73, '#A9835A'], [1, '#806344']], texture: 'plaster' },
  { id: 'wall-dusty-rose', label: 'وردي غباري', category: 'wall', background: 'linear-gradient(180deg, #F0D8D0 0%, #D3A69B 72%, #AD8077 72%, #89635D 100%)', colorStops: [[0, '#F0D8D0'], [0.72, '#D3A69B'], [0.73, '#AD8077'], [1, '#89635D']], texture: 'plaster' },
  { id: 'wall-clay', label: 'طين طبيعي', category: 'wall', background: 'linear-gradient(180deg, #E8C9A9 0%, #BD8C68 72%, #98694D 72%, #704C3A 100%)', colorStops: [[0, '#E8C9A9'], [0.72, '#BD8C68'], [0.73, '#98694D'], [1, '#704C3A']], texture: 'plaster' },

  { id: 'wood-light-oak', label: 'بلوط فاتح', category: 'wood', background: 'linear-gradient(180deg, #E5C99D 0%, #C79B66 72%, #A97949 72%, #835A37 100%)', colorStops: [[0, '#E5C99D'], [0.72, '#C79B66'], [0.73, '#A97949'], [1, '#835A37']], texture: 'wood' },
  { id: 'wood-natural-oak', label: 'بلوط طبيعي', category: 'wood', background: 'linear-gradient(180deg, #C99A68 0%, #9B6944 72%, #805333 72%, #654128 100%)', colorStops: [[0, '#C99A68'], [0.72, '#9B6944'], [0.73, '#805333'], [1, '#654128']], texture: 'wood' },
  { id: 'wood-walnut', label: 'جوز داكن', category: 'wood', background: 'linear-gradient(180deg, #805337 0%, #593820 72%, #432B1D 72%, #302017 100%)', colorStops: [[0, '#805337'], [0.72, '#593820'], [0.73, '#432B1D'], [1, '#302017']], texture: 'wood' },
  { id: 'wood-honey-pine', label: 'صنوبر عسلي', category: 'wood', background: 'linear-gradient(180deg, #D9AC6C 0%, #B77D43 72%, #966137 72%, #70482C 100%)', colorStops: [[0, '#D9AC6C'], [0.72, '#B77D43'], [0.73, '#966137'], [1, '#70482C']], texture: 'wood' },
  { id: 'wood-whitewashed', label: 'خشب أبيض معتّق', category: 'wood', background: 'linear-gradient(180deg, #E9E5D9 0%, #C9C2B2 72%, #ACA18E 72%, #8E8473 100%)', colorStops: [[0, '#E9E5D9'], [0.72, '#C9C2B2'], [0.73, '#ACA18E'], [1, '#8E8473']], texture: 'wood' },
  { id: 'wood-rustic', label: 'خشب ريفي', category: 'wood', background: 'linear-gradient(180deg, #9C6A43 0%, #6F462C 72%, #593820 72%, #402A1D 100%)', colorStops: [[0, '#9C6A43'], [0.72, '#6F462C'], [0.73, '#593820'], [1, '#402A1D']], texture: 'wood' },

  { id: 'gradient-royal-navy', label: 'كحلي ملكي', category: 'gradient', background: 'radial-gradient(circle at 50% 35%, #254A7E 0%, #0F2952 55%, #071326 100%)', colorStops: [[0, '#254A7E'], [0.55, '#0F2952'], [1, '#071326']] },
  { id: 'gradient-black-marble-gold', label: 'رخام أسود وذهبي', category: 'gradient', background: 'linear-gradient(145deg, #26303A 0%, #101820 50%, #05090D 100%)', colorStops: [[0, '#26303A'], [0.5, '#101820'], [1, '#05090D']], texture: 'marble' },
  { id: 'gradient-emerald', label: 'زمردي عميق', category: 'gradient', background: 'radial-gradient(circle at 50% 40%, #08765B 0%, #064E3B 55%, #02251C 100%)', colorStops: [[0, '#08765B'], [0.55, '#064E3B'], [1, '#02251C']] },
  { id: 'gradient-burgundy', label: 'عنابي مخملي', category: 'gradient', background: 'radial-gradient(circle at 50% 35%, #783348 0%, #581C2D 55%, #260A14 100%)', colorStops: [[0, '#783348'], [0.55, '#581C2D'], [1, '#260A14']] },
  { id: 'gradient-teal', label: 'تركواز هادئ', category: 'gradient', background: 'linear-gradient(145deg, #5EEAD4 0%, #0F766E 55%, #134E4A 100%)', colorStops: [[0, '#5EEAD4'], [0.55, '#0F766E'], [1, '#134E4A']] },
  { id: 'gradient-copper', label: 'نحاس دافئ', category: 'gradient', background: 'linear-gradient(145deg, #F2C08B 0%, #B7653A 55%, #572B20 100%)', colorStops: [[0, '#F2C08B'], [0.55, '#B7653A'], [1, '#572B20']] },
];
