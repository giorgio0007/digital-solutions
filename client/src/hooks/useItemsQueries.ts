import { useInfiniteQuery } from '@tanstack/react-query';
import { getLeftItems, getRightItems } from '../api/itemsApi';

export function useLeftItemsQuery(filter: string) {
  return useInfiniteQuery({
    queryKey: ['left', filter],
    queryFn: ({ pageParam, signal }) => getLeftItems(filter, pageParam, signal),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useRightItemsQuery(filter: string) {
  return useInfiniteQuery({
    queryKey: ['right', filter],
    queryFn: ({ pageParam, signal }) =>
      getRightItems(filter, pageParam, signal),
    initialPageParam: null as number | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
