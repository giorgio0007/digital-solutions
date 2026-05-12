import { useEffect, useRef } from "react";
import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addItem, deselectItem, reorderItem, selectItem } from "../api/itemsApi";
import type { ActionAckResponse, CursorPage, StateMeta } from "../types";
import {
  optimisticAppendToRight,
  optimisticInsertIntoLeft,
  PAGE_LIMIT,
  removeIdFromInfinite,
  RESYNC_AFTER_ADD_MS,
  RESYNC_AFTER_MUTATION_MS,
} from "../lib/infiniteListCache";

type SnapshotEntry = readonly [QueryKey, unknown];

function snapshotAllPanels(queryClient: QueryClient): SnapshotEntry[] {
  return [...queryClient.getQueriesData({ queryKey: ["left"] }), ...queryClient.getQueriesData({ queryKey: ["right"] })];
}

function rollbackPanels(queryClient: QueryClient, snapshot: SnapshotEntry[] | undefined) {
  if (!snapshot) return;
  for (const [key, data] of snapshot) {
    queryClient.setQueryData(key, data);
  }
}

function applyQueuedSnapshot(queryClient: QueryClient, ack: Pick<StateMeta, "stateVersion" | "pendingAdd" | "pendingMutation">) {
  queryClient.setQueryData<StateMeta>(["state-meta"], {
    stateVersion: ack.stateVersion,
    pendingAdd: ack.pendingAdd,
    pendingMutation: ack.pendingMutation,
  });
}

export function useActions() {
  const queryClient = useQueryClient();

  const mutationResyncTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const addResyncTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const scheduleMutationListsResync = () => {
    if (mutationResyncTimer.current !== undefined) clearTimeout(mutationResyncTimer.current);
    mutationResyncTimer.current = setTimeout(() => {
      mutationResyncTimer.current = undefined;
      queryClient.invalidateQueries({ queryKey: ["left"] });
      queryClient.invalidateQueries({ queryKey: ["right"] });
      queryClient.invalidateQueries({ queryKey: ["state-meta"] });
    }, RESYNC_AFTER_MUTATION_MS);
  };

  const scheduleAddResync = () => {
    if (addResyncTimer.current !== undefined) clearTimeout(addResyncTimer.current);
    addResyncTimer.current = setTimeout(() => {
      addResyncTimer.current = undefined;
      queryClient.invalidateQueries({ queryKey: ["left"] });
      queryClient.invalidateQueries({ queryKey: ["right"] });
      queryClient.invalidateQueries({ queryKey: ["state-meta"] });
    }, RESYNC_AFTER_ADD_MS);
  };

  useEffect(
    () => () => {
      if (mutationResyncTimer.current !== undefined) clearTimeout(mutationResyncTimer.current);
      if (addResyncTimer.current !== undefined) clearTimeout(addResyncTimer.current);
    },
    [],
  );

  const selectMutation = useMutation({
    mutationFn: selectItem,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["left"] });
      await queryClient.cancelQueries({ queryKey: ["right"] });
      const snapshots = snapshotAllPanels(queryClient);

      queryClient.setQueriesData({ queryKey: ["left"] }, (old) => {
        const typed = old as InfiniteData<CursorPage, number | null> | undefined;
        if (!typed) return typed;
        return removeIdFromInfinite(typed, id);
      });

      for (const [queryKey] of queryClient.getQueriesData({ queryKey: ["right"] })) {
        const filterRaw = queryKey[1];
        const filter = typeof filterRaw === "string" ? filterRaw : "";
        queryClient.setQueryData(queryKey, (old) => {
          const typed = old as InfiniteData<CursorPage, number | null> | undefined;
          if (!typed) return typed;
          return optimisticAppendToRight(typed, id, filter);
        });
      }

      return { snapshots };
    },
    onSuccess: (ack: ActionAckResponse) => {
      applyQueuedSnapshot(queryClient, ack);
      scheduleMutationListsResync();
    },
    onError: (_error, _id, context) => rollbackPanels(queryClient, context?.snapshots),
  });

  const deselectMutation = useMutation({
    mutationFn: deselectItem,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["left"] });
      await queryClient.cancelQueries({ queryKey: ["right"] });
      const snapshots = snapshotAllPanels(queryClient);

      queryClient.setQueriesData({ queryKey: ["right"] }, (old) => {
        const typed = old as InfiniteData<CursorPage, number | null> | undefined;
        if (!typed) return typed;
        return removeIdFromInfinite(typed, id);
      });

      for (const [queryKey] of queryClient.getQueriesData({ queryKey: ["left"] })) {
        const filterRaw = queryKey[1];
        const filter = typeof filterRaw === "string" ? filterRaw : "";
        queryClient.setQueryData(queryKey, (old) => {
          const typed = old as InfiniteData<CursorPage, number | null> | undefined;
          if (!typed) return typed;
          return optimisticInsertIntoLeft(typed, id, filter);
        });
      }

      return { snapshots };
    },
    onSuccess: (ack: ActionAckResponse) => {
      applyQueuedSnapshot(queryClient, ack);
      scheduleMutationListsResync();
    },
    onError: (_error, _id, context) => rollbackPanels(queryClient, context?.snapshots),
  });

  const addMutation = useMutation({
    mutationFn: addItem,
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ["left"] });
      const snapshots = queryClient.getQueriesData({ queryKey: ["left"] });

      for (const [queryKey] of queryClient.getQueriesData({ queryKey: ["left"] })) {
        const filterRaw = queryKey[1];
        const filter = typeof filterRaw === "string" ? filterRaw : "";
        queryClient.setQueryData(queryKey, (old) => {
          const typed = old as InfiniteData<CursorPage, number | null> | undefined;
          if (!typed) return typed;
          return optimisticInsertIntoLeft(typed, id, filter);
        });
      }

      return { snapshots };
    },
    onSuccess: (ack: ActionAckResponse) => {
      applyQueuedSnapshot(queryClient, ack);
      scheduleAddResync();
    },
    onError: (_error, _id, context) => rollbackPanels(queryClient, context?.snapshots),
  });

  const reorderMutation = useMutation({
    mutationFn: reorderItem,
    onMutate: async ({ itemId, targetId, position }) => {
      await queryClient.cancelQueries({ queryKey: ["right"] });
      const snapshots = queryClient.getQueriesData({ queryKey: ["right"] });
      queryClient.setQueriesData({ queryKey: ["right"] }, (oldData) => {
        const data = oldData as InfiniteData<CursorPage, number | null> | undefined;
        if (!data?.pages?.length) return data;
        const merged = data.pages.flatMap((page: CursorPage) => page.items);
        const sourceIndex = merged.indexOf(itemId);
        const targetIndex = merged.indexOf(targetId);
        if (sourceIndex < 0 || targetIndex < 0) return data;
        const moved = [...merged];
        const [value] = moved.splice(sourceIndex, 1);
        let insertionIndex = targetIndex;
        if (sourceIndex < targetIndex) insertionIndex -= 1;
        if (position === "after") insertionIndex += 1;
        moved.splice(insertionIndex, 0, value);

        const rebuiltPages: CursorPage[] = [];
        for (let i = 0; i < moved.length; i += PAGE_LIMIT) {
          const slice = moved.slice(i, i + PAGE_LIMIT);
          rebuiltPages.push({
            items: slice,
            nextCursor: slice.at(-1)!,
            stateVersion: data.pages[0]?.stateVersion ?? 1,
          });
        }

        const pageParams: (number | null)[] = rebuiltPages.map((_page, idx) =>
          idx === 0 ? null : rebuiltPages[idx - 1]!.items.at(-1)!,
        );

        return { ...data, pages: rebuiltPages, pageParams };
      });
      return { snapshots };
    },
    onError: (_error, _payload, context) => rollbackPanels(queryClient, context?.snapshots),
    onSuccess: (ack: ActionAckResponse) => {
      applyQueuedSnapshot(queryClient, ack);
      scheduleMutationListsResync();
    },
  });

  return {
    selectMutation,
    deselectMutation,
    addMutation,
    reorderMutation,
  };
}
