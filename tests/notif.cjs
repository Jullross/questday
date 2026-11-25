const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [], csp = [];
  const c = await b.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['notifications'] });
  const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text().slice(0, 160)); });
  await p.goto('http://localhost:8000/'); await p.waitForTimeout(500);
  await p.getByRole('button', { name: /explorar com uma rotina de exemplo/ }).click(); await p.waitForTimeout(400);
  // escolhe uma tarefa pendente de hoje e simula 10 min antes dela
  const info = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('superplanner-v4')); const t = s.tasks.find((x) => !x.event) || s.tasks[0]; const it = { id: 'tn1', kind: 'task', ref: t.id, day: s.day, start: 15 * 60, dur: 30, status: 'pendente', ver: 'normal', prio: 'media', load: 'media' }; s.plan.items.push(it); s.simNow = it.start - 10; s.tourDone = true; s.notify = true; localStorage.setItem('superplanner-v4', JSON.stringify(s)); return { id: it.id, start: it.start }; });
  await p.reload(); await p.waitForTimeout(1500);
  const al = p.getByRole('alert'); console.log('toast', await al.count() ? (await al.first().innerText()).replace(/\n/g, ' | ') : 'none');
  console.log('bell label', await p.getByRole('button', { name: /Avisos de hoje/ }).first().getAttribute('aria-label'));
  await p.screenshot({ path: '/tmp/notif_toast.png' });
  await al.first().getByRole('button', { name: 'Adiar 10 min' }).click(); await p.waitForTimeout(200);
  const st1 = await p.evaluate(() => JSON.parse(localStorage.getItem('qd-notif'))); console.log('fired', st1.fired.length, 'snooze', st1.snooze.length, 'hist', st1.hist.length);
  await p.reload(); await p.waitForTimeout(1500); console.log('refire after reload', await p.getByRole('alert').count());
  // sino abre e zera
  await p.getByRole('button', { name: /Avisos de hoje/ }).first().click(); await p.waitForTimeout(200); await p.screenshot({ path: '/tmp/notif_bell.png' });
  console.log('bell list', await p.getByRole('dialog', { name: 'Avisos de hoje' }).locator('li').count()); await p.keyboard.press('Escape');
  console.log('bell after', await p.getByRole('button', { name: /Avisos de hoje/ }).first().getAttribute('aria-label'));
  // remédio com "Feito"
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('superplanner-v4')); s.careCfg.meds = [{ id: 'm1', name: 'Vitamina D', time: '13:00', stock: 30, dose: 1 }]; s.simNow = 13 * 60; s.notif = { blocks: false }; localStorage.setItem('superplanner-v4', JSON.stringify(s)); }); await p.reload(); await p.waitForTimeout(1500);
  const al2 = p.getByRole('alert').filter({ hasText: 'Vitamina D' }); console.log('med toast', await al2.count()); if (await al2.count()) { await al2.getByRole('button', { name: 'Feito' }).click(); await p.waitForTimeout(200); }
  console.log('med taken', await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('superplanner-v4')); return !!(s.medsTaken[s.day] || {}).m1; }));
  // configurações
  await p.locator('nav button', { hasText: 'Minha Rotina' }).first().click(); await p.getByRole('button', { name: /Conta e aparelhos/ }).click(); await p.waitForTimeout(300);
  const card = p.locator('div', { hasText: /^Notificações/ }).first();
  console.log('status', await p.getByText(/^(Ativadas|Desativadas|Bloqueadas no navegador)$/).first().innerText());
  console.log('perm', await p.evaluate(() => Notification.permission));
  await p.getByRole('switch', { name: /Blocos e compromissos/ }).click(); await p.waitForTimeout(100); await p.getByRole('radio', { name: '15 min' }).or(p.getByRole('button', { name: '15 min' })).first().click();
  console.log('cfg', JSON.stringify(await p.evaluate(() => JSON.parse(localStorage.getItem('superplanner-v4')).notif)));
  await p.getByRole('button', { name: /Enviar notificação de teste/ }).click(); await p.waitForTimeout(800);
  console.log('test toast', await p.getByRole('alert').filter({ hasText: 'Teste do QuestDay' }).count(), 'sw notifs', await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return r ? (await r.getNotifications()).length : -1; }));
  await p.screenshot({ path: '/tmp/notif_cfg.png', fullPage: true });
  console.log('theme-color', await p.evaluate(() => document.querySelector('meta[name=theme-color]').content));
  console.log('manifest name', await p.evaluate(async () => (await (await fetch('manifest.webmanifest')).json()).name));
  console.log('CSP', csp.length ? csp : 'ok'); console.log('ERRS', errs); await b.close();
})();
