import { motion } from 'motion/react';
import { Crown } from 'lucide-react';

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
      className="inline-flex items-center gap-1 flex-shrink-0 align-middle"
    >
      <div
        className={`aurora-badge relative inline-flex items-center justify-center ${sizeClasses[size]} rounded-full font-black uppercase tracking-[0.15em] select-none cursor-default overflow-hidden leading-none`}
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
