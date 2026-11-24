const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
  const p = await b.newPage({ viewport: vp }); const W = vp.width;
  p.on('pageerror', e => errs.push(W + ' ' + e.message));
  await p.goto('http://localhost:8000/'); await p.waitForTimeout(400);
  await p.getByRole('button', { name: /explorar com uma rotina/ }).click(); await p.waitForTimeout(500);
  const st = async () => p.evaluate(() => JSON.parse(localStorage.getItem('superplanner-v4')));
  let s0 = await st(); const prod0 = s0.plan.items.filter(i => i.day >= s0.day && i.day <= s0.day + 6).length;
  // open Dia tab (desktop aside; mobile may differ)
  const tab = p.getByRole('tab', { name: /^Dia/ });
  if (await tab.count() && await tab.first().isVisible()) { await tab.first().click(); await p.getByRole('button', { name: /Uma semana/ }).click(); }
  else { await p.evaluate(() => {}); const b2 = p.getByRole('button', { name: /Uma semana/ }); if (await b2.count()) await b2.first().click(); else { console.log('no dia tab on mobile; skip quick'); } }
  await p.waitForTimeout(500);
  let s = await st();
  console.log(W, 'vacations', JSON.stringify(s.vacations), 'kept', s.keptDays[s.day], 'streak', s.streak.count);
  const wk = s.plan.items.filter(i => i.day >= s.day && i.day <= s.day + 6);
  console.log(W, 'items week before', prod0, 'after', wk.length, 'kinds', [...new Set(wk.map(i => i.kind + ':' + (i.cycleId ? 'cy' : i.routineId ? 'rt' : 'x')))].join(','));
  const body = await p.locator('body').innerText();
  console.log(W, 'em pausa:', /em pausa/.test(body), 'rotina em pausa:', /rotina em pausa/.test(body));
  await p.screenshot({ path: `/tmp/vac_${W}.png`, fullPage: false });
  // Semana
  const sem = p.getByRole('button', { name: /^Semana/ }).first(); if (await sem.count()) { await sem.click(); await p.waitForTimeout(400); await p.screenshot({ path: `/tmp/vacsem_${W}.png` }); }
  // Semestre card
  await p.getByRole('button', { name: /^Minha Rotina/ }).first().click(); await p.waitForTimeout(200);
  const ss = p.getByRole('button', { name: /Semestre/ }).first(); if (await ss.count()) { await ss.click(); await p.waitForTimeout(300); }
  const fv = p.getByText('Férias e viagens'); console.log(W, 'semestre card', await fv.count());
  if (await fv.count()) { await fv.first().scrollIntoViewIfNeeded(); await p.screenshot({ path: `/tmp/vaccad_${W}.png` }); }
  const enc = p.getByRole('button', { name: /Encerrar agora/ });
  if (await enc.count()) { await enc.first().click(); await p.waitForTimeout(400); s = await st(); console.log(W, 'after end', JSON.stringify(s.vacations), 'items wk', s.plan.items.filter(i => i.day >= s.day && i.day <= s.day + 6).length, 'today', s.plan.items.filter(i=>i.day===s.day).length); }
  // Lume command
  await p.close();
  }
  // commandBrain test via page
  console.log('ERRS', errs); await b.close();
})();
