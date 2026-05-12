import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { startQueueScheduler } from './modules/queue/commandQueue';

import { getLeft, getRight } from './modules/items/itemsController';

import {
  postAdd,
  postDeselect,
  postReorder,
  postSelect,
} from './modules/actions/actionsController';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/items/left', async (req, res, next) => {
  try {
    getLeft(req, res);
  } catch (error) {
    next(error);
  }
});
app.get('/api/items/right', async (req, res, next) => {
  try {
    getRight(req, res);
  } catch (error) {
    next(error);
  }
});

app.post('/api/actions/select', postSelect);
app.post('/api/actions/deselect', postDeselect);
app.post('/api/actions/reorder', postReorder);
app.post('/api/actions/add', postAdd);

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    res.status(500).json({
      error: 'Internal server error',
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
  },
);

const PORT = Number(process.env.PORT ?? '3001');
startQueueScheduler();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server started on port ${PORT}`);
});
