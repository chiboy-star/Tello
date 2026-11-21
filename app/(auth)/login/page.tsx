'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { validateNextUrl } from '@/lib/url/validate-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('tallo.returning', 'true');
        const searchParams = new URLSearchParams(window.location.search);
        const target = validateNextUrl(searchParams.get('next'), '/home');
        // Full navigation ensures cookies and router cache are completely fresh
        window.location.assign(target);
      }
    } catch {
      setErrorMsg('An unexpected error occurred during login.');
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter your email above to receive a reset link.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/settings`,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setResetSent(true);
        setErrorMsg(null);
      }
    } catch {
      setErrorMsg('Failed to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 py-12">
      <div className="w-full max-w-[400px] space-y-6 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-sm">
        <div className="text-center space-y-2 flex flex-col items-center">
          <BrandLogo size="lg" />
          <h2 className="font-display text-xl font-bold tracking-tight text-[var(--text)] pt-2">
            Welcome back
          </h2>
          <p className="text-xs text-[var(--text-muted)]">Sign in to your shop ledger</p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-[var(--r-sm)] bg-[var(--danger-soft)] p-3 text-xs text-[var(--danger)] border border-[var(--danger)]/30 font-medium"
          >
            {errorMsg}
          </div>
        )}

        {resetSent && (
          <div
            role="status"
            className="rounded-[var(--r-sm)] bg-[var(--brand-soft)] p-3 text-xs text-[var(--brand)] border border-[var(--brand)]/30 font-medium"
          >
            Password reset instructions have been sent to your email.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1">Email Address</label>
            <Input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="shop@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 text-xs bg-[var(--surface)]"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[var(--text)]">Password</label>
              <button
                type="button"
                onClick={handleResetPassword}
                className="text-xs text-[var(--brand)] hover:underline hit-slop"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 text-xs bg-[var(--surface)] pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-3 text-[var(--text-muted)] hover:text-[var(--text)] hit-slop"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full font-semibold text-xs h-10 shadow-sm">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sign In
          </Button>
        </form>

        <p className="text-center text-xs text-[var(--text-muted)]">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-[var(--brand)] hover:underline hit-slop">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}
