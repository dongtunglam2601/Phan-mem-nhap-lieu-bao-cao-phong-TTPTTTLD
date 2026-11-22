import { login, signup, getUser, logout, handleAuthCallback, updateUser, acceptInvite, requestPasswordRecovery } from '@netlify/identity';

const destination = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSZtePERUo-nD9p5fJqmDZ39dzeT7YRgGNme091d-kPRgo5s5BcH78LXYK_CGM8onKSGfh3iQnkQttV/pubhtml';
let revision = null, enabled = false, timer, pending = false, running = false;
let status = 'Chưa kết nối kho sao lưu.', authUser = null, inviteToken = null, resetPassword = false;
const fmt = value => value ? new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : 'Chưa có';

async function api(method = 'GET', body) {
  // getUser refreshes an expired browser session before the API call.
  await getUser();
  const response = await fetch('/api/backup', { method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 409) { enabled = false; revision = null; }
    throw new Error(result.error || 'Không kết nối được kho sao lưu.');
  }
  return result;
}

function show(message) {
  status = message;
  const el = document.getElementById('backup-message');
  if (el) el.textContent = message;
  const banner = document.getElementById('backup-banner');
  if (banner) banner.textContent = 'Sao lưu: ' + message;
}

async function refreshStatus() {
  try {
    const result = await api();
    revision = result.snapshot?.revision || 0;
    const run = result.lastRun;
    show(`Kho tập trung: ${fmt(result.snapshot?.updatedAt)}. Lần chạy: ${run ? run.id + ' — ' + run.message : 'Chưa chạy'}.`);
  } catch (e) { show(e.message); }
}

async function sync() {
  if (!enabled || !window.backupCanUpload()) return;
  if (running) { pending = true; return; }
  running = true;
  pending = false;
  show('Đang chuyển dữ liệu lên kho sao lưu…');
  try {
    const payload = await window.collectBackupData();
    const result = await api('PUT', { revision, payload });
    revision = result.revision;
    show(`Đã đồng bộ lúc ${fmt(new Date())}. Sẵn sàng sao lưu lúc 23:00 giờ Việt Nam.`);
  } catch (e) {
    pending = true;
    show('Chưa đồng bộ: ' + e.message + ' Hãy giữ trang mở và thử lại.');
  } finally {
    running = false;
    if (pending && enabled) { clearTimeout(timer); timer = setTimeout(sync, 30000); }
  }
}

function changed() {
  pending = true;
  if (!enabled) { show('Có thay đổi trên máy chưa lên kho sao lưu. Mở Dữ liệu đã nhập và kết nối sao lưu trên máy có đầy đủ dữ liệu.'); return; }
  show('Có thay đổi chưa lên kho sao lưu.');
  clearTimeout(timer);
  timer = setTimeout(sync, 1500);
}

function mount() {
  const slot = document.getElementById('backup-panel');
  if (!slot) return;
  slot.innerHTML = `<h3>Sao lưu Google Sheets</h3>
    <p><b>23:00 hằng ngày · giờ Việt Nam</b> · Tự chạy cả khi đóng trình duyệt sau khi dữ liệu đã lên kho tập trung.</p>
    <p class="mut">Mở ứng dụng trên máy có đầy đủ dữ liệu và kết nối tài khoản email quản trị sao lưu. Khi kết nối, dữ liệu trên máy này thay thế bản sao tập trung; dữ liệu trên các trình duyệt khác không tự gộp. Sau mỗi lần lưu, giữ trang mở đến khi hiện “Đã đồng bộ”. Tài khoản trong bản sao chỉ gồm thông tin và phân quyền; khi khôi phục cần đặt lại mật khẩu.</p>
    <p><a href="${destination}" target="_blank" rel="noopener noreferrer">Mở bảng Google Sheets</a></p>
    <div id="backup-auth"></div><p id="backup-message" role="status" aria-live="polite"></p>`;
  slot.querySelector('#backup-message').textContent = status;
  const auth = slot.querySelector('#backup-auth');
  if (authUser && !resetPassword && !inviteToken) {
    const p = document.createElement('p'); p.textContent = 'Tài khoản sao lưu: ' + authUser.email; auth.append(p);
    auth.insertAdjacentHTML('beforeend', '<button class="btn" id="backup-connect">Đồng bộ dữ liệu máy này và bật tự đồng bộ</button> <button class="btn sec" id="backup-status">Tải lại trạng thái</button> <button class="btn sec" id="backup-logout">Ngắt kết nối</button>');
    auth.querySelector('#backup-connect').onclick = async () => {
      if (revision === null) { show('Hãy tải lại trạng thái trước khi đồng bộ.'); return; }
      enabled = true; await sync();
    };
    auth.querySelector('#backup-status').onclick = refreshStatus;
    auth.querySelector('#backup-logout').onclick = async () => { enabled = false; clearTimeout(timer); await logout(); authUser = null; revision = null; show('Đã ngắt kết nối. Lịch máy chủ tiếp tục dùng bản sao tập trung gần nhất.'); mount(); };
  } else {
    auth.innerHTML = `<form id="backup-login"><div class="row">
      ${resetPassword || inviteToken ? '' : '<div><label class="f" for="backup-email">Email quản trị sao lưu</label><input id="backup-email" type="email" autocomplete="username" required></div>'}
      <div><label class="f" for="backup-password">${resetPassword || inviteToken ? 'Mật khẩu mới' : 'Mật khẩu tài khoản sao lưu'}</label><input id="backup-password" type="password" minlength="8" autocomplete="${resetPassword || inviteToken ? 'new-password' : 'current-password'}" required></div>
      <button class="btn" type="submit">${resetPassword || inviteToken ? 'Lưu mật khẩu' : 'Đăng nhập sao lưu'}</button>
      ${resetPassword || inviteToken ? '' : '<button class="btn sec" type="button" id="backup-signup">Đăng ký email quản trị</button><button class="btn sec" type="button" id="backup-recover">Quên mật khẩu</button>'}
      </div></form>`;
    const credentials = () => ({ email: document.getElementById('backup-email')?.value.trim(), password: document.getElementById('backup-password').value });
    auth.querySelector('form').onsubmit = async e => {
      e.preventDefault(); const button = e.submitter; button.disabled = true;
      try {
        const { email, password } = credentials();
        if (inviteToken) authUser = await acceptInvite(inviteToken, password);
        else if (resetPassword) authUser = await updateUser({ password });
        else authUser = await login(email, password);
        inviteToken = null; resetPassword = false;
        await refreshStatus(); mount();
      } catch { show('Không đăng nhập được. Kiểm tra email quản trị, mật khẩu và thư xác minh.'); }
      finally { button.disabled = false; }
    };
    auth.querySelector('#backup-signup')?.addEventListener('click', async e => {
      if (!auth.querySelector('form').reportValidity()) return;
      e.target.disabled = true;
      try { const { email, password } = credentials(); await signup(email, password); show('Đã gửi yêu cầu đăng ký. Xác minh qua email rồi đăng nhập sao lưu.'); }
      catch { show('Chưa đăng ký được. Kiểm tra email, mật khẩu hoặc dùng đăng nhập nếu đã có tài khoản.'); }
      finally { document.getElementById('backup-password').value = ''; e.target.disabled = false; }
    });
    auth.querySelector('#backup-recover')?.addEventListener('click', async () => {
      const input = document.getElementById('backup-email'); if (!input.reportValidity() || !input.value) return;
      try { await requestPasswordRecovery(input.value.trim()); show('Kiểm tra email để đặt lại mật khẩu sao lưu.'); }
      catch { show('Chưa gửi được email khôi phục. Thử lại sau.'); }
    });
  }
}

window.Backup = { mount, changed };
window.addEventListener('online', () => { if (pending) sync(); });
window.addEventListener('beforeunload', e => { if (enabled && (pending || running)) { e.preventDefault(); e.returnValue = ''; } });
try {
  const callback = await handleAuthCallback();
  if (callback?.type === 'invite') inviteToken = callback.token;
  if (callback?.type === 'recovery') resetPassword = true;
  authUser = await getUser();
  if (authUser) await refreshStatus();
} catch { show('Chưa xác minh được tài khoản sao lưu. Hãy đăng nhập lại.'); }
mount();
