import type { Config } from '@netlify/functions';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { backupSnapshots, backupRuns } from '../../db/schema.ts';
import { sanitizeSnapshot, sendToSheets, vietnamDay } from '../server/backup-data.mjs';

export default async () => {
  const [snapshot] = await db.select().from(backupSnapshots).where(eq(backupSnapshots.id, 'main'));
  if (!snapshot) {
    console.log('Sao lưu chưa sẵn sàng: chưa có dữ liệu được đồng bộ.');
    return;
  }
  const id = vietnamDay();
  const [claim] = await db.insert(backupRuns).values({ id, status: 'running', snapshotRevision: snapshot.revision, message: 'Đang gửi dữ liệu tới Google Sheets.' }).onConflictDoNothing().returning();
  if (!claim) return;
  try {
    await sendToSheets(sanitizeSnapshot(snapshot.payload));
    await db.update(backupRuns).set({ status: 'success', message: 'Web App đã xác nhận nhận dữ liệu.' }).where(eq(backupRuns.id, id));
  } catch {
    await db.update(backupRuns).set({ status: 'error', message: 'Chưa xác nhận sao lưu thành công. Kiểm tra Web App và phản hồi JSON success/ok; kho dữ liệu tập trung vẫn được giữ.' }).where(eq(backupRuns.id, id));
    throw new Error('Google Sheets backup was not confirmed.');
  }
  // Keep 90 days of execution history.
  const oldRuns = await db.select({ id: backupRuns.id }).from(backupRuns).orderBy(desc(backupRuns.createdAt)).offset(90);
  for (const run of oldRuns) await db.delete(backupRuns).where(and(eq(backupRuns.id, run.id)));
};

// Netlify schedules use UTC. Vietnam is UTC+7 all year.
export const config: Config = { schedule: '0 16 * * *' };
