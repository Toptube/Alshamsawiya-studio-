export type MeasureUnit = 'cm' | 'mm' | 'in';
export type MeasureKind =
  | 'height'
  | 'width'
  | 'length'
  | 'depth'
  | 'diameter'
  | 'side'
  | 'strap'
  | 'drop'
  | 'tier'
  | 'custom';
export type MeasureConstraint = 'vertical' | 'horizontal' | 'free';
export type DimensionPoint = { x: number; y: number };

export interface DimensionMeasure {
  id: string;
  kind: MeasureKind;
  label: string;
  value: number;
  unit: MeasureUnit;
  visible: boolean;
  showName: boolean;
  constraint: MeasureConstraint;
  start: DimensionPoint;
  end: DimensionPoint;
  color: string;
  thickness: number;
  labelOffset: number;
}

const UNIT_FACTORS: Record<MeasureUnit, number> = { cm: 1, mm: 10, in: 1 / 2.54 };

export const convertMeasureValue = (value: number, from: MeasureUnit, to: MeasureUnit): number =>
  Number((value * UNIT_FACTORS[to] / UNIT_FACTORS[from]).toFixed(2));

export const safeLabelRotation = (start: DimensionPoint, end: DimensionPoint): number => {
  let degrees = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI;
  if (degrees > 90) degrees -= 180;
  if (degrees < -90) degrees += 180;
  return degrees;
};

export const defaultConstraint = (kind: MeasureKind): MeasureConstraint => {
  if (kind === 'height' || kind === 'drop') return 'vertical';
  if (kind === 'width' || kind === 'length' || kind === 'diameter') return 'horizontal';
  return 'free';
};

export const constrainMeasurePoint = (
  constraint: MeasureConstraint,
  point: DimensionPoint,
  other: DimensionPoint
): DimensionPoint => constraint === 'vertical'
  ? { x: other.x, y: point.y }
  : constraint === 'horizontal'
    ? { x: point.x, y: other.y }
    : point;

const makeMeasure = (
  id: string,
  kind: MeasureKind,
  label: string,
  value: number,
  start: DimensionPoint,
  end: DimensionPoint,
  unit: MeasureUnit,
  color: string,
  thickness: number
): DimensionMeasure => ({
  id,
  kind,
  label,
  value,
  unit,
  visible: true,
  showName: true,
  constraint: defaultConstraint(kind),
  start,
  end,
  color,
  thickness,
  labelOffset: 0,
});

export const createDefaultMeasures = (
  values: { height: number; width: number; depth: number },
  unit: MeasureUnit = 'cm',
  color = '#D48B16',
  thickness = 2,
): DimensionMeasure[] => [
  makeMeasure('height-1', 'height', 'الارتفاع', values.height,
    { x: 0.16, y: 0.2 }, { x: 0.16, y: 0.8 }, unit, color, thickness),
  makeMeasure('width-1', 'width', 'العرض', values.width,
    { x: 0.2, y: 0.82 }, { x: 0.8, y: 0.82 }, unit, color, thickness),
  makeMeasure('depth-1', 'depth', 'العمق', values.depth,
    { x: 0.68, y: 0.22 }, { x: 0.82, y: 0.34 }, unit, color, thickness),
];

export const migrateLegacyMeasures = (frame: Record<string, unknown>): DimensionMeasure[] => {
  const existing = frame.dimensionMeasures;
  const annotations = Array.isArray(frame.dimensionAnnotations) ? frame.dimensionAnnotations : [];
  const hasLegacyValues = ['dimHeight', 'dimWidth', 'dimDepth'].some((key) =>
    typeof frame[key] === 'number' && Number.isFinite(frame[key])
  );
  if (Array.isArray(existing) && existing.every(isDimensionMeasure)
    && (existing.length > 0 || (!hasLegacyValues && annotations.length === 0))) return existing;
  const legacy: Array<{ kind: 'height' | 'width' | 'depth'; label: string; key: string }> = [
    { kind: 'height', label: 'الارتفاع', key: 'dimHeight' },
    { kind: 'width', label: 'العرض', key: 'dimWidth' },
    { kind: 'depth', label: 'العمق', key: 'dimDepth' },
  ];
  return legacy.flatMap(({ kind, label, key }, index) => {
    const annotation = annotations.find((item) =>
      Boolean(item && typeof item === 'object' && (item as Record<string, unknown>).id === kind)
    ) as Record<string, unknown> | undefined;
    const value = typeof frame[key] === 'number' && Number.isFinite(frame[key])
      ? frame[key] as number
      : undefined;
    if (value === undefined && !annotation) return [];
    const fallback = createDefaultMeasures({ height: 24, width: 18, depth: 9 })[index];
    const point = (candidate: unknown, fallbackPoint: DimensionPoint): DimensionPoint => {
      if (!candidate || typeof candidate !== 'object') return fallbackPoint;
      const source = candidate as Record<string, unknown>;
      return typeof source.x === 'number' && typeof source.y === 'number'
        ? { x: source.x, y: source.y }
        : fallbackPoint;
    };
    return [{
      ...fallback,
      id: `${kind}-1`,
      value: value ?? fallback.value,
      unit: frame.dimUnit === 'mm' || frame.dimUnit === 'in' ? frame.dimUnit : 'cm',
      start: point(annotation?.start, fallback.start),
      end: point(annotation?.end, fallback.end),
      visible: typeof annotation?.visible === 'boolean' ? annotation.visible : true,
      color: typeof frame.dimensionColor === 'string' ? frame.dimensionColor : fallback.color,
      thickness: typeof frame.dimensionThickness === 'number' ? frame.dimensionThickness : fallback.thickness,
    }];
  });
};

export const isDimensionMeasure = (value: unknown): value is DimensionMeasure => {
  if (!value || typeof value !== 'object') return false;
  const measure = value as Record<string, unknown>;
  const pointValid = (point: unknown) => Boolean(point && typeof point === 'object'
    && typeof (point as Record<string, unknown>).x === 'number'
    && typeof (point as Record<string, unknown>).y === 'number');
  return typeof measure.id === 'string'
    && typeof measure.label === 'string'
    && typeof measure.value === 'number'
    && ['height', 'width', 'length', 'depth', 'diameter', 'side', 'strap', 'drop', 'tier', 'custom'].includes(String(measure.kind))
    && ['cm', 'mm', 'in'].includes(String(measure.unit))
    && typeof measure.visible === 'boolean'
    && typeof measure.showName === 'boolean'
    && ['vertical', 'horizontal', 'free'].includes(String(measure.constraint))
    && pointValid(measure.start)
    && pointValid(measure.end)
    && typeof measure.color === 'string'
    && typeof measure.thickness === 'number'
    && typeof measure.labelOffset === 'number';
};

export const createMeasure = (
  kind: MeasureKind,
  label: string,
  value: number,
  unit: MeasureUnit,
  index: number,
  color: string,
  thickness: number,
  productBounds?: { left: number; top: number; right: number; bottom: number }
): DimensionMeasure => {
  const offset = Math.min(index * 0.07, 0.28);
  const bounds = productBounds || { left: 0.28, top: 0.2, right: 0.72, bottom: 0.8 };
  let start: DimensionPoint = {
    x: Math.max(0.04, bounds.left - 0.06 - offset),
    y: bounds.top
  };
  let end: DimensionPoint = {
    x: start.x,
    y: bounds.bottom
  };
  if (defaultConstraint(kind) === 'horizontal') {
    start = { x: bounds.left, y: Math.min(0.96, bounds.bottom + 0.06 + offset) };
    end = { x: bounds.right, y: start.y };
  } else if (defaultConstraint(kind) === 'free') {
    start = {
      x: Math.min(0.92, bounds.right + 0.04 + offset / 3),
      y: Math.max(0.04, bounds.top + offset)
    };
    end = {
      x: Math.max(0.08, bounds.right - 0.02 - offset / 3),
      y: Math.min(0.92, bounds.top + 0.16 + offset)
    };
  }
  const id = `${kind}-${index + 1}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  return makeMeasure(id, kind, label, value, start, end, unit, color, thickness);
};
