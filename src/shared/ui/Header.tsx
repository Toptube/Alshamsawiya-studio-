import React from 'react';
import { Sun, Moon, Scissors, Wand2, Menu, Sparkles, LayoutGrid, FolderOpen, Megaphone, Check } from 'lucide-react';

export type StudioTab = 'removal' | 'supir' | 'generator' | 'storyboard' | 'ads' | 'library';

interface HeaderProps {
  activeTab: StudioTab;
  setActiveTab: (tab: StudioTab) => void;
  isDark: boolean;
  toggleDarkMode: () => void;
  isArabic: boolean;
  toggleLanguage: () => void;
  onOpenDrawer: () => void;
  completedTabs?: StudioTab[];
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isDark,
  toggleDarkMode,
  isArabic,
  onOpenDrawer,
  completedTabs = []
}) => {
  const steps = [
    { id: 'removal', label: isArabic ? 'عزل' : 'Isolate', icon: <Scissors className="h-4 w-4" /> },
    { id: 'supir', label: isArabic ? 'تحسين' : 'Enhance', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'generator', label: isArabic ? 'مشاهد' : 'Scenes', icon: <Wand2 className="h-4 w-4" /> },
    { id: 'storyboard', label: isArabic ? 'لوحتي' : 'Board', icon: <LayoutGrid className="h-4 w-4" /> },
    { id: 'ads', label: isArabic ? 'إعلان' : 'Ad', icon: <Megaphone className="h-4 w-4" /> },
  ] as const;
  const activeStepIndex = steps.findIndex((step) => step.id === activeTab);

  return (
    <header className="sticky top-0 z-40 w-full shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#0A1324]/95">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-1.5 sm:flex-nowrap sm:gap-4 sm:px-6 sm:py-0 lg:px-8">
        <button
          onClick={() => setActiveTab('removal')}
          className="order-1 flex shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D48B16] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0A1324]"
          title={isArabic ? 'ستوديو الشمساوية' : 'AlShams Studio'}
          aria-label={isArabic ? 'ستوديو الشمساوية - الصفحة الرئيسية' : 'AlShams Studio - Home'}
        >
          <img
            src="/assets/alshamsawya-stamp.png"
            alt=""
            className="h-10 w-10 rounded-full bg-transparent object-contain sm:h-12 sm:w-12"
          />
        </button>

        <div className="order-2 ms-auto flex shrink-0 items-center gap-1 sm:order-3 sm:ms-0">
          <button
            onClick={toggleDarkMode}
            title={isArabic ? 'تبديل المظهر' : 'Toggle theme'}
            aria-label={isArabic ? 'تبديل المظهر' : 'Toggle theme'}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-[#0F2952]" />}
          </button>
          <button
            onClick={onOpenDrawer}
            title={isArabic ? 'القائمة والإعدادات' : 'Menu and settings'}
            aria-label={isArabic ? 'القائمة والإعدادات' : 'Menu and settings'}
            className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label={isArabic ? 'خطوات الاستوديو' : 'Studio workflow'} className="order-3 flex w-full min-w-0 items-center overflow-x-auto sm:order-2 sm:w-auto sm:flex-1 sm:justify-center">
          {steps.map((step, index) => {
            const isActive = activeTab === step.id;
            const isComplete = completedTabs.includes(step.id) || activeStepIndex > index;
            return (
              <React.Fragment key={step.id}>
                {index > 0 && <span aria-hidden="true" className={`mx-1 h-0.5 min-w-2 flex-1 sm:mx-2 ${isComplete ? 'bg-[#D48B16]' : 'bg-slate-200 dark:bg-slate-700'}`} />}
                <button
                  type="button"
                  onClick={() => setActiveTab(step.id)}
                  aria-current={isActive ? 'step' : undefined}
                  title={step.label}
                  className={`flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D48B16] sm:px-3 ${
                    isActive ? 'bg-[#0F2952] text-white dark:bg-[#D48B16] dark:text-[#0F2952]'
                      : isComplete ? 'text-[#0F2952] dark:text-amber-300'
                        : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full ${isActive ? 'bg-white/15' : isComplete ? 'bg-[#D48B16]/15' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    {isComplete && !isActive ? <Check className="h-4 w-4" /> : <span className="hidden sm:inline">{index + 1}</span>}
                    <span className="sm:hidden">{step.icon}</span>
                  </span>
                  <span className="hidden md:inline">{step.label}</span>
                </button>
              </React.Fragment>
            );
          })}
          <button type="button" onClick={() => setActiveTab('library')} aria-current={activeTab === 'library' ? 'page' : undefined} title={isArabic ? 'أعمالي' : 'My work'} className={`ms-1 flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-bold sm:ms-3 ${activeTab === 'library' ? 'bg-[#D48B16]/15 text-[#0F2952] dark:text-amber-300' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
            <FolderOpen className="h-4 w-4" /><span className="hidden min-[380px]:inline">{isArabic ? 'أعمالي' : 'My Work'}</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
