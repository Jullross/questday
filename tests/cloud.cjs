const { chromium } = require('playwright');
const SB = 'https://ziycnzsjhnswwrpotasp.supabase.co';
(async () => {
  const b = await chromium.launch(); const errs = []; let stored = null; const calls = [];
  const jwt = 'x.' + Buffer.from(JSON.stringify({ sub: 'u1', email: 'jullia@teste.com' })).toString('base64url') + '.y';
  const hdr = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'content-type': 'application/json' };
  const mock = async (ctx) => ctx.route(SB + '/**', async (route) => {
    const r = route.request(), u = new URL(r.url()), m = r.method();
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: hdr });
    calls.push(m + ' ' + u.pathname);
    if (u.pathname === '/auth/v1/token') return route.fulfill({ status: 200, headers: hdr, body: JSON.stringify({ access_token: jwt, refresh_token: 'r', expires_in: 3600, user: { id: 'u1', email: 'jullia@teste.com' } }) });
    if (u.pathname === '/rest/v1/qd_data' && m === 'GET') return route.fulfill({ status: 200, headers: hdr, body: JSON.stringify(stored ? [{ data: stored.data, updated_at: stored.at }] : []) });
    if (u.pathname === '/rest/v1/qd_data' && m === 'POST') { const j = JSON.parse(r.postData()); stored = { data: j.data, at: new Date().toISOString() }; return route.fulfill({ status: 201, headers: hdr, body: JSON.stringify([{ updated_at: stored.at }]) }); }
    if (u.pathname === '/functions/v1/qd-lume') { const j = JSON.parse(r.postData()); if (j.ping) return route.fulfill({ status: 200, headers: hdr, body: '{"ok":true}' });
      const lastMsg = j.messages[j.messages.length - 1];
      if (typeof lastMsg.content === 'string') return route.fulfill({ status: 200, headers: hdr, body: JSON.stringify({ stop_reason: 'tool_use', content: [{ type: 'tool_use', id: 'g1', name: 'add_water', input: { ml: 250 }, signature: 'SIG123' }] }) });
      const echoed = JSON.stringify(j.messages).includes('SIG123') && JSON.stringify(j.messages).includes('tool_result');
      return route.fulfill({ status: 200, headers: hdr, body: JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: echoed ? 'Resposta do servidor do Lume.' : 'sem assinatura' }] }) }); }
    return route.fulfill({ status: 200, headers: hdr, body: '[]' });
  });
  // Aparelho 1: exemplo -> entra na conta -> sobe os dados
  const c1 = await b.newContext({ viewport: { width: 1280, height: 900 } }); await mock(c1);
  const p = await c1.newPage(); p.on('pageerror', (e) => errs.push('p1 ' + e.message));
  await p.goto('http://localhost:8000/'); await p.waitForTimeout(400);
  await p.getByRole('button', { name: /explorar com uma rotina/ }).click(); await p.waitForTimeout(400);
  await p.getByRole('button', { name: /^Minha Rotina/ }).first().click(); await p.waitForTimeout(200);
  await p.getByRole('button', { name: /Conta e aparelhos/ }).first().click(); await p.waitForTimeout(300);
  await p.screenshot({ path: '/tmp/conta_out.png', fullPage: true });
  await p.getByLabel('E-mail').fill('jullia@teste.com'); await p.getByLabel('Senha').fill('segredo123'); await p.getByRole('button', { name: /^Entrar$/ }).click(); await p.waitForTimeout(1500);
  await p.screenshot({ path: '/tmp/conta_in.png', fullPage: true });
  console.log('stored after login?', !!stored, stored && stored.data.v, 'ai key stripped', stored && (!stored.data.ai || !stored.data.ai.key));
  console.log('sw', await p.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())));
  // Lume pelo servidor
  await p.getByRole('button', { name: /Abrir o assistente/ }).click(); await p.waitForTimeout(300);
  const box = p.getByPlaceholder(/./).last(); await box.fill('como está meu dia?'); await box.press('Enter'); await p.waitForTimeout(1200);
  console.log('lume server reply', await p.getByText('Resposta do servidor do Lume.').count());
  // muda algo -> sobe
  const before = stored.at; await p.keyboard.press('Escape');
  await p.evaluate(() => {}); await p.getByRole('button', { name: /^Cuidar/ }).first().click(); await p.waitForTimeout(300);
  const w = p.getByRole('button', { name: /\+ ?250|250 ?ml/ }).first(); if (await w.count()) await w.click(); await p.waitForTimeout(3500);
  console.log('pushed again', stored.at !== before);
  // Aparelho 2: onboarding -> já tenho conta -> traz dados
  const c2 = await b.newContext({ viewport: { width: 390, height: 844 } }); await mock(c2);
  const q = await c2.newPage(); q.on('pageerror', (e) => errs.push('p2 ' + e.message));
  await q.goto('http://localhost:8000/'); await q.waitForTimeout(400);
  await q.getByRole('button', { name: /Já tenho conta/ }).click();
  await q.getByLabel('E-mail').fill('jullia@teste.com'); await q.getByLabel('Senha').fill('segredo123'); await q.getByRole('button', { name: /^Entrar$/ }).click(); await q.waitForTimeout(1500);
  const txt = await q.locator('body').innerText(); console.log('device2 in app', /Agora/.test(txt) && !/Montar minha rotina/.test(txt));
  await q.screenshot({ path: '/tmp/dev2.png' });
  // reload device2: should go sync splash -> app
  await q.reload(); await q.waitForTimeout(1500); console.log('device2 reload ok', /Agora/.test(await q.locator('body').innerText()));
  console.log('calls', [...new Set(calls)].join(' | '));
  console.log('ERRS', errs); await b.close();
})();
