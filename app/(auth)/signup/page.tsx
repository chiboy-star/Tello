'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Loader2 } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!email.trim() || !email.includes('@')) newErrors.email = 'Valid email is required';
    if (!password || password.length < 6) newErrors.password = 'Password must be at least 6 characters';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      let utmData = null;
      try {
        const stored = localStorage.getItem('tallo_utm');
        if (stored) utmData = JSON.parse(stored);
      } catch {
        // ignore json parse error
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            utm: utmData,
          },
        },
      });

      if (error) {
        setApiError(error.message);
        setLoading(false);
        return;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('tallo.returning', 'true');
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign('/onboarding');
      }
    } catch {
      setApiError('An unexpected error occurred during signup.');
      setLoading(false);
    }
  };

  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 py-12">
      <div className="w-full max-w-[400px] space-y-6 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-sm">
        <div className="text-center space-y-2 flex flex-col items-center">
          <BrandLogo size="lg" />
          <h2 className="font-display text-xl font-bold tracking-tight text-[var(--text)] pt-2">
            Create your shop account
          </h2>
          <p className="text-xs text-[var(--text-muted)]">Fast, free, and lightweight shop management</p>
        </div>

        {apiError && (
          <div
            role="alert"
            className="rounded-[var(--r-sm)] bg-[var(--danger-soft)] p-3 text-xs text-[var(--danger)] border border-[var(--danger)]/30 font-medium"
          >
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1">Full Name</label>
            <Input
              type="text"
              name="name"
              autoComplete="name"
              placeholder="e.g. Chukwuma Obi"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-10 text-xs bg-[var(--surface)]"
              required
            />
            {errors.fullName && <p className="mt-1 text-xs text-[var(--danger)]">{errors.fullName}</p>}
          </div>

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
            {errors.email && <p className="mt-1 text-xs text-[var(--danger)]">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text)] mb-1">Password</label>
            <PasswordInput
              name="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 text-xs bg-[var(--surface)]"
              required
            />
            {errors.password && <p className="mt-1 text-xs text-[var(--danger)]">{errors.password}</p>}
          </div>

          <Button type="submit" disabled={loading} className="w-full font-semibold text-xs h-10 shadow-sm">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Account & Continue
          </Button>
        </form>

        <p className="text-center text-xs text-[var(--text-muted)]">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-[var(--brand)] hover:underline hit-slop">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
