import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const appState = pgTable('app_state', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
