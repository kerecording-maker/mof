/** Pure numeric helpers for column-wise comparison (client-side). */

export function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function variancePopulation(values: number[]): number {
  if (!values.length) return 0;
  const m = mean(values);
  return mean(values.map((x) => (x - m) ** 2));
}

export function stdevSample(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const v = values.reduce((s, x) => s + (x - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(v);
}

export function minMax(values: number[]): { min: number; max: number } {
  if (!values.length) return { min: 0, max: 0 };
  let min = values[0];
  let max = values[0];
  for (const x of values) {
    if (x < min) min = x;
    if (x > max) max = x;
  }
  return { min, max };
}

/** Simple period-over-period growth using first vs last observation. */
export function growthRatePercent(values: number[]): number {
  if (values.length < 2) return 0;
  const a = values[0];
  const b = values[values.length - 1];
  if (a === 0) return b === 0 ? 0 : 100;
  return ((b - a) / Math.abs(a)) * 100;
}

export function pctChange(baseline: number, current: number): number {
  if (baseline === 0) return current === 0 ? 0 : 100;
  return ((current - baseline) / Math.abs(baseline)) * 100;
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}
