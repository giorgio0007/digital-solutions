export interface CursorPage {
  items: number[];
  nextCursor: number | null;
  stateVersion: number;
}

export interface StateMeta {
  stateVersion: number;
  pendingAdd: number;
  pendingMutation: number;
}

export interface ActionQueueAck {
  accepted: boolean;
  deduplicated: boolean;
  queueType: "add" | "mutation";
  key: string;
}

export interface ReorderPayload {
  itemId: number;
  targetId: number;
  position: "before" | "after";
}
