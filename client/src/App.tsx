import { useMemo, useState } from "react";
import { VirtualList } from "./components/VirtualList";
import { SortableRightList } from "./components/SortableRightList";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { useActions } from "./hooks/useActions";
import { useLeftItemsQuery, useRightItemsQuery, useStateMetaQuery } from "./hooks/useItemsQueries";
import "./App.css";

function flattenPages(data?: { pages: Array<{ items: number[] }> }): number[] {
  if (!data) return [];
  return data.pages.flatMap((page) => page.items);
}

function App() {
  const [leftFilterInput, setLeftFilterInput] = useState("");
  const [rightFilterInput, setRightFilterInput] = useState("");
  const [customIdInput, setCustomIdInput] = useState("");

  const leftFilter = useDebouncedValue(leftFilterInput, 250);
  const rightFilter = useDebouncedValue(rightFilterInput, 250);

  const leftQuery = useLeftItemsQuery(leftFilter);
  const rightQuery = useRightItemsQuery(rightFilter);
  const metaQuery = useStateMetaQuery();

  const leftItems = useMemo(() => flattenPages(leftQuery.data), [leftQuery.data]);
  const rightItems = useMemo(() => flattenPages(rightQuery.data), [rightQuery.data]);

  const { addMutation, deselectMutation, reorderMutation, selectMutation } = useActions();

  const onAdd = () => {
    const parsed = Number(customIdInput);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return;
    }
    addMutation.mutate(parsed);
    setCustomIdInput("");
  };

  return (
    <main className="layout">
      <header className="topbar">
        <h1>Virtual Range Selector</h1>
        <div className="queue-indicator">
          <span>Version: {metaQuery.data?.stateVersion ?? "-"}</span>
          <span>Mutation queue: {metaQuery.data?.pendingMutation ?? 0}</span>
          <span>Add queue: {metaQuery.data?.pendingAdd ?? 0}</span>
        </div>
      </header>
      <section className="columns">
        <div className="panel">
          <h2>Available IDs</h2>
          <div className="panel-controls">
            <input
              value={leftFilterInput}
              onChange={(event) => setLeftFilterInput(event.target.value)}
              placeholder="Filter by substring"
            />
            <div className="add-row">
              <input
                value={customIdInput}
                onChange={(event) => setCustomIdInput(event.target.value)}
                placeholder="Add custom ID"
              />
              <button type="button" onClick={onAdd}>
                Add
              </button>
            </div>
          </div>
          <VirtualList
            items={leftItems}
            loading={leftQuery.isFetching}
            hasMore={Boolean(leftQuery.hasNextPage)}
            onEndReached={() => {
              if (leftQuery.hasNextPage && !leftQuery.isFetchingNextPage) {
                leftQuery.fetchNextPage();
              }
            }}
            emptyText="No items in left panel"
            renderRow={(itemId) => (
              <div className="item-row">
                <span className="id-tag">#{itemId}</span>
                <button type="button" onClick={() => selectMutation.mutate(itemId)}>
                  Select
                </button>
              </div>
            )}
          />
        </div>

        <div className="panel">
          <h2>Selected IDs</h2>
          <div className="panel-controls">
            <input
              value={rightFilterInput}
              onChange={(event) => setRightFilterInput(event.target.value)}
              placeholder="Filter by substring"
            />
          </div>
          <SortableRightList
            items={rightItems}
            loading={rightQuery.isFetching}
            hasMore={Boolean(rightQuery.hasNextPage)}
            onEndReached={() => {
              if (rightQuery.hasNextPage && !rightQuery.isFetchingNextPage) {
                rightQuery.fetchNextPage();
              }
            }}
            onDeselect={(id) => deselectMutation.mutate(id)}
            onReorder={(payload) => reorderMutation.mutate(payload)}
          />
        </div>
      </section>
    </main>
  );
}

export default App;
