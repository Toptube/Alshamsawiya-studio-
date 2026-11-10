export interface ProcessedImage {
  id: string;
  name: string;
  originalUrl: string;
  processedUrl: string | null;
  maskUrl?: string | null;
  status: 'pending' | 'processing' | 'completed' | 'error';
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
  originalSize: number; // in bytes
  outputSize: number; // in bytes
  processingTimeMs: number;
  error?: string | null;
  modelUsed: string;
  timestamp: string;
  customPath?: string;
  outputPath?: string;
  history: string[]; // snapshot urls for undo
  generatedBackgroundUrl?: string | null;
}

export type RembgModel = 'u2net' | 'u2netp' | 'silueta' | 'isnet-general-use';

export interface RembgSettings {
  model: RembgModel;
  alphaMatting: boolean;
  af: number; // Foreground threshold 0-255 (default: 240)
  ab: number; // Background threshold 0-255 (default: 10)
  ae: number; // Erode size 0-40 (default: 10)
  edgeFeathering: number; // 0-20px
  outputFormat: 'png' | 'webp';
  backgroundType: 'transparent' | 'color' | 'gradient' | 'studio';
  backgroundColor: string; // hex color
  autoSave: boolean;
  engineMode: 'server' | 'offline';
  soundAlerts: boolean;
  browserNotifications: boolean;
}

export interface StudioPresetTheme {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  category: 'luxury' | 'nature' | 'studio' | 'modern' | 'alshams';
  prompt: string;
  previewBg: string; // CSS gradient or color preview
  ambientColor: string;
  shadowColor: string;
  defaultShadowOpacity: number;
}

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  fileName: string;
  errorMessage: string;
  engine: string;
  model: string;
}

export interface StudioStats {
  totalProcessed: number;
  successfulCount: number;
  failedCount: number;
  totalOriginalBytes: number;
  totalOutputBytes: number;
  totalTimeSpentMs: number;
  dailyHistory: {
    date: string;
    count: number;
    successRate: number;
  }[];
}
