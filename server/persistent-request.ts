import { eq } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { PoolClient } from 'pg';
import { pool } from './db';
import * as schema from './db-schema';
import { appState } from './db-schema';
import { restoreStoreSnapshot, serializeStoreSnapshot } from './store';

export async function persistentRequest(_req: Request, res: Response, next: NextFunction) {
  let client: PoolClient | undefined;

  try {
    const requestClient = await pool.connect();
    client = requestClient;
    await requestClient.query('BEGIN');
    const requestDb = drizzle(requestClient, { schema });
    await requestDb
      .insert(appState)
      .values({ id: 'main', data: serializeStoreSnapshot() })
      .onConflictDoNothing();

    const [row] = await requestDb
      .select()
      .from(appState)
      .where(eq(appState.id, 'main'))
      .for('update');

    if (!row) {
      throw new Error('The persistent application state could not be loaded.');
    }

    restoreStoreSnapshot(row.data as ReturnType<typeof serializeStoreSnapshot>);

    let finalizePromise: Promise<void> | null = null;
    const finalize = () => {
      if (!finalizePromise) {
        finalizePromise = (async () => {
          await requestDb
            .update(appState)
            .set({ data: serializeStoreSnapshot(), updatedAt: new Date() })
            .where(eq(appState.id, 'main'));
          await requestClient.query('COMMIT');
          requestClient.release();
        })();
      }
      return finalizePromise;
    };

    const originalEnd = res.end.bind(res) as (...args: any[]) => Response;
    let responseEnded = false;

    res.end = ((...args: any[]) => {
      if (responseEnded) return res;
      responseEnded = true;
      void finalize()
        .then(() => originalEnd(...args))
        .catch(async (error: unknown) => {
          console.error('Failed to persist application state:', error);
          await requestClient.query('ROLLBACK').catch(() => {});
          requestClient.release();
          if (res.headersSent) {
            originalEnd();
            return;
          }
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          originalEnd(JSON.stringify({ error: 'Service temporarily unavailable. Please retry.' }));
        });
      return res;
    }) as Response['end'];

    next();
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
    }
    next(error);
  }
}
