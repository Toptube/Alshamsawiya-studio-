import { ProcessedImage } from '../types';

export function createSampleImages(): ProcessedImage[] {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

  // 1. The user's uploaded logo
  const logoSample: ProcessedImage = {
    id: 'sample-alshams-logo',
    name: 'لوجو_الشمس_كرافت_الأصلي.png',
    originalUrl: '/assets/aistudio/1790755753712_87b037e0.png',
    processedUrl: null,
    status: 'pending',
    originalWidth: 1024,
    originalHeight: 1024,
    outputWidth: 0,
    outputHeight: 0,
    originalSize: 428000,
    outputSize: 0,
    processingTimeMs: 0,
    modelUsed: 'u2net',
    timestamp,
    customPath: '/assets/aistudio/1790755753712_87b037e0.png',
    history: []
  };

  // Helper to generate a canvas-based product sample data URL
  const generateCanvasSample = (
    name: string,
    width: number,
    height: number,
    type: 'wallet' | 'watch' | 'camera'
  ): ProcessedImage => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Background: Solid light studio gray / pastel for testing background removal
      ctx.fillStyle = type === 'wallet' ? '#e2e8f0' : type === 'watch' ? '#cbd5e1' : '#f1f5f9';
      ctx.fillRect(0, 0, width, height);

      // Draw product subject in the center
      const cx = width / 2;
      const cy = height / 2;

      if (type === 'wallet') {
        // Leather craft wallet in rich brown/amber
        ctx.fillStyle = '#78350F';
        ctx.beginPath();
        ctx.roundRect(cx - 150, cy - 100, 300, 200, 24);
        ctx.fill();

        // Stitching pattern
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 6]);
        ctx.strokeRect(cx - 140, cy - 90, 280, 180);
        ctx.setLineDash([]);

        // AlShams badge emblem
        ctx.fillStyle = '#D97706';
        ctx.beginPath();
        ctx.arc(cx, cy, 32, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0F2952';
        ctx.font = 'bold 20px Cairo, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('شمس', cx, cy);
      } else if (type === 'watch') {
        // Luxury watch
        // Band
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(cx - 40, cy - 180, 80, 360);

        // Case
        ctx.fillStyle = '#D48B16';
        ctx.beginPath();
        ctx.arc(cx, cy, 100, 0, Math.PI * 2);
        ctx.fill();

        // Dial
        ctx.fillStyle = '#0F2952';
        ctx.beginPath();
        ctx.arc(cx, cy, 84, 0, Math.PI * 2);
        ctx.fill();

        // Hands
        ctx.strokeStyle = '#E59819';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 40, cy - 30);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx - 10, cy + 50);
        ctx.stroke();
      } else {
        // Handmade camera / product
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(cx - 160, cy - 100, 320, 200, 20);
        ctx.fill();

        // Lens
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(cx, cy, 75, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(cx, cy, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    const dataUrl = canvas.toDataURL('image/png');
    const bytes = Math.round((dataUrl.length * 3) / 4);

    return {
      id: `sample-${type}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `${name}.png`,
      originalUrl: dataUrl,
      processedUrl: null,
      status: 'pending',
      originalWidth: width,
      originalHeight: height,
      outputWidth: 0,
      outputHeight: 0,
      originalSize: bytes,
      outputSize: 0,
      processingTimeMs: 0,
      modelUsed: 'u2net',
      timestamp,
      customPath: `/products/samples/${name}.png`,
      history: []
    };
  };

  const walletSample = generateCanvasSample('مشغولات_جلدية_يدوية_محفظة', 600, 500, 'wallet');
  const watchSample = generateCanvasSample('ساعة_فاخرة_أصلية', 500, 500, 'watch');
  const cameraSample = generateCanvasSample('منتج_كاميرا_استوديو', 600, 500, 'camera');

  return [logoSample, walletSample, watchSample, cameraSample];
}
