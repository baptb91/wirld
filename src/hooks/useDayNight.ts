/**
 * useDayNight — reactive hook that returns the current time period.
 * Re-evaluates every minute so sky / creature schedules update automatically.
 */
import { useEffect, useState } from 'react';
import { getTimeOfDay, TimePeriod } from '../engine/TimeEngine';

export function useDayNight(): TimePeriod {
  const [period, setPeriod] = useState<TimePeriod>(getTimeOfDay);

  useEffect(() => {
    const id = setInterval(() => {
      setPeriod(getTimeOfDay());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return period;
}
