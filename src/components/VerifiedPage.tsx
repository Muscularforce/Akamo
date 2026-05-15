import { motion } from 'motion/react';
import { Check, Music } from 'lucide-react';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

interface VerifiedPageProps {
  onContinue: () => void;
}

export default function VerifiedPage({ onContinue }: VerifiedPageProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Trigger confetti slightly after component mounts for maximum impact
    const timer = setTimeout(() => {
      setShowConfetti(true);
      triggerConfetti();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#1DB954', '#ffffff']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#1DB954', '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  const cardEase = [0.22, 1, 0.36, 1] as const;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#030303]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(29, 185, 84, 0.15) 0%, rgba(0,0,0,0) 70%)',
            filter: 'blur(60px)',
          }}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: cardEase }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[440px] mx-4 flex flex-col items-center">
        {/* Verification Icon Glow */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: 0.1
          }}
          className="w-24 h-24 rounded-full flex items-center justify-center mb-8 relative"
        >
          {/* Animated rings */}
          {[1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border border-[#1DB954]"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: [1, 1.5, 2],
                opacity: [0, 0.5, 0] 
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.5,
                ease: "linear"
              }}
            />
          ))}
          
          <div 
            className="w-full h-full rounded-full flex items-center justify-center bg-[#1DB954] shadow-[0_0_40px_rgba(29,185,84,0.5)] z-10 relative overflow-hidden"
          >
            {/* Shimmer inside icon */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full"
              animate={{ translateX: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />
            <Check size={48} className="text-black" strokeWidth={3} />
          </div>
        </motion.div>

        {/* Text Content */}
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6, ease: cardEase }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-2 mb-3"
          >
            <Music size={16} className="text-[#1DB954]" />
            <span className="text-[#1DB954] font-bold text-xs tracking-[0.2em] uppercase">Akamo Access</span>
          </motion.div>
          
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4 font-display">
            You're Verified
          </h1>
          <p className="text-white/50 text-base sm:text-lg max-w-[300px] mx-auto font-medium">
            Your email has been confirmed. The full Akamo experience is now unlocked.
          </p>
        </motion.div>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6, ease: cardEase }}
          className="w-full"
        >
          <motion.button
            onClick={onContinue}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="group relative w-full py-4 rounded-2xl text-sm font-bold tracking-widest uppercase overflow-hidden transition-all bg-white text-black shadow-[0_8px_30px_rgba(255,255,255,0.1)] hover:shadow-[0_8px_40px_rgba(255,255,255,0.2)]"
          >
            {/* Hover Gradient */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-gray-200 via-white to-gray-200" />
            
            <span className="relative z-10 flex items-center justify-center gap-2">
              Start Listening
            </span>
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}
