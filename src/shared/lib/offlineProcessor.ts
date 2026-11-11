/**
 * AlShams Offline Background Removal Engine
 * Pure client-side canvas-based color saliency & edge matting processor.
 * Guarantees 100% offline functionality without external dependencies.
 */

import { RembgSettings } from '../../types';

export async function processImageOffline(
  imageUrl: string,
  settings: RembgSettings
): Promise<{
  outputUrl: string;
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
  outputSize: number;
  processingTimeMs: number;
}> {
  const startTime = performance.now();

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          throw new Error('Canvas 2D context not available');
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        // 1. Sample perimeter border pixels to compute background distribution
        let bgR = 0, bgG = 0, bgB = 0, sampleCount = 0;
        const sampleStep = Math.max(1, Math.floor(Math.min(width, height) / 50));

        // Top & bottom rows
        for (let x = 0; x < width; x += sampleStep) {
          // top
          let idx = (x) * 4;
          bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2];
          sampleCount++;
          // bottom
          idx = ((height - 1) * width + x) * 4;
          bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2];
          sampleCount++;
        }
        // Left & right columns
        for (let y = 0; y < height; y += sampleStep) {
          let idx = (y * width) * 4;
          bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2];
          sampleCount++;
          idx = (y * width + (width - 1)) * 4;
          bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2];
          sampleCount++;
        }

        bgR = Math.round(bgR / sampleCount);
        bgG = Math.round(bgG / sampleCount);
        bgB = Math.round(bgB / sampleCount);

        // Sensitivity threshold adjustment based on user settings
        const baseThreshold = settings.ab ? Math.max(15, settings.ab * 1.5) : 32;
        const foregroundThreshold = settings.af ? Math.max(baseThreshold + 10, settings.af * 0.8) : 80;

        // 2. Alpha computation per pixel
        const alphaMask = new Uint8Array(width * height);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Euclidean color distance in RGB space
          const dist = Math.sqrt(
            Math.pow(r - bgR, 2) +
            Math.pow(g - bgG, 2) +
            Math.pow(b - bgB, 2)
          );

          const pixelIndex = i / 4;

          if (dist <= baseThreshold) {
            alphaMask[pixelIndex] = 0; // background
          } else if (dist >= foregroundThreshold) {
            alphaMask[pixelIndex] = 255; // solid foreground
          } else {
            // Smooth transition zone
            const factor = (dist - baseThreshold) / (foregroundThreshold - baseThreshold);
            alphaMask[pixelIndex] = Math.round(factor * 255);
          }
        }

        // 3. Edge Feathering / Smoothing if specified
        const feather = Math.min(20, Math.max(0, settings.edgeFeathering || 2));
        if (feather > 0) {
          const smoothedMask = new Uint8Array(width * height);
          const radius = Math.floor(feather);

          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              let sum = 0;
              let count = 0;
              for (let dy = -radius; dy <= radius; dy++) {
                const ny = y + dy;
                if (ny < 0 || ny >= height) continue;
                for (let dx = -radius; dx <= radius; dx++) {
                  const nx = x + dx;
                  if (nx < 0 || nx >= width) continue;
                  sum += alphaMask[ny * width + nx];
                  count++;
                }
              }
              smoothedMask[y * width + x] = Math.round(sum / count);
            }
          }
          // Apply smoothed mask to data
          for (let i = 0; i < alphaMask.length; i++) {
            alphaMask[i] = smoothedMask[i];
          }
        }

        // 4. Apply Alpha to Canvas Data or replace background
        const outCanvas = document.createElement('canvas');
        outCanvas.width = width;
        outCanvas.height = height;
        const outCtx = outCanvas.getContext('2d');
        if (!outCtx) throw new Error('Could not create output canvas');

        // Check if background replacement requested
        if (settings.backgroundType === 'color' && settings.backgroundColor) {
          outCtx.fillStyle = settings.backgroundColor;
          outCtx.fillRect(0, 0, width, height);
        } else if (settings.backgroundType === 'gradient') {
          const grad = outCtx.createLinearGradient(0, 0, width, height);
          grad.addColorStop(0, '#0F2952'); // AlShams Navy
          grad.addColorStop(1, '#D48B16'); // AlShams Gold
          outCtx.fillStyle = grad;
          outCtx.fillRect(0, 0, width, height);
        } else if (settings.backgroundType === 'studio') {
          const rad = outCtx.createRadialGradient(width / 2, height / 2, 20, width / 2, height / 2, Math.max(width, height) / 1.2);
          rad.addColorStop(0, '#ffffff');
          rad.addColorStop(1, '#dbeafe');
          outCtx.fillStyle = rad;
          outCtx.fillRect(0, 0, width, height);
        }

        for (let i = 0; i < alphaMask.length; i++) {
          data[i * 4 + 3] = alphaMask[i];
        }
        ctx.putImageData(imgData, 0, 0);

        // Draw foreground over custom background (if not transparent)
        outCtx.drawImage(canvas, 0, 0);

        const mime = settings.outputFormat === 'webp' ? 'image/webp' : 'image/png';
        const outputUrl = outCanvas.toDataURL(mime, 0.95);

        // Approximate byte size from base64
        const byteSize = Math.round((outputUrl.length * 3) / 4);
        const processingTimeMs = Math.round(performance.now() - startTime);

        resolve({
          outputUrl,
          originalWidth: width,
          originalHeight: height,
          outputWidth: width,
          outputHeight: height,
          outputSize: byteSize,
          processingTimeMs
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for offline processing'));
    };

    img.src = imageUrl;
  });
}
