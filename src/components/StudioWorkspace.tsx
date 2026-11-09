import React, { useRef } from 'react';
import { 
  Upload, Play, Pause, RotateCcw, Trash2, Download, 
  Eye, CheckCircle2, AlertCircle, Clock, Sliders, 
  Palette, Cpu, ShieldCheck, Sparkles, Image as ImageIcon,
  Wand2
} from 'lucide-react';
import { ProcessedImage, RembgSettings, RembgModel } from '../types';

interface StudioWorkspaceProps {
  images: ProcessedImage[];
  isProcessing: boolean;
  isPaused: boolean;
  currentProcessingId: string | null;
  overallProgress: number;
  settings: RembgSettings;
  updateSettings: (partial: Partial<RembgSettings>) => void;
  onFilesSelected: (files: FileList | File[]) => void;
  onLoadSamples: () => void;
  onStartProcessing: () => void;
  onPauseProcessing: () => void;
  onResumeProcessing: () => void;
  onRevertAll: () => void;
  onClearAll: () => void;
  onInspectImage: (image: ProcessedImage) => void;
  onRestoreOriginal: (id: string) => void;
  onDownloadSingle: (image: ProcessedImage) => void;
  onRemoveImage: (id: string) => void;
  onSendToGenerator?: (image: ProcessedImage) => void;
  isArabic: boolean;
}

export const StudioWorkspace: React.FC<StudioWorkspaceProps> = ({
  images,
  isProcessing,
  isPaused,
  currentProcessingId,
  overallProgress,
  settings,
  updateSettings,
  onFilesSelected,
  onLoadSamples,
  onStartProcessing,
  onPauseProcessing,
  onResumeProcessing,
  onRevertAll,
  onClearAll,
  onInspectImage,
  onRestoreOriginal,
  onDownloadSingle,
  onRemoveImage,
  onSendToGenerator,
  isArabic
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const completedCount = images.filter((i) => i.status === 'completed').length;
  const pendingCount = images.filter((i) => i.status === 'pending').length;
  const errorCount = images.filter((i) => i.status === 'error').length;

  return (
    <div className="space-y-6">
      
      {/* Brand Hero Sub-Banner with Trust & Lead Info */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-gradient-to-r from-[#0F2952]/90 via-[#16386D]/85 to-[#0B1B36]/90 p-5 sm:p-6 text-white shadow-sm">
        <div className="space-y-1.5 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {isArabic ? 'محرك الشمساوية الذكي v2.4' : 'AlShams Neural Engine v2.4'}
            </span>
            <span className="text-xs text-slate-300">
              {isArabic ? 'الشمس كرافت · AlShams Craft' : 'AlShams Craft Brand'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {isArabic ? 'ستوديو الشمساوية لإزالة وعزل الخلفيات الذكي' : 'AlShams Craft Background Removal Studio'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {isArabic
              ? 'عزل احترافي فائق الدقة مع إمكانية معالجة الدفعات، ضبط حساسية الحواف والشعر، حفظ النتائج التلقائي، وتصدير التقارير وسكربتات الأتمتة.'
              : 'High-precision AI background removal with batch processing, adjustable alpha edge thresholds, auto-save, CSV reports, and automation scripting.'}
          </p>
        </div>
      </div>

      {/* Main Grid: Upload & Controls + Gallery */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (Settings & Parameters): 4 cols */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-[#0B1528] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            
            {/* Header of Inspector */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isArabic ? 'إعدادات دقة العزل والمعالجة' : 'Precision Tuning Settings'}
                </h2>
              </div>
              <span className="text-[11px] font-mono text-slate-400">AlShams Pro</span>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{isArabic ? 'خوارزمية العزل الذكي' : 'Isolation Algorithm'}</span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  {isArabic ? 'فائق الدقة' : 'High Precision'}
                </span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'u2net', label: isArabic ? 'الدقة القصوى (Pro)' : 'Pro Vision', desc: 'Highest precision' },
                  { id: 'u2netp', label: isArabic ? 'السرعة الفائقة (Turbo)' : 'Turbo Vision', desc: 'Fast lightweight' },
                  { id: 'silueta', label: isArabic ? 'حواف مدمجة (Edge)' : 'Edge Focus', desc: 'Compact edge' },
                  { id: 'isnet-general-use', label: isArabic ? 'التفاصيل الشاملة (Ultra)' : 'Ultra Fine', desc: 'Fine details' }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => updateSettings({ model: m.id as RembgModel })}
                    className={`px-2.5 py-2 text-start rounded-xl border text-xs transition-all ${
                      settings.model === m.id
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="truncate">{m.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Alpha Matting Toggle & Sliders */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    {isArabic ? 'صقل الأطراف والشعر المتقدم' : 'Advanced Edge Matting'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isArabic ? 'لعزل أدق للتفاصيل الدقيقة كالشعر والأقمشة' : 'Sub-pixel edge matting'}
                  </span>
                </div>
                <button
                  onClick={() => updateSettings({ alphaMatting: !settings.alphaMatting })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    settings.alphaMatting ? 'bg-amber-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
                </button>
              </div>

              {settings.alphaMatting && (
                <div className="space-y-3 ps-2 border-s-2 border-amber-500/40 mt-2">
                  {/* Foreground threshold (af) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{isArabic ? 'عتبة العنصر الأمامي (Foreground)' : 'Foreground Threshold'}</span>
                      <span className="font-mono text-amber-500 font-bold">{settings.af}</span>
                    </div>
                    <input
                      type="range"
                      min="150"
                      max="255"
                      value={settings.af}
                      onChange={(e) => updateSettings({ af: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  {/* Background threshold (ab) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{isArabic ? 'عتبة تفريغ الخلفية (Background)' : 'Background Threshold'}</span>
                      <span className="font-mono text-amber-500 font-bold">{settings.ab}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.ab}
                      onChange={(e) => updateSettings({ ab: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  {/* Erode size (ae) */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{isArabic ? 'تقليص الحواف ومنع الهالات' : 'Erode Halo Size'}</span>
                      <span className="font-mono text-amber-500 font-bold">{settings.ae}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="30"
                      value={settings.ae}
                      onChange={(e) => updateSettings({ ae: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Edge Feathering Slider */}
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>{isArabic ? 'تنعيم الأطراف (Edge Smoothing)' : 'Edge Feathering'}</span>
                  <span className="font-mono text-amber-500 font-bold">{settings.edgeFeathering}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  value={settings.edgeFeathering}
                  onChange={(e) => updateSettings({ edgeFeathering: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>

            {/* Output Background Customization */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>{isArabic ? 'خلفية الصورة الناتجة' : 'Output Background Style'}</span>
              </label>

              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'transparent', label: isArabic ? 'شفاف' : 'Transparent' },
                  { id: 'color', label: isArabic ? 'لون مصمت' : 'Solid Color' },
                  { id: 'gradient', label: isArabic ? 'تدرج' : 'Gradient' },
                  { id: 'studio', label: isArabic ? 'استوديو' : 'Studio' }
                ].map((b) => (
                  <button
                    key={b.id}
                    onClick={() => updateSettings({ backgroundType: b.id as any })}
                    className={`py-1.5 text-center text-xs rounded-lg border transition-all ${
                      settings.backgroundType === b.id
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              {settings.backgroundType === 'color' && (
                <div className="flex items-center gap-2 pt-1">
                  {[
                    { hex: '#FFFFFF', name: 'White' },
                    { hex: '#0F2952', name: 'AlShams Navy' },
                    { hex: '#D48B16', name: 'AlShams Gold' },
                    { hex: '#000000', name: 'Black' }
                  ].map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => updateSettings({ backgroundColor: c.hex })}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        settings.backgroundColor.toUpperCase() === c.hex
                          ? 'border-amber-500 scale-110'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={settings.backgroundColor}
                    onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                    className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-700 cursor-pointer overflow-hidden p-0"
                    title="Custom Color"
                  />
                  <span className="font-mono text-xs text-slate-500">{settings.backgroundColor}</span>
                </div>
              )}
            </div>

            {/* Automation & Auto-Save */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    {isArabic ? 'الحفظ التلقائي للنتائج' : 'Auto-Save Results'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isArabic ? 'تنزيل النتيجة فور اكتمال معالجة كل صورة' : 'Auto-download upon processing'}
                  </span>
                </div>
                <button
                  onClick={() => updateSettings({ autoSave: !settings.autoSave })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    settings.autoSave ? 'bg-amber-500 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
                </button>
              </div>

              {/* Engine Mode */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    {isArabic ? 'وضع العمل بدون إنترنت' : 'Offline Mode Only'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {isArabic ? 'معالجة عبر المتصفح محلياً 100%' : 'Pure client-side processing'}
                  </span>
                </div>
                <button
                  onClick={() =>
                    updateSettings({
                      engineMode: settings.engineMode === 'offline' ? 'server' : 'offline',
                    })
                  }
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    settings.engineMode === 'offline' ? 'bg-blue-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Upload Zone, Batch Controls, Gallery: 8 cols */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Dropzone Area */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500/80 rounded-2xl p-6 text-center bg-white/60 dark:bg-[#0B1528]/60 transition-colors cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onFilesSelected(e.target.files);
                }
              }}
            />
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isArabic ? 'اسحب الصور إلى هنا أو انقر للاختيار' : 'Drag & drop images here or browse'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isArabic
                    ? 'يدعم معالجة مئات الصور دفعة واحدة بصيغ PNG, JPG, WebP, BMP'
                    : 'Supports batch upload for hundreds of PNG, JPG, WebP, BMP images'}
                </p>
              </div>

              {/* Sample images button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLoadSamples();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-amber-500/10 hover:text-amber-500 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>{isArabic ? 'تحميل صور تجريبية للاختبار السريع' : 'Load Sample Test Images'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Batch Status and Controls Bar */}
          {images.length > 0 && (
            <div className="bg-white dark:bg-[#0B1528] rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Stats counter */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-semibold text-slate-800 dark:text-white">
                    {isArabic ? 'إجمالي الدفعة: ' : 'Total: '}
                    <span className="font-mono text-amber-500 font-bold">{images.length}</span>
                  </span>
                  <span>·</span>
                  <span className="text-emerald-500 font-medium">
                    {isArabic ? 'مكتمل: ' : 'Done: '}
                    <span className="font-mono">{completedCount}</span>
                  </span>
                  <span>·</span>
                  <span className="text-blue-400 font-medium">
                    {isArabic ? 'بانتظار: ' : 'Pending: '}
                    <span className="font-mono">{pendingCount}</span>
                  </span>
                  {errorCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-rose-500 font-medium">
                        {isArabic ? 'أخطاء: ' : 'Errors: '}
                        <span className="font-mono">{errorCount}</span>
                      </span>
                    </>
                  )}
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2">
                  {!isProcessing ? (
                    <button
                      onClick={onStartProcessing}
                      disabled={pendingCount === 0}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isArabic ? 'بدء معالجة الدفعة' : 'Start Processing Batch'}</span>
                    </button>
                  ) : isPaused ? (
                    <button
                      onClick={onResumeProcessing}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isArabic ? 'استئناف' : 'Resume'}</span>
                    </button>
                  ) : (
                    <button
                      onClick={onPauseProcessing}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-sm transition-all"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>{isArabic ? 'إيقاف مؤقت' : 'Pause'}</span>
                    </button>
                  )}

                  <button
                    onClick={onRevertAll}
                    title={isArabic ? 'تراجع واستعادة الصور الأصلية' : 'Revert All to Original'}
                    className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={onClearAll}
                    title={isArabic ? 'تفريغ القائمة' : 'Clear Queue'}
                    className="p-2 text-rose-500 hover:text-rose-600 rounded-xl hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Overall Progress Bar */}
              {isProcessing && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>{isArabic ? 'جاري عزل خلفيات الصور...' : 'Processing batch...'}</span>
                    <span>{Math.round(overallProgress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300 rounded-full"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Image Cards Grid */}
          {images.length === 0 ? (
            <div className="bg-white/40 dark:bg-[#0B1528]/40 rounded-2xl p-12 text-center border border-slate-200/60 dark:border-slate-800/60">
              <ImageIcon className="w-12 h-12 mx-auto text-slate-400 mb-3 opacity-40" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                {isArabic ? 'لا توجد صور في قائمة المعالجة الحالية' : 'No images in queue'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {isArabic ? 'قم بسحب صورك أو اضغط على تحميل صور تجريبية للبدء' : 'Drop images or click "Load Sample Test Images" to begin'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {images.map((item) => {
                const isCurrent = item.id === currentProcessingId;
                const isCompleted = item.status === 'completed';
                const isError = item.status === 'error';

                return (
                  <div
                    key={item.id}
                    className={`group relative bg-white dark:bg-[#0B1528] rounded-2xl border overflow-hidden transition-all shadow-xs ${
                      isCurrent
                        ? 'border-amber-500 ring-2 ring-amber-500/20'
                        : isCompleted
                        ? 'border-emerald-500/40 dark:border-emerald-500/30'
                        : isError
                        ? 'border-rose-500/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Thumbnail Viewport */}
                    <div 
                      onClick={() => onInspectImage(item)}
                      className="relative h-44 w-full bg-transparency-grid overflow-hidden flex items-center justify-center cursor-pointer"
                    >
                      <img
                        src={item.processedUrl || item.originalUrl}
                        alt={item.name}
                        className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105"
                      />

                      {/* Status Tag Overlay */}
                      <div className="absolute top-2 start-2">
                        {isCompleted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/90 text-white shadow-xs">
                            <CheckCircle2 className="w-3 h-3" />
                            {isArabic ? 'تم العزل' : 'Done'}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/90 text-slate-950 animate-pulse shadow-xs">
                            <Clock className="w-3 h-3" />
                            {isArabic ? 'جاري المعالجة...' : 'Processing...'}
                          </span>
                        )}
                        {item.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-slate-300 backdrop-blur-xs">
                            {isArabic ? 'بانتظار البدء' : 'Pending'}
                          </span>
                        )}
                        {isError && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/90 text-white shadow-xs">
                            <AlertCircle className="w-3 h-3" />
                            {isArabic ? 'خطأ' : 'Error'}
                          </span>
                        )}
                      </div>

                      {/* Hover Quick Inspect Button */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInspectImage(item);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/90 text-slate-900 text-xs font-bold shadow-md hover:bg-white flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{isArabic ? 'معاينة ومقارنة' : 'Compare'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Metadata & Actions Footer */}
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[160px]" title={item.name}>
                          {item.name}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400">
                          {(item.originalSize / 1024).toFixed(0)} KB
                        </span>
                      </div>

                      {isCompleted && (
                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          <span>{item.outputWidth}x{item.outputHeight}</span>
                          <span className="text-emerald-500 font-semibold">{item.processingTimeMs}ms</span>
                        </div>
                      )}

                      {/* Card Button Strip */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-1">
                          {isCompleted && (
                            <button
                              onClick={() => onRestoreOriginal(item.id)}
                              title={isArabic ? 'تراجع واستعادة الأصلية' : 'Revert to Original'}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => onRemoveImage(item.id)}
                            title={isArabic ? 'حذف من القائمة' : 'Remove from list'}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {isCompleted && onSendToGenerator && (
                            <button
                              onClick={() => onSendToGenerator(item)}
                              title={isArabic ? 'توليد خلفية جديدة لهذا المنتج' : 'Generate Background for this'}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-slate-950 transition-colors"
                            >
                              <Wand2 className="w-3 h-3 text-amber-500" />
                              <span>{isArabic ? 'توليد مشهد' : 'Scene'}</span>
                            </button>
                          )}

                          {isCompleted && (
                            <button
                              onClick={() => onDownloadSingle(item)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              <span>PNG</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
