import { applySelectionsToPixels, ColorSelection, sampleColor, selectColorRegion } from './colorSelection';

interface ColorSelectionWorkerMessage {
  mode?: 'sample';
  bitmap: ImageBitmap;
  workingBitmap?: ImageBitmap;
  selections?: ColorSelection[];
  x?: number;
  y?: number;
}

interface ColorSelectionWorkerScope {
  onmessage: ((event: MessageEvent<ColorSelectionWorkerMessage>) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
}

const workerScope = self as unknown as ColorSelectionWorkerScope;

workerScope.onmessage = async (event) => {
  const { bitmap } = event.data;
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Could not read the source image in the worker.');
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    bitmap.close();

    if (event.data.mode === 'sample') {
      workerScope.postMessage({
        color: sampleColor(pixels, canvas.width, canvas.height, event.data.x || 0, event.data.y || 0),
      });
      return;
    }

    const selections = event.data.selections || [];
    const results = selections.map((selection) =>
      selectColorRegion(pixels, canvas.width, canvas.height, selection)
    );
    const masks = results.map((result) => {
      const buffer = new ArrayBuffer(result.mask.byteLength);
      new Uint8Array(buffer).set(result.mask);
      return buffer;
    });
    const response: {
      results: { width: number; height: number; masks: ArrayBuffer[] };
      outputBitmap?: ImageBitmap;
    } = {
      results: {
        width: canvas.width,
        height: canvas.height,
        masks,
      },
    };
    const transferables: Transferable[] = [...masks];

    if (event.data.workingBitmap) {
      const workingCanvas = new OffscreenCanvas(canvas.width, canvas.height);
      const workingContext = workingCanvas.getContext('2d', { willReadFrequently: true });
      if (!workingContext) throw new Error('Could not update the image mask in the worker.');
      workingContext.drawImage(event.data.workingBitmap, 0, 0);
      event.data.workingBitmap.close();
      const workingImage = workingContext.getImageData(0, 0, canvas.width, canvas.height);
      applySelectionsToPixels(workingImage.data, pixels, results, selections);
      workingContext.putImageData(workingImage, 0, 0);
      response.outputBitmap = await createImageBitmap(workingCanvas);
      transferables.push(response.outputBitmap);
    }
    workerScope.postMessage(response, transferables);
  } catch (error) {
    bitmap.close();
    event.data.workingBitmap?.close();
    workerScope.postMessage({ error: error instanceof Error ? error.message : 'Color selection worker failed.' });
  }
};
