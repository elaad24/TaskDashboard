import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Upload, Check, Webhook } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { apiIngest } from '@/lib/api';
import { cn } from '@/lib/cn';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? window.location.origin;

const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const ApiImportSection = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(true);
  const [exampleOpen, setExampleOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(true);
  const [jsonText, setJsonText] = useState('');
  const [dryRun, setDryRun] = useState(false);

  const spec = useQuery({
    queryKey: ['ingest', 'spec'],
    queryFn: () => apiIngest.spec(),
    enabled: open,
  });

  const importMutation = useMutation({
    mutationFn: (body: unknown) => apiIngest.import(body),
    onSuccess: (result) => {
      if (result.errors.length > 0) {
        toast.showError(
          result.dryRun ? 'Validation had errors' : 'Import completed with errors',
          result.errors.map((e) => `${e.collection}[${e.index}]: ${e.message}`).join('\n'),
        );
        return;
      }
      const created =
        result.createdTaskIds.length +
        result.createdGoalIds.length +
        result.createdProblemIds.length +
        result.createdLogIds.length +
        result.createdStudyTopicIds.length +
        result.createdResourceIds.length;
      toast.showSuccess(
        result.dryRun ? 'Validation ok' : 'Import successful',
        result.dryRun
          ? result.warnings.join(' · ') || 'Payload is valid.'
          : `${created} item(s) created.`,
      );
      if (!result.dryRun && created > 0) {
        void queryClient.invalidateQueries();
        setJsonText('');
      }
    },
    onError: (error) => {
      toast.showError('Import failed', error instanceof Error ? error.message : undefined);
    },
  });

  const handleCopy = async (label: string, text: string) => {
    const ok = await copyText(text);
    toast.showSuccess(ok ? `${label} copied` : `Copy failed — select text manually`);
  };

  const handleImport = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      toast.showError('Invalid JSON', 'Fix syntax before importing.');
      return;
    }
    const payload =
      typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? { ...(parsed as Record<string, unknown>), dryRun }
        : { dryRun };
    importMutation.mutate(payload);
  };

  const exampleJson = spec.data
    ? JSON.stringify(spec.data.exampleRequest, null, 2)
    : '';

  const postmanBlock = spec.data
    ? `POST ${BASE_URL}${spec.data.path}
Content-Type: ${spec.data.contentType}

${exampleJson}`
    : '';

  return (
    <GlassCard className="p-5 lg:col-span-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
        data-test-id="settings-api-import-toggle"
      >
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
          <Webhook size={12} /> API import (AI + Postman)
        </div>
        {open ? (
          <ChevronDown size={16} className="text-text-soft" />
        ) : (
          <ChevronRight size={16} className="text-text-soft" />
        )}
      </button>

      <p className="mt-2 text-sm text-text-soft">
        Bulk-add tasks, goals, logs, and more. Copy the AI prompt into ChatGPT, paste the JSON
        response into Postman — or import directly below without leaving the app.
      </p>

      {open && (
        <div className="mt-4 space-y-4">
          {spec.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : spec.isError ? (
            <p className="text-sm text-danger-400">Could not load API template.</p>
          ) : spec.data ? (
            <>
              <div className="rounded-md border border-border-subtle bg-white/[0.02] p-3 text-xs text-text-soft">
                <div className="font-mono text-cyan-200">
                  {spec.data.method} {BASE_URL}
                  {spec.data.path}
                </div>
                <div className="mt-2">
                  Areas:{' '}
                  {spec.data.areas.length === 0 ? (
                    'none yet — create Areas first or omit areaName'
                  ) : (
                    spec.data.areas.map((area) => area.name).join(', ')
                  )}
                </div>
              </div>

              <div className="rounded-md border border-border-subtle">
                <button
                  type="button"
                  onClick={() => setPromptOpen((value) => !value)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-text-main"
                  data-test-id="settings-api-prompt-toggle"
                >
                  <span>1. AI agent prompt (paste into ChatGPT)</span>
                  {promptOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {promptOpen && (
                  <div className="border-t border-border-subtle p-3">
                    <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-bg-deep/60 p-3 font-mono text-[11px] leading-relaxed text-text-soft">
                      {spec.data.aiAgentPrompt}
                    </pre>
                    <GlowButton
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      leftIcon={<Copy size={12} />}
                      onClick={() => void handleCopy('AI prompt', spec.data!.aiAgentPrompt)}
                      data-test-id="settings-api-copy-prompt"
                    >
                      Copy prompt
                    </GlowButton>
                  </div>
                )}
              </div>

              <div className="rounded-md border border-border-subtle">
                <button
                  type="button"
                  onClick={() => setExampleOpen((value) => !value)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-text-main"
                  data-test-id="settings-api-example-toggle"
                >
                  <span>2. Example JSON (Postman body)</span>
                  {exampleOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {exampleOpen && (
                  <div className="border-t border-border-subtle p-3">
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-bg-deep/60 p-3 font-mono text-[11px] text-cyan-100">
                      {exampleJson}
                    </pre>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <GlowButton
                        size="sm"
                        variant="ghost"
                        leftIcon={<Copy size={12} />}
                        onClick={() => void handleCopy('Example JSON', exampleJson)}
                      >
                        Copy JSON
                      </GlowButton>
                      <GlowButton
                        size="sm"
                        variant="subtle"
                        leftIcon={<Copy size={12} />}
                        onClick={() => void handleCopy('Postman block', postmanBlock)}
                      >
                        Copy for Postman
                      </GlowButton>
                    </div>
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-text-muted">
                      {spec.data.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="rounded-md border border-border-subtle">
                <button
                  type="button"
                  onClick={() => setQuickOpen((value) => !value)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-text-main"
                  data-test-id="settings-api-quick-toggle"
                >
                  <span>3. Quick import (no Postman)</span>
                  {quickOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {quickOpen && (
                  <div className="space-y-3 border-t border-border-subtle p-3">
                    <textarea
                      value={jsonText}
                      onChange={(event) => setJsonText(event.target.value)}
                      placeholder='Paste JSON from ChatGPT here, e.g. { "tasks": [{ "title": "...", "areaName": "..." }] }'
                      rows={8}
                      className="w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 font-mono text-xs text-text-main focus:border-border-accent focus:outline-none"
                      data-test-id="settings-api-import-json"
                    />
                    <label className="inline-flex items-center gap-2 text-xs text-text-soft">
                      <input
                        type="checkbox"
                        checked={dryRun}
                        onChange={(event) => setDryRun(event.target.checked)}
                        className="accent-cyan"
                      />
                      Validate only (dryRun — do not save)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <GlowButton
                        size="sm"
                        leftIcon={<Upload size={12} />}
                        loading={importMutation.isPending}
                        onClick={handleImport}
                        disabled={!jsonText.trim()}
                        data-test-id="settings-api-import-submit"
                      >
                        {dryRun ? 'Validate JSON' : 'Import JSON'}
                      </GlowButton>
                      <GlowButton
                        size="sm"
                        variant="ghost"
                        onClick={() => setJsonText(exampleJson)}
                      >
                        Load example
                      </GlowButton>
                    </div>
                    {importMutation.data && (
                      <div
                        className={cn(
                          'rounded-md border p-3 text-xs',
                          importMutation.data.errors.length > 0
                            ? 'border-danger/30 bg-danger/5 text-danger-300'
                            : 'border-neon/30 bg-neon/5 text-neon-100',
                        )}
                      >
                        <div className="flex items-center gap-1.5 font-medium">
                          <Check size={12} />
                          {importMutation.data.dryRun ? 'Last validation' : 'Last import'}
                        </div>
                        <div className="mt-1 text-text-soft">
                          tasks: {importMutation.data.createdTaskIds.length} · goals:{' '}
                          {importMutation.data.createdGoalIds.length} · logs:{' '}
                          {importMutation.data.createdLogIds.length}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}
    </GlassCard>
  );
};
