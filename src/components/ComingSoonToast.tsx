import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Construction } from 'lucide-react';

interface ComingSoonContextType {
  triggerComingSoon: () => void;
}

const ComingSoonContext = createContext<ComingSoonContextType>({ triggerComingSoon: () => {} });

export const useComingSoon = () => useContext(ComingSoonContext);

const MESSAGES = [
  "THIS FEATURE IS NOT OUT YET!",
  "COMING SOON™ — PATIENCE, LEGEND.",
  "NOT AVAILABLE YET. WE'RE COOKING.",
  "FEATURE LOCKED. STAY TUNED.",
  "UNDER CONSTRUCTION. CHILL.",
  "THIS BUTTON DOES NOTHING... YET!",
  "NICE TRY. COMING SOON.",
  "YOU FOUND THE EASTER EGG! 🥚",
];

export function ComingSoonProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [message, setMessage] = useState(MESSAGES[0]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIndex = useRef(-1);

  const triggerComingSoon = useCallback(() => {
    // Pick a random message (different from last)
    let idx = Math.floor(Math.random() * MESSAGES.length);
    while (idx === lastIndex.current && MESSAGES.length > 1) {
      idx = Math.floor(Math.random() * MESSAGES.length);
    }
    lastIndex.current = idx;
    setMessage(MESSAGES[idx]);

    // Clear any existing timeout
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Trigger shake + toast
    setShaking(true);
    setVisible(true);

    // Stop shake after 500ms
    setTimeout(() => setShaking(false), 500);

    // Hide toast after 2.5s
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, 2500);
  }, []);

  return (
    <ComingSoonContext.Provider value={{ triggerComingSoon }}>
      <div
        style={{
          animation: shaking ? 'comingSoonShake 0.5s ease-in-out' : 'none',
        }}
      >
        {children}
      </div>

      {/* Toast overlay */}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 400 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none"
          >
            <div
              className="px-8 py-4 rounded-2xl border border-white/15 shadow-[0_20px_80px_rgba(0,0,0,0.8)] flex items-center gap-4"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 40, 40, 0.25) 0%, rgba(15, 15, 15, 1) 30%, rgba(15, 15, 15, 1) 100%)',
                backdropFilter: 'blur(40px)',
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <Construction size={20} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-black text-white tracking-wider leading-tight">
                  {message}
                </p>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-0.5">
                  v2.0 — Development Phase
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyframe for shake */}
      <style>{`
        @keyframes comingSoonShake {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          10% { transform: translate(-6px, -2px) rotate(-0.5deg); }
          20% { transform: translate(5px, 3px) rotate(0.5deg); }
          30% { transform: translate(-7px, 1px) rotate(-0.3deg); }
          40% { transform: translate(6px, -3px) rotate(0.4deg); }
          50% { transform: translate(-4px, 2px) rotate(-0.6deg); }
          60% { transform: translate(5px, -1px) rotate(0.3deg); }
          70% { transform: translate(-3px, 3px) rotate(-0.2deg); }
          80% { transform: translate(4px, -2px) rotate(0.5deg); }
          90% { transform: translate(-2px, 1px) rotate(-0.1deg); }
        }
      `}</style>
    </ComingSoonContext.Provider>
  );
}
