import React from 'react';
import { Download, Send } from 'lucide-react';

interface SceneActionBarProps {
  isArabic: boolean;
  canApply: boolean;
  canSend: boolean;
  onApply: () => void;
  onSend: () => void;
}

export const SceneActionBar: React.FC<SceneActionBarProps> = ({
  isArabic,
  canApply,
  canSend,
  onApply,
  onSend,
}) => (
  <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-slate-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-slate-800 dark:bg-[#0B1528]/95 lg:hidden">
    <button
      type="button"
      onClick={onApply}
      disabled={!canApply}
      className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#D48B16] px-4 text-sm font-bold text-[#0F2952] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Download className="h-4 w-4" />
      {isArabic ? 'تطبيق' : 'Apply'}
    </button>
    <button
      type="button"
      onClick={onSend}
      disabled={!canSend}
      className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#0F2952] px-4 text-sm font-bold text-[#0F2952] disabled:cursor-not-allowed disabled:opacity-40 dark:border-amber-400 dark:text-amber-300"
    >
      <Send className="h-4 w-4" />
      {isArabic ? 'إرسال إلى لوحتي' : 'Send to Board'}
    </button>
  </div>
);
