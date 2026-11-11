import { ProcessedImage, RembgSettings } from '../../types';
import { processImageOffline } from './offlineProcessor';
import JSZip from 'jszip';

export interface SystemStatus {
  appName: string;
  appEnglishName: string;
  version: string;
  engineAvailable: boolean;
  engine: string;
  supportWhatsApp: string;
  supportEngineer: string;
  availableModels: string[];
  defaultModel: string;
  supportsOffline: boolean;
  supportsBackgroundGeneration: boolean;
  offlineNotice: string;
}

export async function fetchSystemStatus(): Promise<SystemStatus> {
  try {
    const res = await fetch('/api/system/status');
    if (!res.ok) throw new Error('Status endpoint failed');
    return await res.json();
  } catch (e) {
    // If backend is offline, return offline fallback status
    return {
      appName: 'ستوديو الشمساوية',
      appEnglishName: 'AlShams Craft Studio',
      version: '2.4.0',
      engineAvailable: false,
      engine: 'المعالج المحلي الداخلي (Offline Engine)',
      supportWhatsApp: '01000996059',
      supportEngineer: 'م.حسام بسيوني',
      availableModels: ['u2net', 'u2netp', 'silueta'],
      defaultModel: 'u2net',
      supportsOffline: true,
      supportsBackgroundGeneration: true,
      offlineNotice: 'وضع العمل بدون إنترنت نشط'
    };
  }
}

export async function processImageUnified(
  imageItem: ProcessedImage,
  settings: RembgSettings
): Promise<{
  outputUrl: string;
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
  outputSize: number;
  processingTimeMs: number;
  modelUsed: string;
  engineUsed: string;
}> {
  // If user selected offline mode or explicitly forced offline
  if (settings.engineMode === 'offline') {
    const res = await processImageOffline(imageItem.originalUrl, settings);
    return {
      ...res,
      modelUsed: 'المعالج المحلي فائق السرعة',
      engineUsed: 'offline'
    };
  }

  // Try the server-side Node.js background-removal engine first
  try {
    let base64Data = imageItem.originalUrl;
    if (base64Data.startsWith('blob:')) {
      // convert blob to base64
      base64Data = await blobUrlToBase64(base64Data);
    }

    const payload: any = {
      image: base64Data,
      model: settings.model,
      alphaMatting: settings.alphaMatting,
      af: settings.af,
      ab: settings.ab,
      ae: settings.ae,
      postProcessMask: true
    };

    if (settings.backgroundType === 'color' && settings.backgroundColor) {
      // convert hex to rgb
      const hex = settings.backgroundColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) || 0;
      const g = parseInt(hex.substring(2, 4), 16) || 0;
      const b = parseInt(hex.substring(4, 6), 16) || 0;
      payload.bgcolor = `${r},${g},${b}`;
    }

    const response = await fetch('/api/rembg/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || `Server HTTP error ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || 'Server processing failed');
    }

    return {
      outputUrl: data.output_base64,
      originalWidth: data.original_width,
      originalHeight: data.original_height,
      outputWidth: data.output_width,
      outputHeight: data.output_height,
      outputSize: data.output_size_bytes,
      processingTimeMs: data.processing_time_ms,
      modelUsed: data.model_used,
      engineUsed: 'node-rembg'
    };
  } catch (err: any) {
    console.warn('Server rembg failed or unreachable, failing over to offline engine:', err.message);
    const offlineRes = await processImageOffline(imageItem.originalUrl, settings);
    return {
      ...offlineRes,
      modelUsed: `${settings.model} (تم التبديل للمعالج المحلي)`,
      engineUsed: 'offline-fallback'
    };
  }
}

// Helper to convert blob URL to base64 string
export async function blobUrlToBase64(blobUrl: string): Promise<string> {
  const res = await fetch(blobUrl);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Generate & Download CSV Report with UTF-8 BOM for Arabic compatibility
export function exportReportToCSV(items: ProcessedImage[]) {
  if (items.length === 0) return;

  const headers = [
    'اسم الملف',
    'الحالة',
    'المسار الموثق',
    'الأبعاد الأصلية',
    'أبعاد النتيجة',
    'الحجم الأصلي (KB)',
    'حجم النتيجة (KB)',
    'نسبة التحسين (%)',
    'زمن المعالجة (ms)',
    'نموذج الذكاء الاصطناعي',
    'التوقيت'
  ];

  const rows = items.map((item) => {
    const origKb = (item.originalSize / 1024).toFixed(1);
    const outKb = item.outputSize ? (item.outputSize / 1024).toFixed(1) : '0';
    const reduction = item.originalSize && item.outputSize
      ? Math.round(((item.originalSize - item.outputSize) / item.originalSize) * 100)
      : 0;

    return [
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.status === 'completed' ? 'تم بنجاح' : item.status === 'error' ? 'خطأ' : 'قيد الانتظار'}"`,
      `"${(item.customPath || item.name).replace(/"/g, '""')}"`,
      `"${item.originalWidth}x${item.originalHeight}"`,
      `"${item.outputWidth || '-'}x${item.outputHeight || '-'}"`,
      origKb,
      outKb,
      `${reduction}%`,
      item.processingTimeMs || 0,
      `"${item.modelUsed || '-'}"`,
      `"${item.timestamp}"`
    ].join(',');
  });

  // \uFEFF is UTF-8 Byte Order Mark for Excel
  const csvContent = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `تقرير_ستوديو_الشمساوية_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Download all completed images as a ZIP archive
export async function downloadAllAsZip(items: ProcessedImage[]): Promise<void> {
  const completed = items.filter((i) => i.status === 'completed' && i.processedUrl);
  if (completed.length === 0) return;

  const zip = new JSZip();
  const folder = zip.folder('صور_ستوديو_الشمساوية_بدون_خلفية') || zip;

  for (const item of completed) {
    if (!item.processedUrl) continue;
    let base64 = item.processedUrl;
    if (base64.startsWith('data:')) {
      base64 = base64.split(',')[1];
    } else if (base64.startsWith('blob:')) {
      const b64 = await blobUrlToBase64(base64);
      base64 = b64.split(',')[1];
    }
    const cleanName = item.name.replace(/\.[^/.]+$/, '') + '_alshams_nobg.png';
    folder.file(cleanName, base64, { base64: true });
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `حزمة_الشمساوية_${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Trigger Standalone Python Script Download
export async function downloadPythonScript(settings: RembgSettings) {
  try {
    const res = await fetch('/api/rembg/generate-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.model,
        alphaMatting: settings.alphaMatting,
        af: settings.af,
        ab: settings.ab,
        ae: settings.ae
      })
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'alshams_studio_automation.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Failed to download python script:', err);
  }
}
