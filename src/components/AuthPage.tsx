import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Check, Loader2, Music2, AlertTriangle, UserIcon } from 'lucide-react';
import AnimatedInput from './AnimatedInput';
import { supabase, isSupabaseMisconfigured } from '../lib/supabase';

type AuthMode = 'login' | 'signup';

interface AuthPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

// Map Supabase errors to friendly messages
function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  // Network / connection errors
  if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('fetch'))
    return 'Unable to reach the server. Check your internet connection and try again.';
  if (m.includes('timeout') || m.includes('aborted'))
    return 'The request timed out. Please try again.';
  if (m.includes('cors'))
    return 'Connection blocked. Please contact support.';
  // Auth errors
  if (m.includes('invalid login') || m.includes('invalid_credentials'))
    return 'Incorrect email or password.';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'This email is already registered. Try logging in.';
  if (m.includes('password should be') || m.includes('password') && m.includes('characters'))
    return 'Password must be at least 6 characters.';
  if (m.includes('valid email') || m.includes('invalid email'))
    return 'Please enter a valid email address.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Too many attempts. Please wait a moment.';
  if (m.includes('email not confirmed'))
    return 'Please check your email and confirm your account first.';
  if (m.includes('signups not allowed'))
    return 'Sign ups are currently disabled. Please contact the administrator.';
  return msg;
}

// Validate email format
function validateEmail(email: string): string | undefined {
  if (!email) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';
  return undefined;
}

// Validate password
function validatePassword(password: string, isSignup: boolean): string | undefined {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Must be at least 6 characters';
  if (isSignup && password.length < 8) return 'Use at least 8 characters for security';
  return undefined;
}

// Password strength
function getStrength(pw: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { score: s, label: 'Weak', color: '#ef4444' };
  if (s <= 2) return { score: s, label: 'Fair', color: '#f59e0b' };
  if (s <= 3) return { score: s, label: 'Good', color: '#22c55e' };
  return { score: s, label: 'Strong', color: '#1DB954' };
}

// Floating orb component
function FloatingOrb({ delay, size, x, y }: { delay: number; size: number; x: string; y: string }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size, height: size, left: x, top: y,
        background: 'var(--accent-gradient)',
        filter: `blur(${size * 0.6}px)`,
        willChange: 'transform, opacity',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
      }}
      animate={{ y: [0, -30, 0], x: [0, 15, 0], scale: [1, 1.15, 1], opacity: [0.12, 0.22, 0.12] }}
      transition={{ duration: 8 + delay * 2, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

export default function AuthPage({ onBack, onSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const isSignup = mode === 'signup';

  // Clear errors on mode switch
  useEffect(() => {
    setErrors({});
    setAuthError('');
    setTouched({});
    setConfirmPw('');
    setDisplayName('');
    setShowPw(false);
    setShowConfirmPw(false);
  }, [mode]);

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (isSignup && !displayName.trim()) errs.displayName = 'Display name is required';
    if (isSignup && displayName.trim().length > 0 && displayName.trim().length < 2) errs.displayName = 'Must be at least 2 characters';
    const emailErr = validateEmail(email);
    const pwErr = validatePassword(password, isSignup);
    if (emailErr) errs.email = emailErr;
    if (pwErr) errs.password = pwErr;
    if (isSignup && confirmPw !== password) errs.confirm = 'Passwords do not match';
    if (isSignup && !confirmPw) errs.confirm = 'Please confirm your password';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [email, password, confirmPw, isSignup, displayName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setTouched({ email: true, password: true, confirm: true, displayName: true });

    if (!validate()) {
      setShakeKey((k) => k + 1);
      return;
    }

    if (isSupabaseMisconfigured) {
      setAuthError('Authentication is not configured. Please set up your Supabase environment variables.');
      setShakeKey((k) => k + 1);
      return;
    }

    setIsLoading(true);

    // Timeout after 15 seconds to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      let result;
      if (isSignup) {
        result = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: displayName.trim() },
            emailRedirectTo: `${window.location.origin}/`
          }
        });
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }

      clearTimeout(timeoutId);

      if (result.error) throw result.error;

      // For signup, check if email confirmation is required
      if (isSignup && result.data?.user?.identities?.length === 0) {
        setAuthError('This email is already registered. Try logging in.');
        setShakeKey((k) => k + 1);
        return;
      }

      setIsSuccess(true);
      if (!isSignup) {
        setTimeout(onSuccess, 1200);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const message = err?.name === 'AbortError'
        ? 'The request timed out. Please try again.'
        : friendlyError(err?.message || err?.error_description || 'Something went wrong. Please try again.');
      setAuthError(message);
      setShakeKey((k) => k + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const strength = isSignup ? getStrength(password) : null;

  const shakeVariants = {
    shake: {
      x: [0, -12, 12, -8, 8, -4, 4, 0],
      transition: { duration: 0.45, ease: [0.36, 0.07, 0.19, 0.97] },
    },
  };

  const cardEase = [0.22, 1, 0.36, 1] as const;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-[#030303]" />

      {/* Ambient orbs */}
      <FloatingOrb delay={0} size={280} x="10%" y="15%" />
      <FloatingOrb delay={1.5} size={200} x="70%" y="60%" />
      <FloatingOrb delay={3} size={160} x="50%" y="5%" />
      <FloatingOrb delay={2} size={120} x="85%" y="20%" />
      <FloatingOrb delay={4} size={100} x="20%" y="75%" />

      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundRepeat: 'repeat' }} />

      {/* Back button */}
      <motion.button
        onClick={onBack}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.5, ease: cardEase }}
        whileHover={{ x: -4, scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="absolute top-8 left-8 z-50 flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors text-sm font-medium"
        aria-label="Back to app"
      >
        <ArrowLeft size={18} />
        <span className="hidden sm:inline tracking-wide">Back</span>
      </motion.button>

      {/* Main card */}
      <motion.div
        key={shakeKey}
        variants={shakeVariants}
        animate={shakeKey > 0 ? 'shake' : undefined}
        className="relative z-10 w-full max-w-[440px] mx-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: cardEase, delay: 0.1 }}
          className="relative rounded-3xl overflow-hidden"
          style={{ willChange: 'transform, opacity', backfaceVisibility: 'hidden' }}
        >
          {/* Card glow border */}
          <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-b from-white/[0.12] via-white/[0.04] to-transparent pointer-events-none" />

          {/* Card body */}
          <div className="relative rounded-3xl bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/[0.06] p-8 sm:p-10">
            {/* Logo / Brand */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6, ease: cardEase }}
              className="flex flex-col items-center mb-10"
            >
              <motion.div
                whileHover={{ rotate: 10, scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15, restDelta: 0.001 }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'var(--accent-gradient)', boxShadow: '0 8px 30px rgba(29, 185, 84, 0.3)' }}
              >
                <Music2 size={26} className="text-black" />
              </motion.div>
              <h1 className="text-2xl font-bold tracking-tight text-white font-display">
                {isSignup ? 'Create your account' : 'Welcome back'}
              </h1>
              <p className="text-white/40 text-sm mt-2 font-medium">
                {isSignup ? 'Join the Akamo experience' : 'Sign in to Akamo'}
              </p>
            </motion.div>

            {/* Tab toggle */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5, ease: cardEase }}
              className="relative flex bg-white/[0.04] rounded-xl p-1 mb-8 border border-white/[0.06]"
            >
              <motion.div
                className="absolute top-1 bottom-1 rounded-lg"
                style={{ background: 'var(--accent-gradient)', boxShadow: '0 4px 15px rgba(29, 185, 84, 0.25)' }}
                animate={{ left: mode === 'login' ? '4px' : '50%', width: 'calc(50% - 4px)' }}
                transition={{ type: 'spring', stiffness: 350, damping: 30, restDelta: 0.001 }}
              />
              <button
                onClick={() => setMode('login')}
                className={`relative z-10 flex-1 py-2.5 text-xs font-bold tracking-widest uppercase transition-colors ${mode === 'login' ? 'text-black' : 'text-white/50 hover:text-white/70'}`}
              >
                Login
              </button>
              <button
                onClick={() => setMode('signup')}
                className={`relative z-10 flex-1 py-2.5 text-xs font-bold tracking-widest uppercase transition-colors ${mode === 'signup' ? 'text-black' : 'text-white/50 hover:text-white/70'}`}
              >
                Sign Up
              </button>
            </motion.div>

            {/* Success state */}
            <AnimatePresence mode="wait">
              {isSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center py-6 text-center"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1, restDelta: 0.001 }}
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                    style={{ background: 'var(--accent-gradient)', boxShadow: '0 8px 40px rgba(29, 185, 84, 0.4)' }}
                  >
                    <Check size={28} className="text-black" strokeWidth={3} />
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-white font-bold text-lg"
                  >
                    {isSignup ? 'Verify Your Email' : "You're in!"}
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                    className="text-white/45 text-sm mt-3 px-2 leading-relaxed font-medium"
                  >
                    {isSignup ? (
                      <>
                        We've sent a verification link to <span className="text-spotify-green font-bold break-all">{email}</span>.
                        <span className="block mt-4 text-white/30 text-xs">Please check your inbox (and spam/junk folder) to complete your registration.</span>
                      </>
                    ) : 'Redirecting...'}
                  </motion.div>

                  {isSignup && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      onClick={() => {
                        setIsSuccess(false);
                        setMode('login');
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="mt-8 px-8 py-3 rounded-xl text-xs font-bold tracking-widest uppercase bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.3)]"
                    >
                      Back to Login
                    </motion.button>
                  )}
                </motion.div>
              ) : (
                <motion.form
                  key={mode}
                  initial={{ opacity: 0, x: mode === 'login' ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: mode === 'login' ? 20 : -20 }}
                  transition={{ duration: 0.35, ease: cardEase }}
                  onSubmit={handleSubmit}
                  noValidate
                  className="space-y-5"
                >
                  {/* Auth error banner */}
                  <AnimatePresence>
                    {authError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-xs font-medium"
                        role="alert"
                      >
                        {authError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Display Name (signup only) */}
                  <AnimatePresence>
                    {isSignup && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: 12 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -12 }}
                        transition={{ duration: 0.35, ease: cardEase }}
                      >
                        <AnimatedInput
                          label="Display name"
                          type="text"
                          value={displayName}
                          onChange={(v) => { setDisplayName(v); if (touched.displayName) { setErrors((e) => ({ ...e, displayName: !v.trim() ? 'Display name is required' : v.trim().length < 2 ? 'Must be at least 2 characters' : '' })); } }}
                          error={touched.displayName ? errors.displayName : undefined}
                          icon={<UserIcon size={18} />}
                          autoComplete="name"
                          disabled={isLoading}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Email */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.4, ease: cardEase }}
                  >
                    <AnimatedInput
                      label="Email address"
                      type="email"
                      value={email}
                      onChange={(v) => { setEmail(v); if (touched.email) { const err = validateEmail(v); setErrors((e) => ({ ...e, email: err || '' })); } }}
                      error={touched.email ? errors.email : undefined}
                      icon={<Mail size={18} />}
                      autoComplete="email"
                      disabled={isLoading}
                    />
                  </motion.div>

                  {/* Password */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18, duration: 0.4, ease: cardEase }}
                  >
                    <AnimatedInput
                      label="Password"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={(v) => { setPassword(v); if (touched.password) { const err = validatePassword(v, isSignup); setErrors((e) => ({ ...e, password: err || '' })); } }}
                      error={touched.password ? errors.password : undefined}
                      icon={<Lock size={18} />}
                      autoComplete={isSignup ? 'new-password' : 'current-password'}
                      disabled={isLoading}
                      action={
                        <motion.button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          className="text-white/30 hover:text-white/60 transition-colors p-1"
                          aria-label={showPw ? 'Hide password' : 'Show password'}
                          tabIndex={-1}
                        >
                          {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                        </motion.button>
                      }
                    />
                  </motion.div>

                  {/* Password strength (signup only) */}
                  <AnimatePresence>
                    {isSignup && password.length > 0 && strength && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-1"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden flex gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <motion.div
                                key={i}
                                className="flex-1 rounded-full"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: i <= strength.score ? 1 : 0, backgroundColor: i <= strength.score ? strength.color : 'transparent' }}
                                transition={{ delay: i * 0.05, duration: 0.3 }}
                                style={{ transformOrigin: 'left' }}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: strength.color }}>
                            {strength.label}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Confirm password (signup only) */}
                  <AnimatePresence>
                    {isSignup && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: 12 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -12 }}
                        transition={{ duration: 0.35, ease: cardEase }}
                      >
                        <AnimatedInput
                          label="Confirm password"
                          type={showConfirmPw ? 'text' : 'password'}
                          value={confirmPw}
                          onChange={(v) => { setConfirmPw(v); if (touched.confirm) { setErrors((e) => ({ ...e, confirm: v !== password ? 'Passwords do not match' : '' })); } }}
                          error={touched.confirm ? errors.confirm : undefined}
                          icon={<Lock size={18} />}
                          autoComplete="new-password"
                          disabled={isLoading}
                          action={
                            <motion.button
                              type="button"
                              onClick={() => setShowConfirmPw(!showConfirmPw)}
                              whileHover={{ scale: 1.15 }}
                              whileTap={{ scale: 0.9 }}
                              className="text-white/30 hover:text-white/60 transition-colors p-1"
                              aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                              tabIndex={-1}
                            >
                              {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                            </motion.button>
                          }
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit button */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28, duration: 0.4, ease: cardEase }}
                  >
                    <motion.button
                      type="submit"
                      disabled={isLoading}
                      whileHover={!isLoading ? { y: -2, scale: 1.01 } : {}}
                      whileTap={!isLoading ? { scale: 0.98 } : {}}
                      className="relative w-full py-4 rounded-2xl text-sm font-bold tracking-widest uppercase overflow-hidden transition-shadow disabled:opacity-70 disabled:cursor-not-allowed"
                      style={{
                        background: 'var(--accent-gradient)',
                        color: 'black',
                        boxShadow: '0 8px 30px rgba(29, 185, 84, 0.25)',
                      }}
                    >
                      {/* Shimmer effect */}
                      <div className="accent-shimmer absolute inset-0 pointer-events-none" />
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {isLoading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            <span>{isSignup ? 'Creating account...' : 'Signing in...'}</span>
                          </>
                        ) : (
                          <span>{isSignup ? 'Create Account' : 'Sign In'}</span>
                        )}
                      </span>
                    </motion.button>
                  </motion.div>

                  {/* Footer text */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-center text-white/25 text-xs mt-6 font-medium"
                  >
                    {isSignup
                      ? 'By signing up, you agree to our Terms of Service.'
                      : "Don't have an account? "}
                    {!isSignup && (
                      <button
                        type="button"
                        onClick={() => setMode('signup')}
                        className="text-spotify-green hover:underline font-bold ml-1"
                      >
                        Sign up
                      </button>
                    )}
                  </motion.p>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
