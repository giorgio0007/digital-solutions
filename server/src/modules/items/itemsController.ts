import type { Request, Response } from "express";
import { getLeftPage, getRightPage } from "./pagination";
import { getQueueStats } from "../queue/commandQueue";
import { getState } from "../selection/state";

function toNumber(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
}

export async function getLeftItems(req: Request, res: Response): Promise<void> {
  const page = await getLeftPage({
    filter: typeof req.query.filter === "string" ? req.query.filter : "",
    cursor: toNumber(req.query.cursor),
    limit: toNumber(req.query.limit),
  });
  res.json(page);
}

export async function getRightItems(req: Request, res: Response): Promise<void> {
  const page = await getRightPage({
    filter: typeof req.query.filter === "string" ? req.query.filter : "",
    cursor: toNumber(req.query.cursor),
    limit: toNumber(req.query.limit),
  });
  res.json(page);
}

export function getStateMeta(_req: Request, res: Response): void {
  const state = getState();
  const queue = getQueueStats();
  res.json({
    stateVersion: state.stateVersion,
    pendingAdd: queue.pendingAdd,
    pendingMutation: queue.pendingMutation,
  });
}
