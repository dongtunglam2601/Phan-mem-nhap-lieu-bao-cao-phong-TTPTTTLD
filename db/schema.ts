import { pgTable, text, jsonb, integer, timestamp } from 'drizzle-orm/pg-core';

export const backupSnapshots = pgTable('backup_snapshots', {
  id: text().primaryKey(),
  payload: jsonb().notNull(),
  revision: integer().notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const backupRuns = pgTable('backup_runs', {
  id: text().primaryKey(),
  status: text().notNull(),
  snapshotRevision: integer('snapshot_revision').notNull(),
  message: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
