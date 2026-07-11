import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import type { Tally } from '../../shared/types';

const PALETTE = ['#2456C4', '#FFFFFF', '#82AAF6'];
const DURATION = 1200;

interface Props {
  fire: boolean;
  tallyBefore: Tally;
  tallyAfter: Tally;
}

export default function ConfettiOverlay({ fire, tallyBefore, tallyAfter }: Props) {
  const [t, setT] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!fire) return;

    const burst = () =>
      confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 }, colors: PALETTE });
    const timers = [0, 250, 500].map((delay) => setTimeout(burst, delay));

    const start = performance.now();
    const step = (nowTs: number) => {
      const p = Math.min(1, (nowTs - start) / DURATION);
      setT(p);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      timers.forEach(clearTimeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setT(0);
    };
  }, [fire]);

  const lerp = (a: number, b: number) => a + (b - a) * t;
  const dollars = lerp(tallyBefore.dollars_saved, tallyAfter.dollars_saved);
  const co2 = lerp(tallyBefore.kg_co2_avoided, tallyAfter.kg_co2_avoided);
  const items = lerp(tallyBefore.items_released, tallyAfter.items_released);
  const gained = tallyAfter.dollars_saved - tallyBefore.dollars_saved;

  return (
    <AnimatePresence>
      {fire && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className="bg-white rounded-card shadow-xl px-10 py-8 text-center"
            initial={{ scale: 0.85, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          >
            <p className="text-2xl font-semibold text-forest">
              +${gained.toFixed(2)} released back to your future
            </p>
            <div className="mt-5 flex gap-8 justify-center">
              <div>
                <p className="text-3xl font-semibold text-forest tabular-nums">${dollars.toFixed(0)}</p>
                <p className="text-sm text-gray-500">saved</p>
              </div>
              <div>
                <p className="text-3xl font-semibold text-forest tabular-nums">{co2.toFixed(1)}</p>
                <p className="text-sm text-gray-500">kg CO₂</p>
              </div>
              <div>
                <p className="text-3xl font-semibold text-forest tabular-nums">{Math.round(items)}</p>
                <p className="text-sm text-gray-500">released</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
