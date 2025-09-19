import { textColor } from './colorMapping';

const timeUnits = [
  { unit: 's', threshold: 1e9, decimalPlaces: 2 },
  { unit: 'ms', threshold: 1e6, decimalPlaces: 0 },
  { unit: 'µs', threshold: 1e3, decimalPlaces: 0 },
  { unit: 'ns', threshold: 1, decimalPlaces: 0 },
];

export default function durationString(beforeTime: bigint, useColors: boolean): string {
  const zeroNs = '0ns'.padStart(8).padEnd(16);
  const nanoseconds = Number(process.hrtime.bigint() - beforeTime);

  for (const { unit, threshold, decimalPlaces } of timeUnits) {
    if (nanoseconds >= threshold) {
      const value = (nanoseconds / threshold).toFixed(decimalPlaces);
      const timeStr = `${value}${unit}`.padStart(8).padEnd(16);
      return useColors ? textColor('gray', timeStr) : timeStr;
    }
  }

  return useColors ? textColor('gray', zeroNs) : zeroNs;
}
