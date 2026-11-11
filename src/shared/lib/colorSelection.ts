export interface ColorSelection {
  x: number;
  y: number;
  tolerance: number;
  contiguous: boolean;
  feather: number;
  sampleColor?: [number, number, number];
  action?: 'remove' | 'keep';
}

export interface ColorSelectionResult {
  width: number;
  height: number;
  mask: Uint8Array;
}

export interface ColorSelectionBatchResult {
  selections: ColorSelectionResult[];
  outputBitmap?: ImageBitmap;
}

export function selectColorRegion(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  selection: ColorSelection
): ColorSelectionResult {
  if (width <= 0 || height <= 0 || pixels.length !== width * height * 4) {
    throw new RangeError('Pixel buffer dimensions do not match.');
  }
  const mask = new Uint8Array(width * height);
  const seedX = Math.max(0, Math.min(width - 1, Math.floor(selection.x)));
  const seedY = Math.max(0, Math.min(height - 1, Math.floor(selection.y)));
  const seedIndex = (seedY * width + seedX) * 4;
  if (!selection.sampleColor && pixels[seedIndex + 3] === 0) return { width, height, mask };

  const tolerance = Math.max(0, Math.min(100, selection.tolerance)) * 4.41;
  const threshold = tolerance * tolerance;
  const sampleColor = selection.sampleColor || [pixels[seedIndex], pixels[seedIndex + 1], pixels[seedIndex + 2]];
  const matches = (pixelIndex: number) => {
    const index = pixelIndex * 4;
    if (pixels[index + 3] === 0) return false;
    const red = pixels[index] - sampleColor[0];
    const green = pixels[index + 1] - sampleColor[1];
    const blue = pixels[index + 2] - sampleColor[2];
    return red * red + green * green + blue * blue <= threshold;
  };

  if (!selection.contiguous) {
    for (let index = 0; index < mask.length; index++) {
      if (matches(index)) mask[index] = 255;
    }
  } else {
    const stack = [seedY * width + seedX];
    while (stack.length > 0) {
      const seed = stack.pop()!;
      let x = seed % width;
      const y = Math.floor(seed / width);
      if (!matches(seed) || mask[seed] !== 0) continue;

      while (x > 0 && mask[y * width + x - 1] === 0 && matches(y * width + x - 1)) x--;
      let spanAbove = false;
      let spanBelow = false;
      for (; x < width; x++) {
        const index = y * width + x;
        if (mask[index] !== 0 || !matches(index)) break;
        mask[index] = 255;

        if (y > 0) {
          const above = index - width;
          if (mask[above] === 0 && matches(above)) {
            if (!spanAbove) stack.push(above);
            spanAbove = true;
          } else {
            spanAbove = false;
          }
        }
        if (y < height - 1) {
          const below = index + width;
          if (mask[below] === 0 && matches(below)) {
            if (!spanBelow) stack.push(below);
            spanBelow = true;
          } else {
            spanBelow = false;
          }
        }
      }
    }
  }

  const radius = Math.max(0, Math.min(5, Math.round(selection.feather)));
  if (radius > 0) featherMask(mask, width, height, radius);
  return { width, height, mask };
}

function featherMask(mask: Uint8Array, width: number, height: number, radius: number) {
  const horizontal = new Uint8Array(mask.length);
  const windowSize = radius * 2 + 1;
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = -radius; x <= radius; x++) {
      if (x >= 0 && x < width) sum += mask[y * width + x];
    }
    for (let x = 0; x < width; x++) {
      horizontal[y * width + x] = Math.round(sum / windowSize);
      const removeX = x - radius;
      const addX = x + radius + 1;
      if (removeX >= 0) sum -= mask[y * width + removeX];
      if (addX < width) sum += mask[y * width + addX];
    }
  }

  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let y = -radius; y <= radius; y++) {
      if (y >= 0 && y < height) sum += horizontal[y * width + x];
    }
    for (let y = 0; y < height; y++) {
      mask[y * width + x] = Math.round(sum / windowSize);
      const removeY = y - radius;
      const addY = y + radius + 1;
      if (removeY >= 0) sum -= horizontal[removeY * width + x];
      if (addY < height) sum += horizontal[addY * width + x];
    }
  }
}

export async function processColorSelections(
  source: HTMLImageElement,
  selections: ColorSelection[],
  workingCanvas?: HTMLCanvasElement
): Promise<ColorSelectionBatchResult> {
  if (selections.length === 0) return { selections: [] };
  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;

  if (Math.max(width, height) > 2000) {
    if (typeof Worker === 'undefined' || typeof createImageBitmap === 'undefined') {
      throw new Error('Large image color selection requires Web Worker support.');
    }
    const worker = new Worker(new URL('./colorSelection.worker.ts', import.meta.url), { type: 'module' });
    const bitmap = await createImageBitmap(source);
    const workingBitmap = workingCanvas ? await createImageBitmap(workingCanvas) : undefined;
    try {
      return await new Promise<ColorSelectionBatchResult>((resolve, reject) => {
        worker.onmessage = (event: MessageEvent<{
          results?: { width: number; height: number; masks: ArrayBuffer[] };
          outputBitmap?: ImageBitmap;
          error?: string;
        }>) => {
          if (event.data.error) {
            reject(new Error(event.data.error));
            return;
          }
          const response = event.data.results;
          if (!response) {
            reject(new Error('Worker returned no color selection results.'));
            return;
          }
          resolve({
            selections: response.masks.map((buffer) => ({
              width: response.width,
              height: response.height,
              mask: new Uint8Array(buffer),
            })),
            outputBitmap: event.data.outputBitmap,
          });
        };
        worker.onerror = (event) => reject(new Error(event.message || 'Color selection worker failed.'));
        const transferables: Transferable[] = [bitmap];
        if (workingBitmap) transferables.push(workingBitmap);
        worker.postMessage({ bitmap, workingBitmap, selections }, transferables);
      });
    } finally {
      worker.terminate();
    }
  }

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const context = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Could not read the source image for color selection.');
  context.drawImage(source, 0, 0);
  const pixels = context.getImageData(0, 0, width, height).data;
  const results = selections.map((selection) => selectColorRegion(pixels, width, height, selection));
  if (!workingCanvas) return { selections: results };

  const workingContext = workingCanvas.getContext('2d', { willReadFrequently: true });
  if (!workingContext) throw new Error('Could not update the image mask.');
  const workingPixels = workingContext.getImageData(0, 0, width, height);
  applySelectionsToPixels(workingPixels.data, pixels, results, selections);
  workingContext.putImageData(workingPixels, 0, 0);
  return { selections: results };
}

export function applySelectionsToPixels(
  working: Uint8ClampedArray,
  source: Uint8ClampedArray,
  results: ColorSelectionResult[],
  selections: ColorSelection[]
) {
  for (let selectionIndex = 0; selectionIndex < selections.length; selectionIndex++) {
    const { mask } = results[selectionIndex];
    for (let pixel = 0; pixel < mask.length; pixel++) {
      const coverage = mask[pixel] / 255;
      if (coverage === 0) continue;
      const offset = pixel * 4;
      if (selections[selectionIndex].action === 'keep') {
        for (let channel = 0; channel < 4; channel++) {
          working[offset + channel] = Math.round(
            working[offset + channel] * (1 - coverage) + source[offset + channel] * coverage
          );
        }
      } else {
        working[offset + 3] = Math.round(working[offset + 3] * (1 - coverage));
      }
    }
  }
}

export function sampleColor(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number
): [number, number, number] {
  const px = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const py = Math.max(0, Math.min(height - 1, Math.floor(y)));
  const index = (py * width + px) * 4;
  return [pixels[index], pixels[index + 1], pixels[index + 2]];
}

export async function sampleColorAt(
  source: HTMLImageElement,
  x: number,
  y: number
): Promise<[number, number, number]> {
  const width = source.naturalWidth || source.width;
  const height = source.naturalHeight || source.height;
  if (Math.max(width, height) > 2000) {
    if (typeof Worker === 'undefined' || typeof createImageBitmap === 'undefined') {
      throw new Error('Large image color sampling requires Web Worker support.');
    }
    const worker = new Worker(new URL('./colorSelection.worker.ts', import.meta.url), { type: 'module' });
    const bitmap = await createImageBitmap(source);
    try {
      return await new Promise<[number, number, number]>((resolve, reject) => {
        worker.onmessage = (event: MessageEvent<{ color?: [number, number, number]; error?: string }>) => {
          if (event.data.error) reject(new Error(event.data.error));
          else if (event.data.color) resolve(event.data.color);
          else reject(new Error('Worker returned no sampled color.'));
        };
        worker.onerror = (event) => reject(new Error(event.message || 'Color sampling worker failed.'));
        worker.postMessage({ mode: 'sample', bitmap, x, y }, [bitmap]);
      });
    } finally {
      worker.terminate();
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Could not sample the source image color.');
  context.drawImage(source, 0, 0);
  return sampleColor(context.getImageData(0, 0, width, height).data, width, height, x, y);
}
