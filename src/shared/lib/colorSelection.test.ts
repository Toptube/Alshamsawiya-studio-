import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applySelectionsToPixels, selectColorRegion } from './colorSelection';

function rgbaGrid(rows: number[][][]): Uint8ClampedArray {
  return new Uint8ClampedArray(rows.flatMap((row) => row.flatMap((color) => [...color, 255])));
}

describe('selectColorRegion', () => {
  it('selects only the contiguous matching area', () => {
    const pixels = rgbaGrid([
      [[10, 10, 10], [10, 10, 10], [200, 200, 200], [10, 10, 10]],
      [[10, 10, 10], [10, 10, 10], [200, 200, 200], [10, 10, 10]],
    ]);
    const { mask } = selectColorRegion(pixels, 4, 2, {
      x: 0, y: 0, tolerance: 0, contiguous: true, feather: 0,
    });
    assert.deepEqual([...mask], [255, 255, 0, 0, 255, 255, 0, 0]);
  });

  it('selects matching colors across the image in global mode', () => {
    const pixels = rgbaGrid([[[5, 5, 5], [255, 0, 0], [5, 5, 5]]]);
    const { mask } = selectColorRegion(pixels, 3, 1, {
      x: 0, y: 0, tolerance: 0, contiguous: false, feather: 0,
    });
    assert.deepEqual([...mask], [255, 0, 255]);
  });

  it('applies edge feathering as partial coverage', () => {
    const pixels = rgbaGrid([[[0, 0, 0], [0, 0, 0], [255, 255, 255]]]);
    const { mask } = selectColorRegion(pixels, 3, 1, {
      x: 0, y: 0, tolerance: 0, contiguous: true, feather: 1,
    });
    assert.ok(mask[0] < 255);
    assert.ok(mask[0] > 0);
  });

  it('returns an empty mask when the seed is transparent', () => {
    const pixels = new Uint8ClampedArray([40, 40, 40, 0]);
    const { mask } = selectColorRegion(pixels, 1, 1, {
      x: 0, y: 0, tolerance: 30, contiguous: true, feather: 0,
    });
    assert.deepEqual([...mask], [0]);
  });

  it('applies remove and keep marker masks to a copy of the image', () => {
    const source = new Uint8ClampedArray([
      240, 20, 20, 255,
      20, 20, 240, 255,
    ]);
    const working = new Uint8ClampedArray([
      240, 20, 20, 255,
      20, 20, 240, 0,
    ]);
    const remove = selectColorRegion(source, 2, 1, {
      x: 0, y: 0, tolerance: 0, contiguous: false, feather: 0,
    });
    const keep = selectColorRegion(source, 2, 1, {
      x: 1, y: 0, tolerance: 0, contiguous: false, feather: 0,
    });
    applySelectionsToPixels(working, source, [remove, keep], [
      { x: 0, y: 0, tolerance: 0, contiguous: false, feather: 0, action: 'remove' },
      { x: 1, y: 0, tolerance: 0, contiguous: false, feather: 0, action: 'keep' },
    ]);
    assert.equal(working[3], 0);
    assert.equal(working[7], 255);
  });
});
