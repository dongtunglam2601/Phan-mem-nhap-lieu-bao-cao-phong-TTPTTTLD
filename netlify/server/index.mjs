import { getUser } from '@netlify/identity';
import { eq, desc } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { backupSnapshots, backupRuns } from '../../db/schema.ts';
import { sanitizeSnapshot } from './backup-data.mjs';

const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export default async function handler(request) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/backup') return json({ error: 'Không tìm thấy.' }, 404);
  const allowedEmail = process.env.BACKUP_ADMIN_EMAIL?.trim().toLowerCase();
  if (!allowedEmail) return json({ error: 'Chưa cấu hình email quản trị sao lưu.' }, 503);
  const user = await getUser();
  if (!user) return json({ error: 'Hãy đăng nhập tài khoản sao lưu.' }, 401);
  if (!user.confirmedAt || user.email?.toLowerCase() !== allowedEmail) return json({ error: 'Tài khoản không có quyền quản trị sao lưu hoặc chưa xác minh email.' }, 403);
  try {
    if (request.method === 'GET') {
      const [snapshot] = await db.select({ revision: backupSnapshots.revision, updatedAt: backupSnapshots.updatedAt }).from(backupSnapshots).where(eq(backupSnapshots.id, 'main'));
      const [lastRun] = await db.select().from(backupRuns).orderBy(desc(backupRuns.createdAt)).limit(1);
      return json({ snapshot: snapshot || null, lastRun: lastRun || null });
    }
    if (request.method !== 'PUT') return json({ error: 'Phương thức không hỗ trợ.' }, 405);
    if (request.headers.get('origin') !== url.origin) return json({ error: 'Nguồn yêu cầu không hợp lệ.' }, 403);
    // Read a bounded stream rather than trusting Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'Thiếu dữ liệu.' }, 400);
    const chunks = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 4500000) { await reader.cancel(); return json({ error: 'Bản sao lưu vượt giới hạn 4,5 MB.' }, 413); }
      chunks.push(value);
    }
    let body, payload;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); payload = sanitizeSnapshot(body.payload); }
    catch { return json({ error: 'Dữ liệu sao lưu không hợp lệ.' }, 400); }
    if (!Number.isSafeInteger(body.revision) || body.revision < 0) return json({ error: 'Phiên bản không hợp lệ.' }, 400);
    let saved;
    if (body.revision === 0) {
      [saved] = await db.insert(backupSnapshots).values({ id: 'main', payload }).onConflictDoNothing().returning({ revision: backupSnapshots.revision });
    } else {
      const { and } = await import('drizzle-orm');
      [saved] = await db.update(backupSnapshots).set({ payload, revision: body.revision + 1, updatedAt: new Date() }).where(and(eq(backupSnapshots.id, 'main'), eq(backupSnapshots.revision, body.revision))).returning({ revision: backupSnapshots.revision });
    }
    if (!saved) return json({ error: 'Kho sao lưu đã thay đổi trên thiết bị khác. Tải lại trạng thái, kiểm tra dữ liệu và bấm đồng bộ lại.' }, 409);
    return json({ revision: saved.revision });
  } catch {
    return json({ error: 'Không truy cập được kho sao lưu. Dữ liệu trên máy chưa bị thay đổi.' }, 503);
  }
}

export const config = { path: '/api/*' };
