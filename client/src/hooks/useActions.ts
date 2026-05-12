import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addItem, deselectItem, reorderItem, selectItem } from "../api/itemsApi";

export function useActions() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["left"] });
    queryClient.invalidateQueries({ queryKey: ["right"] });
    queryClient.invalidateQueries({ queryKey: ["state-meta"] });
  };

  const selectMutation = useMutation({
    mutationFn: selectItem,
    onSuccess: invalidate,
  });

  const deselectMutation = useMutation({
    mutationFn: deselectItem,
    onSuccess: invalidate,
  });

  const addMutation = useMutation({
    mutationFn: addItem,
    onSuccess: invalidate,
  });

  const reorderMutation = useMutation({
    mutationFn: reorderItem,
    onMutate: async ({ itemId, targetId, position }) => {
      await queryClient.cancelQueries({ queryKey: ["right"] });
      const snapshots = queryClient.getQueriesData({ queryKey: ["right"] });
      queryClient.setQueriesData({ queryKey: ["right"] }, (oldData: any) => {
        if (!oldData?.pages) return oldData;
        const all = oldData.pages.flatMap((page: { items: number[] }) => page.items);
        const sourceIndex = all.indexOf(itemId);
        const targetIndex = all.indexOf(targetId);
        if (sourceIndex < 0 || targetIndex < 0) return oldData;
        const [value] = all.splice(sourceIndex, 1);
        let insertionIndex = targetIndex;
        if (sourceIndex < targetIndex) insertionIndex -= 1;
        if (position === "after") insertionIndex += 1;
        all.splice(insertionIndex, 0, value);
        const pageSize = 20;
        const pages = [];
        for (let i = 0; i < all.length; i += pageSize) {
          pages.push({
            ...oldData.pages[Math.floor(i / pageSize)],
            items: all.slice(i, i + pageSize),
          });
        }
        return { ...oldData, pages };
      });
      return { snapshots };
    },
    onError: (_err, _payload, context) => {
      if (!context?.snapshots) return;
      for (const [key, value] of context.snapshots) {
        queryClient.setQueryData(key, value);
      }
    },
    onSettled: invalidate,
  });

  return {
    selectMutation,
    deselectMutation,
    addMutation,
    reorderMutation,
  };
}
