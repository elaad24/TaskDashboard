import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettingsStatus } from '@/hooks/useSettings';

const DISMISS_KEY = 'ai-status-banner-dismissed';

export const AiStatusBanner = () => {
  const { data, isLoading, isError } = useSettingsStatus();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1');

  const degraded = data?.aiHealth.degraded ?? false;
  const reason = data?.aiHealth.reason;
  const model = data?.openai.model ?? 'gemma3';

  useEffect(() => {
    if (!degraded) {
      sessionStorage.removeItem(DISMISS_KEY);
      setDismissed(false);
    }
  }, [degraded]);

  if (isLoading || isError || !degraded || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div
      className="flex shrink-0 items-start gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 md:px-8"
      role="status"
      data-test-id="ai-status-banner"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
      <div className="min-w-0 flex-1 text-sm text-text-main">
        <p className="font-medium text-amber-100">Using local AI (Ollama) as fallback</p>
        <p className="mt-0.5 text-text-soft">
          OpenAI is unavailable{reason ? `: ${reason}` : ''}. Navigator is using{' '}
          <span className="font-medium text-text-main">{model}</span> locally for now. It will
          switch back to OpenAI automatically when your key works again.{' '}
          <Link to="/settings" className="text-cyan underline-offset-2 hover:underline">
            Settings
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 rounded p-1 text-text-soft transition hover:bg-white/5 hover:text-text-main"
        aria-label="Dismiss AI status banner"
        data-test-id="ai-status-banner-dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
