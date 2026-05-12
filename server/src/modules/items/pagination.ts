import { setImmediate as setImmediatePromise } from "node:timers/promises";
import { getState } from "../selection/state";
import {
  DEFAULT_PAGE_LIMIT,
  MAX_DEFAULT_ID,
  MAX_PAGE_LIMIT,
  type CursorPageResponse,
  type ItemId,
} from "../../shared/types";

const YIELD_EVERY_ITERATIONS = 5_000;
const MAX_SYNC_SLICE_MS = 10;

function normalizeLimit(limit?: number): number {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_PAGE_LIMIT;
  }
  return Math.max(1, Math.min(limit, MAX_PAGE_LIMIT));
}

function matchesFilter(id: number, filter: string): boolean {
  if (!filter) return true;
  return String(id).includes(filter);
}

async function maybeYield(
  iterationsSinceYield: number,
  sliceStartAt: number,
): Promise<{ iterationsSinceYield: number; sliceStartAt: number }> {
  if (
    iterationsSinceYield >= YIELD_EVERY_ITERATIONS ||
    Date.now() - sliceStartAt >= MAX_SYNC_SLICE_MS
  ) {
    await setImmediatePromise();
    return { iterationsSinceYield: 0, sliceStartAt: Date.now() };
  }
  return { iterationsSinceYield, sliceStartAt };
}

export async function getLeftPage(input: {
  filter?: string;
  cursor?: number;
  limit?: number;
}): Promise<CursorPageResponse> {
  const state = getState();
  const filter = (input.filter ?? "").trim();
  const limit = normalizeLimit(input.limit);
  const cursor = Number.isInteger(input.cursor) ? (input.cursor as number) : 0;

  const items: ItemId[] = [];
  let lastSeen: number = cursor;
  let iterationsSinceYield = 0;
  let sliceStartAt = Date.now();

  let id = Math.max(1, cursor + 1);
  while (id <= MAX_DEFAULT_ID && items.length < limit) {
    lastSeen = id;
    if (!state.selectedSet.has(id) && matchesFilter(id, filter)) {
      items.push(id);
    }
    id += 1;
    iterationsSinceYield += 1;
    ({ iterationsSinceYield, sliceStartAt } = await maybeYield(
      iterationsSinceYield,
      sliceStartAt,
    ));
  }

  if (items.length < limit) {
    for (const customId of state.customOrder) {
      if (customId <= cursor) continue;
      lastSeen = customId;
      if (!state.selectedSet.has(customId) && matchesFilter(customId, filter)) {
        items.push(customId);
        if (items.length >= limit) break;
      }
      iterationsSinceYield += 1;
      ({ iterationsSinceYield, sliceStartAt } = await maybeYield(
        iterationsSinceYield,
        sliceStartAt,
      ));
    }
  }

  const nextCursor = items.length > 0 ? lastSeen : null;
  return { items, nextCursor, stateVersion: state.stateVersion };
}

export async function getRightPage(input: {
  filter?: string;
  cursor?: number;
  limit?: number;
}): Promise<CursorPageResponse> {
  const state = getState();
  const filter = (input.filter ?? "").trim();
  const limit = normalizeLimit(input.limit);
  const cursor = Number.isInteger(input.cursor) ? (input.cursor as number) : null;
  const items: ItemId[] = [];

  let startIndex = 0;
  if (cursor !== null) {
    const index = state.selectedOrder.indexOf(cursor);
    if (index >= 0) {
      startIndex = index + 1;
    }
  }

  let lastSeen: ItemId | null = null;
  let iterationsSinceYield = 0;
  let sliceStartAt = Date.now();

  for (let index = startIndex; index < state.selectedOrder.length; index += 1) {
    const id = state.selectedOrder[index];
    lastSeen = id;
    if (matchesFilter(id, filter)) {
      items.push(id);
      if (items.length >= limit) break;
    }
    iterationsSinceYield += 1;
    ({ iterationsSinceYield, sliceStartAt } = await maybeYield(
      iterationsSinceYield,
      sliceStartAt,
    ));
  }

  return {
    items,
    nextCursor: items.length > 0 ? lastSeen : null,
    stateVersion: state.stateVersion,
  };
}
