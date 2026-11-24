const { chromium } = require('playwright');
const SB = 'https://ziycnzsjhnswwrpotasp.supabase.co';
(async () => {
  const b = await chromium.launch(); const errs = []; let stored = null; const calls = [];
  const jwt = 'x.' + Buffer.from(JSON.stringify({ sub: 'u1', email: 'jullia@teste.com' })).toString('base64url') + '.y';
  const hdr = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'content-type': 'application/json' };
  const sess = JSON.stringify({ access_token: jwt, refresh_token: 'r', expires_in: 3600, user: { id: 'u1', email: 'jullia@teste.com' } });
  const mock = async (ctx) => ctx.route(SB + '/**', async (route) => {
    const r = route.request(), u = new URL(r.url()), m = r.method();
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: hdr });
    calls.push(m + ' ' + u.pathname);
    if (u.pathname === '/auth/v1/token' || u.pathname === '/auth/v1/signup') return route.fulfill({ status: 200, headers: hdr, body: sess });
    if (u.pathname === '/rest/v1/qd_data' && m === 'GET') return route.fulfill({ status: 200, headers: hdr, body: JSON.stringify(stored ? [{ data: stored.data, updated_at: stored.at }] : []) });
    if (u.pathname === '/rest/v1/qd_data' && m === 'POST') { stored = { data: JSON.parse(r.postData()).data, at: new Date().toISOString() }; return route.fulfill({ status: 201, headers: hdr, body: JSON.stringify([{ updated_at: stored.at }]) }); }
    if (u.pathname === '/functions/v1/qd-delete-account') { stored = null; return route.fulfill({ status: 200, headers: hdr, body: '{"ok":true,"login_deleted":true}' }); }
    if (u.pathname === '/functions/v1/qd-lume') return route.fulfill({ status: 200, headers: hdr, body: '{"ok":true}' });
    return route.fulfill({ status: 200, headers: hdr, body: '[]' });
  });
  const log = (...a) => console.log(...a);
  for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    stored = null; const W = vp.width;
    const c = await b.newContext({ viewport: vp }); await mock(c); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(W + ' ' + e.message));
    const body = () => p.locator('body').innerText();
    await p.goto('http://localhost:8000/'); await p.waitForTimeout(500);
    await p.screenshot({ path: `/tmp/home_${W}.png`, fullPage: true });
    let t = await body(); log(W, 'home: card criar', /Crie sua conta/.test(t), 'no montar btn', !/Montar minha rotina/.test(t), 'demo link', /explorar com uma rotina de exemplo/.test(t));
    // demo -> banner -> exit
    await p.getByRole('button', { name: /explorar com uma rotina de exemplo/ }).click(); await p.waitForTimeout(500);
    t = await body(); log(W, 'demo banner', /Modo demonstração/.test(t));
    await p.screenshot({ path: `/tmp/demo_${W}.png` });
    await p.getByRole('button', { name: /Sair (da demonstração )?\/ Criar conta/ }).first().click(); await p.waitForTimeout(500);
    t = await body(); log(W, 'back home', /Crie sua conta/.test(t), 'local cleared', await p.evaluate(() => !localStorage.getItem('superplanner-v4')));
    // create account -> onboarding step 1
    await p.getByLabel('E-mail').fill('jullia@teste.com'); await p.getByLabel('Senha').fill('segredo123'); await p.getByRole('button', { name: /^Criar conta$/ }).last().click(); await p.waitForTimeout(1200);
    t = await body(); log(W, 'onboarding started', /que horas você tenta dormir/.test(t));
    // skip onboarding with example-like data: inject remote then reload -> app
    stored = { data: await p.evaluate(() => null), at: new Date().toISOString() };
    stored = null;
    await c.close();
  }
  // existing account flow: login brings data; logout; delete
  const c = await b.newContext({ viewport: { width: 1280, height: 900 } }); await mock(c); const p = await c.newPage(); p.on('pageerror', (e) => errs.push('acct ' + e.message));
  await p.goto('http://localhost:8000/'); await p.waitForTimeout(400);
  await p.getByRole('button', { name: /explorar com uma rotina de exemplo/ }).click(); await p.waitForTimeout(300);
  const demoData = await p.evaluate(() => JSON.parse(localStorage.getItem('superplanner-v4'))); delete demoData.demo;
  stored = { data: demoData, at: new Date(Date.now() + 60000).toISOString() };
  await p.getByRole('button', { name: /Sair da demonstração \/ Criar conta/ }).click(); await p.waitForTimeout(400);
  await p.getByRole('tab', { name: 'Entrar' }).click(); await p.getByLabel('E-mail').fill('jullia@teste.com'); await p.getByLabel('Senha').fill('segredo123'); await p.getByRole('button', { name: /^Entrar$/ }).click(); await p.waitForTimeout(1500);
  let t = await p.locator('body').innerText(); console.log('login loads data', /Agora/.test(t) && !/Modo demonstração/.test(t));
  await p.locator('nav button:has-text("Conta")').last().click(); await p.waitForTimeout(300);
  await p.screenshot({ path: '/tmp/acct_modal.png' });
  await p.getByRole('button', { name: /Sair da conta/ }).first().click(); await p.waitForTimeout(800);
  t = await p.locator('body').innerText(); console.log('logout -> home', /Crie sua conta/.test(t), /Você saiu da conta/.test(t));
  console.log('local keys after logout', JSON.stringify(await p.evaluate(() => Object.keys(localStorage))));
  await p.getByRole('tab', { name: 'Entrar' }).click(); await p.getByLabel('E-mail').fill('jullia@teste.com'); await p.getByLabel('Senha').fill('segredo123'); await p.getByRole('button', { name: /^Entrar$/ }).click(); await p.waitForTimeout(1500);
  await p.locator('nav button:has-text("Conta")').last().click(); await p.waitForTimeout(300);
  await p.getByRole('button', { name: /Excluir minha conta/ }).click(); await p.waitForTimeout(200);
  const del = p.getByRole('button', { name: /Excluir para sempre/ }); console.log('delete disabled before typing', await del.isDisabled());
  await p.getByLabel('Digite EXCLUIR para confirmar').fill('excluir'); await p.screenshot({ path: '/tmp/acct_del.png' });
  await del.click(); await p.waitForTimeout(1000);
  t = await p.locator('body').innerText(); console.log('deleted -> home', /Crie sua conta/.test(t), /Conta excluída/.test(t), 'remote', stored);
  console.log('ERRS', errs); await b.close();
})();
