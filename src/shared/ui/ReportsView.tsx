import React, { useState } from 'react';
import { 
  FileSpreadsheet, Download, Archive, Code2, Search, 
  CheckCircle2, AlertCircle, Clock,
  Trash2
} from 'lucide-react';
import { ProcessedImage, RembgSettings } from '../../types';
import { exportReportToCSV, downloadAllAsZip, downloadPythonScript } from '../lib/api';

interface ReportsViewProps {
  images: ProcessedImage[];
  settings: RembgSettings;
  onDownloadSingle: (image: ProcessedImage) => void;
  onClearReports: () => void;
  isArabic: boolean;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  images,
  settings,
  onDownloadSingle,
  onClearReports,
  isArabic
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'error' | 'pending'>('all');
  const [isZipping, setIsZipping] = useState(false);

  const filteredImages = images.filter((img) => {
    const matchesSearch = img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (img.customPath && img.customPath.toLowerCase().includes(searchTerm.toLowerCase()));
    if (statusFilter === 'all') return matchesSearch;
    return matchesSearch && img.status === statusFilter;
  });

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await downloadAllAsZip(images);
    } catch (err) {
      console.error(err);
    } finally {
      setIsZipping(false);
    }
  };

  const completedCount = images.filter((i) => i.status === 'completed').length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Export Actions */}
      <div className="bg-white dark:bg-[#0B1528] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {isArabic ? 'التقرير النهائي وتوثيق المسارات المعالجة' : 'Final Processing & Path Tracking Report'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isArabic
                    ? 'توثيق شامل لكافة الملفات، الأحجام قبل وبعد العزل، أزمنة المعالجة بالمللي ثانية، ومسارات الحفظ.'
                    : 'Comprehensive documentation of processed files, byte savings, latency, and path records.'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Export CSV button */}
            <button
              onClick={() => exportReportToCSV(images)}
              disabled={images.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>{isArabic ? 'تصدير تقرير CSV' : 'Export CSV'}</span>
            </button>

            {/* Download ZIP */}
            <button
              onClick={handleDownloadZip}
              disabled={completedCount === 0 || isZipping}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>
                {isZipping 
                  ? (isArabic ? 'جاري ضغط الحزمة...' : 'Creating ZIP...') 
                  : (isArabic ? `تحميل الحزمة ZIP (${completedCount})` : `Download ZIP (${completedCount})`)}
              </span>
            </button>

            {/* Export Python Script */}
            <button
              onClick={() => downloadPythonScript(settings)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Download standalone automation python script"
            >
              <Code2 className="w-3.5 h-3.5 text-amber-500" />
              <span>{isArabic ? 'تصدير سكربت بايثون' : 'Export Python Script'}</span>
            </button>

            {/* Clear button */}
            {images.length > 0 && (
              <button
                onClick={onClearReports}
                className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                title={isArabic ? 'تفريغ السجل' : 'Clear Log'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={isArabic ? 'بحث بالاسم أو المسار...' : 'Search by name or path...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full ps-9 pe-4 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Segmented Filter Control */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs self-start sm:self-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {isArabic ? 'الكل' : 'All'} ({images.length})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'completed'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {isArabic ? 'الناجحة' : 'Completed'} ({completedCount})
            </button>
            <button
              onClick={() => setStatusFilter('error')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === 'error'
                  ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {isArabic ? 'الأخطاء' : 'Errors'} ({images.filter((i) => i.status === 'error').length})
            </button>
          </div>
        </div>
      </div>

      {/* Structured High-Density Table */}
      <div className="bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 dark:bg-[#070E1A] border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">{isArabic ? 'الملف' : 'File'}</th>
                <th className="px-4 py-3 text-start font-semibold">{isArabic ? 'الحالة' : 'Status'}</th>
                <th className="px-4 py-3 text-start font-semibold">{isArabic ? 'المسار الموثق' : 'Logged Path'}</th>
                <th className="px-4 py-3 text-start font-semibold">{isArabic ? 'الأبعاد' : 'Dimensions'}</th>
                <th className="px-4 py-3 text-end font-semibold">{isArabic ? 'الحجم الأصلي' : 'Original Size'}</th>
                <th className="px-4 py-3 text-end font-semibold">{isArabic ? 'حجم النتيجة' : 'Result Size'}</th>
                <th className="px-4 py-3 text-end font-semibold">{isArabic ? 'الزمن' : 'Time'}</th>
                <th className="px-4 py-3 text-start font-semibold">{isArabic ? 'النموذج' : 'Model'}</th>
                <th className="px-4 py-3 text-center font-semibold">{isArabic ? 'تحميل' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredImages.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    {isArabic ? 'لا توجد سجلات تطابق الفلتر الحالي' : 'No report records match current filter'}
                  </td>
                </tr>
              ) : (
                filteredImages.map((item) => {
                  const origKb = (item.originalSize / 1024).toFixed(1);
                  const outKb = item.outputSize ? (item.outputSize / 1024).toFixed(1) : '-';
                  const reduction = item.originalSize && item.outputSize
                    ? Math.round(((item.originalSize - item.outputSize) / item.originalSize) * 100)
                    : 0;

                  return (
                    <tr 
                      key={item.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Name & mini preview */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-transparency-grid overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                            <img
                              src={item.processedUrl || item.originalUrl}
                              alt=""
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[140px]" title={item.name}>
                            {item.name}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.status === 'completed' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {isArabic ? 'تم بنجاح' : 'Success'}
                          </span>
                        )}
                        {item.status === 'processing' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500 animate-pulse">
                            <Clock className="w-3.5 h-3.5" />
                            {isArabic ? 'جاري المعالجة' : 'Processing'}
                          </span>
                        )}
                        {item.status === 'pending' && (
                          <span className="text-[11px] text-slate-400">
                            {isArabic ? 'بانتظار البدء' : 'Pending'}
                          </span>
                        )}
                        {item.status === 'error' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500" title={item.error || ''}>
                            <AlertCircle className="w-3.5 h-3.5" />
                            {isArabic ? 'خطأ' : 'Error'}
                          </span>
                        )}
                      </td>

                      {/* Path */}
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={item.customPath || item.name}>
                        {item.customPath || item.name}
                      </td>

                      {/* Dimensions */}
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap tabular-nums">
                        {item.originalWidth}x{item.originalHeight}
                      </td>

                      {/* Original Size */}
                      <td className="px-4 py-3 text-end font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap tabular-nums">
                        {origKb} KB
                      </td>

                      {/* Result Size */}
                      <td className="px-4 py-3 text-end font-mono text-amber-600 dark:text-amber-400 whitespace-nowrap tabular-nums font-semibold">
                        {outKb} {outKb !== '-' && 'KB'}
                        {reduction > 0 && (
                          <span className="text-[10px] text-emerald-500 block">(-{reduction}%)</span>
                        )}
                      </td>

                      {/* Time */}
                      <td className="px-4 py-3 text-end font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap tabular-nums">
                        {item.processingTimeMs ? `${item.processingTimeMs} ms` : '-'}
                      </td>

                      {/* Model */}
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {item.modelUsed || settings.model}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {item.status === 'completed' && (
                          <button
                            onClick={() => onDownloadSingle(item)}
                            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title={isArabic ? 'تنزيل الصورة المعزولة' : 'Download PNG'}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
