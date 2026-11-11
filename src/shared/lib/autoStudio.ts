export interface AutoStudioScene {
  id: string;
  title: string;
  aspectRatio: '1:1' | '4:5' | '9:16' | '16:9';
  position: 'center' | 'left' | 'right';
  blob: Blob;
}

export interface AutoEnhanceResult {
  blob: Blob;
  settings: { brightness: number; contrast: number; sharpness: number; scaleFactor: 4 | 8 };
}

const loadBitmap = async (blob: Blob) => createImageBitmap(blob);

const canvasBlob = (canvas: HTMLCanvasElement): Promise<Blob> => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('تعذر تجهيز الصورة الناتجة.')), 'image/png');
});

export async function smartIsolate(imageUrl: string, onProgress: (progress: number) => void): Promise<Blob> {
  const { removeBackground } = await import('@imgly/background-removal');
  return removeBackground(imageUrl, {
    device: 'cpu',
    model: 'isnet_fp16',
    output: { format: 'image/png', quality: 1 },
    progress: (_key, current, total) => {
      if (total > 0) onProgress(Math.min(100, Math.round((current / total) * 100)));
    }
  });
}

export async function autoEnhance(source: Blob): Promise<AutoEnhanceResult> {
  const bitmap = await loadBitmap(source);
  try {
    const analysis = document.createElement('canvas');
    const sampleScale = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
    analysis.width = Math.max(1, Math.round(bitmap.width * sampleScale));
    analysis.height = Math.max(1, Math.round(bitmap.height * sampleScale));
    const analysisContext = analysis.getContext('2d', { willReadFrequently: true });
    if (!analysisContext) throw new Error('تعذر تحليل إضاءة الصورة.');
    analysisContext.drawImage(bitmap, 0, 0, analysis.width, analysis.height);
    const pixels = analysisContext.getImageData(0, 0, analysis.width, analysis.height).data;
    let luminanceSum = 0;
    let luminanceSquaredSum = 0;
    let count = 0;
    for (let index = 0; index < pixels.length; index += 16) {
      if (pixels[index + 3] < 16) continue;
      const luminance = pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722;
      luminanceSum += luminance;
      luminanceSquaredSum += luminance * luminance;
      count += 1;
    }
    const mean = count ? luminanceSum / count : 128;
    const deviation = count ? Math.sqrt(Math.max(0, luminanceSquaredSum / count - mean * mean)) : 48;
    const brightness = Math.max(-12, Math.min(12, Math.round((128 - mean) * 0.12)));
    const contrast = Math.max(-12, Math.min(18, Math.round((52 - deviation) * 0.6)));
    const sharpness = Math.max(12, Math.min(35, Math.round((55 - deviation) * 0.45 + 20)));
    const isMobile = window.matchMedia('(max-width: 767px)').matches || navigator.maxTouchPoints > 0 && window.innerWidth < 1024;
    const scaleFactor = isMobile ? 4 : 8;
    const multiplier = Math.min(isMobile ? 2 : 3, 2400 / Math.max(bitmap.width, bitmap.height));
    let sharpenedSource: HTMLCanvasElement | null = null;
    if (sharpness > 0 && bitmap.width * bitmap.height <= 2_000_000) {
      sharpenedSource = document.createElement('canvas');
      sharpenedSource.width = bitmap.width;
      sharpenedSource.height = bitmap.height;
      const sourceContext = sharpenedSource.getContext('2d', { willReadFrequently: true });
      if (!sourceContext) throw new Error('تعذر تجهيز الصورة للتحسين.');
      sourceContext.filter = `brightness(${100 + brightness}%) contrast(${100 + contrast}%)`;
      sourceContext.drawImage(bitmap, 0, 0);
      sourceContext.filter = 'none';
      const imageData = sourceContext.getImageData(0, 0, sharpenedSource.width, sharpenedSource.height);
      const original = new Uint8ClampedArray(imageData.data);
      const amount = sharpness / 100 * 0.25;
      for (let y = 1; y < sharpenedSource.height - 1; y += 1) {
        for (let x = 1; x < sharpenedSource.width - 1; x += 1) {
          const index = (y * sharpenedSource.width + x) * 4;
          for (let channel = 0; channel < 3; channel += 1) {
            const neighbors = original[index - sharpenedSource.width * 4 + channel]
              + original[index + sharpenedSource.width * 4 + channel]
              + original[index - 4 + channel]
              + original[index + 4 + channel];
            imageData.data[index + channel] = Math.max(0, Math.min(255,
              original[index + channel] + amount * (4 * original[index + channel] - neighbors)
            ));
          }
        }
      }
      sourceContext.putImageData(imageData, 0, 0);
    }
    const output = document.createElement('canvas');
    output.width = Math.max(1, Math.round(bitmap.width * multiplier));
    output.height = Math.max(1, Math.round(bitmap.height * multiplier));
    const outputContext = output.getContext('2d');
    if (!outputContext) throw new Error('تعذر إنشاء الصورة المحسنة.');
    outputContext.imageSmoothingEnabled = true;
    outputContext.imageSmoothingQuality = 'high';
    if (sharpenedSource) {
      outputContext.drawImage(sharpenedSource, 0, 0, output.width, output.height);
    } else {
      outputContext.filter = `brightness(${100 + brightness}%) contrast(${100 + contrast}%)`;
      outputContext.drawImage(bitmap, 0, 0, output.width, output.height);
      outputContext.filter = 'none';
    }
    return {
      blob: await canvasBlob(output),
      settings: { brightness, contrast, sharpness, scaleFactor }
    };
  } finally {
    bitmap.close();
  }
}

const OUTPUT_SIZES: Record<AutoStudioScene['aspectRatio'], [number, number]> = {
  '1:1': [1080, 1080],
  '4:5': [1080, 1350],
  '9:16': [1080, 1920],
  '16:9': [1920, 1080]
};

const RATIOS: AutoStudioScene['aspectRatio'][] = ['1:1', '4:5', '9:16', '16:9'];
const POSITIONS: AutoStudioScene['position'][] = ['center', 'left', 'right'];

export async function generateWhiteStudioScenes(
  product: Blob,
  onProgress: (completed: number, total: number) => void
): Promise<AutoStudioScene[]> {
  const bitmap = await loadBitmap(product);
  const total = RATIOS.length * POSITIONS.length;
  const scenes: AutoStudioScene[] = [];
  try {
    for (const aspectRatio of RATIOS) {
      for (const position of POSITIONS) {
        const [width, height] = OUTPUT_SIZES[aspectRatio];
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('تعذر إنشاء كادر الاستوديو.');

        const backdrop = context.createLinearGradient(0, 0, 0, height);
        backdrop.addColorStop(0, '#ffffff');
        backdrop.addColorStop(1, '#f1f3f6');
        context.fillStyle = backdrop;
        context.fillRect(0, 0, width, height);

        const scale = Math.min(width * 0.68 / bitmap.width, height * 0.64 / bitmap.height);
        const productWidth = bitmap.width * scale;
        const productHeight = bitmap.height * scale;
        const centerX = width * (position === 'left' ? 0.43 : position === 'right' ? 0.57 : 0.5);
        const centerY = height * 0.49;
        const angle = position === 'left' ? -1.5 : position === 'right' ? 1.5 : 0;

        context.save();
        context.translate(centerX + width * 0.018, centerY + height * 0.025);
        context.rotate(angle * Math.PI / 180);
        context.filter = 'brightness(0) opacity(0.20) blur(22px)';
        context.drawImage(bitmap, -productWidth / 2, -productHeight / 2, productWidth, productHeight);
        context.restore();

        context.save();
        context.filter = `blur(${Math.max(10, width * 0.012)}px)`;
        context.fillStyle = 'rgba(25, 30, 40, 0.22)';
        context.beginPath();
        context.ellipse(centerX, centerY + productHeight * 0.48, productWidth * 0.31, Math.max(10, height * 0.015), 0, 0, Math.PI * 2);
        context.fill();
        context.restore();

        context.save();
        context.translate(centerX, centerY);
        context.rotate(angle * Math.PI / 180);
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(bitmap, -productWidth / 2, -productHeight / 2, productWidth, productHeight);
        context.restore();

        const blob = await canvasBlob(canvas);
        scenes.push({
          id: `${aspectRatio.replace(':', 'x')}-${position}`,
          title: `${aspectRatio} · ${position}`,
          aspectRatio,
          position,
          blob
        });
        onProgress(scenes.length, total);
      }
    }
    return scenes;
  } finally {
    bitmap.close();
  }
}

export function createStoryboardFrames(
  scenes: Array<Omit<AutoStudioScene, 'blob'> & { imageUrl: string }>
) {
  return scenes.map((scene, index) => {
    const [numerator, denominator] = scene.aspectRatio.split(':').map(Number);
    return {
      id: `auto-${scene.id}`,
      sceneId: scene.id,
      type: scene.aspectRatio === '9:16' ? 'lifestyle' as const : scene.aspectRatio === '4:5' ? 'technical' as const : 'hero' as const,
      title: `لقطة ${index + 1}: ${scene.aspectRatio} · ${scene.position}`,
      titleEn: `Shot ${index + 1}: ${scene.aspectRatio} · ${scene.position}`,
      aspectRatioLabel: scene.aspectRatio,
      aspectRatioClass: scene.aspectRatio === '1:1' ? 'aspect-square' : scene.aspectRatio === '4:5' ? 'aspect-[4/5]' : scene.aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video',
      aspectRatioNum: numerator / denominator,
      description: 'لقطة استوديو بيضاء تلقائية مع ظل أرضي.',
      imageUrl: scene.imageUrl,
      zoom: 100,
      panX: scene.position === 'left' ? -8 : scene.position === 'right' ? 8 : 0,
      panY: 0,
      backdrop: 'clean' as const,
      caption: scene.title,
      tag: scene.aspectRatio
    };
  });
}
