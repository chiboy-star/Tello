'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { Download, Trash2, LogOut, Loader2, Check, Sun, Moon, Monitor, Store, Palette, Database, ShieldAlert, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { clearPersistedQueryCache } from '@/lib/query/cache-persister';
import { useSettings } from '@/lib/query/hooks';
import { useInstall } from '@/components/install-provider';

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { data: settingsData, isLoading } = useSettings();
  const { canInstall, install } = useInstall();
  const [fullName, setFullName] = useState('');
  const [shopName, setShopName] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [timezone, setTimezone] = useState('Africa/Lagos');
  
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (settingsData?.profile) {
      setFullName(settingsData.profile.full_name || '');
      setShopName(settingsData.profile.shop_name || '');
      setCurrency(settingsData.profile.currency || 'NGN');
      setTimezone(settingsData.profile.timezone || 'Africa/Lagos');
    }
  }, [settingsData]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          shopName,
          currency,
          timezone,
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        await queryClient.invalidateQueries({ queryKey: ['settings'] });
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await clearPersistedQueryCache();
    queryClient.clear();
    const supabase = createClient();
    await supabase.auth.signOut();
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/login');
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/account', { method: 'DELETE' });
      if (res.ok) {
        await clearPersistedQueryCache();
        queryClient.clear();
        router.push('/');
      }
    } catch (err) {
      console.error('Delete account failed:', err);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (isLoading && !settingsData) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="space-y-2">
          <div className="h-7 w-40 skeleton rounded-[var(--r-sm)]"></div>
          <div className="h-4 w-64 skeleton rounded-[var(--r-sm)]"></div>
        </div>
        <div className="h-64 skeleton rounded-[var(--r-md)]"></div>
        <div className="h-32 skeleton rounded-[var(--r-md)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl pb-12">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
          Settings
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Manage your profile, shop configuration, theme preference, and data exports
        </p>
      </div>

      {/* Profile & Shop Form */}
      <form onSubmit={handleSaveSettings} className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
          <Store className="w-4 h-4 text-[var(--brand)]" />
          <h2 className="font-display text-sm font-semibold text-[var(--text)]">Shop & Owner Profile</h2>
        </div>
        
        <div>
          <label className="text-xs font-semibold text-[var(--text)]">Owner Full Name</label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="mt-1 h-9 text-xs"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-[var(--text)]">Shop Name</label>
          <Input
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder="e.g. Obinna Provisions"
            className="mt-1 h-9 text-xs"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-[var(--text)]">Currency Code</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 w-full rounded-[var(--r-sm)] border border-[var(--border)] p-2 text-xs bg-[var(--surface)] text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            >
              <option value="NGN">NGN (Nigerian Naira - ₦)</option>
              <option value="GHS">GHS (Ghanaian Cedi - ₵)</option>
              <option value="KES">KES (Kenyan Shilling - KSh)</option>
              <option value="USD">USD (US Dollar - $)</option>
              <option value="EUR">EUR (Euro - €)</option>
              <option value="GBP">GBP (British Pound - £)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text)]">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="mt-1 w-full rounded-[var(--r-sm)] border border-[var(--border)] p-2 text-xs bg-[var(--surface)] text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            >
              <option value="Africa/Lagos">Africa/Lagos (WAT, UTC+1)</option>
              <option value="Africa/Accra">Africa/Accra (GMT, UTC+0)</option>
              <option value="Africa/Nairobi">Africa/Nairobi (EAT, UTC+3)</option>
              <option value="Africa/Johannesburg">Africa/Johannesburg (SAST, UTC+2)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={saving || isLoading} className="gap-2 text-xs font-semibold h-9">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Settings
          </Button>
          {savedSuccess && (
            <span className="flex items-center gap-1 text-xs text-[var(--brand)] font-medium">
              <Check className="h-4 w-4" /> Settings updated successfully
            </span>
          )}
        </div>
      </form>

      {/* Appearance / Theme */}
      <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
          <Palette className="w-4 h-4 text-[var(--brand)]" />
          <h2 className="font-display text-sm font-semibold text-[var(--text)]">Appearance</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Choose how Tallo looks on your device. The system setting matches your phone or browser preference.
        </p>

        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`flex flex-col items-center justify-center p-3 rounded-[var(--r-sm)] border text-xs font-medium transition-all hit-slop ${
              theme === 'light'
                ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)] font-bold'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <Sun className="w-4 h-4 mb-1" />
            Light
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`flex flex-col items-center justify-center p-3 rounded-[var(--r-sm)] border text-xs font-medium transition-all hit-slop ${
              theme === 'dark'
                ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)] font-bold'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <Moon className="w-4 h-4 mb-1" />
            Dark
          </button>

          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`flex flex-col items-center justify-center p-3 rounded-[var(--r-sm)] border text-xs font-medium transition-all hit-slop ${
              theme === 'system'
                ? 'border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)] font-bold'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <Monitor className="w-4 h-4 mb-1" />
            System
          </button>
        </div>
      </div>

      {/* Install Application */}
      {canInstall && (
        <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
            <Download className="w-4 h-4 text-[var(--brand)]" />
            <h2 className="font-display text-sm font-semibold text-[var(--text)]">Install Application</h2>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Install Tallo to your home screen or desktop for fast zero-latency access and complete offline recording.
          </p>
          <Button
            onClick={install}
            className="gap-2 text-xs font-semibold h-9 bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-hover)]"
          >
            <Download className="h-4 w-4" /> Install Tallo App
          </Button>
        </div>
      )}

      {/* CSV Export */}
      <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
          <Database className="w-4 h-4 text-[var(--brand)]" />
          <h2 className="font-display text-sm font-semibold text-[var(--text)]">Export Data</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Download a complete CSV backup of all your recorded sales, restocks, adjustments, and debt ledger payments.
        </p>
        <a href="/api/export/entries.csv" download className="inline-block">
          <Button variant="outline" className="gap-2 text-xs font-semibold h-9">
            <Download className="h-4 w-4" /> Export Ledger CSV
          </Button>
        </a>
      </div>

      {/* Legal & Policies */}
      <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
          <Shield className="w-4 h-4 text-[var(--brand)]" />
          <h2 className="font-display text-sm font-semibold text-[var(--text)]">Legal & Policies</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Tallo is committed to data privacy and shop owner data ownership.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
          <Link
            href="/privacy"
            className="flex items-center justify-between p-3 rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--surface-2)]/40 hover:bg-[var(--surface-2)] transition-colors hit-slop"
          >
            <div>
              <span className="font-semibold text-[var(--text)]">Privacy Policy</span>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Last updated: November 21, 2026</p>
            </div>
          </Link>
          <Link
            href="/terms"
            className="flex items-center justify-between p-3 rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--surface-2)]/40 hover:bg-[var(--surface-2)] transition-colors hit-slop"
          >
            <div>
              <span className="font-semibold text-[var(--text)]">Terms of Service</span>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Last updated: November 21, 2026</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-[var(--r-md)] border border-[var(--danger)]/30 bg-[var(--surface)] p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]">
          <ShieldAlert className="w-4 h-4 text-[var(--danger)]" />
          <h2 className="font-display text-sm font-semibold text-[var(--danger)]">Account & Data Removal</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Sign out of this session or permanently delete your account and all associated shop data.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={handleSignOut} className="gap-2 text-xs font-semibold h-9">
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>

          <Button
            variant="destructive"
            onClick={() => setShowDeleteModal(true)}
            className="gap-2 text-xs font-semibold h-9"
          >
            <Trash2 className="h-4 w-4" /> Delete Account & Data
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="Permanently Delete Account?"
        description="This action cannot be undone. All your inventory, sales entries, customer debt records, and settings will be permanently erased."
        confirmLabel={deleting ? 'Deleting…' : 'Yes, Delete Everything'}
        isDestructive={true}
        isLoading={deleting}
      />
    </div>
  );
}
