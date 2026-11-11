import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { convertMeasureValue, migrateLegacyMeasures, safeLabelRotation } from './dimensionMeasures';

describe('dimension measures', () => {
  it('migrates existing frame measurements and annotation positions', () => {
    const migrated = migrateLegacyMeasures({
      dimHeight: 34,
      dimWidth: 21,
      dimDepth: 8.5,
      dimUnit: 'cm',
      dimensionAnnotations: [
        { id: 'height', start: { x: 0.1, y: 0.2 }, end: { x: 0.1, y: 0.8 }, visible: false },
        { id: 'width', start: { x: 0.2, y: 0.85 }, end: { x: 0.8, y: 0.85 }, visible: true },
      ],
    });

    it('migrates legacy values when a stored dynamic list is empty', () => {
      const migrated = migrateLegacyMeasures({
        dimensionMeasures: [],
        dimHeight: 40,
        dimWidth: 26,
        dimDepth: 12,
      });

      assert.deepEqual(migrated.map((measure) => measure.value), [40, 26, 12]);
    });

    assert.equal(migrated.length, 3);
    assert.equal(migrated[0].value, 34);
    assert.equal(migrated[0].visible, false);
    assert.deepEqual(migrated[0].start, { x: 0.1, y: 0.2 });
    assert.equal(migrated[2].value, 8.5);
  });

  it('converts values between cm, mm and inches', () => {
    assert.equal(convertMeasureValue(2.54, 'cm', 'in'), 1);
    assert.equal(convertMeasureValue(3, 'cm', 'mm'), 30);
    assert.equal(convertMeasureValue(25.4, 'mm', 'in'), 1);
    assert.equal(convertMeasureValue(1, 'in', 'cm'), 2.54);
  });

  it('keeps slanted dimension labels upright', () => {
    const angles = [
      safeLabelRotation({ x: 0, y: 0 }, { x: -1, y: -1 }),
      safeLabelRotation({ x: 0, y: 0 }, { x: -1, y: 1 }),
      safeLabelRotation({ x: 0, y: 0 }, { x: 1, y: -1 }),
      safeLabelRotation({ x: 0, y: 0 }, { x: 1, y: 1 }),
    ];
    assert.ok(angles.every((angle) => angle >= -90 && angle <= 90));
    assert.ok(Math.abs(angles[0] - 45) < 0.001);
    assert.ok(Math.abs(angles[1] + 45) < 0.001);
  });
});
