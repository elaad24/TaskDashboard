import { useMemo, useState } from 'react';
import type { Resource } from '@command-center/shared';
import { BookMarked, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { PageScroll } from '@/components/layout/PageScroll';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAreas, useTracks } from '@/hooks/useAreas';
import {
  useCreateResource,
  useDeleteResource,
  useResources,
  useUpdateResource,
} from '@/hooks/useResources';

type FormState = {
  id?: string;
  title: string;
  type: 'link' | 'note' | 'file';
  url: string;
  content: string;
  areaId: string;
  trackId: string;
  goalId: string;
  studyTopicId: string;
};

const emptyForm: FormState = {
  title: '',
  type: 'link',
  url: '',
  content: '',
  areaId: '',
  trackId: '',
  goalId: '',
  studyTopicId: '',
};

export const ResourcesPage = () => {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<string>('');
  const [areaId, setAreaId] = useState('');
  const [editing, setEditing] = useState<FormState | null>(null);
  const resources = useResources({ q: query || undefined, type: type || undefined, areaId: areaId || undefined });
  const { data: areas } = useAreas();
  const { data: tracks } = useTracks(areaId || undefined);
  const createResource = useCreateResource();
  const updateResource = useUpdateResource();
  const deleteResource = useDeleteResource();

  const resourcesByType = useMemo(() => {
    const all = resources.data ?? [];
    return {
      link: all.filter((item) => item.type === 'link'),
      note: all.filter((item) => item.type === 'note'),
      file: all.filter((item) => item.type === 'file'),
    };
  }, [resources.data]);

  const handleSave = async () => {
    if (!editing || !editing.title.trim()) return;
    const payload = {
      title: editing.title.trim(),
      type: editing.type,
      url: editing.url || null,
      content: editing.content || undefined,
      areaId: editing.areaId || null,
      trackId: editing.trackId || null,
      goalId: editing.goalId || null,
      studyTopicId: editing.studyTopicId || null,
    };
    if (editing.id) {
      await updateResource.mutateAsync({ id: editing.id, input: payload });
    } else {
      await createResource.mutateAsync(payload);
    }
    setEditing(null);
  };

  const startEdit = (resource?: Resource) => {
    if (!resource) {
      setEditing(emptyForm);
      return;
    }
    setEditing({
      id: resource.id,
      title: resource.title,
      type: resource.type,
      url: resource.url ?? '',
      content: resource.content ?? '',
      areaId: resource.areaId ?? '',
      trackId: resource.trackId ?? '',
      goalId: resource.goalId ?? '',
      studyTopicId: resource.studyTopicId ?? '',
    });
  };

  return (
    <PageScroll>
      <PageHeader
        title="Resources"
        description="Central table for links, notes, and files attached to your projects."
        action={
          <GlowButton leftIcon={<Plus size={14} />} onClick={() => startEdit()}>
            Add resource
          </GlowButton>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, URL, notes..."
          className="rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
        />
        <select
          value={type}
          onChange={(event) => setType(event.target.value)}
          className="rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
        >
          <option value="">All types</option>
          <option value="link">Link</option>
          <option value="note">Note</option>
          <option value="file">File</option>
        </select>
        <select
          value={areaId}
          onChange={(event) => setAreaId(event.target.value)}
          className="rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
        >
          <option value="">All areas</option>
          {areas?.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </div>

      {(resources.data?.length ?? 0) === 0 ? (
        <EmptyState title="No resources yet" description="Add your first link or note." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {(['link', 'note', 'file'] as const).map((bucket) => (
            <GlassCard key={bucket} className="p-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-cyan-200">
                <BookMarked size={12} /> {bucket}
              </div>
              <div className="mt-3 space-y-2">
                {resourcesByType[bucket].map((resource) => (
                  <div key={resource.id} className="rounded-md border border-border-subtle p-3">
                    <div className="text-sm font-medium text-text-main">{resource.title}</div>
                    {resource.url && (
                      <a href={resource.url} target="_blank" rel="noreferrer" className="text-xs text-cyan-300">
                        {resource.url}
                      </a>
                    )}
                    {resource.content && <p className="mt-1 text-xs text-text-soft">{resource.content}</p>}
                    <div className="mt-2 flex gap-2">
                      <GlowButton size="sm" variant="subtle" onClick={() => startEdit(resource)}>
                        Edit
                      </GlowButton>
                      <GlowButton
                        size="sm"
                        variant="ghost"
                        leftIcon={<Trash2 size={12} />}
                        onClick={() => deleteResource.mutate(resource.id)}
                        loading={deleteResource.isPending}
                      >
                        Delete
                      </GlowButton>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {editing && (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(event) => event.target === event.currentTarget && setEditing(null)}
        >
          <GlassCard variant="neon" glow className="w-full max-w-xl p-5">
            <h3 className="text-base font-semibold text-text-main">
              {editing.id ? 'Edit resource' : 'Create resource'}
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={editing.title}
                onChange={(event) => setEditing((prev) => ({ ...(prev ?? emptyForm), title: event.target.value }))}
                placeholder="Title"
                className="rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
              />
              <select
                value={editing.type}
                onChange={(event) =>
                  setEditing((prev) => ({
                    ...(prev ?? emptyForm),
                    type: event.target.value as 'link' | 'note' | 'file',
                  }))
                }
                className="rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
              >
                <option value="link">Link</option>
                <option value="note">Note</option>
                <option value="file">File</option>
              </select>
              <input
                value={editing.url}
                onChange={(event) => setEditing((prev) => ({ ...(prev ?? emptyForm), url: event.target.value }))}
                placeholder="URL (optional)"
                className="rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main sm:col-span-2"
              />
              <textarea
                value={editing.content}
                onChange={(event) =>
                  setEditing((prev) => ({ ...(prev ?? emptyForm), content: event.target.value }))
                }
                placeholder="Notes/content (optional)"
                rows={4}
                className="rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main sm:col-span-2"
              />
              <select
                value={editing.areaId}
                onChange={(event) => setEditing((prev) => ({ ...(prev ?? emptyForm), areaId: event.target.value }))}
                className="rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
              >
                <option value="">No area</option>
                {areas?.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
              <select
                value={editing.trackId}
                onChange={(event) => setEditing((prev) => ({ ...(prev ?? emptyForm), trackId: event.target.value }))}
                className="rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
              >
                <option value="">No track</option>
                {tracks?.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <GlowButton variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </GlowButton>
              <GlowButton onClick={handleSave} loading={createResource.isPending || updateResource.isPending}>
                Save
              </GlowButton>
            </div>
          </GlassCard>
        </div>
      )}
    </PageScroll>
  );
};
