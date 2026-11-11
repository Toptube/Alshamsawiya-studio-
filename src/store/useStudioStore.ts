import { useEffect, useState } from 'react';
import { ProcessedImage, RembgSettings } from '../types';

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

export function useStudioStore() {
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

  useEffect(() => {
    try {
      localStorage.setItem('alshams_settings', JSON.stringify(settings));
    } catch {
      // Ignore unavailable storage.
    }
  }, [settings]);

  return {
    images,
    setImages,
    settings,
    setSettings,
    selectedForGenerator,
    setSelectedForGenerator,
  };
}
