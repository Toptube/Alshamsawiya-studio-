import React from 'react';
import { 
  Sun, Moon, Layers, Wand2, Menu, PlusCircle
} from 'lucide-react';
import { RembgSettings } from '../types';

interface HeaderProps {
  activeTab: 'removal' | 'generator' | 'reports' | 'analytics' | 'errors';
  setActiveTab: (tab: 'removal' | 'generator' | 'reports' | 'analytics' | 'errors') => void;
  isDark: boolean;
  toggleDarkMode: () => void;
  isArabic: boolean;
  toggleLanguage: () => void;
  onOpenDrawer: () => void;
  onNewBatchClick: () => void;
  errorCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isDark,
  toggleDarkMode,
  isArabic,
  toggleLanguage,
  onOpenDrawer,
  onNewBatchClick,
  errorCount
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0A1324]/95 backdrop-blur-md transition-colors overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-1.5 sm:gap-4 h-14 sm:h-16">
          
          {/* Zone 1: Brand Wordmark & Logo */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button 
              onClick={() => setActiveTab('removal')}
              className="flex items-center gap-2 sm:gap-3 text-start group cursor-pointer focus:outline-none"
              title={isArabic ? 'ستوديو الشمساوية' : 'AlShams Studio'}
            >
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-white shadow-xs ring-1 ring-amber-500/30 flex items-center justify-center p-0.5 shrink-0">
                <img 
                  src="/assets/aistudio/1790755753712_87b037e0.png" 
                  alt="AlShams Craft Logo" 
                  className="w-full h-full object-contain transform group-hover:scale-105 transition-transform"
                />
              </div>
              {/* Brand text: Only shown on larger screens; on mobile only the logo icon is displayed */}
              <div className="hidden md:flex flex-col">
                <span className="text-base sm:text-lg font-black tracking-tight text-[#0F2952] dark:text-white whitespace-nowrap">
                  {isArabic ? 'ستوديو الشمساوية' : 'AlShams Studio'}
                </span>
                <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">
                  {isArabic ? 'عزل وتوليد الصور الذكي' : 'Smart Isolation & Synthesis'}
                </span>
              </div>
            </button>
          </div>

          {/* Zone 2: Two Primary Navigation Tabs Only (إزالة الخلفية & توليد الخلفيات) */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {/* Tab 1: إزالة الخلفية */}
            <button
              onClick={() => setActiveTab('removal')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'removal'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
              <span>{isArabic ? 'إزالة الخلفية' : 'Remove Background'}</span>
            </button>

            {/* Tab 2: توليد الخلفيات */}
            <button
              onClick={() => setActiveTab('generator')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                activeTab === 'generator'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
              <span>{isArabic ? 'توليد الخلفيات' : 'Generate Background'}</span>
              <span className="hidden sm:inline-block text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-400">
                {isArabic ? 'جديد' : 'New'}
              </span>
            </button>
          </nav>

          {/* Zone 3: Quick Tools & Sidebar Drawer Trigger */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              title={isArabic ? 'تبديل المظهر' : 'Toggle Theme'}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#0F2952]" />}
            </button>

            {/* Primary Action Button (New batch) */}
            <button
              onClick={onNewBatchClick}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 rounded-lg shadow-xs shadow-amber-900/20 transition-all whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{isArabic ? 'دفعة جديدة' : 'New Batch'}</span>
            </button>

            {/* Sidebar Drawer Menu Toggle Button (Houses Support, Reports, Logs) */}
            <button
              onClick={onOpenDrawer}
              title={isArabic ? 'فتح القائمة الجانبية والدعم الفني والتقارير' : 'Open Sidebar Menu'}
              className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="hidden md:inline">{isArabic ? 'القائمة الجانبية' : 'Menu'}</span>
              {errorCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 absolute -top-0.5 -end-0.5" />
              )}
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};
