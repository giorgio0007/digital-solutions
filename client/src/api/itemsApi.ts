import { apiGet, apiPost } from "./http";
import type { ActionQueueAck, CursorPage, ReorderPayload, StateMeta } from "../types";

export function getLeftItems(
  filter: string,
  cursor: number | null,
  signal?: AbortSignal,
): Promise<CursorPage> {
  return apiGet("/items/left", { filter, cursor: cursor ?? undefined, limit: 20 }, signal);
}

export function getRightItems(
  filter: string,
  cursor: number | null,
  signal?: AbortSignal,
): Promise<CursorPage> {
  return apiGet("/items/right", { filter, cursor: cursor ?? undefined, limit: 20 }, signal);
}

export function getStateMeta(signal?: AbortSignal): Promise<StateMeta> {
  return apiGet("/state/meta", {}, signal);
}

export function selectItem(id: number): Promise<ActionQueueAck> {
  return apiPost("/actions/select", { id });
}

export function deselectItem(id: number): Promise<ActionQueueAck> {
  return apiPost("/actions/deselect", { id });
}

export function addItem(id: number): Promise<ActionQueueAck> {
  return apiPost("/actions/add", { id });
}

export function reorderItem(payload: ReorderPayload): Promise<ActionQueueAck> {
  return apiPost("/actions/reorder", payload);
}
