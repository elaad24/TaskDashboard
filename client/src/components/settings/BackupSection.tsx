import { useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Download, Upload } from 'lucide-react';
import { backupPayloadSchema } from '@command-center/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { useToast } from '@/components/ui/Toast';
import { apiBackup } from '@/lib/api';
import { invalidateAfterBackupRestore } from '@/lib/queryClient';

export const BackupSection = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const importMutation = useMutation({
    mutationFn: (body: unknown) => {
      const parsed = backupPayloadSchema.safeParse(body);
      if (!parsed.success) {
        throw new Error(parsed.error.issues.map((issue) => issue.message).join('; '));
      }
      return apiBackup.import(parsed.data);
    },
    onSuccess: (result) => {
      if (result.errors.length > 0) {
        toast.showError('Restore failed', result.errors.slice(0, 5).join('\n'));
      } else {
        const total = Object.values(result.imported).reduce((sum, count) => sum + count, 0);
        toast.showSuccess('Backup restored', `${total} record(s) imported.`);
        invalidateAfterBackupRestore(queryClient);
      }
    },
    onError: (error) => {
      toast.showError('Restore failed', error instanceof Error ? error.message : undefined);
    },
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      await apiBackup.downloadExport();
      toast.showSuccess('Backup downloaded');
    } catch (error) {
      toast.showError('Export failed', error instanceof Error ? error.message : undefined);
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const validated = backupPayloadSchema.safeParse(parsed);
      if (!validated.success) {
        toast.showError(
          'Invalid backup file',
          validated.error.issues.slice(0, 3).map((issue) => issue.message).join('; '),
        );
        return;
      }
      importMutation.mutate(validated.data);
    } catch {
      toast.showError('Invalid backup file', 'Could not parse JSON.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <GlassCard className="p-5 lg:col-span-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
        data-test-id="settings-backup-toggle"
      >
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
          <Download size={12} /> Backup &amp; restore
        </div>
        {open ? (
          <ChevronDown size={16} className="text-text-soft" />
        ) : (
          <ChevronRight size={16} className="text-text-soft" />
        )}
      </button>

      <p className="mt-2 text-sm text-text-soft">
        Export all dashboard data to a single JSON file, or restore from a previous backup.
      </p>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="rounded-md border border-border-subtle bg-white/[0.02] p-4">
            <p className="text-sm text-text-main">Export backup</p>
            <p className="mt-1 text-xs text-text-soft">
              Downloads areas, tasks, goals, logs, focus sessions, integrations, settings, and more
              into one file.
            </p>
            <GlowButton
              size="sm"
              className="mt-3"
              leftIcon={<Download size={12} />}
              loading={exporting}
              onClick={() => void handleExport()}
              data-test-id="settings-backup-export"
            >
              Download backup
            </GlowButton>
          </div>

          <div className="rounded-md border border-border-subtle bg-white/[0.02] p-4">
            <p className="text-sm text-text-main">Restore backup</p>
            <p className="mt-1 text-xs text-text-soft">
              Import a backup file. Existing records with the same ID will be updated atomically.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(event) => void handleFileChange(event)}
              data-test-id="settings-backup-file-input"
            />
            <GlowButton
              size="sm"
              variant="ghost"
              className="mt-3"
              leftIcon={<Upload size={12} />}
              loading={importMutation.isPending}
              onClick={() => fileInputRef.current?.click()}
              data-test-id="settings-backup-import"
            >
              Choose backup file
            </GlowButton>
          </div>
        </div>
      )}
    </GlassCard>
  );
};
