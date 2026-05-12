export const MAX_DEFAULT_ID = 1_000_000;
export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;

export type ItemId = number;

export interface CursorPageResponse {
  items: ItemId[];
  nextCursor: ItemId | null;
  stateVersion: number;
}

export type CommandType =
  | "SELECT_ITEM"
  | "DESELECT_ITEM"
  | "REORDER_ITEM"
  | "ADD_CUSTOM_ITEM";

export interface SelectCommand {
  type: "SELECT_ITEM";
  payload: { id: ItemId };
}

export interface DeselectCommand {
  type: "DESELECT_ITEM";
  payload: { id: ItemId };
}

export interface ReorderCommand {
  type: "REORDER_ITEM";
  payload: {
    itemId: ItemId;
    targetId: ItemId;
    position: "before" | "after";
  };
}

export interface AddCustomItemCommand {
  type: "ADD_CUSTOM_ITEM";
  payload: { id: ItemId };
}

export type Command =
  | SelectCommand
  | DeselectCommand
  | ReorderCommand
  | AddCustomItemCommand;
