import React from 'react';
import type { ScenePanelId } from './ScenePanel';

interface ScenePanelTabsProps {
  activePanel: ScenePanelId;
  onChange: (panel: ScenePanelId) => void;
  isArabic: boolean;
}

const PANELS: Array<{ id: ScenePanelId; label: string; english: string }> = [
  { id: 'background', label: 'الخلفية', english: 'Background' },
  { id: 'shadow', label: 'الظل', english: 'Shadow' },
  { id: 'size', label: 'المقاس', english: 'Size' },
  { id: 'product', label: 'المنتج', english: 'Product' },
  { id: 'smart', label: 'ذكي', english: 'Smart' },
];

export const ScenePanelTabs: React.FC<ScenePanelTabsProps> = ({ activePanel, onChange, isArabic }) => (
  <nav aria-label={isArabic ? 'إعدادات المشهد' : 'Scene controls'} className="flex shrink-0 gap-2 overflow-x-auto py-1 lg:hidden">
    {PANELS.map((panel) => (
      <button
        key={panel.id}
        type="button"
        aria-pressed={activePanel === panel.id}
        onClick={() => onChange(panel.id)}
        className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold transition-colors ${
          activePanel === panel.id
            ? 'border-[#D48B16] bg-[#D48B16] text-[#0F2952]'
            : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-[#0B1528] dark:text-slate-300'
        }`}
      >
        {isArabic ? panel.label : panel.english}
      </button>
    ))}
  </nav>
);
