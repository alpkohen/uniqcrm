"use client";

import { useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "cn";

export type KanbanColumn<T extends { id: string }> = {
  id: string;
  name: string;
  color: string;
  items: T[];
};

function DroppableColumn({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${id}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(className, isOver && "ring-2 ring-primary/40")}
    >
      {children}
    </div>
  );
}

function DraggableCard({
  id,
  columnId,
  children,
}: {
  id: string;
  columnId: string;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { columnId },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(isDragging && "opacity-40")}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}

export function KanbanBoard<T extends { id: string }>({
  columns,
  onMove,
  renderCard,
}: {
  columns: KanbanColumn<T>[];
  onMove: (itemId: string, columnId: string) => Promise<void>;
  renderCard: (item: T) => ReactNode;
}) {
  // Mirrors `columns` locally so a drop can move the card instantly, before the
  // server round trip (onMove) resolves — otherwise the card just snaps back
  // and sits there for however long the mutation + refresh takes, which reads
  // as "nothing happened." Re-synced (during render, not an effect — see
  // https://react.dev/learn/you-might-not-need-an-effect) whenever the server
  // sends fresh columns.
  const [prevColumns, setPrevColumns] = useState(columns);
  const [localColumns, setLocalColumns] = useState(columns);
  if (columns !== prevColumns) {
    setPrevColumns(columns);
    setLocalColumns(columns);
  }

  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const activeItem = localColumns.flatMap((column) => column.items).find((item) => item.id === activeId);

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    const targetColumnId = overId.startsWith("column:")
      ? overId.slice("column:".length)
      : localColumns.find((column) => column.items.some((item) => item.id === overId))?.id;
    if (!targetColumnId) return;
    const itemId = String(active.id);
    const sourceColumn = localColumns.find((column) => column.items.some((item) => item.id === itemId));
    if (!sourceColumn || sourceColumn.id === targetColumnId) return;

    const item = sourceColumn.items.find((entry) => entry.id === itemId)!;
    const previousColumns = localColumns;
    setLocalColumns((prev) =>
      prev.map((column) => {
        if (column.id === sourceColumn.id) {
          return { ...column, items: column.items.filter((entry) => entry.id !== itemId) };
        }
        if (column.id === targetColumnId) {
          return { ...column, items: [item, ...column.items] };
        }
        return column;
      }),
    );

    try {
      await onMove(itemId, targetColumnId);
    } catch {
      setLocalColumns(previousColumns);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(event) => setActiveId(String(event.active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex min-h-[28rem] gap-3 overflow-x-auto pb-4">
        {localColumns.map((column) => (
          <DroppableColumn
            key={column.id}
            id={column.id}
            className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/60 p-3"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: column.color }}
                />
                <h2 className="text-sm font-medium">{column.name}</h2>
              </div>
              <span className="text-xs text-muted-foreground">{column.items.length}</span>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {column.items.map((item) => (
                <DraggableCard key={item.id} id={item.id} columnId={column.id}>
                  {renderCard(item)}
                </DraggableCard>
              ))}
            </div>
          </DroppableColumn>
        ))}
      </div>
      <DragOverlay>
        {activeItem ? (
          <div className="w-72">{renderCard(activeItem)}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
