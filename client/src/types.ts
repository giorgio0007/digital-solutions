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
  queueType: 'add' | 'mutation';
  key: string;
}

/** Action POST body: enqueue metadata + snapshot of queued/committed versioning */
export type ActionAckResponse = ActionQueueAck & StateMeta;

export interface ReorderPayload {
  itemId: number;
  targetId: number;
  position: 'before' | 'after';
}
