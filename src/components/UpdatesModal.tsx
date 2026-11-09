import React from 'react';
import { X, Sparkles, CheckCircle2, History, ArrowUpRight } from 'lucide-react';

interface UpdatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isArabic: boolean;
}

export const UpdatesModal: React.FC<UpdatesModalProps> = ({
  isOpen,
  onClose,
  isArabic
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-[#0B1528] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070E1A]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isArabic ? 'سجل التحديثات الدورية والتطوير المستمر' : 'Release Notes & Periodic Updates'}
              </h3>
              <p className="text-xs text-slate-400">
                {isArabic ? 'الإصدار 2.4.0 مع ميزة توليد المشاهد واستوديو المنتجات' : 'Version 2.4.0 with Scene Synthesis and Product Studio'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-xs text-slate-600 dark:text-slate-300">
          
          {/* Latest Version 2.4.0 */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {isArabic ? 'الإصدار 2.4.0 (الإصدار الحالي)' : 'v2.4.0 (Current Release)'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-bold text-[10px]">
                  {isArabic ? 'أحدث ترقية' : 'Latest'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">2026</span>
            </div>

            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  {isArabic
                    ? 'إضافة صفحة "توليد الخلفيات الذكية" لوضع المنتجات في مشاهد استوديو ومدرجات رخامية وخشبية واقعية.'
                    : 'Added AI Background Generator to place products in realistic commercial studio scenes.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  {isArabic
                    ? 'إعادة هيكلة الترويسة العلوية ووضع كافة الأدوات المساعدة والدعم الفني في قائمة جانبية أنيقة وسلسة.'
                    : 'Reorganized top navigation into clean 2-tab view with comprehensive Slide-over Sidebar Drawer.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  {isArabic
                    ? 'محاكاة الظلال الأرضية الواقعية (Contact Shadows) وتأثير عمق الميدان والبوكيه (Bokeh).'
                    : 'Added photorealistic contact ground shadow simulation and depth-of-field bokeh blur.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  {isArabic
                    ? 'محرك العزل العصبي فائق الدقة المدمج والمحلي بنسبة 100% مع ضمان الخصوصية الكاملة.'
                    : 'High-performance proprietary neural isolation engine with 100% offline fallback support.'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  {isArabic
                    ? 'تصدير التقارير النهائية إلى ملف CSV متوافق مع Excel وتوثيق المسارات والأحجام والسرعة.'
                    : 'Export comprehensive CSV reports with UTF-8 BOM and path logging.'}
                </span>
              </li>
            </ul>
          </div>

          {/* Past Version 2.3.0 */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                {isArabic ? 'الإصدار 2.3.0' : 'v2.3.0'}
              </span>
              <span className="text-[11px] font-mono text-slate-400">Archive</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isArabic
                ? 'تهيئة واجهة المستخدم باللغتين العربية والإنجليزية وتطبيق ألوان براند الشمس كرافت.'
                : 'Initial multi-language setup, dark theme, and AlShams Craft brand palette integration.'}
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070E1A] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
          >
            {isArabic ? 'حسناً، فهمت' : 'Got it'}
          </button>
        </div>
      </div>
    </div>
  );
};
