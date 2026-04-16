/**
 * TimeEngine — all real-time logic based on device local timezone.
 * Pure functions, no side effects.
 */
import { ScheduleType } from '../constants/creatures';

export type TimePeriod = 'dawn' | 'day' | 'dusk' | 'night';

// ---------------------------------------------------------------------------
// Core queries
// ---------------------------------------------------------------------------

export function getTimeOfDay(): TimePeriod {
  const h = new Date().getHours();
  if (h >= 6  && h < 9)  return 'dawn';
  if (h >= 9  && h < 18) return 'day';
  if (h >= 18 && h < 22) return 'dusk';
  return 'night';
}

export function isCreatureActive(scheduleType: ScheduleType): boolean {
  const h = new Date().getHours();
  switch (scheduleType) {
    case 'diurnal':
      return h >= 6 && h < 22;
    case 'nocturnal':
      return h >= 22 || h < 6;
    case 'crepuscular':
      // Active 18:00–08:00, but sleeps 10:00–16:00 and 00:00–04:00
      if (h >= 10 && h < 16) return false;
      if (h >= 0  && h < 4)  return false;
      return true;
    default:
      return true;
  }
}

/** Hours + fractional minutes, e.g. 14.5 = 14:30 */
export function getHourDecimal(): number {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}

/**
 * Maps the current hour to a 0–3 "sky progress" value:
 *   0 = dawn (6h), 1 = day (9h), 2 = dusk (18h), 3 = night (22h)
 * Smoothly interpolated between key points.
 */
export function getSkyProgress(): number {
  const h = getHourDecimal();
  if (h >= 6 && h < 9)   return (h - 6) / 3;           // 0 → 1
  if (h >= 9 && h < 18)  return 1;                      // day
  if (h >= 18 && h < 22) return 1 + (h - 18) / 4;      // 1 → 2
  if (h >= 22)           return 2 + (h - 22) / 2;      // 2 → 3 (by midnight)
  if (h >= 0 && h < 6)   return 3 - h / 6;             // 3 → 0 (by 6am)
  return 0;
}

/**
 * Sky background colors for each period.
 * Used with interpolateColor at sky-progress key points [0,1,2,3].
 */
export const SKY_COLORS = {
  dawn:  '#FFD9B0',
  day:   '#E8F5E0',
  dusk:  '#7B4F8C',
  night: '#0D1B2A',
} as const;

export const SKY_PROGRESS_COLORS: [string, string, string, string] = [
  SKY_COLORS.dawn,
  SKY_COLORS.day,
  SKY_COLORS.dusk,
  SKY_COLORS.night,
];
