import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { VirtualList } from "./VirtualList";

function SortableRow({
  itemId,
  onDeselect,
}: {
  itemId: number;
  onDeselect: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: itemId,
  });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="item-row">
      <span className="id-tag">#{itemId}</span>
      <button type="button" onClick={() => onDeselect(itemId)}>
        Remove
      </button>
      <button type="button" className="drag-handle" {...attributes} {...listeners}>
        Drag
      </button>
    </div>
  );
}

export function SortableRightList({
  items,
  hasMore,
  loading,
  onDeselect,
  onEndReached,
  onReorder,
}: {
  items: number[];
  hasMore: boolean;
  loading: boolean;
  onDeselect: (id: number) => void;
  onEndReached: () => void;
  onReorder: (payload: { itemId: number; targetId: number; position: "before" | "after" }) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const activeId = Number(event.active.id);
    const overId = Number(event.over?.id);
    if (!overId || activeId === overId) {
      return;
    }
    const sourceIndex = items.indexOf(activeId);
    const targetIndex = items.indexOf(overId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }
    onReorder({
      itemId: activeId,
      targetId: overId,
      position: sourceIndex < targetIndex ? "after" : "before",
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <VirtualList
          items={items}
          loading={loading}
          hasMore={hasMore}
          onEndReached={onEndReached}
          emptyText="No selected items"
          renderRow={(itemId) => <SortableRow itemId={itemId} onDeselect={onDeselect} />}
        />
      </SortableContext>
    </DndContext>
  );
}
