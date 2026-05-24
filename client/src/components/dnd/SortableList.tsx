import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/cn';

type SortableItem = {
  id: string;
};

type SortableListProps<T extends SortableItem> = {
  items: Array<T>;
  onReorder: (orderedIds: Array<string>) => void | Promise<void>;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  itemClassName?: string;
  disabled?: boolean;
};

const SortableRow = ({
  id,
  children,
  className,
  disabled,
}: {
  id: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-stretch gap-2',
        isDragging && 'relative z-10 opacity-90',
        className,
      )}
    >
      <button
        type="button"
        className={cn(
          'mt-3 flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded-md text-text-muted transition-colors hover:bg-white/[0.04] hover:text-cyan active:cursor-grabbing',
          disabled && 'pointer-events-none opacity-30',
        )}
        aria-label="Drag to reorder"
        data-test-id={`drag-handle-${id}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
};

export const SortableList = <T extends SortableItem>({
  items,
  onReorder,
  renderItem,
  className,
  itemClassName,
  disabled = false,
}: SortableListProps<T>) => {
  const [localItems, setLocalItems] = useState(items);
  const ids = useMemo(() => localItems.map((item) => item.id), [localItems]);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localItems.findIndex((item) => item.id === active.id);
    const newIndex = localItems.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(localItems, oldIndex, newIndex);
    setLocalItems(next);
    await onReorder(next.map((item) => item.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void handleDragEnd(event)}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className={cn('space-y-2.5', className)}>
          {localItems.map((item, index) => (
            <SortableRow key={item.id} id={item.id} className={itemClassName} disabled={disabled}>
              {renderItem(item, index)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
};
