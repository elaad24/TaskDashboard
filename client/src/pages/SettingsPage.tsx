import { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Cpu, Database, Lock, MessageCircle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { PageScroll } from '@/components/layout/PageScroll';
import { GlassCard } from '@/components/ui/GlassCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/Skeleton';
import { GlowButton } from '@/components/ui/GlowButton';
import { useSettings, useSettingsStatus, useUpdateSettings } from '@/hooks/useSettings';
import { apiSettings } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { ApiImportSection } from '@/components/settings/ApiImportSection';
import { IntegrationsSection } from '@/components/settings/IntegrationsSection';
import { TrackedTagsSection } from '@/components/settings/TrackedTagsSection';
import { SidebarFeedSection } from '@/components/settings/SidebarFeedSection';
import { StartHereSection } from '@/components/settings/StartHereSection';

export const SettingsPage = () => {
  const { data, isLoading } = useSettings();
  const status = useSettingsStatus();
  const updateSettings = useUpdateSettings();
  const toast = useToast();

  const [aiProvider, setAiProvider] = useState<'openai' | 'ollama'>('openai');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o-mini');
  const [ollamaModel, setOllamaModel] = useState('llama3.1');
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramTimezone, setTelegramTimezone] = useState('UTC');
  const [quietStart, setQuietStart] = useState('23:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [pairing, setPairing] = useState(false);

  useEffect(() => {
    if (!data) return;
    setAiProvider(data.ai.provider);
    setOpenaiModel(data.ai.openaiModel);
    setOllamaModel(data.ai.ollamaModel);
    setOllamaBaseUrl(data.ai.ollamaBaseUrl);
    setTelegramEnabled(data.telegram.enabled);
    setTelegramTimezone(data.telegram.timezone);
    setQuietStart(data.telegram.quietHoursStart);
    setQuietEnd(data.telegram.quietHoursEnd);
  }, [data]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings.mutateAsync({
        aiProvider,
        openaiModel,
        ollamaModel,
        ollamaBaseUrl,
        telegramEnabled,
        telegramBotToken: telegramBotToken.trim() || undefined,
        telegramTimezone,
        telegramQuietHoursStart: quietStart,
        telegramQuietHoursEnd: quietEnd,
      });
      setTelegramBotToken('');
      toast.showSuccess('Settings saved');
    } catch (error) {
      toast.showError('Failed to save settings', error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const handleTestAi = async () => {
    setTestingAi(true);
    try {
      const result = await apiSettings.testAi({
        provider: aiProvider,
        openaiModel,
        ollamaModel,
        ollamaBaseUrl,
      });
      if (result.ok) {
        toast.showSuccess('AI connection ok', `${result.provider} · ${result.model} · ${Math.round(result.latencyMs)}ms`);
      } else {
        toast.showError('AI test failed', result.error);
      }
    } catch (error) {
      toast.showError('AI test failed', error instanceof Error ? error.message : undefined);
    } finally {
      setTestingAi(false);
    }
  };

  const handlePairTelegram = async () => {
    setPairing(true);
    try {
      const result = await apiSettings.pairTelegram();
      setPairCode(result.pairingCode);
      setBotUsername(result.botUsername);
      toast.showSuccess('Pairing code generated');
    } catch (error) {
      toast.showError('Pairing failed', error instanceof Error ? error.message : undefined);
    } finally {
      setPairing(false);
    }
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    try {
      await apiSettings.testTelegram();
      toast.showSuccess('Telegram test sent');
    } catch (error) {
      toast.showError('Telegram test failed', error instanceof Error ? error.message : undefined);
    } finally {
      setTestingTelegram(false);
    }
  };

  return (
    <PageScroll>
      <PageHeader
        title="Settings"
        description="Local-first runtime config for AI providers and Telegram reminders."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <StartHereSection />

        <GlassCard className="p-5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
            <Cpu size={12} /> AI Provider
          </div>
          {isLoading ? (
            <Skeleton className="mt-3 h-40 w-full" />
          ) : (
            <div className="mt-3 space-y-3 text-sm">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAiProvider('openai')}
                  className={`rounded-md border px-3 py-1 text-xs ${aiProvider === 'openai' ? 'border-border-accent-strong bg-cyan/10 text-cyan-200' : 'border-border-subtle text-text-soft'}`}
                >
                  OpenAI
                </button>
                <button
                  type="button"
                  onClick={() => setAiProvider('ollama')}
                  className={`rounded-md border px-3 py-1 text-xs ${aiProvider === 'ollama' ? 'border-border-accent-strong bg-cyan/10 text-cyan-200' : 'border-border-subtle text-text-soft'}`}
                >
                  Ollama
                </button>
              </div>
              <label className="block">
                <span className="text-xs text-text-muted">OpenAI model</span>
                <input
                  value={openaiModel}
                  onChange={(event) => setOpenaiModel(event.target.value)}
                  className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
                />
              </label>
              <label className="block">
                <span className="text-xs text-text-muted">Ollama model</span>
                <input
                  value={ollamaModel}
                  onChange={(event) => setOllamaModel(event.target.value)}
                  className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
                />
              </label>
              <label className="block">
                <span className="text-xs text-text-muted">Ollama base URL</span>
                <input
                  value={ollamaBaseUrl}
                  onChange={(event) => setOllamaBaseUrl(event.target.value)}
                  className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
                />
              </label>
              <div className="flex items-center justify-between">
                <span className="text-text-soft">Runtime provider</span>
                <span className="font-mono text-text-main">{status.data?.ai.provider ?? '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-soft">Connection status</span>
                {status.data?.openai.configured ? (
                  <StatusBadge tone="neon" dot>
                    Configured
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="danger" dot>
                    Missing
                  </StatusBadge>
                )}
              </div>
              <GlowButton onClick={handleTestAi} loading={testingAi} size="sm">
                Test connection
              </GlowButton>
              <p className="mt-3 rounded-md border border-border-subtle bg-white/[0.02] p-3 text-xs text-text-soft">
                <Lock size={11} className="mr-1.5 inline align-[-1px] text-cyan" />
                Set <code className="font-mono text-cyan-200">OPENAI_API_KEY</code> in
                <code className="font-mono text-cyan-200"> server/.env</code> and restart the server
                to change this. The key is never sent to the browser.
              </p>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
            <MessageCircle size={12} /> Telegram
          </div>
          <div className="mt-3 space-y-3 text-sm">
            <label className="inline-flex items-center gap-2 text-text-main">
              <input
                type="checkbox"
                checked={telegramEnabled}
                onChange={(event) => setTelegramEnabled(event.target.checked)}
                className="accent-cyan"
              />
              Enable Telegram reminders
            </label>
            <label className="block">
              <span className="text-xs text-text-muted">Bot token</span>
              <input
                value={telegramBotToken}
                onChange={(event) => setTelegramBotToken(event.target.value)}
                placeholder={data?.telegram.hasBotToken ? 'Token already saved (leave blank to keep)' : '12345:ABC...'}
                className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs text-text-muted">Quiet hours start</span>
                <input
                  type="time"
                  value={quietStart}
                  onChange={(event) => setQuietStart(event.target.value)}
                  className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
                />
              </label>
              <label className="block">
                <span className="text-xs text-text-muted">Quiet hours end</span>
                <input
                  type="time"
                  value={quietEnd}
                  onChange={(event) => setQuietEnd(event.target.value)}
                  className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-xs text-text-muted">Timezone</span>
              <input
                value={telegramTimezone}
                onChange={(event) => setTelegramTimezone(event.target.value)}
                className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <GlowButton size="sm" onClick={handlePairTelegram} loading={pairing}>
                Pair device
              </GlowButton>
              <GlowButton size="sm" variant="ghost" onClick={handleTestTelegram} loading={testingTelegram}>
                Send test message
              </GlowButton>
            </div>
            {pairCode && (
              <p className="rounded-md border border-border-subtle bg-white/[0.02] p-3 text-xs text-text-soft">
                Pairing code: <code className="font-mono text-cyan-200">{pairCode}</code>
                {botUsername ? (
                  <>
                    {' '}
                    · send <code className="font-mono text-cyan-200">/start {pairCode}</code> to{' '}
                    <code className="font-mono text-cyan-200">@{botUsername}</code>.
                  </>
                ) : null}
              </p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-text-soft">Environment</span>
              <span className="font-mono text-text-main">{status.data?.env ?? '-'}</span>
            </div>
          </div>
        </GlassCard>

        <ApiImportSection />

        <IntegrationsSection />

        <TrackedTagsSection />

        <SidebarFeedSection />

        <GlassCard className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
            <SettingsIcon size={12} /> About
          </div>
          <p className="mt-3 max-w-3xl text-sm text-text-soft">
            Command Center is a local-first AI command dashboard for goals, tasks, study, problems,
            and personal operations. Open the app -&gt; know what matters now.
          </p>
          <div className="mt-4 flex items-center justify-between rounded-md border border-border-subtle bg-white/[0.02] p-3">
            <div className="text-xs text-text-soft">
              Save to persist provider and Telegram runtime settings.
            </div>
            <GlowButton onClick={handleSaveSettings} loading={saving || updateSettings.isPending}>
              Save settings
            </GlowButton>
          </div>
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
            <Database size={12} /> Storage
          </div>
          <p className="mt-3 rounded-md border border-border-subtle bg-white/[0.02] p-3 text-xs text-text-soft">
            To wipe and reseed the database, run{' '}
            <code className="font-mono text-cyan-200">npm run db:reset</code> at the repo root.
          </p>
        </GlassCard>
      </div>
    </PageScroll>
  );
};
