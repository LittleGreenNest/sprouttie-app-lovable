import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';

const SortableWordItem = ({ word, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: word.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
        isDragging
          ? 'bg-primary/10 border-2 border-primary shadow-lg'
          : 'bg-red-50 hover:bg-red-100 border border-red-200'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground hover:text-foreground"
        aria-label={`Drag to reorder ${word.front || word.word}`}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="flex-1 font-medium text-red-700">{word.front || word.word}</span>
      {(word.date_introduced || word.created_at) && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {new Date(word.date_introduced || word.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
      )}
      <button
        onClick={() => onRemove(word.id)}
        className="p-0.5 text-red-400 hover:text-red-600 transition-colors"
        aria-label={`Remove ${word.front || word.word}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const SortableWordList = ({ words, onRemove, onReorder }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = words.findIndex((w) => w.id === active.id);
    const newIndex = words.findIndex((w) => w.id === over.id);
    const reordered = arrayMove(words, oldIndex, newIndex);
    onReorder(reordered);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={words.map((w) => w.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {words.map((word) => (
            <SortableWordItem key={word.id} word={word} onRemove={onRemove} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default SortableWordList;
