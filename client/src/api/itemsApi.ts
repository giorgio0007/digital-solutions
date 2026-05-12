import { apiGet, apiPost } from './http';
import type { ActionAckResponse, CursorPage, ReorderPayload } from '../types';

export function getLeftItems(
  filter: string,
  cursor: number | null,
  signal?: AbortSignal
): Promise<CursorPage> {
  return apiGet(
    '/items/left',
    { filter, cursor: cursor ?? undefined, limit: 20 },
    signal
  );
}

export function getRightItems(
  filter: string,
  cursor: number | null,
  signal?: AbortSignal
): Promise<CursorPage> {
  return apiGet(
    '/items/right',
    { filter, cursor: cursor ?? undefined, limit: 20 },
    signal
  );
}

export function selectItem(id: number): Promise<ActionAckResponse> {
  return apiPost('/actions/select', { id });
}

export function deselectItem(id: number): Promise<ActionAckResponse> {
  return apiPost('/actions/deselect', { id });
}

export function addItem(id: number): Promise<ActionAckResponse> {
  return apiPost('/actions/add', { id });
}

export function reorderItem(
  payload: ReorderPayload
): Promise<ActionAckResponse> {
  return apiPost('/actions/reorder', payload);
}
