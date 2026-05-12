# Virtual Range Selector (Fullstack)

Two-panel fullstack app with shared in-memory state:
- left panel: available IDs
- right panel: selected IDs

Tech stack:
- Backend: Node.js + Express + TypeScript
- Frontend: React + Vite + TypeScript
- Data: process memory only (no DB)

## Run

```bash
# backend
cd server
npm install
npm run dev

# frontend (new terminal)
cd client
npm install
npm run dev
```

Frontend expects backend at `http://localhost:3001/api`.
You can override with `VITE_API_BASE`.

## Architecture

### Backend

Structure:

```text
server/src/
  modules/
    actions/
    items/
    queue/
    selection/
  shared/
  app.ts
```

Core state (`modules/selection/state.ts`):
- `selectedOrder: number[]` - global selected order source of truth
- `selectedSet: Set<number>` - O(1) selection membership checks
- `customItems: Set<number>` - manually added IDs
- `customOrder: number[]` - stable traversal for custom items
- `stateVersion: number` - incremented on applied flush with changes

Virtual base range:
- IDs `1..1_000_000` are implicit and not materialized in memory
- only selected/custom deltas are stored

### Lazy filtering and pagination

Endpoints:
- `GET /api/items/left?filter=&cursor=&limit=20`
- `GET /api/items/right?filter=&cursor=&limit=20`

Cursor-based pagination is used (`nextCursor`).

Left list is evaluated lazily:
- iterate IDs
- skip selected
- apply filter
- collect only requested chunk (20 by default)
- stop early as soon as chunk is ready

To avoid event-loop blocking on worst-case filters:
- implementation yields to event loop with `setImmediate`
- each sync slice is capped (~10ms)

### Command queue, dedup, batching

Commands:
- `SELECT_ITEM`
- `DESELECT_ITEM`
- `REORDER_ITEM`
- `ADD_CUSTOM_ITEM`

Two queues:
- mutation queue flush every 1s
- add queue flush every 10s

Deduplication:
- command key is `${type}:${JSON.stringify(payload)}`
- duplicate keys are ignored until flush

Flush behavior:
- apply commands to in-memory state
- clear queue
- increment `stateVersion` if state changed

### API

Reads:
- `GET /api/items/left`
- `GET /api/items/right`
- `GET /api/state/meta` -> `{ stateVersion, pendingAdd, pendingMutation }` (manual refresh / post-mutation sync; client does **not** poll this every second)

Writes:
- `POST /api/actions/select` `{ id }`
- `POST /api/actions/deselect` `{ id }`
- `POST /api/actions/add` `{ id }`
- `POST /api/actions/reorder` `{ itemId, targetId, position }`

Each write responds with enqueue metadata **plus** the same `{ stateVersion, pendingAdd, pendingMutation }` snapshot so the UI can update indicators without hammering `/state/meta`.

Reorder is operation-based (no full array payload).

### Frontend

Uses:
- TanStack Query (`useInfiniteQuery`, mutations, invalidation)
- react-virtuoso (virtualized rendering for both panels)
- dnd-kit (drag/drop reorder on right panel)

UX behavior:
- debounced search in both panels
- stale requests canceled through query `AbortSignal`
- optimistic list updates for select/deselect/add so the UI does not flicker before the 1s / 10s server flush
- periodic resync roughly aligned with flush windows (invalidate lists + meta shortly after enqueue)
- queue indicators fed from mutation responses (no unconditional 1 Hz polling)
- drag/drop is vertical-only (`restrictToVerticalAxis`); horizontal dragging is suppressed
- drag/drop reorder works while filtered because backend reorders against global `selectedOrder` by `targetId` lookup

## Tradeoffs

- No DB means fast local operations but volatile state (reset on server restart).
- Dedup is per queue-window (until next flush), not historical forever.
- Right-list optimistic reorder currently updates loaded pages; offscreen pages are eventually consistent after refetch.
- `selectedOrder.indexOf(...)` is O(n). This keeps code simple and is acceptable for typical interactive selected-set sizes.

## Performance decisions

- Never allocate base range array (`1..1_000_000` stays virtual).
- No full-range `.filter()` calls.
- Pagination is cursor-based and chunked.
- Lazy iteration with early stop minimizes scanned IDs.
- Event-loop yielding avoids long blocking scans.
- Virtualized UI keeps DOM size bounded.
- Set-based membership avoids repeated linear lookups for selected checks.

## Edge cases handled

- duplicate custom IDs (rejected in state layer)
- selecting already selected item (ignored)
- deselecting non-selected item (ignored)
- custom IDs over `1_000_000` supported
- reorder with identical source/target ignored
- queue dedup for rapid repeated same operations

