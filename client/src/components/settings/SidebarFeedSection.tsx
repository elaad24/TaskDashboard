import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  Plus,
  Quote,
  Trash2,
  X,
} from 'lucide-react';
import type { FeedGroup, FeedItem } from '@command-center/shared';
import { countFeedItems } from '@command-center/shared';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlowButton } from '@/components/ui/GlowButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useSidebarFeed, useSidebarFeedActions } from '@/hooks/useSidebarFeed';
import { cn } from '@/lib/cn';

const ExcludeToggle = ({
  excluded,
  onChange,
  label,
}: {
  excluded: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={excluded}
    aria-label={`${label}: hide from rotation`}
    onClick={() => onChange(!excluded)}
    className={cn(
      'flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors',
      excluded
        ? 'border-danger/40 bg-danger/10 text-danger'
        : 'border-border-subtle bg-bg-deep/40 text-transparent hover:border-border-accent',
    )}
    data-test-id={`feed-item-exclude-${label}`}
  >
    {excluded && <X size={12} aria-hidden />}
  </button>
);

const countGroupItems = (group: FeedGroup): number =>
  group.items.length + group.children.reduce((sum, child) => sum + countGroupItems(child), 0);

const FeedItemRow = ({ item }: { item: FeedItem }) => {
  const actions = useSidebarFeedActions();
  const toast = useToast();

  const handleToggleExclude = async () => {
    try {
      await actions.updateItem.mutateAsync({
        id: item.id,
        input: { excludedFromRotation: !item.excludedFromRotation },
      });
    } catch (error) {
      toast.showError('Update failed', error instanceof Error ? error.message : undefined);
    }
  };

  const handleDelete = async () => {
    try {
      await actions.removeItem.mutateAsync(item.id);
      toast.showSuccess('Item removed');
    } catch (error) {
      toast.showError('Delete failed', error instanceof Error ? error.message : undefined);
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-md border border-border-subtle p-3">
      <ExcludeToggle
        excluded={item.excludedFromRotation}
        onChange={() => void handleToggleExclude()}
        label={item.content.slice(0, 40)}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-main">{item.content}</p>
        <p className="mt-1 text-[11px] text-text-muted">
          {item.excludedFromRotation ? 'Hidden from rotation' : 'In rotation pool'}
        </p>
      </div>
      <GlowButton
        size="sm"
        variant="ghost"
        leftIcon={<Trash2 size={12} />}
        onClick={() => void handleDelete()}
        loading={actions.removeItem.isPending}
        aria-label={`Delete ${item.content}`}
      >
        Delete
      </GlowButton>
    </div>
  );
};

const FeedFolderNode = ({ group, depth = 0 }: { group: FeedGroup; depth?: number }) => {
  const actions = useSidebarFeedActions();
  const toast = useToast();
  const [expanded, setExpanded] = useState(true);
  const [itemText, setItemText] = useState('');
  const [folderName, setFolderName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(group.name);
  const [showAddFolder, setShowAddFolder] = useState(false);

  const itemCount = countGroupItems(group);

  const handleAddItem = async () => {
    if (!itemText.trim()) return;
    try {
      await actions.createItem.mutateAsync({
        groupId: group.id,
        content: itemText.trim(),
      });
      setItemText('');
      toast.showSuccess('Item added');
    } catch (error) {
      toast.showError('Create failed', error instanceof Error ? error.message : undefined);
    }
  };

  const handleAddFolder = async () => {
    if (!folderName.trim()) return;
    try {
      await actions.createGroup.mutateAsync({
        name: folderName.trim(),
        parentId: group.id,
      });
      setFolderName('');
      setShowAddFolder(false);
      setExpanded(true);
      toast.showSuccess('Folder added');
    } catch (error) {
      toast.showError('Create failed', error instanceof Error ? error.message : undefined);
    }
  };

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === group.name) {
      setEditingName(false);
      setNameDraft(group.name);
      return;
    }
    try {
      await actions.updateGroup.mutateAsync({ id: group.id, input: { name: trimmed } });
      setEditingName(false);
      toast.showSuccess('Folder renamed');
    } catch (error) {
      toast.showError('Update failed', error instanceof Error ? error.message : undefined);
    }
  };

  const handleDeleteFolder = async () => {
    try {
      await actions.removeGroup.mutateAsync(group.id);
      toast.showSuccess('Folder removed');
    } catch (error) {
      toast.showError('Delete failed', error instanceof Error ? error.message : undefined);
    }
  };

  return (
    <div
      className={cn('rounded-md border border-border-subtle', depth > 0 && 'ml-4 mt-2')}
      data-test-id={`feed-folder-${group.id}`}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle bg-white/[0.02] px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center gap-1.5 text-sm font-medium text-text-main hover:text-cyan"
          aria-expanded={expanded}
          data-test-id={`feed-folder-toggle-${group.id}`}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Folder size={14} className="text-cyan" aria-hidden />
          {editingName ? (
            <input
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={() => void handleSaveName()}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === 'Enter') void handleSaveName();
                if (event.key === 'Escape') {
                  setEditingName(false);
                  setNameDraft(group.name);
                }
              }}
              onClick={(event) => event.stopPropagation()}
              className="rounded-md border border-border-subtle bg-bg-deep/60 px-2 py-0.5 text-sm font-medium text-text-main"
              autoFocus
              data-test-id={`feed-group-name-input-${group.id}`}
            />
          ) : (
            <span
              onDoubleClick={(event) => {
                event.stopPropagation();
                setEditingName(true);
              }}
            >
              {group.name}
            </span>
          )}
        </button>
        <StatusBadge tone="muted">{itemCount} items</StatusBadge>
        <GlowButton
          size="sm"
          variant="ghost"
          leftIcon={<FolderPlus size={12} />}
          onClick={() => {
            setShowAddFolder((prev) => !prev);
            setExpanded(true);
          }}
          data-test-id={`feed-folder-add-child-${group.id}`}
        >
          Add folder
        </GlowButton>
        <GlowButton
          size="sm"
          variant="ghost"
          leftIcon={<Trash2 size={12} />}
          onClick={() => void handleDeleteFolder()}
          loading={actions.removeGroup.isPending}
        >
          Delete
        </GlowButton>
      </div>

      {expanded && (
        <div className="space-y-2 p-3">
          {group.children.map((child) => (
            <FeedFolderNode key={child.id} group={child} depth={depth + 1} />
          ))}

          {group.items.length === 0 && group.children.length === 0 ? (
            <p className="text-xs text-text-soft">No items in this folder yet.</p>
          ) : (
            group.items.map((item) => <FeedItemRow key={item.id} item={item} />)
          )}

          {showAddFolder && (
            <div className="flex flex-col gap-2 rounded-md border border-border-subtle bg-white/[0.02] p-3 sm:flex-row">
              <input
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                placeholder="Subfolder name"
                className="min-w-0 flex-1 rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
                data-test-id={`feed-subfolder-input-${group.id}`}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleAddFolder();
                }}
              />
              <GlowButton
                size="sm"
                leftIcon={<FolderPlus size={14} />}
                onClick={() => void handleAddFolder()}
                loading={actions.createGroup.isPending}
              >
                Create folder
              </GlowButton>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={itemText}
              onChange={(event) => setItemText(event.target.value)}
              placeholder="Word, phrase, or explanation to remember"
              className="min-w-0 flex-1 rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
              data-test-id={`feed-item-input-${group.id}`}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void handleAddItem();
              }}
            />
            <GlowButton
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={() => void handleAddItem()}
              loading={actions.createItem.isPending}
              data-test-id={`feed-item-add-${group.id}`}
            >
              Add item
            </GlowButton>
          </div>
        </div>
      )}
    </div>
  );
};

export const SidebarFeedSection = () => {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const feed = useSidebarFeed();
  const actions = useSidebarFeedActions();
  const [folderName, setFolderName] = useState('');

  const totalItems = countFeedItems(feed.data?.groups ?? []);

  const handleCreateRootFolder = async () => {
    if (!folderName.trim()) return;
    try {
      await actions.createGroup.mutateAsync({ name: folderName.trim() });
      setFolderName('');
      toast.showSuccess('Folder added');
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
        data-test-id="sidebar-feed-section-toggle"
      >
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <Quote size={12} /> Sidebar feed
        </div>
        <StatusBadge tone="muted">{totalItems} items</StatusBadge>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <p className="text-xs text-text-soft">
            Organize phrases in a folder tree. Every 2 minutes the sidebar picks a random item
            from the rotation pool. Mark an item with X to keep it saved but exclude it from
            rotation.
          </p>

          {feed.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (feed.data?.groups.length ?? 0) === 0 ? (
            <EmptyState
              title="No folders yet"
              description="Create a root folder for motivation, vocabulary, or anything you want to remember."
            />
          ) : (
            <div className="space-y-3">
              {feed.data!.groups.map((group) => (
                <FeedFolderNode key={group.id} group={group} />
              ))}
            </div>
          )}

          <div className="rounded-md border border-border-subtle bg-white/[0.02] p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200">
              Add root folder
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                placeholder="e.g. Aviation, Spanish vocab"
                className="min-w-0 flex-1 rounded-md border border-border-subtle bg-bg-deep/60 px-3 py-2 text-sm text-text-main"
                data-test-id="feed-group-name-input"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleCreateRootFolder();
                }}
              />
              <GlowButton
                size="sm"
                leftIcon={<FolderPlus size={14} />}
                onClick={() => void handleCreateRootFolder()}
                loading={actions.createGroup.isPending}
                data-test-id="feed-group-create"
              >
                Add folder
              </GlowButton>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  );
};
