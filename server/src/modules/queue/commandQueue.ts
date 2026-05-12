import {
  addCustomItem,
  bumpStateVersion,
  deselectItem,
  getState,
  reorderItem,
  selectItem,
} from "../selection/state";
import type { AddCustomItemCommand, Command, CommandType } from "../../shared/types";

type QueueType = "add" | "mutation";

interface QueueStats {
  pendingAdd: number;
  pendingMutation: number;
}

interface EnqueueResult {
  accepted: boolean;
  deduplicated: boolean;
  queueType: QueueType;
  key: string;
}

interface FlushResult {
  applied: number;
  changed: boolean;
  type: QueueType;
}

const addQueue = new Map<string, AddCustomItemCommand>();
const mutationQueue = new Map<string, Command>();

const ADD_FLUSH_MS = 10_000;
const MUTATION_FLUSH_MS = 1_000;

function keyForCommand(command: Command): string {
  return `${command.type}:${JSON.stringify(command.payload)}`;
}

function resolveQueue(commandType: CommandType): QueueType {
  return commandType === "ADD_CUSTOM_ITEM" ? "add" : "mutation";
}

function applyCommand(command: Command): boolean {
  switch (command.type) {
    case "ADD_CUSTOM_ITEM":
      return addCustomItem(command.payload.id).changed;
    case "SELECT_ITEM":
      return selectItem(command.payload.id).changed;
    case "DESELECT_ITEM":
      return deselectItem(command.payload.id).changed;
    case "REORDER_ITEM":
      return reorderItem(
        command.payload.itemId,
        command.payload.targetId,
        command.payload.position,
      ).changed;
    default:
      return false;
  }
}

function flushQueue(queue: Map<string, Command>, type: QueueType): FlushResult {
  if (queue.size === 0) {
    return { applied: 0, changed: false, type };
  }

  let changed = false;
  const commands = [...queue.values()];
  queue.clear();
  for (const command of commands) {
    if (applyCommand(command)) {
      changed = true;
    }
  }

  if (changed) {
    bumpStateVersion();
  }
  return { applied: commands.length, changed, type };
}

export function enqueue(command: Command): EnqueueResult {
  const key = keyForCommand(command);
  const queueType = resolveQueue(command.type);
  const queue = queueType === "add" ? addQueue : mutationQueue;
  const existed = queue.has(key);
  if (!existed) {
    queue.set(key, command as never);
  }
  return {
    accepted: true,
    deduplicated: existed,
    queueType,
    key,
  };
}

export function getQueueStats(): QueueStats {
  return {
    pendingAdd: addQueue.size,
    pendingMutation: mutationQueue.size,
  };
}

export function getServerSnapshot(): QueueStats & { stateVersion: number } {
  const queue = getQueueStats();
  return {
    ...queue,
    stateVersion: getState().stateVersion,
  };
}

export function startQueueScheduler(): void {
  setInterval(() => {
    flushQueue(mutationQueue, "mutation");
  }, MUTATION_FLUSH_MS);

  setInterval(() => {
    flushQueue(addQueue, "add");
  }, ADD_FLUSH_MS);
}
