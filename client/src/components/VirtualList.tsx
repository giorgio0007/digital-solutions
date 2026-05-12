import type { ReactNode } from "react";
import { Virtuoso } from "react-virtuoso";

interface VirtualListProps {
  items: number[];
  loading: boolean;
  hasMore: boolean;
  onEndReached: () => void;
  renderRow: (itemId: number) => ReactNode;
  emptyText: string;
}

export function VirtualList({
  items,
  loading,
  hasMore,
  onEndReached,
  renderRow,
  emptyText,
}: VirtualListProps) {
  if (!loading && items.length === 0) {
    return <div className="empty">{emptyText}</div>;
  }

  return (
    <Virtuoso
      style={{ height: 560, overflowX: "hidden" }}
      data={items}
      endReached={() => {
        if (hasMore && !loading) {
          onEndReached();
        }
      }}
      itemContent={(index, itemId) => (
        <div className="row-shell" key={`${itemId}-${index}`}>
          {renderRow(itemId)}
        </div>
      )}
      components={{
        Footer: () =>
          loading ? (
            <div className="list-footer">Загрузка...</div>
          ) : (
            <div className="list-footer"> </div>
          ),
      }}
    />
  );
}
