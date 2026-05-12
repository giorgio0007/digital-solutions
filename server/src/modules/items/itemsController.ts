import { Request, Response } from 'express';
import { getProjectedState } from '../selection/projection';
import { getState } from '../selection/state';
import { MAX_DEFAULT_ID, type ItemId } from '../../shared/types';

function* leftPanelGenerator(
  filter: string,
  startCursor: number,
  state: ReturnType<typeof getProjectedState>,
) {
  const filterStr = filter.toLowerCase();

  for (let id = startCursor + 1; id <= MAX_DEFAULT_ID; id++) {
    if (state.selectedSet.has(id as ItemId)) continue;
    if (filterStr && !String(id).includes(filterStr)) continue;
    yield id as ItemId;
  }

  const sortedCustom = Array.from(state.customItems).sort(
    (a: number, b: number) => a - b,
  );
  for (const id of sortedCustom) {
    if (id <= Math.max(startCursor, MAX_DEFAULT_ID)) continue;
    if (state.selectedSet.has(id)) continue;
    if (filterStr && !String(id).includes(filterStr)) continue;
    yield id;
  }
}

export const getLeft = (req: Request, res: Response): void => {
  const filter = String(req.query.filter || '');
  const cursor = Number(req.query.cursor) || 0;
  const limit = 20;

  const state = getProjectedState();
  const generator = leftPanelGenerator(filter, cursor, state);

  const items: ItemId[] = [];
  let nextCursor: ItemId | null = null;

  for (const id of generator) {
    if (items.length < limit) {
      items.push(id);
    } else {
      nextCursor = items[items.length - 1];
      break;
    }
  }

  res.json({
    items,
    nextCursor,
    stateVersion: getState().stateVersion,
  });
};

export const getRight = (req: Request, res: Response): void => {
  const filter = String(req.query.filter || '').toLowerCase();
  const cursor = req.query.cursor ? Number(req.query.cursor) : null;
  const limit = 20;

  const state = getProjectedState();

  const filtered = state.selectedOrder.filter(
    (id: ItemId) => !filter || String(id).includes(filter),
  );

  let startIndex = 0;
  if (cursor !== null) {
    const foundIndex = filtered.indexOf(cursor as ItemId);
    if (foundIndex !== -1) {
      startIndex = foundIndex + 1;
    }
  }

  const chunk = filtered.slice(startIndex, startIndex + limit);
  const nextCursor = chunk.length === limit ? chunk[chunk.length - 1] : null;

  res.json({
    items: chunk,
    nextCursor,
    stateVersion: getState().stateVersion,
  });
};
