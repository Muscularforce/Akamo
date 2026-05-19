import { motion } from 'motion/react';
import { Crown, Briefcase, Lightbulb } from 'lucide-react';

const ease = [0.16, 1, 0.3, 1] as const;

const team = [
  {
    name: 'Jovan Fernandes',
    role: 'Founder & CEO',
    icon: Crown,
    description: 'Visionary behind Akamo. Building the future of music discovery and creative expression.',
  },
  {
    name: 'Tercia Fernandes',
    role: 'Executive Director',
    icon: Briefcase,
    description: 'Driving operational excellence and strategic direction for the Akamo platform.',
  },
  {
    name: 'Vihaan Romil',
    role: 'Professional Dumbass',
    icon: Lightbulb,
    description: 'The original idea giver and constant source of inspiration for the platform.',
  },
];

function AkamoPlusWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display font-bold tracking-tight ${className}`}>
      Akamo
      <span className="relative">
        <span
          className="absolute -top-[0.35em] -right-[0.65em] text-[0.55em] font-black"
          style={{
            background: 'var(--accent-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            opacity: 0.85,
          }}
        >
          +
        </span>
      </span>
    </span>
  );
}

export { AkamoPlusWordmark };

export default function AboutSection() {
  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, ease }}
      className="mt-20 mb-8"
    >
      {/* Section label */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease, delay: 0.1 }}
        className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30 mb-10"
      >
        The Team
      </motion.p>

      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease, delay: 0.15 }}
        className="mb-14"
      >
        <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-white leading-tight mb-4">
          Built by people who{' '}
          <span className="text-white/40">love music.</span>
        </h2>
        <p className="text-sm text-white/40 leading-relaxed max-w-md font-medium">
          <AkamoPlusWordmark className="text-sm text-white" /> is crafted with care by a small,
          passionate team dedicated to redefining how you experience sound.
        </p>
      </motion.div>

      {/* Team grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {team.map((member, i) => (
          <motion.div
            key={member.name}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease, delay: 0.25 + i * 0.1 }}
            whileHover={{ scale: 1.01, borderColor: 'rgba(255,255,255,0.15)' }}
            className="group relative rounded-2xl p-6 cursor-default transition-colors duration-500"
            style={{
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.06)',
              willChange: 'transform',
              backfaceVisibility: 'hidden',
            }}
          >
            {/* Subtle top-edge highlight */}
            <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="flex items-start gap-4">
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500 group-hover:shadow-lg"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <member.icon size={17} className="text-white/50 group-hover:text-white/70 transition-colors duration-500" />
              </div>

              <div className="min-w-0">
                {/* Name */}
                <h3 className="text-base font-bold tracking-tight text-white group-hover:text-white transition-colors duration-500">
                  {member.name}
                </h3>

                {/* Role */}
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.15em] mt-0.5 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background: 'var(--accent-gradient)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    opacity: 0.7,
                  }}
                >
                  {member.role}
                </p>

                {/* Description */}
                <p className="text-xs text-white/35 leading-relaxed mt-3 font-medium group-hover:text-white/50 transition-colors duration-500">
                  {member.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer divider */}
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 1, ease, delay: 0.5 }}
        className="mt-16 h-[1px] bg-gradient-to-r from-transparent via-white/8 to-transparent origin-center"
      />
    </motion.section>
  );
}
