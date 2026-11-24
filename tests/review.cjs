const { chromium } = require('playwright');
const SB = 'https://ziycnzsjhnswwrpotasp.supabase.co';
(async () => {
  const b = await chromium.launch(); const errs = [];
  const hdr = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'content-type': 'application/json' };
  const jwt = 'x.' + Buffer.from(JSON.stringify({ sub: 'u1', email: 'jullia@teste.com' })).toString('base64url') + '.y';
  for (const vp of [{ width: 1280, height: 860 }, { width: 390, height: 844 }]) {
    const W = vp.width, c = await b.newContext({ viewport: vp });
    await c.route(SB + '/**', (r) => { const u = new URL(r.request().url()); if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: hdr });
      if (/signup|token/.test(u.pathname)) return r.fulfill({ status: 200, headers: hdr, body: JSON.stringify({ access_token: jwt, refresh_token: 'r', expires_in: 3600, user: { id: 'u1', email: 'jullia@teste.com' } }) });
      if (u.pathname === '/rest/v1/qd_data' && r.request().method() === 'POST') return r.fulfill({ status: 201, headers: hdr, body: JSON.stringify([{ updated_at: new Date().toISOString() }]) });
      return r.fulfill({ status: 200, headers: hdr, body: u.pathname.includes('functions') ? '{"ok":true}' : '[]' }); });
    const p = await c.newPage(); p.on('pageerror', (e) => errs.push(W + ' ' + e.message));
    await p.goto('http://localhost:8000/'); await p.waitForTimeout(400);
    await p.getByLabel('E-mail').fill('jullia@teste.com'); await p.getByLabel('Senha').fill('segredo123'); await p.getByRole('button', { name: /^Criar conta$/ }).last().click(); await p.waitForTimeout(1000);
    // 1 sono
    const t1 = await p.locator('body').innerText(); console.log(W, 'presets', ['Acordo cedo', 'Padrão', 'Durmo tarde'].every((x) => t1.includes(x)), 'old gone', !/Madrugadora|Noturna|Horário comercial/.test(t1));
    await p.getByRole('button', { name: 'Durmo tarde' }).click();
    await p.getByRole('button', { name: /^Continuar/ }).click(); await p.waitForTimeout(300);
    // 3 trajeto em aulas e outro fixo
    await p.getByRole('button', { name: /Aulas \/ faculdade/ }).first().click(); await p.waitForTimeout(200);
    await p.getByRole('button', { name: /Outro fixo/ }).click(); await p.waitForTimeout(200);
    await p.getByPlaceholder('Ex.: terapia, academia, curso').fill('Academia');
    const segs = await p.getByRole('radio', { name: 'Tem trajeto' }).count() + await p.getByRole('button', { name: 'Tem trajeto' }).count();
    console.log(W, 'trajeto options (aula + outro)', segs);
    // marca trajeto no outro fixo
    const tt = p.getByRole('button', { name: 'Tem trajeto' }).or(p.getByRole('radio', { name: 'Tem trajeto' })); await tt.last().click(); await p.waitForTimeout(200);
    // 2 seletor de duração: abre, escolhe 1h e 37 min, digita
    const ida = p.getByRole('button', { name: /^Tempo de ida:/ }); console.log(W, 'ida pickers', await ida.count(), 'native selects', await p.locator('select').count());
    await ida.last().click(); await p.waitForTimeout(200);
    const dlg = p.getByRole('dialog', { name: 'Tempo de ida' });
    console.log(W, 'hours listed', await dlg.locator('button', { hasText: /^\d+h$/ }).count(), 'minutes listed', await dlg.locator('button', { hasText: /^\d\d$/ }).count());
    await dlg.getByRole('button', { name: '1h', exact: true }).click(); await dlg.getByRole('button', { name: '37', exact: true }).click();
    await p.screenshot({ path: `/tmp/dur_${W}.png` });
    await dlg.getByRole('button', { name: 'Pronto' }).click(); await p.waitForTimeout(100);
    console.log(W, 'ida value', await ida.last().getAttribute('aria-label'));
    await ida.last().click(); await p.getByLabel('Tempo de ida em minutos').fill('135'); await p.getByLabel('Tempo de ida em minutos').press('Enter'); await p.getByRole('dialog', { name: 'Tempo de ida' }).getByRole('button', { name: 'Pronto' }).click();
    console.log(W, 'typed value', await ida.last().getAttribute('aria-label'));
    await p.screenshot({ path: `/tmp/fixos_${W}.png`, fullPage: true });
    // segue onboarding
    await p.getByRole('button', { name: /^Continuar/ }).click(); await p.waitForTimeout(200);
    await p.getByRole('button', { name: /^Continuar/ }).click(); await p.waitForTimeout(200);
    const chips = p.locator('div.flex.flex-wrap.gap-2').first().locator('button'); await chips.nth(0).click(); await chips.nth(1).click();
    for (let k = 0; k < 4; k++) { const cb = p.getByRole('button', { name: /^(Continuar|Montar minha semana)/ }); if (await cb.count()) { await cb.click(); await p.waitForTimeout(300); } }
    const go = p.getByRole('button', { name: /Ver o que fazer agora/ }); if (await go.count()) { await go.click(); await p.waitForTimeout(800); }
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('superplanner-v4')));
    const tr = st.fixed.filter((f) => f.type === 'trajeto').map((f) => f.title + ' ' + f.start + '-' + f.end + ' of=' + f.of);
    console.log(W, 'trips built', tr.join(' | '), 'bed', st.sleepGoal.bed);
    // 8 tour
    let n = 0; for (; n < 6; n++) { const d = p.getByRole('dialog').filter({ hasText: / de 4/ }); if (!(await d.count())) break; await p.screenshot({ path: `/tmp/tour${n}_${W}.png` }); const nx = d.getByRole('button', { name: /Próximo|Começar/ }); await nx.click(); await p.waitForTimeout(500); }
    console.log(W, 'tour steps shown', n);
    await p.reload(); await p.waitForTimeout(800); console.log(W, 'tour again after reload', await p.getByRole('dialog').filter({ hasText: / de 4/ }).count());
    // 7 sim field
    if (W > 800) { await p.getByRole('tab', { name: /^Dia/ }).click(); await p.waitForTimeout(200); console.log(W, 'sim native select', await p.locator('select#sim').count());
      await p.getByRole('button', { name: /^Ver como se fosse/ }).click(); const sd = p.getByRole('dialog', { name: 'Ver como se fosse' }); console.log(W, 'sim options', await sd.locator('button').count() - 1);
      await p.screenshot({ path: '/tmp/sim.png' }); await sd.getByRole('button', { name: '03:00', exact: true }).click(); console.log(W, 'simNow', await p.evaluate(() => JSON.parse(localStorage.getItem('superplanner-v4')).simNow)); }
    await c.close();
  }
  console.log('ERRS', errs); await b.close();
})();
