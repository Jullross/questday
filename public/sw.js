// QuestDay service worker: abre offline e recebe as notificações.
// Só guarda arquivos do próprio site (nunca respostas com login nem APIs externas: Supabase, Google, IA).
const CACHE = 'questday-__BUILD__';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/badge-96.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  // Primeira instalação assume logo; atualizações esperam o "Atualizar" (mensagem SKIP_WAITING).
  if (!self.registration.active) self.skipWaiting();
});
self.addEventListener('message', (e) => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('questday-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || req.headers.has('authorization')) return;
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (req.mode === 'navigate') {
    // HTML: rede primeiro (versão nova), cache se estiver offline.
    e.respondWith(fetch(req).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put('index.html', copy)); } return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  // Arquivos estáticos: responde do cache e atualiza em segundo plano.
  e.respondWith(caches.open(CACHE).then((c) => c.match(req).then((hit) => {
    const net = fetch(req).then((r) => { if (r.ok && r.type === 'basic') c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  })));
});

const ACTIONABLE = /^(it|med|meal|water)-/;
self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: 'QuestDay', body: e.data ? e.data.text() : '' }; }
  const tag = d.tag || undefined;
  e.waitUntil(self.registration.showNotification(d.title || 'QuestDay', {
    body: d.body || '', tag, renotify: false, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png',
    data: { id: tag, url: d.url || './' }, actions: tag && ACTIONABLE.test(tag) ? [{ action: 'done', title: 'Feito' }, { action: 'snooze', title: 'Adiar 10 min' }] : [],
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const id = e.notification.data && e.notification.data.id, action = e.action || '';
  const scope = self.registration.scope;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
    const open = cs.find((c) => c.url.startsWith(scope));
    if (open) { if (action && id) open.postMessage({ type: 'qd-notif', action, id }); return open.focus(); }
    const q = action && id ? `?na=${encodeURIComponent(action)}&nid=${encodeURIComponent(id)}` : '';
    return self.clients.openWindow(scope + q);
  }));
});
