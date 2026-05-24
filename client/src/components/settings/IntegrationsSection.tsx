import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ChevronRight, Calendar, Mail, RefreshCw, Unplug } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { useGoogleIntegration, useGoogleIntegrationActions } from '@/hooks/useIntegrations';
import { cn } from '@/lib/cn';

const formatWhen = (value: string | null | undefined): string => {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
};

export const IntegrationsSection = () => {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const status = useGoogleIntegration();
  const actions = useGoogleIntegrationActions();

  const [gmailPollMinutes, setGmailPollMinutes] = useState('5');
  const [calendarPollMinutes, setCalendarPollMinutes] = useState('30');
  const [calendarDailyWriteCap, setCalendarDailyWriteCap] = useState('20');
  const [emailHashtag, setEmailHashtag] = useState('#for_the_bot');

  useEffect(() => {
    if (!status.data) return;
    setGmailPollMinutes(String(status.data.gmailPollMinutes));
    setCalendarPollMinutes(String(status.data.calendarPollMinutes));
    setCalendarDailyWriteCap(String(status.data.calendarDailyWriteCap));
    setEmailHashtag(status.data.emailHashtag);
  }, [status.data]);

  useEffect(() => {
    const google = searchParams.get('google');
    if (google === 'connected') {
      toast.showSuccess('Google connected');
      searchParams.delete('google');
      setSearchParams(searchParams, { replace: true });
    } else if (google === 'error') {
      toast.showError('Google connection failed', searchParams.get('reason') ?? undefined);
      searchParams.delete('google');
      searchParams.delete('reason');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, toast]);

  const handleSaveSettings = async () => {
    try {
      await actions.updateSettings.mutateAsync({
        emailHashtag,
        gmailPollMinutes: Number(gmailPollMinutes),
        calendarPollMinutes: Number(calendarPollMinutes),
        calendarDailyWriteCap: Number(calendarDailyWriteCap),
      });
      toast.showSuccess('Integration settings saved');
    } catch (error) {
      toast.showError('Failed to save', error instanceof Error ? error.message : undefined);
    }
  };

  const handleScan = async () => {
    try {
      const result = await actions.scan.mutateAsync();
      toast.showSuccess(
        'Scan complete',
        `Gmail ${result.gmailProcessed} · Calendar ${result.calendarProcessed} · ${result.capturesCreated} capture(s)`,
      );
    } catch (error) {
      toast.showError('Scan failed', error instanceof Error ? error.message : undefined);
    }
  };

  return (
    <GlassCard className="p-5 lg:col-span-2">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        data-test-id="integrations-section-toggle"
      >
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <Mail size={12} /> Gmail + Calendar
        </div>
        {status.data?.connected ? (
          <StatusBadge tone="neon" dot>
            Connected
          </StatusBadge>
        ) : (
          <StatusBadge tone="muted">Not connected</StatusBadge>
        )}
      </button>

      {open && (
        <div className="mt-4 space-y-4 text-sm">
          {status.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              <p className="rounded-md border border-border-subtle bg-white/[0.02] p-3 text-xs text-text-soft">
                Only emails containing your hashtag (default <code className="font-mono text-cyan-200">#for_the_bot</code>)
                are sent to the AI. Calendar events you create from this app are tagged{' '}
                <code className="font-mono text-cyan-200">#cc_created</code> and ignored on scan.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {status.data?.connected ? (
                  <>
                    <StatusBadge tone="cyan">
                      {status.data.email ?? 'Google account'}
                    </StatusBadge>
                    <GlowButton
                      size="sm"
                      variant="ghost"
                      leftIcon={<Unplug size={14} />}
                      onClick={() => actions.disconnect.mutate()}
                      loading={actions.disconnect.isPending}
                      data-test-id="google-disconnect"
                    >
                      Disconnect
                    </GlowButton>
                  </>
                ) : (
                  <GlowButton
                    size="sm"
                    onClick={() => actions.connect.mutate()}
                    loading={actions.connect.isPending}
                    data-test-id="google-connect"
                  >
                    Connect Google
                  </GlowButton>
                )}
                <GlowButton
                  size="sm"
                  variant="subtle"
                  leftIcon={<RefreshCw size={14} />}
                  onClick={handleScan}
                  loading={actions.scan.isPending}
                  disabled={!status.data?.connected}
                  data-test-id="google-scan-now"
                >
                  Scan now
                </GlowButton>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border-subtle bg-white/[0.02] p-3 text-xs">
                  <div className="flex items-center gap-1.5 text-text-soft">
                    <Mail size={12} className="text-cyan" /> Gmail last sync
                  </div>
                  <div className="mt-1 font-mono text-text-main">
                    {formatWhen(status.data?.gmailLastSyncAt)}
                  </div>
                </div>
                <div className="rounded-md border border-border-subtle bg-white/[0.02] p-3 text-xs">
                  <div className="flex items-center gap-1.5 text-text-soft">
                    <Calendar size={12} className="text-cyan" /> Calendar last sync
                  </div>
                  <div className="mt-1 font-mono text-text-main">
                    {formatWhen(status.data?.calendarLastSyncAt)}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block">
                  <span className="text-xs text-text-muted">Email hashtag</span>
                  <input
                    value={emailHashtag}
                    onChange={(event) => setEmailHashtag(event.target.value)}
                    className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
                    data-test-id="integration-email-hashtag"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-text-muted">Gmail poll (minutes)</span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={gmailPollMinutes}
                    onChange={(event) => setGmailPollMinutes(event.target.value)}
                    className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-text-muted">Calendar poll (minutes)</span>
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={calendarPollMinutes}
                    onChange={(event) => setCalendarPollMinutes(event.target.value)}
                    className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-text-muted">Daily calendar write cap</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={calendarDailyWriteCap}
                    onChange={(event) => setCalendarDailyWriteCap(event.target.value)}
                    className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-text-soft">
                  Calendar writes today:{' '}
                  <span className="font-mono text-text-main">
                    {status.data?.calendarWritesToday ?? 0}/{status.data?.calendarDailyWriteCap ?? 20}
                  </span>
                  {' · '}
                  Pending captures:{' '}
                  <span className="font-mono text-text-main">{status.data?.pendingCapturesCount ?? 0}</span>
                </p>
                <GlowButton
                  size="sm"
                  onClick={handleSaveSettings}
                  loading={actions.updateSettings.isPending}
                  data-test-id="integration-settings-save"
                >
                  Save integration settings
                </GlowButton>
              </div>

              <p className={cn('text-xs text-text-muted')}>
                Set <code className="font-mono text-cyan-200">GOOGLE_OAUTH_CLIENT_ID</code> and{' '}
                <code className="font-mono text-cyan-200">GOOGLE_OAUTH_CLIENT_SECRET</code> in server/.env, then restart.
              </p>
            </>
          )}
        </div>
      )}
    </GlassCard>
  );
};
