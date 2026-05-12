import { getState, hasBaseItem } from './state';
import { getPendingCommands } from '../queue/commandQueue';
import type { ItemId } from '../../shared/types';

export interface ProjectedState {
  selectedOrder: ItemId[];
  selectedSet: Set<ItemId>;
  customItems: Set<ItemId>;
}

export function getProjectedState(): ProjectedState {
  const baseState = getState();
  const { addCommands, mutationCommands } = getPendingCommands();

  const projectedCustomItems = new Set(baseState.customItems);
  const projectedSelectedSet = new Set(baseState.selectedSet);
  const projectedSelectedOrder = [...baseState.selectedOrder];

  for (const cmd of addCommands) {
    projectedCustomItems.add(cmd.payload.id);
  }

  for (const cmd of mutationCommands) {
    const { type, payload } = cmd;

    if (type === 'SELECT_ITEM') {
      if (!projectedSelectedSet.has(payload.id)) {
        projectedSelectedSet.add(payload.id);
        projectedSelectedOrder.push(payload.id);
      }
    } else if (type === 'DESELECT_ITEM') {
      if (projectedSelectedSet.has(payload.id)) {
        projectedSelectedSet.delete(payload.id);
        const idx = projectedSelectedOrder.indexOf(payload.id);
        if (idx !== -1) projectedSelectedOrder.splice(idx, 1);
      }
    } else if (type === 'REORDER_ITEM') {
      const { itemId, targetId, position } = payload;
      const sIdx = projectedSelectedOrder.indexOf(itemId);
      const tIdx = projectedSelectedOrder.indexOf(targetId);

      if (sIdx !== -1 && tIdx !== -1) {
        const [val] = projectedSelectedOrder.splice(sIdx, 1);
        let insIdx = projectedSelectedOrder.indexOf(targetId); // ищем заново после сплайса
        if (position === 'after') insIdx += 1;
        projectedSelectedOrder.splice(insIdx, 0, val);
      }
    }
  }

  return {
    customItems: projectedCustomItems,
    selectedSet: projectedSelectedSet,
    selectedOrder: projectedSelectedOrder,
  };
}
