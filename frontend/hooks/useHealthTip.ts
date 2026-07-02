import { useCallback, useEffect, useState } from 'react';
import { getCurrentHealthTip, HealthTip } from '@/services/homeService';

const ROTATE_MS = 10 * 60 * 1000;

const FALLBACK_TIPS: HealthTip[] = [
  { id: '1', content: 'Drink at least 8 glasses of water daily to help your medications work effectively.', category: 'Hydration' },
  { id: '2', content: 'Take medications at the same time each day to build a healthy routine.', category: 'Adherence' },
  { id: '3', content: 'Store medicines in a cool, dry place away from direct sunlight.', category: 'Storage' },
];

export function useHealthTip() {
  const [tip, setTip] = useState<HealthTip>(FALLBACK_TIPS[0]);
  const [index, setIndex] = useState(0);

  const fetchTip = useCallback(async () => {
    try {
      const data = await getCurrentHealthTip();
      if (data?.content) setTip(data);
    } catch {
      setTip(FALLBACK_TIPS[index % FALLBACK_TIPS.length]);
    }
  }, [index]);

  useEffect(() => {
    fetchTip();
    const interval = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % FALLBACK_TIPS.length;
        setTip(FALLBACK_TIPS[next]);
        fetchTip();
        return next;
      });
    }, ROTATE_MS);
    return () => clearInterval(interval);
  }, [fetchTip]);

  return tip;
}
