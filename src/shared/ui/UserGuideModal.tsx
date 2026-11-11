import React from 'react';
import { X, BookOpen, Cpu, Sliders, WifiOff, Wand2, Check } from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isArabic: boolean;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  isArabic
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div 
        className="relative w-full max-w-4xl bg-white dark:bg-[#0B1528] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070E1A]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isArabic ? 'دليل الاستخدام الشامل | ستوديو الشمساوية' : 'AlShams Studio Comprehensive Guide'}
              </h3>
              <p className="text-xs text-slate-400">
                {isArabic ? 'دليل إرشادي لإزالة الخلفيات وتوليد المشاهد الإعلانية والأتمتة' : 'User guide for background removal, scene synthesis, and batch automation'}
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          
          {/* Section 1: Algorithms */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Cpu className="w-4 h-4 text-amber-500" />
              <h4>{isArabic ? '1. خوارزميات العزل العصبي الذكية' : '1. Neural Isolation Algorithms'}</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
                <span className="font-bold text-amber-500 font-mono text-[11px]">
                  {isArabic ? 'الدقة القصوى (Pro Vision)' : 'Pro Vision'}
                </span>
                <p className="text-[11px]">
                  {isArabic 
                    ? 'الخوارزمية القياسية الأعلى دقة للأغراض العامة. يوصى بها للمنتجات التجارية، الحقائب والمشغولات اليدوية.'
                    : 'The gold standard high-precision model. Best for commercial products, crafts, and e-commerce.'}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
                <span className="font-bold text-blue-400 font-mono text-[11px]">
                  {isArabic ? 'السرعة الفائقة (Turbo Vision)' : 'Turbo Vision'}
                </span>
                <p className="text-[11px]">
                  {isArabic
                    ? 'خوارزمية خفيفة وسريعة جداً تستهلك موارد أقل وتعمل بسرعة استثنائية على الأجهزة المتوسطة.'
                    : 'Ultra-lightweight fast algorithm with minimal latency and low resource footprint.'}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
                <span className="font-bold text-emerald-400 font-mono text-[11px]">
                  {isArabic ? 'حواف مدمجة (Edge Focus)' : 'Edge Focus'}
                </span>
                <p className="text-[11px]">
                  {isArabic
                    ? 'خوارزمية مخصصة لحواف الأجسام وتفاصيل الحدود، ممتازة للهواتف الذكية والأجهزة المحمولة.'
                    : 'Optimized for clean edges and boundary separation on touch and mobile devices.'}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
                <span className="font-bold text-purple-400 font-mono text-[11px]">
                  {isArabic ? 'التفاصيل الشاملة (Ultra Fine)' : 'Ultra Fine'}
                </span>
                <p className="text-[11px]">
                  {isArabic
                    ? 'خوارزمية فائقة لقراءة التباينات الدقيقة والشعر والأطراف الرقيقة بكفاءة لا مثيل لها.'
                    : 'High-fidelity segmentation with refined contrast boundary awareness and micro-details.'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Alpha Matting */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Sliders className="w-4 h-4 text-amber-500" />
              <h4>{isArabic ? '2. إعدادات حساسية الأطراف والشعر' : '2. Edge Matting & Sensitivity Tuning'}</h4>
            </div>
            <div className="space-y-2 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-white">{isArabic ? 'عتبة العنصر الأمامي: ' : 'Foreground Threshold: '}</span>
                    <span>{isArabic ? 'تحدد درجة التباين التي تعتبر حتماً جزءاً من العنصر وتمنع قصه.' : 'Defines pixel intensity strictly recognized as foreground.'}</span>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-white">{isArabic ? 'عتبة تفريغ الخلفية: ' : 'Background Threshold: '}</span>
                    <span>{isArabic ? 'تحدد درجة التباين التي تعتبر حتماً خلفية يجب تفريغها.' : 'Defines pixel intensity strictly recognized as transparent background.'}</span>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-white">{isArabic ? 'حجم تقليص الحواف (Erode Size): ' : 'Erode Halo Size: '}</span>
                    <span>{isArabic ? 'يزيل الهالات البيضاء أو الشوائب اللونية المحيطة بحواف العنصر.' : 'Eliminates color halos or fringing around cut edges.'}</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Section 3: Background Generator */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Wand2 className="w-4 h-4 text-amber-500" />
              <h4>{isArabic ? '3. مولّد الخلفيات الإعلانية واستوديو المشاهد' : '3. AI Scene Generator & Studio'}</h4>
            </div>
            <p>
              {isArabic
                ? 'تتيح لك صفحة "توليد الخلفيات" وضع منتجاتك في مشاهد استوديو واقعية: مدرج رخامي أسود فاخر، طاولة خشبية دافئة، استوديو إعلاني ناعم، أو تدرجات كحلي ملكي خاصة ببراند الشمس كرافت. يمكنك التحكم في حجم وموضع المنتج، وتفعيل الظلال الأرضية الواقعية وعزل الخلفية (Bokeh).'
                : 'The Background Generator tab allows you to place isolated products into realistic studio scenes: black marble podiums, rustic wood tables, clean commercial setups, or brand royal navy backdrops, with realistic contact shadows and depth-of-field blur.'}
            </p>
          </div>

          {/* Section 4: Offline Mode */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <WifiOff className="w-4 h-4 text-blue-500" />
              <h4>{isArabic ? '4. وضع العمل بدون إنترنت بالكامل (Offline Mode)' : '4. 100% Offline Operation'}</h4>
            </div>
            <p>
              {isArabic
                ? 'يوفر ستوديو الشمساوية معالجاً داخلياً يعمل عبر المتصفح مباشرة دون الحاجة لأي اتصال بالإنترنت أو الاعتماد على خوادم خارجية، مما يضمن استمرارية عملك وخصوصية بياناتك بنسبة 100%.'
                : 'AlShams Studio provides an integrated client-side engine running directly inside your browser without needing any internet connection, ensuring 100% privacy and continuous uptime.'}
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070E1A] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
          >
            {isArabic ? 'إغلاق الدليل' : 'Close Guide'}
          </button>
        </div>
      </div>
    </div>
  );
};
