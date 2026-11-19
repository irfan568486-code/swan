import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Phone, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';

function normalizePhoneInput(raw: string): string {
  return raw.replace(/[\s\-()]+/g, '').trim();
}

function isValidMobileNumber(phone: string): boolean {
  return /^\+?[0-9]{7,15}$/.test(normalizePhoneInput(phone));
}

export function LoginPage() {
  const { loginWithCredentials } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const normalized = normalizePhoneInput(phone);
    if (!isValidMobileNumber(normalized)) {
      setError('Please enter a valid mobile number (7–15 digits, e.g. +919876543210).');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setSubmitting(true);
    try {
      await loginWithCredentials(normalized, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid mobile number or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md bg-[#141824] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6"
      >
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold text-white tracking-tight">Sign in to SwarnaPlay</h1>
          <p className="text-sm text-slate-400">
            Enter your mobile number and password to access your virtual coin wallet and games.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="login-phone" className="block text-xs font-medium text-slate-300">
              Mobile Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl bg-[#0E1119] border border-white/10 font-mono-num text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="login-password" className="block text-xs font-medium text-slate-300">
                Password
              </label>
              <Link to="/forgot-password" className="text-xs text-amber-400 hover:text-amber-300">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full min-h-[44px] pl-10 pr-11 py-2.5 rounded-xl bg-[#0E1119] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[46px] py-2.5 px-4 rounded-xl gold-button-surface font-semibold text-sm transition-transform active:scale-[0.99] cursor-pointer disabled:opacity-60"
          >
            {submitting ? 'Signing In...' : 'Sign In with Mobile'}
          </button>
        </form>

        <div className="pt-2 border-t border-white/8 flex items-center justify-between text-xs text-slate-400">
          <span>New to SwarnaPlay?</span>
          <Link to="/register" className="font-semibold text-amber-400 hover:text-amber-300">
            Create Account
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export function RegisterPage() {
  const { registerAccount } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanName = username.trim();
    const cleanPhone = normalizePhoneInput(phone);

    if (cleanName.length < 2) {
      setError('Username must be at least 2 characters.');
      return;
    }
    if (!isValidMobileNumber(cleanPhone)) {
      setError('Enter a valid mobile number (7–15 digits, e.g. +919876543210).');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await registerAccount({
        username: cleanName,
        phone: cleanPhone,
        password,
      });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[82vh] flex items-center justify-center py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md bg-[#141824] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5"
      >
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold text-white tracking-tight">Create Player Account</h1>
          <p className="text-sm text-slate-400">
            Register with your mobile number to receive 1,000 virtual welcome coins.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label htmlFor="reg-username" className="block text-xs font-medium text-slate-300">
              Username
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="reg-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="RoyalPlayer"
                className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-[#0E1119] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="reg-phone" className="block text-xs font-medium text-slate-300">
              Mobile Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="reg-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl bg-[#0E1119] border border-white/10 font-mono-num text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="reg-password" className="block text-xs font-medium text-slate-300">
              Password (min 6 characters)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create strong password"
                className="w-full min-h-[44px] pl-10 pr-11 py-2 rounded-xl bg-[#0E1119] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="reg-confirm" className="block text-xs font-medium text-slate-300">
              Confirm Password
            </label>
            <input
              id="reg-confirm"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-[#0E1119] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[46px] py-2.5 px-4 rounded-xl gold-button-surface font-semibold text-sm transition-transform active:scale-[0.99] cursor-pointer disabled:opacity-60"
          >
            {submitting ? 'Creating Account...' : 'Register & Claim 1,000 Coins'}
          </button>
        </form>

        <div className="pt-2 border-t border-white/8 flex items-center justify-between text-xs text-slate-400">
          <span>Already have an account?</span>
          <Link to="/login" className="font-semibold text-amber-400 hover:text-amber-300">
            Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const { requestPasswordReset, completeLocalPasswordReset } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'request' | 'verify' | 'done'>('request');
  const [demoCodeHint, setDemoCodeHint] = useState<string | undefined>();
  const [statusMessage, setStatusMessage] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidMobileNumber(phone)) {
      setError('Enter a valid registered mobile number (7–15 digits).');
      return;
    }
    setSubmitting(true);
    try {
      const res = await requestPasswordReset(phone);
      setStatusMessage(res.message);
      setDemoCodeHint(res.demoCode);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start password reset.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await completeLocalPasswordReset(phone, code, newPassword);
      setStatusMessage('Password updated successfully.');
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-md bg-[#141824] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold text-white tracking-tight">Reset Password</h1>
          <p className="text-sm text-slate-400">
            Recover access to your SwarnaPlay account using your registered mobile number.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300">
            {error}
          </div>
        )}

        {step === 'request' && (
          <form onSubmit={handleRequest} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="reset-phone" className="block text-xs font-medium text-slate-300">
                Registered Mobile Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="reset-phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl bg-[#0E1119] border border-white/10 font-mono-num text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[46px] py-2.5 px-4 rounded-xl gold-button-surface font-semibold text-sm cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Sending Verification...' : 'Send Reset Code'}
            </button>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1">
              <p>{statusMessage}</p>
              {demoCodeHint && (
                <p className="font-mono-num font-semibold">
                  Demo verification code: {demoCodeHint}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="reset-code" className="block text-xs font-medium text-slate-300">
                6-Digit Verification Code
              </label>
              <input
                id="reset-code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#0E1119] border border-white/10 text-sm text-white font-mono-num focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="reset-new-pwd" className="block text-xs font-medium text-slate-300">
                New Password
              </label>
              <div className="relative">
                <input
                  id="reset-new-pwd"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (6+ chars)"
                  className="w-full min-h-[44px] pl-4 pr-11 py-2.5 rounded-xl bg-[#0E1119] border border-white/10 text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[46px] py-2.5 px-4 rounded-xl gold-button-surface font-semibold text-sm cursor-pointer disabled:opacity-60"
            >
              {submitting ? 'Updating...' : 'Confirm Password Reset'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-300">
              {statusMessage}
            </div>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="w-full min-h-[46px] py-2.5 px-4 rounded-xl gold-button-surface font-semibold text-sm cursor-pointer"
            >
              Return to Sign In
            </button>
          </div>
        )}

        <div className="pt-2 border-t border-white/8 text-center text-xs text-slate-400">
          <Link to="/login" className="text-amber-400 hover:text-amber-300">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
