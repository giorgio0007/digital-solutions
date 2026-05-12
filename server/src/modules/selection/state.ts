import { MAX_DEFAULT_ID, type ItemId } from "../../shared/types";

export interface AppState {
  selectedOrder: ItemId[];
  selectedSet: Set<ItemId>;
  customItems: Set<ItemId>;
  customOrder: ItemId[];
  stateVersion: number;
}

const state: AppState = {
  selectedOrder: [],
  selectedSet: new Set<ItemId>(),
  customItems: new Set<ItemId>(),
  customOrder: [],
  stateVersion: 1,
};

export function getState(): AppState {
  return state;
}

export function hasBaseItem(id: ItemId): boolean {
  return Number.isInteger(id) && id >= 1 && id <= MAX_DEFAULT_ID;
}

export function hasCustomItem(id: ItemId): boolean {
  return state.customItems.has(id);
}

export function itemExists(id: ItemId): boolean {
  return hasBaseItem(id) || hasCustomItem(id);
}

export function addCustomItem(id: ItemId): { changed: boolean; reason?: string } {
  if (!Number.isInteger(id) || id < 1) {
    return { changed: false, reason: "ID must be a positive integer" };
  }
  if (hasBaseItem(id)) {
    return { changed: false, reason: "ID already exists in base range" };
  }
  if (state.customItems.has(id)) {
    return { changed: false, reason: "Custom ID already exists" };
  }
  state.customItems.add(id);
  state.customOrder.push(id);
  return { changed: true };
}

export function selectItem(id: ItemId): { changed: boolean; reason?: string } {
  if (!itemExists(id)) {
    return { changed: false, reason: "Item does not exist" };
  }
  if (state.selectedSet.has(id)) {
    return { changed: false, reason: "Item already selected" };
  }
  state.selectedSet.add(id);
  state.selectedOrder.push(id);
  return { changed: true };
}

export function deselectItem(id: ItemId): { changed: boolean; reason?: string } {
  if (!state.selectedSet.has(id)) {
    return { changed: false, reason: "Item is not selected" };
  }
  state.selectedSet.delete(id);
  const index = state.selectedOrder.indexOf(id);
  if (index >= 0) {
    state.selectedOrder.splice(index, 1);
  }
  return { changed: true };
}

export function reorderItem(
  itemId: ItemId,
  targetId: ItemId,
  position: "before" | "after",
): { changed: boolean; reason?: string } {
  if (itemId === targetId) {
    return { changed: false, reason: "Source and target are equal" };
  }
  const sourceIndex = state.selectedOrder.indexOf(itemId);
  const targetIndex = state.selectedOrder.indexOf(targetId);
  if (sourceIndex < 0 || targetIndex < 0) {
    return { changed: false, reason: "Source or target not selected" };
  }

  const [value] = state.selectedOrder.splice(sourceIndex, 1);
  let insertionIndex = targetIndex;
  if (sourceIndex < targetIndex) {
    insertionIndex -= 1;
  }
  if (position === "after") {
    insertionIndex += 1;
  }
  state.selectedOrder.splice(insertionIndex, 0, value);
  return { changed: true };
}

export function bumpStateVersion(): number {
  state.stateVersion += 1;
  return state.stateVersion;
}
