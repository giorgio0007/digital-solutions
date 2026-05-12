import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Virtuoso } from "react-virtuoso";

/** Высота строки виртуализатора (пиксели) — одна строка включает внешний отступ внизу */
export const RIGHT_ROW_STRIDE_PX = 52;

interface SelectedVirtualListProps {
  items: number[];
  loading: boolean;
  hasMore: boolean;
  onEndReached: () => void;
  onDeselect: (id: number) => void;
  onReorder: (payload: { itemId: number; targetId: number; position: "before" | "after" }) => void;
}

function clamp(index: number, max: number) {
  return Math.max(0, Math.min(max, index));
}

type DragState = {
  pointerId: number;
  itemId: number;
  fromIndex: number;
  grabOffsetY: number;
  hoveredIndex: number;
  ghostLeft: number;
  ghostTop: number;
  ghostWidth: number;
};

export function SelectedVirtualList({
  items,
  loading,
  hasMore,
  onEndReached,
  onDeselect,
  onReorder,
}: SelectedVirtualListProps) {
  const scrollerEl = useRef<HTMLElement | null>(null);
  const [dragUi, setDragUi] = useState<DragState | undefined>(undefined);

  /** Активный drag для window listeners без лишних зависимостей от React state */
  const dragRef = useRef<DragState | undefined>(undefined);

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const pickHoveredIndex = useCallback((clientY: number) => {
    const scroll = scrollerEl.current;
    const currentItems = itemsRef.current;
    if (!scroll || currentItems.length === 0) return 0;

    const rect = scroll.getBoundingClientRect();
    const y = clientY - rect.top + scroll.scrollTop;
    const snapped = Math.floor(y / RIGHT_ROW_STRIDE_PX + 0.5);
    return clamp(snapped, currentItems.length - 1);
  }, []);

  const autoScroll = useCallback((clientY: number) => {
    const scroll = scrollerEl.current;
    if (!scroll) return;

    const rect = scroll.getBoundingClientRect();
    const zone = 48;

    let delta = 0;
    if (clientY < rect.top + zone) delta -= 14;
    if (clientY > rect.bottom - zone) delta += 14;

    if (delta !== 0) scroll.scrollTop += delta;
  }, []);

  const finishDragFromPointerEvent = useCallback(
    (event: PointerEvent) => {
      const active = dragRef.current;
      if (!active || event.pointerId !== active.pointerId) return;

      const list = itemsRef.current;
      const dropIndex = pickHoveredIndex(event.clientY);
      const fromIndex = active.fromIndex;

      dragRef.current = undefined;

      if (
        dropIndex !== fromIndex &&
        list[fromIndex] === active.itemId &&
        typeof list[dropIndex] === "number"
      ) {
        onReorder({
          itemId: active.itemId,
          targetId: list[dropIndex],
          position: fromIndex < dropIndex ? "after" : "before",
        });
      }

      setDragUi(undefined);
    },
    [onReorder, pickHoveredIndex],
  );

  /** Глобальные события: не пересоздаём при каждом движении */
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const active = dragRef.current;
      if (!active || event.pointerId !== active.pointerId) return;

      autoScroll(event.clientY);

      const hoveredIndex = pickHoveredIndex(event.clientY);
      const nextGhostTop = event.clientY - active.grabOffsetY;

      const nextUi: DragState = {
        ...active,
        hoveredIndex,
        ghostTop: nextGhostTop,
      };

      dragRef.current = nextUi;
      setDragUi(nextUi);
    };

    const onUpOrCancel = (event: PointerEvent) => {
      const active = dragRef.current;
      if (!active || event.pointerId !== active.pointerId) return;

      finishDragFromPointerEvent(event);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUpOrCancel);
    window.addEventListener("pointercancel", onUpOrCancel);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUpOrCancel);
      window.removeEventListener("pointercancel", onUpOrCancel);
    };
  }, [autoScroll, finishDragFromPointerEvent, pickHoveredIndex]);

  const beginDrag = useCallback((event: React.PointerEvent<HTMLButtonElement>, itemId: number) => {
    if (dragRef.current) return;
    if (itemsRef.current.length <= 1) return;

    const currentItems = itemsRef.current;
    const fromIndex = currentItems.indexOf(itemId);
    if (fromIndex < 0) return;

    event.preventDefault();
    event.stopPropagation();

    const row = event.currentTarget.closest("[data-selected-row]");
    const rowRect = row?.getBoundingClientRect();

    const grabOffsetY = rowRect ? event.clientY - rowRect.top : RIGHT_ROW_STRIDE_PX / 2;
    const ghostWidth = rowRect?.width ?? 320;
    const ghostLeft = rowRect?.left ?? event.clientX;
    const ghostTop = rowRect?.top ?? event.clientY;

    const nextUi: DragState = {
      pointerId: event.pointerId,
      itemId,
      fromIndex,
      grabOffsetY,
      hoveredIndex: fromIndex,
      ghostLeft,
      ghostTop,
      ghostWidth,
    };

    dragRef.current = nextUi;
    setDragUi(nextUi);
  }, []);

  if (!loading && items.length === 0) {
    return <div className="empty">Нет выбранных элементов</div>;
  }

  type ListCtx = {
    hoveredIndex: number | null;
    draggedId: number | null;
    dragFromIndex: number | null;
  };

  const listContext: ListCtx = dragUi
    ? { hoveredIndex: dragUi.hoveredIndex, draggedId: dragUi.itemId, dragFromIndex: dragUi.fromIndex }
    : { hoveredIndex: null, draggedId: null, dragFromIndex: null };

  return (
    <>
      <Virtuoso<number, ListCtx>
        style={{ height: 560, overflowX: "hidden" }}
        data={items}
        context={listContext}
        fixedItemHeight={RIGHT_ROW_STRIDE_PX}
        overscan={8}
        scrollerRef={(el) => {
          scrollerEl.current = typeof el !== "undefined" && el instanceof HTMLElement ? el : null;
        }}
        computeItemKey={(_, id) => id}
        endReached={() => {
          if (hasMore && !loading) {
            onEndReached();
          }
        }}
        itemContent={(index, itemId, ctx) => {
          const draggingSelf = ctx.draggedId === itemId;
          const hoverTarget =
            ctx.hoveredIndex === index &&
            ctx.draggedId !== null &&
            ctx.dragFromIndex !== null &&
            ctx.dragFromIndex !== index;

          return (
            <div
              data-selected-row=""
              className={`right-row-shell${draggingSelf ? " is-drag-source" : ""}${hoverTarget ? " is-drop-target" : ""}`}
            >
              <div className="item-row item-row-right">
                <span className="id-tag">#{itemId}</span>
                <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => onDeselect(itemId)}>
                  Убрать
                </button>
                <button
                  type="button"
                  className="drag-handle"
                  aria-label={`Перетащить ${itemId}`}
                  onPointerDown={(e) => beginDrag(e, itemId)}
                >
                  Тянуть
                </button>
              </div>
            </div>
          );
        }}
        components={{
          Footer: () =>
            loading ? (
              <div className="list-footer">Загрузка...</div>
            ) : (
              <div className="list-footer"> </div>
            ),
        }}
      />

      {dragUi &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "fixed",
              left: dragUi.ghostLeft,
              top: dragUi.ghostTop,
              width: dragUi.ghostWidth,
              pointerEvents: "none",
              zIndex: 10_000,
              userSelect: "none",
            }}
          >
            <div className="item-row item-row-right drag-ghost">
              <span className="id-tag">#{dragUi.itemId}</span>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
