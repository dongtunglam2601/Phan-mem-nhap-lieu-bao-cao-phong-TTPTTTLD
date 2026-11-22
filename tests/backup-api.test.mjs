import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/server/index.mjs';

test('backup API requires a configured, verified administrator and same-origin writes', async () => {
  const previousEmail = process.env.BACKUP_ADMIN_EMAIL;
  const previousContext = globalThis.Netlify;
  const previousFetch = globalThis.fetch;
  try {
    delete process.env.BACKUP_ADMIN_EMAIL;
    const request = () => new Request('https://backup.example/api/backup', { method: 'PUT', headers: { Origin: 'https://other.example' } });
    assert.equal((await handler(request())).status, 503);
    process.env.BACKUP_ADMIN_EMAIL = 'admin@example.test';
    globalThis.Netlify = { context: { url: 'https://backup.example', cookies: { get: () => null } } };
    assert.equal((await handler(request())).status, 401);
    globalThis.Netlify.context.cookies.get = () => 'test-session';
    globalThis.fetch = async () => Response.json({ id: 'other', email: 'other@example.test', confirmed_at: '2026-11-22T00:00:00Z' });
    assert.equal((await handler(request())).status, 403);
    globalThis.fetch = async () => Response.json({ id: 'admin', email: 'admin@example.test' });
    assert.equal((await handler(request())).status, 403);
    globalThis.fetch = async () => Response.json({ id: 'admin', email: 'admin@example.test', confirmed_at: '2026-11-22T00:00:00Z' });
    const crossOrigin = await handler(request());
    assert.equal(crossOrigin.status, 403);
    assert.match((await crossOrigin.json()).error, /Nguồn/);
    assert.equal((await handler(new Request('https://backup.example/api/backup', { method: 'DELETE' }))).status, 405);
  } finally {
    if (previousEmail === undefined) delete process.env.BACKUP_ADMIN_EMAIL;
    else process.env.BACKUP_ADMIN_EMAIL = previousEmail;
    globalThis.Netlify = previousContext;
    globalThis.fetch = previousFetch;
  }
});
