/**
 * jisuanhuizong-ggb · 自建服务器方案云同步
 * API_BASE 默认按页面同源推断（/jisuan → /jisuan/api）；注册免邮箱验证码。
 */
const TOKEN_KEY = 'jisuan-cloud-token-v1';

/** 推断 API 根：自建站挂在 /jisuan/ 时为 origin+/jisuan；也可 init({apiBase}) 覆盖 */
function detectApiBase() {
  try {
    const loc = window.location;
    const origin = loc.origin;
    const path = loc.pathname || '';
    if (origin && origin !== 'null') {
      if (path === '/jisuan' || path.startsWith('/jisuan/')) {
        return origin.replace(/\/$/, '') + '/jisuan';
      }
      // 本地 python -m http.server 等：同源根路径也可挂 /api（少见）
      if (loc.protocol === 'http:' || loc.protocol === 'https:') {
        // file:// 无 origin 可用；GitHub Pages 不再作为入口
        if (!/github\.io$/i.test(loc.hostname)) {
          return origin.replace(/\/$/, '') + '/jisuan';
        }
      }
    }
  } catch (_) {}
  return '';
}

const DEFAULT_API_BASE = detectApiBase();
const MIGRATE_FLAG_PREFIX = 'cloud-migrated:';
const USERNAME_RE = /^[A-Za-z0-9][A-Za-z0-9\-_.:+@]{4,23}$/;

/** 管理员用户名 / 邮箱（均为空时，登录用户均可管理） */
const ADMIN_USERNAMES = [];
const ADMIN_EMAILS = [];

let API_BASE = DEFAULT_API_BASE;
let session = null;
const authListeners = new Set();

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function getUsername(user) {
  if (!user) return '';
  const meta = user.user_metadata || {};
  return String(user.username || meta.username || meta.name || '').trim();
}

function validateUsername(username, { required = false } = {}) {
  const name = String(username || '').trim();
  if (!name) {
    if (required) throw new Error('请输入用户名');
    return '';
  }
  if (!USERNAME_RE.test(name)) {
    throw new Error('用户名需 5–24 位，字母或数字开头，可含 -_.:+@');
  }
  return name;
}

function notifyAuth() {
  authListeners.forEach((fn) => {
    try {
      fn(session);
    } catch (e) {
      console.warn('[cloud-sync] auth listener', e);
    }
  });
}

function loadToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function saveToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

function setSessionFromAuth(data) {
  const token = (data && (data.token || (data.session && data.session.access_token))) || '';
  const user = (data && (data.user || (data.session && data.session.user))) || null;
  if (token && user) {
    saveToken(token);
    session = { access_token: token, user };
  } else {
    saveToken('');
    session = null;
  }
  notifyAuth();
  return session;
}

async function api(path, opts = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  const token = (session && session.access_token) || loadToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  let res;
  try {
    res = await fetch(API_BASE.replace(/\/$/, '') + path, {
      method: opts.method || 'GET',
      headers,
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
      mode: 'cors',
      credentials: 'omit',
    });
  } catch (e) {
    throw new Error(
      '无法连接云端 API（' +
        API_BASE +
        '）。请用自建地址 http://服务器:8081/jisuan/ 打开本站，并确认 /jisuan/api/health 正常。' +
        (e && e.message ? ' ' + e.message : '')
    );
  }
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || res.statusText };
  }
  if (!res.ok) {
    const msg = (data && data.error) || res.statusText || '请求失败';
    if (res.status === 401) {
      saveToken('');
      session = null;
      notifyAuth();
    }
    throw new Error(msg);
  }
  return data;
}

export function isAdminUser(user) {
  if (!ADMIN_EMAILS.length && !ADMIN_USERNAMES.length) return true;
  if (!user) return false;
  const email = normalizeEmail(user.email);
  const username = getUsername(user);
  if (email && ADMIN_EMAILS.map(normalizeEmail).includes(email)) return true;
  if (username && ADMIN_USERNAMES.includes(username)) return true;
  return false;
}

export function canManageCloud() {
  return isAdminUser(getUser());
}

/** @param {{apiBase?: string}} [opts] */
export function init(opts = {}) {
  if (opts.apiBase) API_BASE = String(opts.apiBase).replace(/\/$/, '');
  else if (!API_BASE) API_BASE = detectApiBase();
  const token = loadToken();
  if (token) {
    session = { access_token: token, user: null };
    api('/api/auth/me')
      .then((data) => setSessionFromAuth(data))
      .catch(() => {
        saveToken('');
        session = null;
        notifyAuth();
      });
  } else {
    session = null;
    notifyAuth();
  }
  return { apiBase: API_BASE };
}

export function getApiBase() {
  return API_BASE;
}

export function onAuthChange(fn) {
  authListeners.add(fn);
  fn(session);
  return () => authListeners.delete(fn);
}

export function getSession() {
  return session;
}

export function getUser() {
  return session && session.user ? session.user : null;
}

export async function loginWithPassword(account, password) {
  const trimmed = String(account || '').trim();
  const pwd = String(password || '');
  if (!trimmed) throw new Error('请输入用户名或邮箱');
  if (pwd.length < 6) throw new Error('密码至少 6 位');
  const data = await api('/api/auth/login', {
    method: 'POST',
    body: { account: trimmed, password: pwd },
  });
  return setSessionFromAuth(data);
}

/**
 * 注册：邮箱+密码（可选用户名），自建服免验证码，直接登录
 */
export async function signUpStart(email, password, username) {
  const trimmed = String(email || '').trim();
  const pwd = String(password || '');
  if (!trimmed || !trimmed.includes('@')) throw new Error('请输入有效邮箱');
  if (pwd.length < 6) throw new Error('密码至少 6 位');
  const uname = validateUsername(username, { required: false });
  const data = await api('/api/auth/register', {
    method: 'POST',
    body: { email: trimmed, password: pwd, username: uname || undefined },
  });
  setSessionFromAuth(data);
  return { needsCode: false, email: trimmed, session };
}

/** 兼容旧 UI：自建无需验证码 */
export async function signUpConfirm(_code) {
  if (session && session.user) return { session, needsEmailConfirm: false };
  throw new Error('请先完成注册');
}

export async function updateUsername(username) {
  await requireUser();
  const name = validateUsername(username, { required: true });
  const data = await api('/api/auth/username', {
    method: 'PATCH',
    body: { username: name },
  });
  if (session) {
    session = Object.assign({}, session, { user: data.user });
    notifyAuth();
  }
  return data;
}

/** @deprecated */
export async function signUpWithPassword(email, password, username) {
  return signUpStart(email, password, username);
}

/** @deprecated */
export async function loginWithEmail(email, password) {
  if (password != null && String(password).length) {
    return loginWithPassword(email, password);
  }
  throw new Error('请使用用户名或邮箱 + 密码登录');
}

export async function logout() {
  saveToken('');
  session = null;
  notifyAuth();
}

async function requireUser() {
  if (session && session.user) return session.user;
  const token = loadToken();
  if (!token) throw new Error('请先登录');
  const data = await api('/api/auth/me');
  setSessionFromAuth(data);
  if (!session || !session.user) throw new Error('请先登录');
  return session.user;
}

function requireManage() {
  const user = getUser();
  if (!isAdminUser(user)) throw new Error('仅管理员可保存或删除云端方案，你仍可载入导入');
}

export async function listSchemes(tool) {
  await requireUser();
  const data = await api('/api/schemes?tool=' + encodeURIComponent(tool));
  return (data && data.data) || [];
}

export async function listAllSchemes() {
  await requireUser();
  const data = await api('/api/schemes/all');
  return (data && data.data) || [];
}

export async function saveScheme(payload) {
  const user = await requireUser();
  requireManage();
  const tool = payload.tool;
  const name = (payload.name || '').trim() || '未命名方案';
  if (payload.id) {
    const data = await api('/api/schemes/' + encodeURIComponent(payload.id), {
      method: 'PUT',
      body: {
        tool,
        name,
        inputs: payload.inputs != null ? payload.inputs : {},
        snapshot: payload.snapshot != null ? payload.snapshot : {},
      },
    });
    return data.data;
  }
  const data = await api('/api/schemes', {
    method: 'POST',
    body: {
      tool,
      name,
      inputs: payload.inputs != null ? payload.inputs : {},
      snapshot: payload.snapshot != null ? payload.snapshot : {},
      user_id: user.id,
    },
  });
  return data.data;
}

export async function deleteScheme(id) {
  await requireUser();
  requireManage();
  await api('/api/schemes/' + encodeURIComponent(id), { method: 'DELETE' });
  return true;
}

export async function migrateLocalArray(tool, localKey) {
  const user = await requireUser();
  requireManage();
  const flagKey = MIGRATE_FLAG_PREFIX + tool + ':' + user.id;
  if (localStorage.getItem(flagKey) === '1') {
    return { uploaded: 0, skipped: true, errors: [] };
  }
  let list = [];
  try {
    const raw = localStorage.getItem(localKey);
    list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
  } catch {
    list = [];
  }
  if (!list.length) {
    localStorage.setItem(flagKey, '1');
    return { uploaded: 0, skipped: false, errors: [] };
  }
  const errors = [];
  let uploaded = 0;
  for (const item of list) {
    try {
      await saveScheme({
        tool,
        name: item.name || '本地方案',
        inputs: item.inputs || {},
        snapshot: Object.assign({}, item.snapshot || {}, {
          _migratedFromLocalId: item.id || null,
          _localSavedAt: item.savedAt || null,
        }),
      });
      uploaded += 1;
    } catch (e) {
      errors.push(((item && item.name) || '?') + ': ' + (e.message || e));
    }
  }
  if (!errors.length) localStorage.setItem(flagKey, '1');
  return { uploaded, skipped: false, errors };
}

export function resetMigrateFlag(tool) {
  const user = getUser();
  if (!user) return;
  localStorage.removeItem(MIGRATE_FLAG_PREFIX + tool + ':' + user.id);
}

export function scrapeFormState() {
  const inputs = {};
  document.querySelectorAll('input, select, textarea').forEach((el) => {
    if (!el.id) return;
    if (el.type === 'button' || el.type === 'submit' || el.type === 'file') return;
    if (el.id === 'schemeName' || el.id.startsWith('cloud')) return;
    if (el.type === 'checkbox' || el.type === 'radio') inputs[el.id] = el.checked;
    else inputs[el.id] = el.value;
  });
  const nameEl = document.getElementById('schemeName');
  const name = (nameEl && nameEl.value.trim()) || '当前表单';
  return { name, inputs, snapshot: { source: 'form-scrape' } };
}

export function applyFormState(state) {
  const inputs = (state && state.inputs) || {};
  Object.keys(inputs).forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = inputs[id];
    if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!val;
    else el.value = val == null ? '' : val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  if (state && state.name) {
    const nameEl = document.getElementById('schemeName');
    if (nameEl) nameEl.value = state.name;
  }
}

function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach((k) => {
      if (k === 'className') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else if (k.startsWith('on') && typeof attrs[k] === 'function')
        node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
      else if (attrs[k] != null) node.setAttribute(k, attrs[k]);
    });
  }
  (children || []).forEach((c) => {
    if (c == null) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

const INLINE_CSS = `
.cloud-bar{font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif;font-size:13px;color:#0f172a;background:#f8fafc;border:1px solid rgba(15,23,42,.1);border-radius:12px;padding:10px 12px;margin:0 0 12px;display:grid;gap:8px}
.cloud-bar *{box-sizing:border-box}
.cloud-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.cloud-bar input[type=email],.cloud-bar input[type=text],.cloud-bar input[type=password]{flex:1;min-width:140px;padding:6px 10px;border:1px solid rgba(15,23,42,.14);border-radius:8px;font:inherit}
.cloud-bar button{padding:6px 12px;border-radius:8px;border:1px solid rgba(15,23,42,.14);background:#fff;cursor:pointer;font:inherit}
.cloud-bar button.primary{background:#0f766e;color:#fff;border-color:#0f766e}
.cloud-bar button:disabled{opacity:.5;cursor:not-allowed}
.cloud-bar button.mode-on{background:#0f766e;color:#fff;border-color:#0f766e}
.cloud-bar .muted{color:#64748b;font-size:12px}
.cloud-bar .err{color:#be123c}
.cloud-bar .ok{color:#047857}
.cloud-bar .hint{color:#64748b;font-size:12px}
.cloud-list{display:grid;gap:6px;margin-top:4px}
.cloud-item{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;padding:8px 10px;border:1px solid rgba(15,23,42,.08);border-radius:10px;background:#fff}
.cloud-item .nm{font-weight:600}
.cloud-item .meta{color:#64748b;font-size:11px}
.cloud-item .acts{display:flex;gap:6px;flex-wrap:wrap}
`;

function ensureCss() {
  if (!document.getElementById('cloud-sync-inline')) {
    const style = document.createElement('style');
    style.id = 'cloud-sync-inline';
    style.textContent = INLINE_CSS;
    document.head.appendChild(style);
  }
}

export function mountAuthBar(container) {
  ensureCss();
  if (!container) return { refresh() {} };
  const root = el('div', { className: 'cloud-bar', role: 'region', 'aria-label': '云同步登录' });
  container.innerHTML = '';
  container.appendChild(root);

  let mode = 'login';
  const status = el('div', { className: 'muted' });
  const hint = el('div', {
    className: 'hint',
    text: '自建云端 · 注册免验证码；登录可用用户名或邮箱',
  });

  const modeRow = el('div', { className: 'cloud-row' });
  const loginModeBtn = el('button', { type: 'button', text: '登录' });
  const registerModeBtn = el('button', { type: 'button', text: '注册' });
  modeRow.appendChild(loginModeBtn);
  modeRow.appendChild(registerModeBtn);

  const formRow = el('div', { className: 'cloud-row' });
  const accountInput = el('input', {
    type: 'text',
    placeholder: '用户名或邮箱',
    autocomplete: 'username',
  });
  const emailInput = el('input', {
    type: 'email',
    placeholder: '邮箱',
    autocomplete: 'email',
  });
  const usernameInput = el('input', {
    type: 'text',
    placeholder: '用户名（选填，推荐）',
    autocomplete: 'nickname',
  });
  const passInput = el('input', {
    type: 'password',
    placeholder: '密码（至少 6 位）',
    autocomplete: 'current-password',
  });
  const loginBtn = el('button', { type: 'button', className: 'primary', text: '登录' });
  const signupBtn = el('button', { type: 'button', className: 'primary', text: '注册并登录' });
  const logoutBtn = el('button', { type: 'button', text: '退出登录' });

  formRow.appendChild(accountInput);
  formRow.appendChild(emailInput);
  formRow.appendChild(usernameInput);
  formRow.appendChild(passInput);
  formRow.appendChild(loginBtn);
  formRow.appendChild(signupBtn);
  formRow.appendChild(logoutBtn);

  const bindRow = el('div', { className: 'cloud-row' });
  const bindInput = el('input', {
    type: 'text',
    placeholder: '绑定/修改用户名',
    autocomplete: 'nickname',
  });
  const bindBtn = el('button', { type: 'button', text: '保存用户名' });
  bindRow.appendChild(bindInput);
  bindRow.appendChild(bindBtn);

  root.appendChild(status);
  root.appendChild(hint);
  root.appendChild(modeRow);
  root.appendChild(formRow);
  root.appendChild(bindRow);

  function setBusy(on) {
    loginBtn.disabled = on;
    signupBtn.disabled = on;
    bindBtn.disabled = on;
    loginModeBtn.disabled = on;
    registerModeBtn.disabled = on;
  }

  function paint() {
    const u = getUser();
    if (u) {
      const uname = getUsername(u);
      const role = isAdminUser(u) ? '（可读写）' : '（仅可导入）';
      status.className = 'ok';
      status.textContent =
        '已登录：' + (uname ? uname + ' · ' : '') + (u.email || u.id) + role;
      hint.style.display = 'none';
      modeRow.style.display = 'none';
      accountInput.style.display = 'none';
      emailInput.style.display = 'none';
      usernameInput.style.display = 'none';
      passInput.style.display = 'none';
      loginBtn.style.display = 'none';
      signupBtn.style.display = 'none';
      logoutBtn.style.display = '';
      bindRow.style.display = '';
      bindInput.value = uname;
      bindInput.placeholder = uname ? '修改用户名' : '绑定用户名（便于日后登录）';
      bindBtn.textContent = uname ? '修改用户名' : '绑定用户名';
    } else {
      status.className = 'muted';
      status.textContent =
        mode === 'login' ? '登录：用户名或邮箱 + 密码' : '注册：邮箱 + 密码（用户名选填，免验证码）';
      hint.style.display = '';
      modeRow.style.display = '';
      loginModeBtn.className = mode === 'login' ? 'mode-on' : '';
      registerModeBtn.className = mode === 'register' ? 'mode-on' : '';
      logoutBtn.style.display = 'none';
      bindRow.style.display = 'none';
      passInput.style.display = '';
      if (mode === 'login') {
        accountInput.style.display = '';
        emailInput.style.display = 'none';
        usernameInput.style.display = 'none';
        loginBtn.style.display = '';
        signupBtn.style.display = 'none';
        passInput.setAttribute('autocomplete', 'current-password');
      } else {
        accountInput.style.display = 'none';
        emailInput.style.display = '';
        usernameInput.style.display = '';
        loginBtn.style.display = 'none';
        signupBtn.style.display = '';
        passInput.setAttribute('autocomplete', 'new-password');
      }
    }
  }

  loginModeBtn.addEventListener('click', () => {
    mode = 'login';
    paint();
  });
  registerModeBtn.addEventListener('click', () => {
    mode = 'register';
    paint();
  });

  loginBtn.addEventListener('click', async () => {
    setBusy(true);
    status.className = 'muted';
    status.textContent = '正在登录…';
    try {
      await loginWithPassword(accountInput.value, passInput.value);
      status.className = 'ok';
      status.textContent = '登录成功';
      passInput.value = '';
    } catch (e) {
      status.className = 'err';
      status.textContent = e.message || String(e);
    } finally {
      setBusy(false);
    }
  });

  signupBtn.addEventListener('click', async () => {
    setBusy(true);
    status.className = 'muted';
    status.textContent = '正在注册…';
    try {
      await signUpStart(emailInput.value, passInput.value, usernameInput.value);
      status.className = 'ok';
      status.textContent = '注册成功并已登录';
      passInput.value = '';
    } catch (e) {
      status.className = 'err';
      status.textContent = e.message || String(e);
    } finally {
      setBusy(false);
      paint();
    }
  });

  bindBtn.addEventListener('click', async () => {
    setBusy(true);
    status.className = 'muted';
    status.textContent = '正在保存用户名…';
    try {
      await updateUsername(bindInput.value);
      status.className = 'ok';
      status.textContent = '用户名已保存';
    } catch (e) {
      status.className = 'err';
      status.textContent = e.message || String(e);
    } finally {
      setBusy(false);
      paint();
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      await logout();
    } catch (e) {
      status.className = 'err';
      status.textContent = e.message || String(e);
    }
  });

  onAuthChange(paint);
  return { refresh: paint, root };
}

export function mountSchemePanel(opts) {
  ensureCss();
  const tool = opts.tool;
  if (!tool) throw new Error('mountSchemePanel: tool 必填');

  let host = opts.container;
  if (!host) {
    host = document.createElement('div');
    host.id = 'cloud-scheme-panel';
    const anchor =
      document.querySelector('.scheme-bar') || document.querySelector('main') || document.body;
    if (opts.position === 'append') anchor.appendChild(host);
    else anchor.insertBefore(host, anchor.firstChild);
  }

  const root = el('div', { className: 'cloud-bar', role: 'region', 'aria-label': '云端方案' });
  host.innerHTML = '';
  host.appendChild(root);

  const title = el('div', { className: 'muted', text: '云端方案 · 自建服务器 · ' + tool });
  const authHost = el('div');
  const actionRow = el('div', { className: 'cloud-row' });
  const saveBtn = el('button', { type: 'button', className: 'primary', text: '保存到云' });
  const loadBtn = el('button', { type: 'button', text: '从云加载列表' });
  const migrateBtn = el('button', { type: 'button', text: '迁移本地方案到云' });
  const msg = el('div', { className: 'muted' });
  const list = el('div', { className: 'cloud-list' });

  actionRow.appendChild(saveBtn);
  actionRow.appendChild(loadBtn);
  if (opts.localKey) actionRow.appendChild(migrateBtn);
  else migrateBtn.style.display = 'none';

  root.appendChild(title);
  root.appendChild(authHost);
  root.appendChild(actionRow);
  root.appendChild(msg);
  root.appendChild(list);

  mountAuthBar(authHost);

  function setMsg(text, kind) {
    msg.className = kind === 'err' ? 'err' : kind === 'ok' ? 'ok' : 'muted';
    msg.textContent = text || '';
  }

  function setLoggedInUi(on) {
    const manage = on && canManageCloud();
    saveBtn.disabled = !manage;
    loadBtn.disabled = !on;
    migrateBtn.disabled = !manage;
    saveBtn.title = manage ? '' : '仅管理员可保存';
    migrateBtn.title = manage ? '' : '仅管理员可迁移';
  }

  onAuthChange((s) => {
    setLoggedInUi(!!(s && s.user));
    if (s && s.user) setMsg('');
  });

  saveBtn.addEventListener('click', async () => {
    try {
      const state = opts.getState() || {};
      const saved = await saveScheme({
        tool,
        name: state.name,
        inputs: state.inputs,
        snapshot: state.snapshot,
      });
      setMsg('已保存到云：「' + saved.name + '」', 'ok');
      await refreshList();
    } catch (e) {
      setMsg(e.message || String(e), 'err');
    }
  });

  async function refreshList() {
    list.innerHTML = '';
    try {
      const rows = await listSchemes(tool);
      if (!rows.length) {
        list.appendChild(el('div', { className: 'muted', text: '云端暂无方案' }));
        return;
      }
      const manage = canManageCloud();
      rows.forEach((r) => {
        const item = el('div', { className: 'cloud-item' });
        const left = el('div');
        left.appendChild(el('div', { className: 'nm', text: r.name }));
        const when = r.updated_at ? new Date(r.updated_at).toLocaleString('zh-CN') : '';
        left.appendChild(el('div', { className: 'meta', text: when }));
        const acts = el('div', { className: 'acts' });
        const loadOne = el('button', { type: 'button', text: '载入' });
        loadOne.addEventListener('click', () => {
          try {
            opts.applyState({ name: r.name, inputs: r.inputs || {}, snapshot: r.snapshot || {} });
            setMsg('已从云载入「' + r.name + '」', 'ok');
          } catch (e) {
            setMsg(e.message || String(e), 'err');
          }
        });
        acts.appendChild(loadOne);
        if (manage) {
          const delOne = el('button', { type: 'button', text: '删除' });
          delOne.addEventListener('click', async () => {
            if (!confirm('删除云端方案「' + r.name + '」？')) return;
            try {
              await deleteScheme(r.id);
              setMsg('已删除', 'ok');
              await refreshList();
            } catch (e) {
              setMsg(e.message || String(e), 'err');
            }
          });
          acts.appendChild(delOne);
        }
        item.appendChild(left);
        item.appendChild(acts);
        list.appendChild(item);
      });
    } catch (e) {
      setMsg(e.message || String(e), 'err');
    }
  }

  loadBtn.addEventListener('click', () => refreshList());

  migrateBtn.addEventListener('click', async () => {
    if (!opts.localKey) return;
    try {
      setMsg('正在迁移…');
      const r = await migrateLocalArray(tool, opts.localKey);
      if (r.skipped) setMsg('本机方案已迁移过（如需重迁请清标记）', 'muted');
      else if (r.errors.length)
        setMsg('已上传 ' + r.uploaded + ' 个，失败：' + r.errors.join('；'), 'err');
      else setMsg('已迁移 ' + r.uploaded + ' 个本地方案到云（本机仍保留缓存）', 'ok');
      await refreshList();
    } catch (e) {
      setMsg(e.message || String(e), 'err');
    }
  });

  return {
    refreshList,
    root,
    async saveCurrent(extra) {
      const state = Object.assign({}, opts.getState() || {}, extra || {});
      return saveScheme({
        tool,
        name: state.name,
        inputs: state.inputs,
        snapshot: state.snapshot,
        id: state.id,
      });
    },
  };
}

export function autoMountFromDataset(elNode) {
  const tool = elNode.getAttribute('data-tool');
  const localKey = elNode.getAttribute('data-local-key') || '';
  return mountSchemePanel({
    tool,
    localKey: localKey || undefined,
    getState: scrapeFormState,
    applyState: applyFormState,
    container: elNode,
  });
}

export default {
  init,
  getApiBase,
  loginWithEmail,
  loginWithPassword,
  signUpWithPassword,
  signUpStart,
  signUpConfirm,
  updateUsername,
  logout,
  getSession,
  getUser,
  isAdminUser,
  canManageCloud,
  onAuthChange,
  listSchemes,
  listAllSchemes,
  saveScheme,
  deleteScheme,
  migrateLocalArray,
  resetMigrateFlag,
  scrapeFormState,
  applyFormState,
  mountAuthBar,
  mountSchemePanel,
  autoMountFromDataset,
};
