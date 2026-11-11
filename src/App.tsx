/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { StudioWorkspace } from './features/isolate/StudioWorkspace';
import { SupirEnhancer } from './features/enhance/SupirEnhancer';
import { BackgroundGenerator } from './features/scenes/BackgroundGenerator';
import { StoryboardWorkspace } from './features/board/StoryboardWorkspace';
import { AdStoryboard } from './features/ads/AdStoryboard';
import { Header } from './shared/ui/Header';
import { SidebarDrawer } from './shared/ui/SidebarDrawer';
import { ImageComparisonModal } from './shared/ui/ImageComparisonModal';
import { UserGuideModal } from './shared/ui/UserGuideModal';
import { SupportModal } from './shared/ui/SupportModal';
import { UpdatesModal } from './shared/ui/UpdatesModal';
import { ProcessedImage, RembgSettings, ErrorLogEntry, StudioStats } from './types';
import { ProjectsLibrary } from './features/library/ProjectsLibrary';
import { AutoStudioProgress, type AutoStudioStep } from './features/library/AutoStudioProgress';
import type { SceneProjectState } from './features/scenes/BackgroundGenerator';
import type { EnhanceProjectState } from './features/enhance/SupirEnhancer';
import type { StoryboardFrame } from './features/board/StoryboardWorkspace';
import type { ProductType, ProductDescription } from './shared/lib/visionProvider';
import { processImageUnified, fetchSystemStatus } from './shared/lib/api';
import { autoEnhance, createStoryboardFrames, generateWhiteStudioScenes, smartIsolate } from './shared/lib/autoStudio';
import { processingQueue } from './shared/lib/processingQueue';
import { soundEffects } from './shared/lib/audio';
import { useStudioStore } from './store/useStudioStore';
import {
  friendlyStorageError,
  listProjects,
  loadProject,
  requestPersistentStorage,
  saveImageProject,
  type Project,
  type ProjectStage
} from './store/projectDatabase';

interface AutoStudioProgressState {
  runId: number;
  step: AutoStudioStep;
  progress: number;
  detail: string;
  error?: string | null;
}

export default function App() {
  // Primary Tabs: 'removal' (عزل) | 'supir' (تحسين) | 'generator' (مشاهد) | 'storyboard' (لوحتي)
  const [activeTab, setActiveTab] = useState<'removal' | 'supir' | 'generator' | 'storyboard' | 'ads' | 'library'>('removal');
  const [isDark, setIsDark] = useState<boolean>(true);
  const [isArabic, setIsArabic] = useState<boolean>(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const {
    settings,
    setSettings,
    images,
    setImages,
    selectedForGenerator,
    setSelectedForGenerator,
  } = useStudioStore();
  const [, setErrorLogs] = useState<ErrorLogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentProcessingId, setCurrentProcessingId] = useState<string | null>(null);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [inspectImage, setInspectImage] = useState<ProcessedImage | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => localStorage.getItem('alshams_active_project'));
  const [projectsReady, setProjectsReady] = useState(false);
  const [storageMessage, setStorageMessage] = useState<string | null>(null);
  const [projectState, setProjectState] = useState<Record<string, Partial<Pick<Project, 'productType' | 'productDescription' | 'materials' | 'enhanceSettings' | 'scenes' | 'boardFrames' | 'dimensions' | 'adCopy' | 'adFrames' | 'studioSettings'>> & { enhancedUrl?: string | null }>>({});
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const autoRunIdRef = useRef(0);
  const activeAutoRunRef = useRef<number | null>(null);
  const cancelledAutoRunsRef = useRef(new Set<number>());
  const [autoStudioProgress, setAutoStudioProgress] = useState<AutoStudioProgressState | null>(null);
  const activeStage = activeTab === 'library' ? undefined : activeTab as ProjectStage;
  const enqueueProjectSave = (save: () => Promise<unknown>) => {
    const queuedSave = saveQueueRef.current.then(save);
    saveQueueRef.current = queuedSave.then(() => undefined, () => undefined);
    return queuedSave;
  };

  // Modals
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isSupportOpen, setIsSupportOpen] = useState<boolean>(false);
  const [isUpdatesOpen, setIsUpdatesOpen] = useState<boolean>(false);

  // Reference to cancel or pause batch processing
  const pauseRef = useRef<boolean>(false);
  pauseRef.current = isPaused;

  const cancelRef = useRef<boolean>(false);

  // Stats calculation
  const [, setStats] = useState<StudioStats>({
    totalProcessed: 0,
    successfulCount: 0,
    failedCount: 0,
    totalOriginalBytes: 0,
    totalOutputBytes: 0,
    totalTimeSpentMs: 0,
    dailyHistory: [],
  });

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

  // Check system status on mount
  useEffect(() => {
    void fetchSystemStatus();
  }, []);

  useEffect(() => {
    let active = true;
    void listProjects().then(async (savedProjects) => {
      if (!active) return;
      const restored = await Promise.all(savedProjects.map((project) => loadProject(project.id)));
      if (!active) return;
      const savedImages = restored.flatMap((entry) => entry ? [{
        ...entry.image,
        status: entry.image.status === 'processing' ? 'pending' as const : entry.image.status
      }] : []);
      if (savedImages.length) {
        const preferred = activeProjectId && savedImages.some((image) => image.id === activeProjectId)
          ? activeProjectId
          : savedImages[0].id;
        setImages([
          ...savedImages.filter((image) => image.id === preferred),
          ...savedImages.filter((image) => image.id !== preferred)
        ]);
        setActiveProjectId(preferred);
        localStorage.setItem('alshams_active_project', preferred);
        const selectedEntry = restored.find((entry) => entry?.project.id === preferred);
        const selected = selectedEntry?.project;
        if (selected) {
          restored.forEach((entry) => {
            if (!entry || entry.project.id === preferred) return;
            if (entry.enhancedUrl) URL.revokeObjectURL(entry.enhancedUrl);
            entry.scenes.forEach((scene) => {
              if (typeof scene.imageUrl === 'string' && scene.imageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(scene.imageUrl);
              }
            });
            entry.boardFrames.forEach((frame) => {
              if (typeof frame.imageUrl === 'string' && frame.imageUrl.startsWith('blob:')) {
                URL.revokeObjectURL(frame.imageUrl);
              }
            });
          });
          setProjectState((prev) => ({
            ...prev,
            [preferred]: {
              enhanceSettings: selected.enhanceSettings,
              productType: selected.productType,
              productDescription: selected.productDescription,
              materials: selected.materials,
              adFrames: selected.adFrames,
              adCopy: selected.adCopy,
              scenes: selectedEntry?.scenes || selected.scenes,
              boardFrames: selectedEntry?.boardFrames as unknown as Record<string, unknown>[] || selected.boardFrames,
              dimensions: selected.dimensions,
              studioSettings: selected.studioSettings,
              enhancedUrl: selectedEntry?.enhancedUrl || null
            }
          }));
          setSettings(selected.studioSettings);
          setActiveTab(selected.lastStage);
        }
      } else {
        setActiveProjectId(null);
      }
      setProjectsReady(true);
    }).catch((error: unknown) => {
      if (active) {
        setStorageMessage(friendlyStorageError(error));
        setProjectsReady(true);
      }
    });
    void requestPersistentStorage().catch((error: unknown) => {
      if (active) setStorageMessage(friendlyStorageError(error));
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!projectsReady || !images.length || activeTab === 'library') return;
    const timer = window.setTimeout(() => {
      for (const image of images) {
        const stage = image.id === activeProjectId ? activeStage : undefined;
        const data = { ...projectState[image.id], studioSettings: settings };
        void enqueueProjectSave(() =>
          saveImageProject(image, stage, data)
        ).then(() => setStorageMessage(null)).catch((error: unknown) => {
          setStorageMessage(friendlyStorageError(error));
        });
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [images, settings, activeProjectId, activeStage, activeTab, projectState, projectsReady]);

  useEffect(() => {
    if (activeProjectId) localStorage.setItem('alshams_active_project', activeProjectId);
  }, [activeProjectId]);

  const updateSettings = (partial: Partial<RembgSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const toggleDarkMode = () => setIsDark((d) => !d);
  const toggleLanguage = () => setIsArabic((a) => !a);

  const runAutoStudio = async (items: ProcessedImage[]) => {
    const runId = ++autoRunIdRef.current;
    const updateProgress = (progress: Omit<AutoStudioProgressState, 'runId'>) => {
      if (activeAutoRunRef.current === runId) setAutoStudioProgress({ runId, ...progress });
    };
    setAutoStudioProgress({ runId, step: 'queued', progress: 0, detail: 'بانتظار انتهاء المهمة الحالية...' });
    await processingQueue.run(async () => {
      activeAutoRunRef.current = runId;
      try {
        for (const item of items) {
          if (cancelledAutoRunsRef.current.has(runId)) break;
          setActiveProjectId(item.id);
          updateProgress({ step: 'isolate', progress: 0, detail: `عزل المنتج: ${item.name}` });
          const isolatedBlob = await smartIsolate(item.originalUrl, (progress) => {
            updateProgress({ step: 'isolate', progress: Math.round(progress * 0.25), detail: `جارٍ عزل المنتج · ${progress}%` });
          });
          if (cancelledAutoRunsRef.current.has(runId)) break;

          const isolatedUrl = URL.createObjectURL(isolatedBlob);
          const isolatedItem: ProcessedImage = {
            ...item,
            processedUrl: isolatedUrl,
            status: 'completed',
            outputWidth: item.originalWidth,
            outputHeight: item.originalHeight,
            outputSize: isolatedBlob.size,
            processingTimeMs: 0,
            history: [item.originalUrl]
          };
          setImages((previous) => previous.map((image) => image.id === item.id ? isolatedItem : image));
          await enqueueProjectSave(() => saveImageProject(isolatedItem, 'removal', { studioSettings: settings }));
          updateProgress({ step: 'enhance', progress: 25, detail: 'تحليل الإضاءة والألوان لتحسين الصورة...' });

          const enhanced = await autoEnhance(isolatedBlob);
          if (cancelledAutoRunsRef.current.has(runId)) break;
          const enhancedUrl = URL.createObjectURL(enhanced.blob);
          const enhanceSettings = {
            scaleFactor: enhanced.settings.scaleFactor,
            brightness: enhanced.settings.brightness,
            contrast: enhanced.settings.contrast,
            sharpness: enhanced.settings.sharpness
          };
          setProjectState((previous) => ({
            ...previous,
            [item.id]: { ...previous[item.id], enhanceSettings, enhancedUrl }
          }));
          await enqueueProjectSave(() => saveImageProject(isolatedItem, 'supir', {
            enhancedUrl,
            enhanceSettings,
            studioSettings: settings
          }));
          updateProgress({ step: 'scenes', progress: 40, detail: 'إنشاء 12 صورة استوديو بالمقاسات والزوايا المختلفة...' });

          const generatedScenes = await generateWhiteStudioScenes(enhanced.blob, (completed, total) => {
            updateProgress({
              step: 'scenes',
              progress: 40 + Math.round(completed / total * 45),
              detail: `تجهيز المشاهد · ${completed} من ${total}`
            });
          });
          if (cancelledAutoRunsRef.current.has(runId)) break;
          const scenes = generatedScenes.map((scene) => ({
            id: scene.id,
            title: scene.title,
            aspectRatio: scene.aspectRatio,
            position: scene.position,
            imageUrl: URL.createObjectURL(scene.blob),
            kind: 'generated'
          }));
          const sceneRecords = scenes as unknown as Record<string, unknown>[];
          setProjectState((previous) => ({
            ...previous,
            [item.id]: {
              ...previous[item.id],
              enhanceSettings,
              enhancedUrl,
              scenes: sceneRecords
            }
          }));
          await enqueueProjectSave(() => saveImageProject(isolatedItem, 'generator', {
            enhancedUrl,
            enhanceSettings,
            scenes: sceneRecords,
            studioSettings: settings
          }));
          updateProgress({ step: 'board', progress: 88, detail: 'ترتيب جميع المشاهد في لوحتي...' });
          const boardFrames = createStoryboardFrames(scenes);
          setProjectState((previous) => ({
            ...previous,
            [item.id]: {
              ...previous[item.id],
              enhanceSettings,
              enhancedUrl,
              scenes: sceneRecords,
              boardFrames: boardFrames as unknown as Record<string, unknown>[]
            }
          }));
          await enqueueProjectSave(() => saveImageProject(isolatedItem, 'storyboard', {
            enhancedUrl,
            enhanceSettings,
            scenes: scenes as unknown as Record<string, unknown>[],
            boardFrames: boardFrames as unknown as Record<string, unknown>[],
            studioSettings: settings
          }));
          updateProgress({ step: 'done', progress: 100, detail: `اكتمل إعداد ${item.name}. يمكنك تعديل النتيجة من أي تبويب.` });
        }
        if (cancelledAutoRunsRef.current.has(runId)) {
          updateProgress({ step: 'cancelled', progress: 0, detail: 'تم إيقاف الخطوات التالية. النتائج المكتملة محفوظة.' });
        }
      } catch (error) {
        const message = friendlyStorageError(error);
        updateProgress({ step: 'error', progress: 0, detail: '', error: message });
        setStorageMessage(message);
      } finally {
        if (activeAutoRunRef.current === runId) activeAutoRunRef.current = null;
      }
    });
  };

  const cancelAutoStudio = () => {
    if (autoStudioProgress) cancelledAutoRunsRef.current.add(autoStudioProgress.runId);
  };

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
            if (newItems[0]) {
              setActiveProjectId(newItems[0].id);
              void runAutoStudio(newItems);
            }
          }
        };
        img.src = url;
      };
      reader.readAsDataURL(file);
    });
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
        const result = await processingQueue.run(() => processImageUnified(item, settings));

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

  const handleManualEdit = (id: string, dataUrl: string) => {
    setActiveProjectId(id);
    setImages((prev) =>
      prev.map((image) =>
        image.id === id
          ? {
              ...image,
              processedUrl: dataUrl,
              status: 'completed',
              outputWidth: image.originalWidth,
              outputHeight: image.originalHeight,
              outputSize: Math.round(dataUrl.length * 0.75),
            }
          : image
      )
    );
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

  const handleSendToGenerator = (item: ProcessedImage) => {
    setSelectedForGenerator(item);
    setActiveProjectId(item.id);
    setActiveTab('generator');
    soundEffects.playClick();
  };

  const handleAddImageFromGenerator = (item: ProcessedImage) => {
    setImages((prev) => [item, ...prev]);
    setActiveProjectId(item.id);
  };

  const handleTabChange = (tab: typeof activeTab) => {
    if (activeProjectId && activeStage) {
      const currentImage = images.find((image) => image.id === activeProjectId);
      if (currentImage) {
        void enqueueProjectSave(() => saveImageProject(currentImage, activeStage, { ...projectState[activeProjectId], studioSettings: settings }))
          .catch((error: unknown) => setStorageMessage(friendlyStorageError(error)));
      }
    }
    setActiveTab(tab);
  };

  const handleProjectStateChange = useCallback((
    id: string,
    data: Partial<Pick<Project, 'productType' | 'productDescription' | 'materials' | 'enhanceSettings' | 'scenes' | 'boardFrames' | 'dimensions' | 'adCopy' | 'adFrames' | 'studioSettings'>> & { enhancedUrl?: string | null }
  ) => {
    setProjectState((previous) => {
      const merged = { ...previous[id], ...data };
      if (JSON.stringify(previous[id]) === JSON.stringify(merged)) return previous;
      return { ...previous, [id]: merged };
    });
  }, []);

  const handleActiveImageChange = useCallback((id: string) => {
    setActiveProjectId((current) => current === id ? current : id);
  }, []);

  const handleOpenProject = async (id: string, stage: ProjectStage) => {
    try {
      const loaded = await loadProject(id);
      if (!loaded) throw new Error('تعذر فتح المشروع.');
      setImages([{
        ...loaded.image,
        status: loaded.image.status === 'processing' ? 'pending' : loaded.image.status
      }]);
      setActiveProjectId(id);
      setProjectState((previous) => ({
        ...previous,
        [id]: {
          enhanceSettings: loaded.project.enhanceSettings,
          productType: loaded.project.productType,
          productDescription: loaded.project.productDescription,
          materials: loaded.project.materials,
          adFrames: loaded.project.adFrames,
          adCopy: loaded.project.adCopy,
          scenes: loaded.scenes as unknown as Record<string, unknown>[],
          boardFrames: loaded.boardFrames as unknown as Record<string, unknown>[],
          dimensions: loaded.project.dimensions,
          studioSettings: loaded.project.studioSettings,
          enhancedUrl: loaded.enhancedUrl
        }
      }));
      setSettings(loaded.project.studioSettings);
      setActiveTab(stage);
    } catch (error) {
      setStorageMessage(friendlyStorageError(error));
    }
  };

  const handleProjectDeleted = (id: string) => {
    setImages((previous) => previous.filter((image) => image.id !== id));
    setProjectState((previous) => {
      const { [id]: _deleted, ...remaining } = previous;
      return remaining;
    });
    if (activeProjectId === id) {
      const next = images.find((image) => image.id !== id);
      setActiveProjectId(next?.id || null);
    }
  };

  return (
    <div className="flex h-dvh min-h-0 w-full max-w-full flex-col overflow-hidden bg-slate-50 text-slate-900 transition-colors dark:bg-[#070E1A] dark:text-slate-100">
      
      {/* Top Header with Brand, 4 Main Workflow Tabs, and Drawer Trigger */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isDark={isDark}
        toggleDarkMode={toggleDarkMode}
        isArabic={isArabic}
        toggleLanguage={toggleLanguage}
        onOpenDrawer={() => setIsDrawerOpen(true)}
      />

      {/* Main Content Area */}
      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden px-3 py-2 sm:px-6 sm:py-4 lg:px-8">
        {storageMessage && (
          <p role="alert" className="mb-2 shrink-0 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            {storageMessage}
          </p>
        )}
        {autoStudioProgress && (
          <AutoStudioProgress
            step={autoStudioProgress.step}
            progress={autoStudioProgress.progress}
            detail={autoStudioProgress.detail}
            error={autoStudioProgress.error}
            onCancel={cancelAutoStudio}
            onNavigate={handleTabChange}
            isArabic={isArabic}
          />
        )}
        
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
            onManualEdit={handleManualEdit}
            onStartProcessing={handleStartProcessing}
            onPauseProcessing={handlePauseProcessing}
            onResumeProcessing={handleResumeProcessing}
            onRevertAll={handleRevertAll}
            onClearAll={handleClearAll}
            onInspectImage={(img) => setInspectImage(img)}
            onActiveImageChange={handleActiveImageChange}
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
            onActiveImageChange={handleActiveImageChange}
            initialEnhanceSettings={activeProjectId ? projectState[activeProjectId]?.enhanceSettings as Partial<EnhanceProjectState> | undefined : undefined}
            initialEnhancedUrl={activeProjectId ? projectState[activeProjectId]?.enhancedUrl : null}
            onEnhanceStateChange={(enhanceSettings, enhancedUrl) => {
              if (!activeProjectId) return;
              handleProjectStateChange(activeProjectId, {
                enhanceSettings: { ...enhanceSettings },
                enhancedUrl
              });
            }}
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
            onActiveImageChange={handleActiveImageChange}
            generatedScenes={activeProjectId
              ? (projectState[activeProjectId]?.scenes || [])
                .filter((scene) => scene.kind === 'generated' || scene.kind === 'advisor')
                .map((scene) => ({
                  id: String(scene.id || ''),
                  title: String(scene.title || ''),
                  aspectRatio: String(scene.aspectRatio || ''),
                  position: String(scene.position || ''),
                  imageUrl: typeof scene.imageUrl === 'string' ? scene.imageUrl : null
                }))
              : []}
            advisorProductType={(projectState[activeProjectId || '']?.productType as ProductType) || 'other'}
            advisorDescription={projectState[activeProjectId || '']?.productDescription || ''}
            onAdvisorTypeChange={(productType) => {
              if (activeProjectId) handleProjectStateChange(activeProjectId, { productType });
            }}
            onAdvisorDescriptionChange={(description) => {
              if (activeProjectId) handleProjectStateChange(activeProjectId, {
                productType: description.type,
                productDescription: description.description,
                materials: description.materials
              });
            }}
            onAdvisorSceneChoose={(chosen) => {
              if (!activeProjectId) return;
              const sceneId = `advisor-${chosen.id}`;
              const nextScene = {
                id: sceneId,
                title: chosen.title,
                aspectRatio: '4:5',
                position: 'center',
                imageUrl: chosen.imageUrl,
                prompt: chosen.prompt,
                kind: 'advisor'
              };
              const currentScenes = projectState[activeProjectId]?.scenes || [];
              const nextScenes = [...currentScenes.filter((scene) => scene.id !== sceneId), nextScene];
              const currentFrames = (projectState[activeProjectId]?.boardFrames || []) as unknown as StoryboardFrame[];
              const nextFrame: StoryboardFrame = {
                id: `ad-${sceneId}`,
                sceneId,
                type: 'lifestyle',
                title: chosen.title,
                titleEn: chosen.title,
                aspectRatioLabel: '4:5',
                aspectRatioClass: 'aspect-[4/5]',
                aspectRatioNum: 4 / 5,
                description: chosen.prompt,
                imageUrl: chosen.imageUrl,
                zoom: 100,
                panX: 0,
                panY: 0,
                backdrop: 'clean',
                caption: chosen.title,
                tag: 'Scene Advisor'
              };
              handleProjectStateChange(activeProjectId, {
                productType: chosen.type,
                scenes: nextScenes as unknown as Record<string, unknown>[],
                boardFrames: [...currentFrames.filter((frame) => frame.id !== nextFrame.id), nextFrame] as unknown as Record<string, unknown>[]
              });
              setStorageMessage('تم حفظ المشهد في المشروع وإضافته إلى لوحتي.');
            }}
            initialSceneState={activeProjectId
              ? (projectState[activeProjectId]?.scenes?.find((scene) => scene.kind === 'settings')
                || projectState[activeProjectId]?.scenes?.find((scene) => !scene.id)) as Partial<SceneProjectState> | undefined
              : undefined}
            onSceneStateChange={(sceneState) => {
              if (activeProjectId) {
                const generatedScenes = (projectState[activeProjectId]?.scenes || []).filter((scene) => Boolean(scene.id));
                handleProjectStateChange(activeProjectId, {
                  scenes: [{ kind: 'settings', ...sceneState }, ...generatedScenes]
                });
              }
            }}
          />
        )}

        {/* 4. لوحتي */}
        {activeTab === 'storyboard' && (
          <StoryboardWorkspace
            images={images}
            isArabic={isArabic}
            onAddImageToLibrary={handleAddImageFromGenerator}
            initialBoardFrames={activeProjectId ? projectState[activeProjectId]?.boardFrames as unknown as StoryboardFrame[] | undefined : undefined}
            initialBoardDimensions={activeProjectId ? projectState[activeProjectId]?.dimensions : undefined}
            onBoardStateChange={(boardFrames, dimensions) => {
              if (activeProjectId) handleProjectStateChange(activeProjectId, {
                boardFrames: boardFrames as unknown as Record<string, unknown>[],
                dimensions
              });
            }}
          />
        )}

        {activeTab === 'ads' && (
          <AdStoryboard
            frames={(projectState[activeProjectId || '']?.boardFrames || []) as unknown as StoryboardFrame[]}
            isArabic={isArabic}
            product={{
              type: (projectState[activeProjectId || '']?.productType as ProductType) || 'other',
              description: projectState[activeProjectId || '']?.productDescription || '',
              materials: projectState[activeProjectId || '']?.materials || []
            }}
            dimensions={(() => {
              const frame = ((projectState[activeProjectId || '']?.boardFrames || []) as unknown as StoryboardFrame[])[0];
              if (!frame) return '';
              return [frame.dimHeight, frame.dimWidth, frame.dimDepth].filter((value) => value !== undefined).join(' × ')
                + (frame.dimUnit ? ` ${frame.dimUnit}` : '');
            })()}
            initialAdFrames={projectState[activeProjectId || '']?.adFrames}
            onStateChange={(adFrames, adCopy) => {
              if (activeProjectId) handleProjectStateChange(activeProjectId, { adFrames, adCopy });
            }}
          />
        )}

        {activeTab === 'library' && (
          <ProjectsLibrary
            isArabic={isArabic}
            onOpenProject={(id, stage) => void handleOpenProject(id, stage)}
            onCreateProject={() => handleTabChange('removal')}
            onDeleteProject={handleProjectDeleted}
          />
        )}

      </main>

      {/* Footer - Single clean line per user request */}
      <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-2 text-xs text-slate-500 dark:border-slate-800/80 dark:bg-[#0A1324] dark:text-slate-400 sm:py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-center text-center">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            ستوديو الشمساوية · الشمس كرافت © 2026
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
