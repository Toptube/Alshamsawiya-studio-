import React from 'react';

export type SceneAspectRatio = '1:1' | '4:5' | '9:16' | '16:9';

interface AspectRatioPanelProps {
  aspectRatio: SceneAspectRatio;
  isArabic: boolean;
  onChange: (ratio: SceneAspectRatio) => void;
}

const PRESETS: Array<{ ratio: SceneAspectRatio; size: string; label: string; labelEn: string }> = [
  { ratio: '1:1', size: '1080 × 1080', label: 'مربع للمتجر', labelEn: 'Store square' },
  { ratio: '4:5', size: '1080 × 1350', label: 'منشور', labelEn: 'Post' },
  { ratio: '9:16', size: '1080 × 1920', label: 'قصة', labelEn: 'Story' },
  { ratio: '16:9', size: '1920 × 1080', label: 'أفقي', labelEn: 'Landscape' },
];

export const AspectRatioPanel: React.FC<AspectRatioPanelProps> = ({ aspectRatio, isArabic, onChange }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0B1528]">
    <h2 className="mb-3 text-sm font-bold text-[#0F2952] dark:text-white">{isArabic ? 'مقاس الصورة' : 'Canvas size'}</h2>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {PRESETS.map(({ ratio, size, label, labelEn }) => (
        <button
          key={ratio}
          type="button"
          onClick={() => onChange(ratio)}
          aria-pressed={aspectRatio === ratio}
          aria-label={`${ratio} ${isArabic ? label : labelEn} (${size})`}
          title={`${isArabic ? label : labelEn} — ${size}`}
          className={`min-h-11 rounded-lg border px-2 py-2 text-sm font-bold transition-colors ${
            aspectRatio === ratio
              ? 'border-[#D48B16] bg-[#D48B16]/10 text-[#D48B16]'
              : 'border-slate-200 text-slate-500 dark:border-slate-700'
          }`}
        >
          <span className="block">{ratio}</span>
          <span className="hidden text-[11px] font-normal sm:block">{size}</span>
        </button>
      ))}
    </div>
  </section>
);
