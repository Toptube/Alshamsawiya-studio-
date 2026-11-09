import React from 'react';
import { 
  AlertTriangle, RefreshCw, Trash2, Download, 
  CheckCircle, FileWarning, ExternalLink
} from 'lucide-react';
import { ErrorLogEntry } from '../types';

interface ErrorLogsViewProps {
  errorLogs: ErrorLogEntry[];
  onRetryAll: () => void;
  onClearLogs: () => void;
  isArabic: boolean;
}

export const ErrorLogsView: React.FC<ErrorLogsViewProps> = ({
  errorLogs,
  onRetryAll,
  onClearLogs,
  isArabic
}) => {
  const exportErrors = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(errorLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `سجل_أخطاء_ستوديو_الشمساوية_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#0B1528] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {isArabic ? 'سجل الأخطاء والتشخيص الفني' : 'Error Log & Technical Diagnostics'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isArabic
                ? 'توثيق دقيق للأخطاء البرمجية أو المشكلات في قراءة الصور لمراجعتها وحلها.'
                : 'Detailed logging of image decoding and segmentation failures for subsequent review.'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {errorLogs.length > 0 && (
            <>
              <button
                onClick={onRetryAll}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isArabic ? 'إعادة المحاولة للكل' : 'Retry All'}</span>
              </button>

              <button
                onClick={exportErrors}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isArabic ? 'تصدير السجل JSON' : 'Export JSON'}</span>
              </button>

              <button
                onClick={onClearLogs}
                className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                title={isArabic ? 'تفريغ سجل الأخطاء' : 'Clear Errors'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {errorLogs.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                {isArabic ? 'سجل الأخطاء نظيف تماماً!' : 'No Errors Recorded'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isArabic ? 'كافة عمليات المعالجة تمت بسلاسة ودقة فائقة' : 'All background removal operations completed smoothly.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-slate-50 dark:bg-[#070E1A] border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                <tr>
                  <th className="px-4 py-3 text-start">{isArabic ? 'التوقيت' : 'Timestamp'}</th>
                  <th className="px-4 py-3 text-start">{isArabic ? 'اسم الملف' : 'Filename'}</th>
                  <th className="px-4 py-3 text-start">{isArabic ? 'رسالة الخطأ' : 'Error Message'}</th>
                  <th className="px-4 py-3 text-start">{isArabic ? 'المحرك والنموذج' : 'Engine & Model'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono text-[11px]">
                {errorLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white font-semibold whitespace-nowrap">
                      {log.fileName}
                    </td>
                    <td className="px-4 py-3 text-rose-500 max-w-md truncate" title={log.errorMessage}>
                      {log.errorMessage}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {log.engine} · {log.model}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
