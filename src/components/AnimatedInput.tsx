import { useState, useId } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AnimatedInputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  autoComplete?: string;
  disabled?: boolean;
}

export default function AnimatedInput({
  label,
  type = 'text',
  value,
  onChange,
  error,
  icon,
  action,
  autoComplete,
  disabled = false,
}: AnimatedInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const id = useId();
  const isActive = isFocused || value.length > 0;

  return (
    <div className="relative w-full">
      <div className="relative">
        {/* Glow ring on focus */}
        <motion.div
          className="absolute -inset-[1px] rounded-2xl pointer-events-none"
          animate={{
            opacity: isFocused ? 1 : 0,
            boxShadow: isFocused
              ? '0 0 20px rgba(29, 185, 84, 0.15), 0 0 40px rgba(29, 185, 84, 0.05)'
              : '0 0 0px transparent',
          }}
          transition={{ duration: 0.3 }}
          style={{
            border: '1px solid',
            borderColor: error
              ? 'rgba(239, 68, 68, 0.5)'
              : isFocused
                ? 'rgba(29, 185, 84, 0.4)'
                : 'transparent',
            borderRadius: '1rem',
            willChange: 'opacity, box-shadow',
            backfaceVisibility: 'hidden' as const,
          }}
        />

        {/* Input container */}
        <div
          className={`relative flex items-center gap-3 rounded-2xl px-5 py-4 transition-all duration-300 ${
            error
              ? 'bg-red-500/5 border border-red-500/20'
              : isFocused
                ? 'bg-white/[0.07] border border-white/15'
                : 'bg-white/[0.04] border border-white/[0.08]'
          }`}
        >
          {/* Left icon */}
          {icon && (
            <motion.div
              animate={{
                color: error
                  ? 'rgb(239, 68, 68)'
                  : isFocused
                    ? 'rgb(29, 185, 84)'
                    : 'rgb(167, 167, 167)',
              }}
              transition={{ duration: 0.25 }}
              className="shrink-0"
            >
              {icon}
            </motion.div>
          )}

          {/* Input + Floating Label */}
          <div className="relative flex-1 min-w-0">
            <motion.label
              htmlFor={id}
              className="absolute left-0 pointer-events-none origin-left font-medium"
              animate={{
                y: isActive ? -10 : 0,
                scale: isActive ? 0.72 : 1,
                color: error
                  ? 'rgb(239, 68, 68)'
                  : isFocused
                    ? 'rgb(29, 185, 84)'
                    : 'rgb(167, 167, 167)',
              }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ fontSize: '14px', willChange: 'transform, color', backfaceVisibility: 'hidden' as const }}
            >
              {label}
            </motion.label>
            <input
              id={id}
              type={type}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={disabled}
              autoComplete={autoComplete}
              className="w-full bg-transparent text-white text-sm font-medium outline-none pt-2.5 pb-0 placeholder-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              aria-invalid={!!error}
              aria-describedby={error ? `${id}-error` : undefined}
            />
          </div>

          {/* Right action */}
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            id={`${id}-error`}
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.2 }}
            className="text-red-400 text-xs font-medium mt-2 ml-1"
            role="alert"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
