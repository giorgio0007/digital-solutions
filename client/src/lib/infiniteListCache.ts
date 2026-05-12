import type { InfiniteData } from "@tanstack/react-query";
import type { CursorPage } from "../types";

export const PAGE_LIMIT = 20;

/** Убираем повторы id без изменения порядка первого вхождения — защита от «мерцающих» дублей после оптимистичных патчей */
export function uniqOrdered(ids: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** ~1s server mutation flush + small buffer so refetch sees applied state */
export const RESYNC_AFTER_MUTATION_MS = 1150;
/** ~10s add flush + buffer */
export const RESYNC_AFTER_ADD_MS = 10_150;

function matchesFilter(filter: string, id: number): boolean {
  const f = filter.trim();
  return f.length === 0 || String(id).includes(f);
}

function flatten(old: InfiniteData<CursorPage, number | null>): number[] {
  return old.pages.flatMap((page) => page.items);
}

export function rebuildFromFlat(
  old: InfiniteData<CursorPage, number | null>,
  flat: number[],
): InfiniteData<CursorPage, number | null> {
  const normalized = uniqOrdered(flat);
  const version = old.pages[0]?.stateVersion ?? 1;

  if (normalized.length === 0) {
    return {
      pages: [{ items: [], nextCursor: null, stateVersion: version }],
      pageParams: [null],
    };
  }

  const chunks: number[][] = [];
  for (let i = 0; i < normalized.length; i += PAGE_LIMIT) {
    chunks.push(normalized.slice(i, i + PAGE_LIMIT));
  }

  const pages: CursorPage[] = chunks.map((chunk) => ({
    items: chunk,
    nextCursor: chunk[chunk.length - 1]!,
    stateVersion: version,
  }));

  const pageParams = chunks.map((_chunk, index) =>
    index === 0 ? null : chunks[index - 1]![chunks[index - 1]!.length - 1]!,
  );

  return { pages, pageParams };
}

export function removeIdFromInfinite(
  old: InfiniteData<CursorPage, number | null> | undefined,
  id: number,
): InfiniteData<CursorPage, number | null> | undefined {
  if (!old) return old;
  const flat = flatten(old).filter((item) => item !== id);
  return rebuildFromFlat(old, flat);
}

export function optimisticAppendToRight(
  old: InfiniteData<CursorPage, number | null> | undefined,
  id: number,
  filter: string,
): InfiniteData<CursorPage, number | null> | undefined {
  if (!old) return old;
  let flat = flatten(old).filter((item) => item !== id);
  if (!matchesFilter(filter, id)) {
    return rebuildFromFlat(old, flat);
  }
  flat = [...flat, id];
  return rebuildFromFlat(old, flat);
}

export function optimisticInsertIntoLeft(
  old: InfiniteData<CursorPage, number | null> | undefined,
  id: number,
  filter: string,
): InfiniteData<CursorPage, number | null> | undefined {
  if (!old) return old;
  if (!matchesFilter(filter, id)) {
    return removeIdFromInfinite(old, id);
  }
  const flat = flatten(old).filter((item) => item !== id);
  const sorted = [...flat, id].sort((a, b) => a - b);
  return rebuildFromFlat(old, sorted);
}

export function reorderLoadedRight(
  old: InfiniteData<CursorPage, number | null> | undefined,
  itemId: number,
  targetId: number,
  position: "before" | "after",
): InfiniteData<CursorPage, number | null> | undefined {
  if (!old?.pages?.length || itemId === targetId) return old;

  const merged = uniqOrdered(old.pages.flatMap((page) => page.items));
  const sourceIndex = merged.indexOf(itemId);
  const targetIndex = merged.indexOf(targetId);
  if (sourceIndex < 0 || targetIndex < 0) return old;

  const moved = [...merged];
  const [value] = moved.splice(sourceIndex, 1);
  let insertionIndex = targetIndex;
  if (sourceIndex < targetIndex) insertionIndex -= 1;
  if (position === "after") insertionIndex += 1;
  moved.splice(insertionIndex, 0, value);

  return rebuildFromFlat(old, moved);
}
