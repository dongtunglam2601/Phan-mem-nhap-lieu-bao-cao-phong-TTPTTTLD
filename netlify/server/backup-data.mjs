export const COLLECTIONS = ['entries', 'settings', 'users', 'reports'];

// Only account metadata belongs in a backup sent to a published spreadsheet.
export function sanitizeSnapshot(input) {
  if (!input || input.ver !== 1) throw new Error('Định dạng sao lưu không hợp lệ.');
  const output = { ver: 1, ts: Date.now() };
  for (const collection of COLLECTIONS) {
    if (!Array.isArray(input[collection])) throw new Error('Thiếu bộ dữ liệu: ' + collection);
    if (input[collection].length > 100000) throw new Error('Quá nhiều bản ghi.');
    const seen = new Set();
    output[collection] = input[collection].map(record => {
      if (!record || typeof record.id !== 'string' || !record.id || seen.has(record.id)) throw new Error('Mã bản ghi không hợp lệ hoặc trùng lặp.');
      seen.add(record.id);
      if (collection !== 'users') return record;
      const { id, name, role, perm, act } = record;
      return { id, name, role, perm, act };
    });
  }
  return output;
}

export function vietnamDay(date = new Date()) {
  return new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}

export async function sendToSheets(payload, fetcher = fetch) {
  const response = await fetcher('https://script.google.com/macros/s/AKfycbxco6Y4G8TRi3GVpxhNCQst_fipOiKc5MBZHcXmaexo6WbcZ4z3vYEf5ttsm1TluwSi/exec', {
    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload), redirect: 'follow', signal: AbortSignal.timeout(18000),
  });
  if (!response.ok) throw new Error('HTTP_ERROR');
  const text = await response.text();
  let result;
  try { result = JSON.parse(text); } catch { throw new Error('UNCONFIRMED_RESPONSE'); }
  if (!result || (result.success !== true && result.ok !== true && result.status !== 'success' && result.status !== 'ok')) throw new Error('UNCONFIRMED_RESPONSE');
}
