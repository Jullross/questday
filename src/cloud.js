// Nuvem do QuestDay: conta (Supabase Auth), sincronização, lembretes push, Lume pelo servidor e Google Agenda.
// Sem dependências: fala direto com as APIs REST do Supabase. Tudo é opcional: sem conta, o app segue local.

export const CFG = {
  url: 'https://ziycnzsjhnswwrpotasp.supabase.co',
  key: 'sb_publishable_7jWnLKG6oPif52JT0Zgrpw_w9BzOcrn',
  vapid: 'BPkGtOt5l1tseyZaFylNyUxS4xHLTrYsuWrqcwmJA00oHxw3XShRpZdMOvtrie7d6pUrvGL-MP2DuagZDuDDZxQ',
};
const SKEY = 'qd-session', LOCAL_AT = 'qd-local-at', SEEN_AT = 'qd-remote-at', PUSH_ON = 'qd-push';
const GCAL_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

const ls = {
  get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} },
};
const listeners = new Set();
let session = (() => { try { return JSON.parse(ls.get(SKEY)) || null; } catch (e) { return null; } })();
let status = { sync: 'idle', at: null, error: null, aiReady: null };

const emit = () => listeners.forEach((f) => { try { f(); } catch (e) {} });
const setStatus = (p) => { status = { ...status, ...p }; emit(); };
const saveSession = (s) => { session = s; ls.set(SKEY, s ? JSON.stringify(s) : null); emit(); };

export const canCloud = () => typeof window !== 'undefined' && /^https?:$/.test(location.protocol) && typeof fetch === 'function';
const redirectTo = () => location.origin + location.pathname;

async function api(path, opt = {}, auth = true) {
  const headers = { apikey: CFG.key, 'Content-Type': 'application/json', ...(opt.headers || {}) };
  if (auth) { const t = await token(); if (!t) throw Object.assign(new Error('login'), { status: 401 }); headers.Authorization = `Bearer ${t}`; }
  const r = await fetch(CFG.url + path, { ...opt, headers });
  if (!r.ok) {
    let msg = ''; try { const j = await r.json(); msg = j.msg || j.message || j.error_description || (j.error && j.error.message) || (typeof j.error === 'string' ? j.error : '') || ''; } catch (e) {}
    throw Object.assign(new Error(msg || `HTTP ${r.status}`), { status: r.status });
  }
  const txt = await r.text(); return txt ? JSON.parse(txt) : null;
}

function fromAuth(j, extra = {}) {
  if (!j || !j.access_token) return null;
  return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (Number(j.expires_in) || 3600) * 1000, user: j.user || session?.user || null, ...extra };
}

let refreshing = null;
async function token() {
  if (!session) return null;
  if (session.expires_at - Date.now() > 60_000) return session.access_token;
  if (!refreshing) refreshing = (async () => {
    try {
      const j = await api('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }) }, false);
      saveSession({ ...fromAuth(j), google: session.google });
    } catch (e) { if (e.status === 400 || e.status === 401) saveSession(null); }
    finally { refreshing = null; }
  })();
  await refreshing; return session ? session.access_token : null;
}

export const Cloud = {
  CFG,
  on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  get user() { return session ? session.user : null; },
  get status() { return status; },
  get pushOn() { return ls.get(PUSH_ON) === '1'; },
  get hasGoogleToken() { return !!(session && session.google && session.google.exp > Date.now()); },

  // Volta do login com Google: os tokens chegam no endereço (#access_token=...).
  handleRedirect() {
    if (typeof location === 'undefined' || !/access_token=|error_description=/.test(location.hash)) return null;
    const p = new URLSearchParams(location.hash.slice(1));
    history.replaceState(null, '', location.pathname + location.search);
    if (p.get('error_description')) return { error: p.get('error_description') };
    const s = fromAuth({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: p.get('expires_in') });
    if (!s) return null;
    try { s.user = JSON.parse(atob(s.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); s.user = { id: s.user.sub, email: s.user.email }; } catch (e) {}
    if (p.get('provider_token')) s.google = { token: p.get('provider_token'), exp: Date.now() + 55 * 60_000 };
    saveSession(s);
    api('/auth/v1/user').then((u) => { if (session && u) saveSession({ ...session, user: { id: u.id, email: u.email } }); }).catch(() => {});
    return { ok: true, google: !!s.google };
  },

  async signUp(email, password) {
    const j = await api('/auth/v1/signup?redirect_to=' + encodeURIComponent(redirectTo()), { method: 'POST', body: JSON.stringify({ email, password }) }, false);
    const s = fromAuth(j); if (s) { saveSession(s); return { session: true }; }
    return { confirm: true }; // precisa confirmar o e-mail
  },
  async signIn(email, password) {
    const j = await api('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) }, false);
    saveSession(fromAuth(j)); return true;
  },
  signInGoogle({ calendar = false } = {}) {
    const q = new URLSearchParams({ provider: 'google', redirect_to: redirectTo() });
    if (calendar) { q.set('scopes', GCAL_SCOPE); q.set('access_type', 'offline'); q.set('prompt', 'consent'); }
    location.href = `${CFG.url}/auth/v1/authorize?${q}`;
  },
  async recover(email) { await api('/auth/v1/recover?redirect_to=' + encodeURIComponent(redirectTo()), { method: 'POST', body: JSON.stringify({ email }) }, false); return true; },
  async signOut() {
    try { await Cloud.disablePush(); } catch (e) {}
    try { await api('/auth/v1/logout', { method: 'POST' }); } catch (e) {}
    saveSession(null); ls.set(SEEN_AT, null); setStatus({ sync: 'idle', at: null, aiReady: null });
  },

  // Apaga os dados do QuestDay (e o login, se não for usado por outro app) e encerra a sessão.
  async deleteAccount() {
    try { await Cloud.disablePush(); } catch (e) {}
    const r = await api('/functions/v1/qd-delete-account', { method: 'POST', body: JSON.stringify({ confirm: 'EXCLUIR' }) });
    clearTimeout(pushT); pushT = null; pending = null;
    saveSession(null); ls.set(SEEN_AT, null); ls.set(LOCAL_AT, null); setStatus({ sync: 'idle', at: null, aiReady: null });
    return r;
  },
  // Sai da conta sem perder nada: sobe o que falta antes.
  async logout(state) { if (state) { try { await Cloud.pushNow(state); } catch (e) {} } await Cloud.signOut(); ls.set(LOCAL_AT, null); },

  // ---------- sincronização ----------
  markLocal() { ls.set(LOCAL_AT, String(Date.now())); },
  localAt() { return Number(ls.get(LOCAL_AT)) || 0; },
  async pull() {
    if (!session) return null;
    const rows = await api(`/rest/v1/qd_data?select=data,updated_at&user_id=eq.${session.user.id}`);
    const row = rows && rows[0]; if (!row) return null;
    return { data: row.data, at: Date.parse(row.updated_at) };
  },
  // Decide qual versão vale ao abrir: a mais nova entre a deste aparelho e a da nuvem.
  async reconcile(localState) {
    if (!session) return { use: 'local' };
    setStatus({ sync: 'syncing', error: null });
    try {
      const remote = await Cloud.pull();
      if (!remote) { if (localState) await Cloud.pushNow(localState); return { use: 'local' }; }
      ls.set(SEEN_AT, String(remote.at));
      if (!localState || remote.at > Cloud.localAt()) { setStatus({ sync: 'ok', at: remote.at }); return { use: 'remote', data: remote.data }; }
      await Cloud.pushNow(localState); return { use: 'local' };
    } catch (e) { setStatus({ sync: 'error', error: e.message }); return { use: 'local', error: e }; }
  },
  async pushNow(state) {
    if (!session || !state) return;
    clearTimeout(pushT); pushT = null;
    const data = { ...state, ai: state.ai ? { ...state.ai, key: '' } : undefined };
    setStatus({ sync: 'syncing', error: null });
    try {
      const rows = await api('/rest/v1/qd_data?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify({ user_id: session.user.id, data, device: navigator.userAgent.slice(0, 120) }) });
      const at = rows && rows[0] ? Date.parse(rows[0].updated_at) : Date.now();
      ls.set(SEEN_AT, String(at)); ls.set(LOCAL_AT, String(at)); setStatus({ sync: 'ok', at });
    } catch (e) { setStatus({ sync: e.status === 401 ? 'login' : 'error', error: e.message }); }
  },
  queuePush(state) { if (!session) return; pending = state; clearTimeout(pushT); pushT = setTimeout(() => Cloud.pushNow(pending), 2500); },
  flush() { if (pushT && pending) Cloud.pushNow(pending); },
  // Outro aparelho salvou depois? (checado quando o app volta para a frente)
  async newerRemote() {
    if (!session || pushT) return null;
    try { const r = await Cloud.pull(); if (r && r.at > (Number(ls.get(SEEN_AT)) || 0) && r.at > Cloud.localAt()) { ls.set(SEEN_AT, String(r.at)); ls.set(LOCAL_AT, String(r.at)); return r.data; } } catch (e) {}
    return null;
  },
  async backups() { return api(`/rest/v1/qd_backup?select=id,saved_at&user_id=eq.${session.user.id}&order=saved_at.desc&limit=30`); },
  async backup(id) { const r = await api(`/rest/v1/qd_backup?select=data&id=eq.${id}`); return r && r[0] ? r[0].data : null; },

  // ---------- notificações push ----------
  pushSupported() { return canCloud() && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; },
  async enablePush() {
    if (!Cloud.pushSupported()) throw new Error('unsupported');
    if (!session) throw Object.assign(new Error('login'), { status: 401 });
    const perm = await Notification.requestPermission(); if (perm !== 'granted') throw new Error('denied');
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(CFG.vapid) });
    const j = sub.toJSON();
    await api('/rest/v1/qd_push_subs?on_conflict=endpoint', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ endpoint: j.endpoint, user_id: session.user.id, p256dh: j.keys.p256dh, auth: j.keys.auth, device: navigator.userAgent.slice(0, 120) }) });
    ls.set(PUSH_ON, '1'); emit(); return true;
  },
  async disablePush() {
    ls.set(PUSH_ON, null); emit();
    if (!('serviceWorker' in navigator)) return;
    const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription();
    if (sub) { try { await api(`/rest/v1/qd_push_subs?endpoint=eq.${encodeURIComponent(sub.endpoint)}`, { method: 'DELETE' }); } catch (e) {} await sub.unsubscribe(); }
  },
  setReminders(list) {
    if (!session || !Cloud.pushOn) return;
    const key = JSON.stringify(list); if (key === lastRem) return;
    clearTimeout(remT); remT = setTimeout(async () => { try { await api('/rest/v1/rpc/qd_set_reminders', { method: 'POST', body: JSON.stringify({ items: list }) }); lastRem = key; } catch (e) {} }, 4000);
  },

  // ---------- Lume pelo servidor (a chave fica no Supabase) ----------
  async lumeCheck() {
    if (!session) { setStatus({ aiReady: null }); return null; }
    try { await api('/functions/v1/qd-lume', { method: 'POST', body: JSON.stringify({ ping: true }) }); setStatus({ aiReady: true }); return true; }
    catch (e) { setStatus({ aiReady: e.status === 409 ? 'not_configured' : e.status === 403 ? 'forbidden' : false }); return false; }
  },
  async lume(body) { return api('/functions/v1/qd-lume', { method: 'POST', body: JSON.stringify(body) }); },

  // ---------- Google Agenda (só leitura) ----------
  async gcalEvents(days = 14) {
    if (!Cloud.hasGoogleToken) throw Object.assign(new Error('google'), { status: 401 });
    const from = new Date(); from.setHours(0, 0, 0, 0); const to = new Date(from.getTime() + days * 86400000);
    const q = new URLSearchParams({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '250' });
    const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${q}`, { headers: { Authorization: `Bearer ${session.google.token}` } });
    if (r.status === 401) { saveSession({ ...session, google: null }); throw Object.assign(new Error('google'), { status: 401 }); }
    if (!r.ok) throw new Error(`Google ${r.status}`);
    const j = await r.json();
    return (j.items || []).filter((e) => e.status !== 'cancelled' && e.start && e.start.dateTime && e.end && e.end.dateTime)
      .map((e) => ({ id: e.id, title: e.summary || 'Compromisso', start: new Date(e.start.dateTime), end: new Date(e.end.dateTime) }));
  },
};
let pushT = null, pending = null, remT = null, lastRem = '';

function b64u(s) { const p = '='.repeat((4 - (s.length % 4)) % 4); const raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(raw, (c) => c.charCodeAt(0)); }

// ---------- app instalável ----------
let installEvt = null;
export const Pwa = {
  get canInstall() { return !!installEvt; },
  get installed() { return typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true); },
  get ios() { return typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent); },
  async install() { if (!installEvt) return false; installEvt.prompt(); const r = await installEvt.userChoice; installEvt = null; emit(); return r.outcome === 'accepted'; },
  register() {
    if (!canCloud() || !('serviceWorker' in navigator)) return;
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; emit(); });
    window.addEventListener('appinstalled', () => { installEvt = null; emit(); });
    navigator.serviceWorker.register('sw.js').catch(() => {});
  },
};
