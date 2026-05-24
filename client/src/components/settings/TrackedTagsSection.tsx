import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Tag, Trash2 } from 'lucide-react';
import type { AskFields, TrackedTag } from '@command-center/shared';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useAreas } from '@/hooks/useAreas';
import { useTrackedTagActions, useTrackedTags } from '@/hooks/useTrackedTags';
import { cn } from '@/lib/cn';

const SAMPLE_TAG = {
  name: 'Flying lesson',
  aliases: ['flying lesson', 'PPL flight'],
  askFields: { cost: true, duration: true, location: true } satisfies AskFields,
  defaultLogKind: 'expense' as const,
};

const AskFieldToggle = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) => (
  <label className="inline-flex items-center gap-2 rounded-full border border-border-subtle px-3 py-1 text-[11px] text-text-soft">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="accent-cyan" />
    {label}
  </label>
);

const TagRow = ({ tag }: { tag: TrackedTag }) => {
  const actions = useTrackedTagActions();
  const toast = useToast();

  const handleToggleActive = async () => {
    try {
      await actions.update.mutateAsync({ id: tag.id, input: { active: !tag.active } });
    } catch (error) {
      toast.showError('Update failed', error instanceof Error ? error.message : undefined);
    }
  };

  const handleDelete = async () => {
    try {
      await actions.remove.mutateAsync(tag.id);
      toast.showSuccess('Tag removed');
    } catch (error) {
      toast.showError('Delete failed', error instanceof Error ? error.message : undefined);
    }
  };

  return (
    <div className="rounded-md border border-border-subtle p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-text-main">{tag.name}</span>
        {!tag.active && <StatusBadge tone="muted">Inactive</StatusBadge>}
        <StatusBadge tone="cyan">{tag.defaultLogKind}</StatusBadge>
        {tag.aliases.map((alias) => (
          <StatusBadge key={alias} tone="muted">
            {alias}
          </StatusBadge>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-text-soft">
        {tag.askFields.cost && <StatusBadge tone="neon">cost</StatusBadge>}
        {tag.askFields.duration && <StatusBadge tone="neon">duration</StatusBadge>}
        {tag.askFields.location && <StatusBadge tone="neon">location</StatusBadge>}
        {tag.askFields.counterparty && <StatusBadge tone="neon">counterparty</StatusBadge>}
      </div>
      <div className="mt-3 flex gap-2">
        <GlowButton size="sm" variant="ghost" onClick={handleToggleActive}>
          {tag.active ? 'Deactivate' : 'Activate'}
        </GlowButton>
        <GlowButton
          size="sm"
          variant="ghost"
          leftIcon={<Trash2 size={12} />}
          onClick={handleDelete}
          loading={actions.remove.isPending}
        >
          Delete
        </GlowButton>
      </div>
    </div>
  );
};

export const TrackedTagsSection = () => {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const tags = useTrackedTags();
  const actions = useTrackedTagActions();
  const { data: areas } = useAreas();

  const [name, setName] = useState('');
  const [aliasesText, setAliasesText] = useState('');
  const [areaId, setAreaId] = useState('');
  const [defaultLogKind, setDefaultLogKind] = useState<'expense' | 'study' | 'note'>('note');
  const [askFields, setAskFields] = useState<AskFields>({});

  const handleCreate = async () => {
    if (!name.trim()) return;
    const aliases = aliasesText
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    try {
      await actions.create.mutateAsync({
        name: name.trim(),
        aliases,
        areaId: areaId || null,
        defaultLogKind,
        askFields,
      });
      setName('');
      setAliasesText('');
      setAskFields({});
      toast.showSuccess('Tracked tag added');
    } catch (error) {
      toast.showError('Create failed', error instanceof Error ? error.message : undefined);
    }
  };

  const handleAddSample = async () => {
    try {
      await actions.create.mutateAsync(SAMPLE_TAG);
      toast.showSuccess('Sample tag added');
    } catch (error) {
      toast.showError('Create failed', error instanceof Error ? error.message : undefined);
    }
  };

  return (
    <GlassCard className="p-5 lg:col-span-2">
      <button
        type="button"
        className="flex w-full items-center justify-between text-left"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        data-test-id="tracked-tags-section-toggle"
      >
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <Tag size={12} /> Tracked tags
        </div>
        <StatusBadge tone="muted">{tags.data?.length ?? 0} tags</StatusBadge>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <p className="text-xs text-text-soft">
            When Gmail or Calendar text matches a tag name or alias, a pending capture asks only the fields you configure.
          </p>

          {tags.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (tags.data?.length ?? 0) === 0 ? (
            <EmptyState
              title="No tracked tags yet"
              description="Add tags for recurring activities like flying lessons, gym, or client calls."
              action={
                <GlowButton size="sm" onClick={handleAddSample}>
                  Add common: Flying lesson
                </GlowButton>
              }
            />
          ) : (
            <div className="space-y-2">
              {tags.data!.map((tag) => (
                <TagRow key={tag.id} tag={tag} />
              ))}
            </div>
          )}

          <div className="rounded-md border border-border-subtle bg-white/[0.02] p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">Add tag</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs text-text-muted">Name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
                  data-test-id="tracked-tag-name"
                />
              </label>
              <label className="block">
                <span className="text-xs text-text-muted">Aliases (comma separated)</span>
                <input
                  value={aliasesText}
                  onChange={(event) => setAliasesText(event.target.value)}
                  placeholder="flying lesson, PPL flight"
                  className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
                />
              </label>
              <label className="block">
                <span className="text-xs text-text-muted">Area</span>
                <select
                  value={areaId}
                  onChange={(event) => setAreaId(event.target.value)}
                  className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
                >
                  <option value="">Any</option>
                  {areas?.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-text-muted">Default log kind</span>
                <select
                  value={defaultLogKind}
                  onChange={(event) =>
                    setDefaultLogKind(event.target.value as 'expense' | 'study' | 'note')
                  }
                  className="mt-1 w-full rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
                >
                  <option value="note">Note</option>
                  <option value="expense">Expense</option>
                  <option value="study">Study</option>
                </select>
              </label>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <AskFieldToggle
                label="Cost"
                checked={Boolean(askFields.cost)}
                onChange={(value) => setAskFields((prev) => ({ ...prev, cost: value }))}
              />
              <AskFieldToggle
                label="Duration"
                checked={Boolean(askFields.duration)}
                onChange={(value) => setAskFields((prev) => ({ ...prev, duration: value }))}
              />
              <AskFieldToggle
                label="Location"
                checked={Boolean(askFields.location)}
                onChange={(value) => setAskFields((prev) => ({ ...prev, location: value }))}
              />
              <AskFieldToggle
                label="Counterparty"
                checked={Boolean(askFields.counterparty)}
                onChange={(value) => setAskFields((prev) => ({ ...prev, counterparty: value }))}
              />
            </div>

            <div className={cn('mt-4 flex flex-wrap gap-2')}>
              <GlowButton
                size="sm"
                leftIcon={<Plus size={14} />}
                onClick={handleCreate}
                loading={actions.create.isPending}
                data-test-id="tracked-tag-create"
              >
                Add tag
              </GlowButton>
              {(tags.data?.length ?? 0) > 0 && (
                <GlowButton size="sm" variant="ghost" onClick={handleAddSample}>
                  Add sample
                </GlowButton>
              )}
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
};
