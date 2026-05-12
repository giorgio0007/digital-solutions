import type { Request, Response } from "express";
import { enqueue, getServerSnapshot } from "../queue/commandQueue";
import type { Command } from "../../shared/types";

function toId(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    return null;
  }
  return value;
}

export function postSelect(req: Request, res: Response): void {
  const id = toId(req.body?.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const command: Command = { type: "SELECT_ITEM", payload: { id } };
  const ack = enqueue(command);
  res.json({ ...ack, ...getServerSnapshot() });
}

export function postDeselect(req: Request, res: Response): void {
  const id = toId(req.body?.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const command: Command = { type: "DESELECT_ITEM", payload: { id } };
  const ack = enqueue(command);
  res.json({ ...ack, ...getServerSnapshot() });
}

export function postAdd(req: Request, res: Response): void {
  const id = toId(req.body?.id);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const command: Command = { type: "ADD_CUSTOM_ITEM", payload: { id } };
  const ack = enqueue(command);
  res.json({ ...ack, ...getServerSnapshot() });
}

export function postReorder(req: Request, res: Response): void {
  const itemId = toId(req.body?.itemId);
  const targetId = toId(req.body?.targetId);
  const position = req.body?.position;

  if (
    itemId === null ||
    targetId === null ||
    (position !== "before" && position !== "after")
  ) {
    res.status(400).json({ error: "Invalid reorder payload" });
    return;
  }

  const command: Command = {
    type: "REORDER_ITEM",
    payload: { itemId, targetId, position },
  };
  const ack = enqueue(command);
  res.json({ ...ack, ...getServerSnapshot() });
}
