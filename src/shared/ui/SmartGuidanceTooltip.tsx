import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';

interface SmartGuidanceTooltipProps {
  pageKey: 'removal' | 'supir' | 'generator' | 'storyboard';
  messageAr: string;
  messageEn: string;
  isArabic: boolean;
}

export const SmartGuidanceTooltip: React.FC<SmartGuidanceTooltipProps> = ({
  pageKey,
  messageAr,
  messageEn,
  isArabic
}) => {
  const storageKey = `alshams_tip_dismissed_${pageKey}`;
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) !== 'true';
    } catch {
      return true;
    }
  });

  const [progress, setProgress] = useState<number>(100);

  const dismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!isVisible) return;

    // 5-second automatic dismissal
    const startTime = Date.now();
    const duration = 5000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remainingPct);
      if (elapsed >= duration) {
        clearInterval(interval);
        dismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isVisible, pageKey]);

  if (!isVisible) return null;

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0F2952]/90 via-[#16386D]/90 to-[#0F2952]/90 text-white border border-[#D48B16]/30 shadow-xs backdrop-blur-md px-3.5 py-2 transition-all animate-fadeIn">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
          <span className="p-1 rounded-lg bg-[#D48B16]/20 text-[#D48B16] shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <p className="text-slate-100 leading-snug">
            {isArabic ? messageAr : messageEn}
          </p>
        </div>

        <button
          onClick={dismiss}
          className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors shrink-0 cursor-pointer"
          title={isArabic ? 'إغلاق الإرشاد' : 'Dismiss'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 5-second subtle timer indicator line at bottom */}
      <div
        className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-r from-amber-400 to-[#D48B16] opacity-70 transition-all duration-75"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
