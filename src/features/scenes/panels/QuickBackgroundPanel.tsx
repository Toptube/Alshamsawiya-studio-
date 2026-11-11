import React from 'react';

export type QuickBackdrop = 'clean' | 'warmWall' | 'rusticWood' | null;

interface QuickBackgroundPanelProps {
  backdrop: QuickBackdrop;
  hasShadow: boolean;
  isArabic: boolean;
  onBackdropChange: (backdrop: Exclude<QuickBackdrop, null>) => void;
  onShadowChange: (enabled: boolean) => void;
}

const BACKDROPS = [
  { id: 'clean', label: 'استوديو أبيض', labelEn: 'Clean studio' },
  { id: 'warmWall', label: 'حائط دافئ', labelEn: 'Warm wall' },
  { id: 'rusticWood', label: 'خشب هادئ', labelEn: 'Rustic wood' },
] as const;

export const QuickBackgroundPanel: React.FC<QuickBackgroundPanelProps> = ({
  backdrop,
  hasShadow,
  isArabic,
  onBackdropChange,
  onShadowChange,
}) => (
  <section className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#0B1528]">
    <p className="mb-2 text-sm font-bold text-[#0F2952] dark:text-white">{isArabic ? 'استوديو سريع' : 'Quick studio'}</p>
    <div className="grid grid-cols-3 gap-2">
      {BACKDROPS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onBackdropChange(item.id)}
          aria-pressed={backdrop === item.id}
          className={`min-h-11 rounded-lg border px-2 text-sm font-semibold ${
            backdrop === item.id
              ? 'border-[#D48B16] bg-[#D48B16]/10 text-[#0F2952] dark:text-amber-300'
              : 'border-slate-200 dark:border-slate-700'
          }`}
        >
          {isArabic ? item.label : item.labelEn}
        </button>
      ))}
    </div>
    <label className="mt-2 flex min-h-11 items-center gap-2 text-sm font-semibold">
      <input type="checkbox" checked={hasShadow} onChange={(event) => onShadowChange(event.target.checked)} />
      {isArabic ? 'ظل تلقائي ناعم' : 'Auto soft shadow'}
    </label>
  </section>
);
