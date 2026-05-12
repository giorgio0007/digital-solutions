import { useMemo, useState } from 'react';
import { VirtualList } from './components/VirtualList';
import { SelectedVirtualList } from './components/SelectedVirtualList';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { useActions } from './hooks/useActions';
import { useLeftItemsQuery, useRightItemsQuery } from './hooks/useItemsQueries';
import './App.css';

function flattenPages(data?: { pages: Array<{ items: number[] }> }): number[] {
  if (!data) return [];
  return data.pages.flatMap((page) => page.items);
}

function App() {
  const [leftFilterInput, setLeftFilterInput] = useState('');
  const [rightFilterInput, setRightFilterInput] = useState('');
  const [customIdInput, setCustomIdInput] = useState('');

  const leftFilter = useDebouncedValue(leftFilterInput, 250);
  const rightFilter = useDebouncedValue(rightFilterInput, 250);

  const leftQuery = useLeftItemsQuery(leftFilter);
  const rightQuery = useRightItemsQuery(rightFilter);

  const leftItems = useMemo(
    () => flattenPages(leftQuery.data),
    [leftQuery.data]
  );
  const rightItems = useMemo(
    () => flattenPages(rightQuery.data),
    [rightQuery.data]
  );

  const { addMutation, deselectMutation, reorderMutation, selectMutation } =
    useActions();

  const onAdd = () => {
    const parsed = Number(customIdInput);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return alert('ID должен быть числом, еще и целым еще и положительным:)');
    }
    addMutation.mutate(parsed);
    setCustomIdInput('');
  };

  return (
    <main className="layout">
      <header className="topbar">
        <h1>Выбор из виртуального миллиона ID</h1>
      </header>
      <section className="columns">
        <div className="panel">
          <h2>Все ID</h2>
          <div className="panel-controls">
            <input
              value={leftFilterInput}
              onChange={(event) => setLeftFilterInput(event.target.value)}
              placeholder="Фильтровать по ID"
            />
            <div className="add-row">
              <input
                value={customIdInput}
                onChange={(event) => setCustomIdInput(event.target.value)}
                placeholder="Свой ID (любой положительный)"
              />
              <button type="button" onClick={onAdd}>
                Добавить
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
            emptyText="Здесь пока пусто"
            renderRow={(itemId) => (
              <div className="item-row">
                <span className="id-tag">#{itemId}</span>
                <button
                  type="button"
                  onClick={() => selectMutation.mutate(itemId)}
                >
                  Выбрать
                </button>
              </div>
            )}
          />
        </div>

        <div className="panel">
          <h2>Выбранные ID</h2>
          <div className="panel-controls">
            <input
              value={rightFilterInput}
              onChange={(event) => setRightFilterInput(event.target.value)}
              placeholder="Фильтровать по ID"
            />
          </div>
          <SelectedVirtualList
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
