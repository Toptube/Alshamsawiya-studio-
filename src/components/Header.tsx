import React from 'react';
import { 
  Sun, Moon, Scissors, Wand2, Menu, Sparkles, LayoutGrid, Image as ImageIcon
} from 'lucide-react';

export type StudioTab = 'removal' | 'supir' | 'generator' | 'storyboard' | 'reports' | 'analytics';

interface HeaderProps {
  activeTab: StudioTab;
  setActiveTab: (tab: StudioTab) => void;
  isDark: boolean;
  toggleDarkMode: () => void;
  isArabic: boolean;
  toggleLanguage: () => void;
  onOpenDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isDark,
  toggleDarkMode,
  isArabic,
  onOpenDrawer
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0A1324]/95 backdrop-blur-md transition-colors overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 sm:gap-4 h-14 sm:h-16">
          
          {/* Brand Logo & Wordmark */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button 
              onClick={() => setActiveTab('removal')}
              className="flex items-center gap-2 sm:gap-2.5 text-start group cursor-pointer focus:outline-none"
              title={isArabic ? 'ستوديو الشمساوية' : 'AlShams Studio'}
            >
              <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl overflow-hidden bg-white shadow-xs ring-1 ring-[#D48B16]/30 flex items-center justify-center p-0.5 shrink-0">
                <img 
                  src="/assets/aistudio/1790755753712_87b037e0.png" 
                  alt="AlShams Craft Logo" 
                  className="w-full h-full object-contain transform group-hover:scale-105 transition-transform"
                />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-sm sm:text-base font-black tracking-tight text-[#0F2952] dark:text-white whitespace-nowrap">
                  {isArabic ? 'ستوديو الشمساوية' : 'AlShams Studio'}
                </span>
                <span className="text-[10px] font-medium text-[#D48B16] whitespace-nowrap">
                  {isArabic ? 'صعوبتها في بساطتها' : 'Craft Studio'}
                </span>
              </div>
            </button>
          </div>

          {/* Clean Top Navigation (عزل -> تحسين -> مشاهد -> لوحتي) */}
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1">
            {/* 1. عزل */}
            <button
              onClick={() => setActiveTab('removal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'removal'
                  ? 'bg-[#D48B16]/15 text-[#D48B16] border border-[#D48B16]/30 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
              title={isArabic ? 'عزل خلفية الورشة والموبايل بضغطة واحدة' : 'Isolate Subject'}
            >
              <Scissors className="w-3.5 h-3.5 text-[#D48B16] shrink-0" />
              <span>{isArabic ? 'عزل' : 'Isolate'}</span>
            </button>

            {/* 2. تحسين */}
            <button
              onClick={() => setActiveTab('supir')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'supir'
                  ? 'bg-[#D48B16]/15 text-[#D48B16] border border-[#D48B16]/30 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
              title={isArabic ? 'توضيح ألياف الخيوط والنسيج وإضاءة الاستوديو' : 'Enhance & Texture'}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D48B16] shrink-0" />
              <span>{isArabic ? 'تحسين' : 'Enhance'}</span>
            </button>

            {/* 3. مشاهد */}
            <button
              onClick={() => setActiveTab('generator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'generator'
                  ? 'bg-[#D48B16]/15 text-[#D48B16] border border-[#D48B16]/30 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
              title={isArabic ? 'وضع المنتج في كادرات وبيئات حقيقية تناسب نوعه' : 'Decor Scenes'}
            >
              <Wand2 className="w-3.5 h-3.5 text-[#D48B16] shrink-0" />
              <span>{isArabic ? 'مشاهد' : 'Scenes'}</span>
            </button>

            {/* 4. لوحتي */}
            <button
              onClick={() => setActiveTab('storyboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'storyboard'
                  ? 'bg-[#D48B16]/15 text-[#D48B16] border border-[#D48B16]/30 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
              title={isArabic ? 'تجميع زوايا ومقاسات المنتج في لوحة عرض موحدة' : 'Commercial Board'}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-[#D48B16] shrink-0" />
              <span>{isArabic ? 'لوحتي' : 'My Board'}</span>
            </button>
          </nav>

          {/* Tools & Drawer Trigger */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Dark mode toggle */}
            <button
              onClick={toggleDarkMode}
              title={isArabic ? 'تبديل المظهر' : 'Toggle Theme'}
              className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#0F2952]" />}
            </button>

            {/* Clean Sidebar Drawer Trigger */}
            <button
              onClick={onOpenDrawer}
              title={isArabic ? 'القائمة الجانبية والدعم الفني' : 'Open Menu'}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Menu className="w-4 h-4 text-[#D48B16] shrink-0" />
              <span className="hidden sm:inline">{isArabic ? 'القائمة' : 'Menu'}</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
