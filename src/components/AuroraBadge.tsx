import { motion, AnimatePresence } from 'motion/react';
import { Crown, Shield } from 'lucide-react';
import { useState } from 'react';

interface AuroraBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showTitle?: boolean;
}

/**
 * AURORA — The founder-exclusive prestige badge for Akamo.
 *
 * Renders an animated rainbow-gradient pill with a crown icon.
 * Three sizes:
 *   sm  → inline next to artist name in Player / TrackCard
 *   md  → profile dropdown or card contexts
 *   lg  → profile page hero (future)
 */
export default function AuroraBadge({ size = 'sm', showLabel = true, showTitle = false }: AuroraBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const sizeClasses = {
    sm: 'h-[18px] gap-[3px] px-[6px] text-[8px]',
    md: 'h-[22px] gap-1 px-2 text-[9px]',
    lg: 'h-[28px] gap-1.5 px-3 text-[11px]',
  };

  const crownSize = { sm: 8, md: 10, lg: 13 };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.2 }}
      className="inline-flex items-center gap-1 flex-shrink-0 align-middle relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={(e) => { e.stopPropagation(); setShowTooltip(prev => !prev); }}
    >
      <div
        className={`aurora-badge relative inline-flex items-center justify-center ${sizeClasses[size]} rounded-full font-black uppercase tracking-[0.15em] select-none cursor-pointer overflow-hidden leading-none`}
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 aurora-gradient rounded-full" />
        
        {/* Inner dark pill for contrast */}
        <div className="absolute inset-[1px] bg-black/80 rounded-full backdrop-blur-sm" />
        
        {/* Content */}
        <div className="relative z-10 flex items-center justify-center gap-[3px] leading-none">
          <Crown size={crownSize[size]} className="aurora-text flex-shrink-0" strokeWidth={2.5} />
          {showLabel && (
            <span className="aurora-text leading-none translate-y-[0.5px]">AURORA</span>
          )}
        </div>

        {/* Shimmer sweep */}
        <div className="absolute inset-0 aurora-shimmer rounded-full pointer-events-none" />
      </div>

      {/* Custom Tooltip Box */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-[9999] pointer-events-none"
          >
            <div
              className="relative px-3.5 py-2.5 rounded-xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] whitespace-nowrap"
              style={{
                background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.97) 0%, rgba(18, 18, 18, 0.97) 100%)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div className="flex items-center gap-2">
                <Shield size={12} className="aurora-text flex-shrink-0" />
                <span className="text-[11px] font-semibold text-white/90 tracking-wide">
                  Developer-only badge
                </span>
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px]">
                <div
                  className="w-2.5 h-2.5 rotate-45 border-r border-b border-white/10"
                  style={{
                    background: 'rgba(18, 18, 18, 0.97)',
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showTitle && (
        <motion.span
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="text-[9px] font-bold uppercase tracking-[0.15em] aurora-text ml-0.5"
        >
          Head CEO
        </motion.span>
      )}
    </motion.div>
  );
}
