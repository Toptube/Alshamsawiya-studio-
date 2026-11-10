/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { StudioWorkspace } from './components/StudioWorkspace';
import { BackgroundGenerator } from './components/BackgroundGenerator';
import { StoryboardWorkspace } from './components/StoryboardWorkspace';
import { SupirEnhancer } from './components/SupirEnhancer';
import { SidebarDrawer } from './components/SidebarDrawer';
import { ReportsView } from './components/ReportsView';
import { AnalyticsView } from './components/AnalyticsView';
import { ImageComparisonModal } from './components/ImageComparisonModal';
import { UserGuideModal } from './components/UserGuideModal';
import { SupportModal } from './components/SupportModal';
import { UpdatesModal } from './components/UpdatesModal';
import { ProcessedImage, RembgSettings, ErrorLogEntry, StudioStats } from './types';
import { processImageUnified, fetchSystemStatus } from './services/api';
import { soundEffects } from './utils/audio';
import { createSampleImages } from './utils/sampleImages';

const DEFAULT_SETTINGS: RembgSettings = {
  model: 'u2net',
  alphaMatting: true,
  af: 240,
  ab: 10,
  ae: 10,
  edgeFeathering: 2,
  outputFormat: 'png',
  backgroundType: 'transparent',
  backgroundColor: '#FFFFFF',
  autoSave: false,
  engineMode: 'server',
  soundAlerts: true,
  browserNotifications: false,
};

export default function App() {
  // Primary Tabs: 'removal' (عزل) | 'supir' (تحسين) | 'generator' (مشاهد) | 'storyboard' (لوحتي)
  const [activeTab, setActiveTab] = useState<'removal' | 'supir' | 'generator' | 'storyboard' | 'reports' | 'analytics'>('removal');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [isArabic, setIsArabic] = useState<boolean>(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const [settings, setSettings] = useState<RembgSettings>(() => {
    try {
      const saved = localStorage.getItem('alshams_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [selectedForGenerator, setSelectedForGenerator] = useState<ProcessedImage | null>(null);
  const [errorLogs, setErrorLogs] = useState<ErrorLogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentProcessingId, setCurrentProcessingId] = useState<string | null>(null);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [inspectImage, setInspectImage] = useState<ProcessedImage | null>(null);

  // Modals
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isSupportOpen, setIsSupportOpen] = useState<boolean>(false);
  const [isUpdatesOpen, setIsUpdatesOpen] = useState<boolean>(false);

  // Reference to cancel or pause batch processing
  const pauseRef = useRef<boolean>(false);
  pauseRef.current = isPaused;

  const cancelRef = useRef<boolean>(false);

  // Stats calculation
  const [stats, setStats] = useState<StudioStats>({
    totalProcessed: 0,
    successfulCount: 0,
    failedCount: 0,
    totalOriginalBytes: 0,
    totalOutputBytes: 0,
    totalTimeSpentMs: 0,
    dailyHistory: [],
  });

  // Sync settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('alshams_settings', JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  // Sync dark class on documentElement
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Sync language / RTL dir on documentElement
  useEffect(() => {
    document.documentElement.lang = isArabic ? 'ar' : 'en';
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr';
  }, [isArabic]);

  // Check system status on mount & auto-load sample images if queue empty
  useEffect(() => {
    fetchSystemStatus().then((status) => {
      // silent
    });

    const samples = createSampleImages();
    setImages(samples);
  }, []);

  const updateSettings = (partial: Partial<RembgSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const toggleDarkMode = () => setIsDark((d) => !d);
  const toggleLanguage = () => setIsArabic((a) => !a);

  // File selection handler
  const handleFilesSelected = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    const newItems: ProcessedImage[] = [];
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    let loadedCount = 0;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          newItems.push({
            id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            originalUrl: url,
            processedUrl: null,
            status: 'pending',
            originalWidth: img.naturalWidth || img.width,
            originalHeight: img.naturalHeight || img.height,
            outputWidth: 0,
            outputHeight: 0,
            originalSize: file.size,
            outputSize: 0,
            processingTimeMs: 0,
            modelUsed: settings.model,
            timestamp,
            customPath: (file as any).webkitRelativePath || file.name,
            history: [],
          });

          loadedCount++;
          if (loadedCount === files.length) {
            setImages((prev) => [...prev, ...newItems]);
          }
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLoadSamples = () => {
    const samples = createSampleImages();
    setImages((prev) => [...prev, ...samples]);
    soundEffects.playClick();
  };

  // Start Batch Processing Loop
  const handleStartProcessing = async () => {
    cancelRef.current = false;
    setIsProcessing(true);
    setIsPaused(false);

    const pending = images.filter((img) => img.status === 'pending' || img.status === 'error');
    if (pending.length === 0) {
      setIsProcessing(false);
      return;
    }

    let completedInBatch = 0;
    const totalToProcess = pending.length;

    for (const item of pending) {
      if (cancelRef.current) break;

      while (pauseRef.current) {
        await new Promise((r) => setTimeout(r, 200));
        if (cancelRef.current) break;
      }
      if (cancelRef.current) break;

      setCurrentProcessingId(item.id);

      setImages((prev) =>
        prev.map((img) => (img.id === item.id ? { ...img, status: 'processing' } : img))
      );

      try {
        const result = await processImageUnified(item, settings);

        setImages((prev) =>
          prev.map((img) => {
            if (img.id === item.id) {
              return {
                ...img,
                processedUrl: result.outputUrl,
                status: 'completed',
                outputWidth: result.outputWidth,
                outputHeight: result.outputHeight,
                outputSize: result.outputSize,
                processingTimeMs: result.processingTimeMs,
                modelUsed: result.modelUsed,
                history: [img.originalUrl],
              };
            }
            return img;
          })
        );

        setStats((prev) => ({
          ...prev,
          totalProcessed: prev.totalProcessed + 1,
          successfulCount: prev.successfulCount + 1,
          totalOriginalBytes: prev.totalOriginalBytes + item.originalSize,
          totalOutputBytes: prev.totalOutputBytes + result.outputSize,
          totalTimeSpentMs: prev.totalTimeSpentMs + result.processingTimeMs,
        }));

        if (settings.autoSave) {
          triggerSingleDownload({
            ...item,
            processedUrl: result.outputUrl,
          });
        }
      } catch (err: any) {
        const errMsg = err.message || 'Unknown processing error';
        setImages((prev) =>
          prev.map((img) =>
            img.id === item.id ? { ...img, status: 'error', error: errMsg } : img
          )
        );

        setErrorLogs((prev) => [
          {
            id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            timestamp: new Date().toLocaleTimeString(),
            fileName: item.name,
            errorMessage: errMsg,
            engine: settings.engineMode,
            model: settings.model,
          },
          ...prev,
        ]);

        setStats((prev) => ({
          ...prev,
          totalProcessed: prev.totalProcessed + 1,
          failedCount: prev.failedCount + 1,
        }));
      }

      completedInBatch++;
      setOverallProgress((completedInBatch / totalToProcess) * 100);
    }

    setIsProcessing(false);
    setCurrentProcessingId(null);

    if (settings.soundAlerts) {
      soundEffects.playCompletionChime();
    }

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D48B16', '#0F2952', '#3B82F6', '#10B981'],
      });
    } catch {
      // ignore
    }
  };

  const handlePauseProcessing = () => {
    setIsPaused(true);
    soundEffects.playClick();
  };

  const handleResumeProcessing = () => {
    setIsPaused(false);
    soundEffects.playClick();
  };

  const handleRestoreOriginal = (id: string) => {
    setImages((prev) =>
      prev.map((img) => {
        if (img.id === id) {
          return {
            ...img,
            processedUrl: null,
            status: 'pending',
            outputWidth: 0,
            outputHeight: 0,
            outputSize: 0,
            processingTimeMs: 0,
            error: null,
          };
        }
        return img;
      })
    );

    if (inspectImage && inspectImage.id === id) {
      setInspectImage((prev) => (prev ? { ...prev, processedUrl: null, status: 'pending' } : null));
    }

    soundEffects.playClick();
  };

  const handleRevertAll = () => {
    cancelRef.current = true;
    setIsProcessing(false);
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        processedUrl: null,
        status: 'pending',
        outputWidth: 0,
        outputHeight: 0,
        outputSize: 0,
        processingTimeMs: 0,
        error: null,
      }))
    );
    soundEffects.playClick();
  };

  const handleClearAll = () => {
    cancelRef.current = true;
    setIsProcessing(false);
    setImages([]);
    soundEffects.playClick();
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    soundEffects.playClick();
  };

  const triggerSingleDownload = (image: ProcessedImage) => {
    const url = image.processedUrl || image.originalUrl;
    const a = document.createElement('a');
    a.href = url;
    a.download = image.name.replace(/\.[^/.]+$/, '') + '_alshams_nobg.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    soundEffects.playClick();
  };

  const handleRetryAllErrors = () => {
    setImages((prev) =>
      prev.map((img) => (img.status === 'error' ? { ...img, status: 'pending', error: null } : img))
    );
    setActiveTab('removal');
    setTimeout(() => {
      handleStartProcessing();
    }, 150);
  };

  const handleSendToGenerator = (item: ProcessedImage) => {
    setSelectedForGenerator(item);
    setActiveTab('generator');
    soundEffects.playClick();
  };

  const handleAddImageFromGenerator = (item: ProcessedImage) => {
    setImages((prev) => [item, ...prev]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#070E1A] text-slate-900 dark:text-slate-100 transition-colors overflow-x-hidden w-full max-w-full">
      
      {/* Top Header with Brand, 4 Main Workflow Tabs, and Drawer Trigger */}
      <Header
        activeTab={activeTab as any}
        setActiveTab={setActiveTab as any}
        isDark={isDark}
        toggleDarkMode={toggleDarkMode}
        isArabic={isArabic}
        toggleLanguage={toggleLanguage}
        onOpenDrawer={() => setIsDrawerOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* 1. عزل */}
        {activeTab === 'removal' && (
          <StudioWorkspace
            images={images}
            isProcessing={isProcessing}
            isPaused={isPaused}
            currentProcessingId={currentProcessingId}
            overallProgress={overallProgress}
            settings={settings}
            updateSettings={updateSettings}
            onFilesSelected={handleFilesSelected}
            onLoadSamples={handleLoadSamples}
            onStartProcessing={handleStartProcessing}
            onPauseProcessing={handlePauseProcessing}
            onResumeProcessing={handleResumeProcessing}
            onRevertAll={handleRevertAll}
            onClearAll={handleClearAll}
            onInspectImage={(img) => setInspectImage(img)}
            onRestoreOriginal={handleRestoreOriginal}
            onDownloadSingle={triggerSingleDownload}
            onRemoveImage={handleRemoveImage}
            onSendToGenerator={handleSendToGenerator}
            isArabic={isArabic}
          />
        )}

        {/* 2. تحسين */}
        {activeTab === 'supir' && (
          <SupirEnhancer
            images={images}
            isArabic={isArabic}
            onAddImageToLibrary={handleAddImageFromGenerator}
          />
        )}

        {/* 3. مشاهد */}
        {activeTab === 'generator' && (
          <BackgroundGenerator
            images={images}
            selectedInitialImage={selectedForGenerator}
            settings={settings}
            onAddImageToLibrary={handleAddImageFromGenerator}
            isArabic={isArabic}
          />
        )}

        {/* 4. لوحتي */}
        {activeTab === 'storyboard' && (
          <StoryboardWorkspace
            images={images}
            isArabic={isArabic}
            onAddImageToLibrary={handleAddImageFromGenerator}
          />
        )}

        {/* Secondary Views accessed via direct link if needed */}
        {activeTab === 'reports' && (
          <ReportsView
            images={images}
            settings={settings}
            onDownloadSingle={triggerSingleDownload}
            onClearReports={handleClearAll}
            isArabic={isArabic}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            stats={stats}
            images={images}
            isArabic={isArabic}
          />
        )}
      </main>

      {/* Footer - Single clean line per user request */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0A1324] py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 mt-auto">
        <div className="max-w-7xl mx-auto flex items-center justify-center text-center">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            {isArabic ? 'ستوديو الشمساوية · الشمس كرافت © 2026' : 'AlShams Craft Studio © 2026'}
          </p>
        </div>
      </footer>

      {/* Slide-Over Sidebar Drawer */}
      <SidebarDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        isArabic={isArabic}
        toggleLanguage={toggleLanguage}
        isDark={isDark}
        toggleDarkMode={toggleDarkMode}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Modals */}
      <ImageComparisonModal
        image={inspectImage}
        onClose={() => setInspectImage(null)}
        onRestoreOriginal={handleRestoreOriginal}
        onDownload={triggerSingleDownload}
        isArabic={isArabic}
      />

      <UserGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        isArabic={isArabic}
      />

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        isArabic={isArabic}
      />

      <UpdatesModal
        isOpen={isUpdatesOpen}
        onClose={() => setIsUpdatesOpen(false)}
        isArabic={isArabic}
      />
    </div>
  );
}
