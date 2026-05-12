import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getLeftItems, getRightItems, getStateMeta } from "../api/itemsApi";

export function useLeftItemsQuery(filter: string) {
  return useInfiniteQuery({
    queryKey: ["left", filter],
    queryFn: ({ pageParam, signal }) => getLeftItems(filter, pageParam, signal),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useRightItemsQuery(filter: string) {
  return useInfiniteQuery({
    queryKey: ["right", filter],
    queryFn: ({ pageParam, signal }) => getRightItems(filter, pageParam, signal),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useStateMetaQuery() {
  return useQuery({
    queryKey: ["state-meta"],
    queryFn: ({ signal }) => getStateMeta(signal),
    refetchInterval: 1000,
  });
}
