import React from 'react';
import { Check, LoaderCircle, X } from 'lucide-react';

export type AutoStudioStep = 'queued' | 'isolate' | 'enhance' | 'scenes' | 'board' | 'done' | 'cancelled' | 'error';

interface AutoStudioProgressProps {
  step: AutoStudioStep;
  progress: number;
  detail: string;
  error?: string | null;
  onCancel: () => void;
  onNavigate: (tab: 'removal' | 'supir' | 'generator' | 'storyboard') => void;
  isArabic: boolean;
}

const STEPS: Array<{ id: Exclude<AutoStudioStep, 'queued' | 'done' | 'cancelled' | 'error'>; label: string; tab: 'removal' | 'supir' | 'generator' | 'storyboard' }> = [
  { id: 'isolate', label: 'عزل ذكي', tab: 'removal' },
  { id: 'enhance', label: 'تحسين تلقائي', tab: 'supir' },
  { id: 'scenes', label: 'تجهيز المشاهد', tab: 'generator' },
  { id: 'board', label: 'إنشاء لوحتي', tab: 'storyboard' }
];

export const AutoStudioProgress: React.FC<AutoStudioProgressProps> = ({
  step,
  progress,
  detail,
  error,
  onCancel,
  onNavigate,
  isArabic
}) => {
  const currentIndex = STEPS.findIndex((entry) => entry.id === step);
  const isFinished = step === 'done' || step === 'cancelled' || step === 'error';
  const statusText = step === 'done'
    ? 'اكتمل الاستوديو الآلي'
    : step === 'cancelled'
      ? 'تم إيقاف الاستوديو الآلي'
      : step === 'error'
        ? 'توقف الاستوديو الآلي بسبب خطأ'
        : step === 'queued'
          ? 'الاستوديو الآلي في قائمة الانتظار'
          : `الاستوديو الآلي · ${STEPS[currentIndex]?.label || ''}`;

  return (
    <section className="mb-2 shrink-0 rounded-xl border border-[#D48B16]/40 bg-white p-3 shadow-sm dark:bg-[#0B1528]" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-bold text-[#0F2952] dark:text-white">
            {!isFinished && <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-[#D48B16]" />}
            {step === 'done' && <Check className="h-4 w-4 text-emerald-600" />}
            {statusText}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{error || detail}</p>
        </div>
        {!isFinished && (
          <button type="button" onClick={onCancel} className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-rose-600 hover:bg-rose-50" aria-label="إلغاء الاستوديو الآلي">
            <X className="h-4 w-4" />
            إلغاء
          </button>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {STEPS.map((entry, index) => (
          <button key={entry.id} type="button" onClick={() => onNavigate(entry.tab)} className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold ${index < currentIndex || step === 'done' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : entry.id === step ? 'bg-[#0F2952] text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
            {entry.label}
          </button>
        ))}
      </div>
      {!isFinished && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-[#D48B16] transition-all" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
      {!isArabic && <span className="sr-only">Auto Studio progress</span>}
    </section>
  );
};
