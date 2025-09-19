import { StatusMap } from 'elysia';
import { textColor } from './colorMapping';

export function getStatusCode(status: string | number): number {
  if (typeof status === 'number') return status;
  return (StatusMap as Record<string, number>)[status] || 500;
}

export default function statusString(status: number, useColors: boolean): string {
  const statusStr = status.toString();
  if (!useColors) return statusStr;
  return getColor(status, statusStr);
}

const getColor = (status: number, text: string) =>
  ({
    500: textColor('red', text),
    400: textColor('yellow', text),
    300: textColor('cyan', text),
    200: textColor('green', text),
  })[status] || textColor('white', text);
