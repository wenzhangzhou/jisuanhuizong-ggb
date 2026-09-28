/**
 * jisuanhuizong-ggb · 腾讯云开发 CloudBase（PG）方案云同步
 * 仅使用 Publishable Key，勿放服务端 API Key
 */
import cloudbase from 'https://cdn.jsdelivr.net/npm/@cloudbase/js-sdk@3.10.1/+esm';

const ENV_ID = 'winkigongzuotai-d9ffmduq2c2b92f2';
const ACCESS_KEY =
  'eyJhbGciOiJSUzI1NiIsImtpZCI6IjI5MmM1YTY3LTlmNjctNDViNC04MjI5LTc2ZmQwMWEwMDQwNSJ9.eyJpc3MiOiJodHRwczovL3dpbmtpZ29uZ3p1b3RhaS1kOWZmbWR1cTJjMmI5MmYyLmFwLXNoYW5naGFpLnRjYi1hcGkudGVuY2VudGNsb3VkYXBpLmNvbSIsInN1YiI6ImFub24iLCJhdWQiOiJ3aW5raWdvbmd6dW90YWktZDlmZm1kdXEyYzJiOTJmMiIsImV4cCI6NDA5NDI2MzA2MywiaWF0IjoxNzkwNTc5ODYzLCJub25jZSI6InV3V0cyWjdHVGptamRBQ1J0WEYxNkEiLCJhdF9oYXNoIjoidXdXRzJaN0dUam1qZEFDUnRYRjE2QSIsIm5hbWUiOiJBbm9ueW1vdXMiLCJzY29wZSI6ImFub255bW91cyIsInByb2plY3RfaWQiOiJ3aW5raWdvbmd6dW90YWktZDlmZm1kdXEyYzJiOTJmMiIsIm1ldGEiOnsicGxhdGZvcm0iOiJQdWJsaXNoYWJsZUtleSJ9LCJyb2xlIjoiYW5vbiIsImlzX2Fub255bW91cyI6dHJ1ZSwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiYW5vbnltb3VzIiwicHJvdmlkZXJzIjpbImFub255bW91cyJdfSwidXNlcl9tZXRhZGF0YSI6eyJuYW1lIjoiQW5vbnltb3VzIn0sInVzZXJfdHlwZSI6IiIsImNsaWVudF90eXBlIjoiY2xpZW50X3VzZXIiLCJpc19zeXN0ZW1fYWRtaW4iOmZhbHNlfQ.Pwn-EUycmjxICqhvqSXGsFcNSwTFFuSfjuhveRfQhrtkFZU1QHuPPr_yW_yW-tlSyIPRqxmJNMBs1jelTE81wLO3l86WIS0OukTh0YSmLP3q4kkYML3yAfosp9kbfc2Dr_jZyiVCAIgTA373N-wcXShxCpo3RWqgAKqDylWzzVKkNoFK_R52SXhaqMvWKURIDF5v_G6dRMSfQnSIPY9mlP74mnE7oe_wbMubV3dP-l_cf_RNs1T0at1Q3Assqx_SuMgfbM21Lwenj2wjMSnHueIM9S6ti14Nb4nhzU9di5hmBuIq9tk0wYmX7LCsm39J41lqq17MnDPuZrnVWwRcdA';

/** 管理员邮箱（小写）。填入后：其他人只能载入，不能保存/删除。未填时暂允许登录用户完整操作。 */
const ADMIN_EMAILS = [];

const MIGRATE_FLAG_PREFIX = 'cloud-migrated:';

let app = null;
let auth = null;
let db = null;
let session = null;
let pendingSignUp = null;
const authListeners = new Set();

function ensureClient() {
  if (!app) init();
  return { app, auth, db };
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

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

export function isAdminUser(user) {
  if (!ADMIN_EMAILS.length) return true;
  const email = normalizeEmail(user && user.email);
  return !!email && ADMIN_EMAILS.map(normalizeEmail).includes(email);
}

export function canManageCloud() {
  return isAdminUser(getUser());
}

/** @param {{env?: string, accessKey?: string}} [opts] */
export function init(opts = {}) {
  if (app) return app;
  app = cloudbase.init({
    env: opts.env || ENV_ID,
    region: 'ap-shanghai',
    accessKey: opts.accessKey || ACCESS_KEY,
    auth: { detectSessionInUrl: true },
  });
  auth = app.auth;
  db = app.rdb();
  auth.getSession().then(({ data, error }) => {
    if (error) console.warn('[cloud-sync] getSession', error.message || error);
    session = (data && data.session) || null;
    notifyAuth();
  });
  auth.onAuthStateChange((_event, s) => {
    session = s || null;
    notifyAuth();
  });
  return app;
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

function throwAuthError(error, fallback) {
  if (!error) throw new Error(fallback || '未知错误');
  const msg = error.message || error.code || String(error);
  if (error.code === 'permission_denied' || /安全域名|cors permission/i.test(msg)) {
    throw new Error('域名未加入 CloudBase 安全域名，请添加 https://wenzhangzhou.github.io');
  }
  throw new Error(msg);
}

/** 邮箱+密码登录 */
export async function loginWithPassword(email, password) {
  ensureClient();
  const trimmed = String(email || '').trim();
  const pwd = String(password || '');
  if (!trimmed || !trimmed.includes('@')) throw new Error('请输入有效邮箱');
  if (pwd.length < 6) throw new Error('密码至少 6 位');
  const { data, error } = await auth.signInWithPassword({
    email: trimmed,
    password: pwd,
  });
  if (error) throwAuthError(error, '登录失败');
  session = data.session || null;
  notifyAuth();
  return data.session;
}

/**
 * 注册第一步：发邮箱验证码（CloudBase 要求验证码）
 * @returns {{ needsCode: true }}
 */
export async function signUpStart(email, password) {
  ensureClient();
  const trimmed = String(email || '').trim();
  const pwd = String(password || '');
  if (!trimmed || !trimmed.includes('@')) throw new Error('请输入有效邮箱');
  if (pwd.length < 6) throw new Error('密码至少 6 位');
  const { data, error } = await auth.signUp({
    email: trimmed,
    password: pwd,
  });
  if (error) throwAuthError(error, '注册失败');
  if (!data || typeof data.verifyOtp !== 'function') {
    throw new Error('无法发送验证码。请在控制台开启邮箱登录并配置邮件代发。');
  }
  pendingSignUp = { email: trimmed, verifyOtp: data.verifyOtp };
  return { needsCode: true, email: trimmed };
}

/** 注册第二步：填写邮箱验证码完成注册并登录 */
export async function signUpConfirm(code) {
  ensureClient();
  if (!pendingSignUp || typeof pendingSignUp.verifyOtp !== 'function') {
    throw new Error('请先点击注册发送验证码');
  }
  const token = String(code || '').trim();
  if (!token) throw new Error('请输入邮箱验证码');
  const { data, error } = await pendingSignUp.verifyOtp({ token });
  if (error) throwAuthError(error, '验证失败');
  pendingSignUp = null;
  session = (data && data.session) || null;
  notifyAuth();
  return { session, needsEmailConfirm: !session };
}

/** @deprecated */
export async function signUpWithPassword(email, password) {
  return signUpStart(email, password);
}

/** @deprecated */
export async function loginWithEmail(email, password) {
  if (password != null && String(password).length) {
    return loginWithPassword(email, password);
  }
  throw new Error('请使用邮箱+密码登录');
}

export async function logout() {
  ensureClient();
  const { error } = await auth.signOut();
  if (error) throwAuthError(error, '退出失败');
  session = null;
  notifyAuth();
}

async function requireUser() {
  ensureClient();
  if (session && session.user) return session.user;
  const { data, error } = await auth.getSession();
  if (error) throwAuthError(error);
  session = (data && data.session) || null;
  if (!session || !session.user) throw new Error('请先登录');
  return session.user;
}

function requireManage() {
  const user = getUser();
  if (!isAdminUser(user)) throw new Error('仅管理员可保存或删除云端方案，你仍可载入导入');
}

/** @param {string} tool */
export async function listSchemes(tool) {
  await requireUser();
  const { data, error } = await db
    .from('schemes')
    .select('id, tool, name, inputs, snapshot, created_at, updated_at, user_id')
    .eq('tool', tool)
    .order('updated_at', { ascending: false });
  if (error) throwAuthError(error, '加载失败');
  return data || [];
}

/**
 * @param {{tool: string, name: string, inputs?: object, snapshot?: object, id?: string}} payload
 */
export async function saveScheme(payload) {
  const user = await requireUser();
  requireManage();
  const tool = payload.tool;
  const name = (payload.name || '').trim() || '未命名方案';
  const row = {
    user_id: user.id,
    tool,
    name,
    inputs: payload.inputs != null ? payload.inputs : {},
    snapshot: payload.snapshot != null ? payload.snapshot : {},
    updated_at: new Date().toISOString(),
  };
  if (payload.id) {
    const { data, error } = await db
      .from('schemes')
      .update(row)
      .eq('id', payload.id)
      .select()
      .single();
    if (error) throwAuthError(error, '更新失败');
    return data;
  }
  const { data, error } = await db.from('schemes').insert(row).select().single();
  if (error) throwAuthError(error, '保存失败');
  return data;
}

export async function deleteScheme(id) {
  await requireUser();
  requireManage();
  const { error } = await db.from('schemes').delete().eq('id', id);
  if (error) throwAuthError(error, '删除失败');
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
.cloud-bar .muted{color:#64748b;font-size:12px}
.cloud-bar .err{color:#be123c}
.cloud-bar .ok{color:#047857}
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
  ensureClient();
  ensureCss();
  if (!container) return { refresh() {} };
  const root = el('div', { className: 'cloud-bar', role: 'region', 'aria-label': '云同步登录' });
  container.innerHTML = '';
  container.appendChild(root);

  const status = el('div', { className: 'muted' });
  const row = el('div', { className: 'cloud-row' });
  const emailInput = el('input', { type: 'email', placeholder: '邮箱', autocomplete: 'username' });
  const passInput = el('input', {
    type: 'password',
    placeholder: '密码（至少 6 位）',
    autocomplete: 'current-password',
  });
  const codeInput = el('input', {
    type: 'text',
    placeholder: '邮箱验证码（注册用）',
    autocomplete: 'one-time-code',
  });
  codeInput.style.display = 'none';
  const loginBtn = el('button', { type: 'button', className: 'primary', text: '登录' });
  const signupBtn = el('button', { type: 'button', text: '注册发码' });
  const confirmBtn = el('button', { type: 'button', text: '确认注册' });
  confirmBtn.style.display = 'none';
  const logoutBtn = el('button', { type: 'button', text: '退出登录' });
  row.appendChild(emailInput);
  row.appendChild(passInput);
  row.appendChild(codeInput);
  row.appendChild(loginBtn);
  row.appendChild(signupBtn);
  row.appendChild(confirmBtn);
  row.appendChild(logoutBtn);
  root.appendChild(status);
  root.appendChild(row);

  function setBusy(on) {
    loginBtn.disabled = on;
    signupBtn.disabled = on;
    confirmBtn.disabled = on;
  }

  function paint() {
    const u = getUser();
    if (u) {
      status.className = 'ok';
      const role = isAdminUser(u) ? '（管理员）' : '（仅可导入）';
      status.textContent = '已登录：' + (u.email || u.id) + role;
      emailInput.style.display = 'none';
      passInput.style.display = 'none';
      codeInput.style.display = 'none';
      loginBtn.style.display = 'none';
      signupBtn.style.display = 'none';
      confirmBtn.style.display = 'none';
      logoutBtn.style.display = '';
    } else {
      status.className = 'muted';
      status.textContent = 'CloudBase 邮箱登录；注册需收一封验证码邮件';
      emailInput.style.display = '';
      passInput.style.display = '';
      loginBtn.style.display = '';
      signupBtn.style.display = '';
      logoutBtn.style.display = 'none';
      if (pendingSignUp) {
        codeInput.style.display = '';
        confirmBtn.style.display = '';
      } else {
        codeInput.style.display = 'none';
        confirmBtn.style.display = 'none';
      }
    }
  }

  loginBtn.addEventListener('click', async () => {
    setBusy(true);
    status.className = 'muted';
    status.textContent = '正在登录…';
    try {
      await loginWithPassword(emailInput.value, passInput.value);
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
    status.textContent = '正在发送验证码…';
    try {
      await signUpStart(emailInput.value, passInput.value);
      codeInput.style.display = '';
      confirmBtn.style.display = '';
      status.className = 'ok';
      status.textContent = '验证码已发送，请查收邮箱后点「确认注册」';
    } catch (e) {
      status.className = 'err';
      status.textContent = e.message || String(e);
    } finally {
      setBusy(false);
    }
  });

  confirmBtn.addEventListener('click', async () => {
    setBusy(true);
    status.className = 'muted';
    status.textContent = '正在验证…';
    try {
      const r = await signUpConfirm(codeInput.value);
      if (r.session) {
        status.className = 'ok';
        status.textContent = '注册并已登录';
        passInput.value = '';
        codeInput.value = '';
      } else {
        status.className = 'err';
        status.textContent = '验证完成但未建立会话，请再点登录';
      }
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
  ensureClient();
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

  const title = el('div', { className: 'muted', text: '云端方案 · CloudBase · ' + tool });
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
  loginWithEmail,
  loginWithPassword,
  signUpWithPassword,
  signUpStart,
  signUpConfirm,
  logout,
  getSession,
  getUser,
  isAdminUser,
  canManageCloud,
  onAuthChange,
  listSchemes,
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
