import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeSnapshot, sendToSheets, vietnamDay } from '../netlify/server/backup-data.mjs';

const data = () => ({ ver: 1, entries: [{ id: 'report-1', v: { a1: 12 } }], settings: [], users: [{ id: 'operator', name: 'Cán bộ', role: 'admin', perm: { a: 1 }, act: true, h: 'excluded', s: 'excluded', it: 120000, token: 'excluded' }], reports: [] });

test('preserves report data and exports only permitted account metadata', () => {
  const snapshot = sanitizeSnapshot(data());
  assert.deepEqual(snapshot.entries, data().entries);
  assert.deepEqual(Object.keys(snapshot.users[0]).sort(), ['act', 'id', 'name', 'perm', 'role']);
  assert.equal(snapshot.ver, 1);
  assert.equal(typeof snapshot.ts, 'number');
});

test('rejects incomplete snapshots and duplicate IDs rather than replacing valid data', () => {
  assert.throws(() => sanitizeSnapshot({ ver: 1 }));
  const duplicate = data(); duplicate.entries.push(duplicate.entries[0]);
  assert.throws(() => sanitizeSnapshot(duplicate));
  const invalid = data(); invalid.entries[0].id = '';
  assert.throws(() => sanitizeSnapshot(invalid));
});

test('uses the correct Vietnam day across the UTC date boundary', () => {
  assert.equal(vietnamDay(new Date('2026-11-22T16:00:00Z')), '2026-11-22');
  assert.equal(vietnamDay(new Date('2026-11-22T17:00:00Z')), '2026-11-23');
});

test('sends the full backup using the existing Web App payload format', async () => {
  const payload = sanitizeSnapshot(data());
  await sendToSheets(payload, async (url, options) => {
    assert.equal(new URL(url).hostname, 'script.google.com');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), payload);
    assert.equal(options.redirect, 'follow');
    return Response.json({ success: true });
  });
});

test('does not report success for Google login HTML, rejected data, or HTTP errors', async () => {
  for (const response of [new Response('<html>Sign in</html>'), Response.json({ success: false }), new Response('', { status: 403 })]) {
    await assert.rejects(sendToSheets(data(), async () => response));
  }
  for (const body of [{ ok: true }, { status: 'success' }, { status: 'ok' }]) {
    await sendToSheets(data(), async () => Response.json(body));
  }
});
