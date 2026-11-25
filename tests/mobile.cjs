const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const dev of ['Pixel 7', 'iPhone 14']) {
    const c = await b.newContext({ ...devices[dev] }); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(dev + ' ' + e.message));
    const tag = dev.split(' ')[0];
    await p.goto('http://localhost:8000/'); await p.waitForTimeout(400);
    console.log(tag, 'home install btn', await p.getByRole('button', { name: /Baixar app no celular/ }).count());
    await p.getByRole('button', { name: /explorar com uma rotina de exemplo/ }).click(); await p.waitForTimeout(400);
    await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('superplanner-v4')); s.tourDone = true; localStorage.setItem('superplanner-v4', JSON.stringify(s)); }); await p.reload(); await p.waitForTimeout(500);
    // helper de gesto
    await p.evaluate(() => { window.__swipe = (el, dx, dy, steps = 8) => { const r = el.getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + Math.min(r.height / 2, 30); const mk = (x, y) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
      el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [mk(x0, y0)], changedTouches: [mk(x0, y0)] }));
      for (let i = 1; i <= steps; i++) el.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [mk(x0 + dx * i / steps, y0 + dy * i / steps)], changedTouches: [mk(x0 + dx * i / steps, y0 + dy * i / steps)] }));
      el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], changedTouches: [mk(x0 + dx, y0 + dy)] })); }; });
    const tabs = await p.locator('nav[aria-label="Seções"] button').allInnerTexts(); console.log(tag, 'tabs', tabs.map((t) => t.trim()).join(','));
    // instalar
    await p.getByRole('button', { name: /Baixar app: instalar no celular/ }).click(); await p.waitForTimeout(400);
    const sh = p.getByRole('dialog', { name: 'Instalar o QuestDay' }); console.log(tag, 'install sheet', (await sh.innerText()).replace(/\n+/g, ' ').slice(0, 140));
    await p.screenshot({ path: `/tmp/m_install_${tag}.png` });
    // arrastar para baixo fecha
    await p.evaluate(() => { const h = document.querySelector('[data-handle]'); window.__swipe(h, 0, 200); }); await p.waitForTimeout(400); console.log(tag, 'sheet closed by drag', await sh.count() === 0);
    // pull to refresh
    await p.evaluate(() => { window.scrollTo(0, 0); window.__swipe(document.querySelector('main h1'), 0, 260, 10); }); await p.waitForTimeout(1300);
    console.log(tag, 'pull refresh toast', await p.getByText('Tudo em dia.').count());
    // FAB
    await p.getByRole('button', { name: 'Ação rápida: adicionar' }).click(); await p.waitForTimeout(300); await p.screenshot({ path: `/tmp/m_fab_${tag}.png` });
    const w0 = await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('superplanner-v4')); return (s.waterMl || {})[s.day] || 0; });
    await p.getByRole('button', { name: '+250 ml de água' }).click(); await p.waitForTimeout(300);
    console.log(tag, 'fab water', await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('superplanner-v4')); return (s.waterMl || {})[s.day] || 0; }) - w0);
    // Semana: swipe item -> feito + desfazer
    await p.locator('nav[aria-label="Seções"] button', { hasText: 'Semana' }).click(); await p.waitForTimeout(400);
    const dayBtns = p.locator('button[aria-pressed]').filter({ hasText: /itens|livre|pausa/ });
    const before = await p.locator('button[aria-pressed="true"]').filter({ hasText: /itens|livre|pausa/ }).first().innerText();
    await p.evaluate(() => { const el = document.querySelector('.lg\\:hidden.space-y-2.max-w-2xl'); window.__swipe(el, -200, 0); }); await p.waitForTimeout(300);
    const after = await p.locator('button[aria-pressed="true"]').filter({ hasText: /itens|livre|pausa/ }).first().innerText();
    console.log(tag, 'day swipe', before.replace(/\n/g, ' '), '->', after.replace(/\n/g, ' '));
    await p.evaluate(() => { const rows = [...document.querySelectorAll('.lg\\:hidden.space-y-2.max-w-2xl .relative.rounded-lg.overflow-hidden')]; if (rows[0]) window.__swipe(rows[0], -160, 0); }); await p.waitForTimeout(400);
    console.log(tag, 'swipe left sheet (first)', await p.getByRole('dialog').filter({ hasText: /Trocar por algo mais leve/ }).count()); await p.screenshot({ path: `/tmp/m_left_${tag}.png` }); await p.getByRole('button', { name: 'Cancelar' }).last().click(); await p.waitForTimeout(300);
    const id = await p.evaluate(() => { const rows = [...document.querySelectorAll('.lg\\:hidden.space-y-2.max-w-2xl .relative.rounded-lg.overflow-hidden')]; const el = rows[0]; if (!el) return null; window.__swipe(el, 160, 0); return true; });
    await p.waitForTimeout(400); const toast = p.getByText(/^Feito: /); console.log(tag, 'swipe done toast', await toast.count());
    await p.screenshot({ path: `/tmp/m_swipe_${tag}.png` });
    if (await toast.count()) { await p.getByRole('button', { name: 'Desfazer' }).click(); await p.waitForTimeout(300); console.log(tag, 'undo ok', await p.getByText(/^Feito: /).count() === 0); }
    console.log(tag, 'rows now', await p.evaluate(() => document.querySelectorAll('.lg\\:hidden.space-y-2.max-w-2xl .relative.rounded-lg.overflow-hidden').length), await p.evaluate(() => document.querySelector('.lg\\:hidden.space-y-2.max-w-2xl') ? document.querySelector('.lg\\:hidden.space-y-2.max-w-2xl').innerText.slice(0,120) : 'no list'));
    await p.evaluate(() => { const rows = [...document.querySelectorAll('.lg\\:hidden.space-y-2.max-w-2xl .relative.rounded-lg.overflow-hidden')]; if (rows[0]) window.__swipe(rows[0], -160, 0); }); await p.waitForTimeout(400);
    console.log(tag, 'swipe left sheet', await p.getByRole('dialog').filter({ hasText: /Trocar por algo mais leve/ }).count()); await p.screenshot({ path: `/tmp/m_left_${tag}.png` }); await p.keyboard.press('Escape');
    // seletor de horário como sheet (Minha Rotina > Sono)
    await p.locator('nav[aria-label="Seções"] button', { hasText: 'Rotina' }).click(); await p.getByRole('button', { name: /Sono e cuidados/ }).click(); await p.waitForTimeout(300);
    await p.getByRole('button', { name: /^Dormir às:/ }).first().click(); await p.waitForTimeout(300);
    console.log(tag, 'picker is sheet', await p.evaluate(() => { const d = [...document.querySelectorAll('[role=dialog]')].pop(); return d && d.className.includes('bottom-0'); }));
    await p.screenshot({ path: `/tmp/m_picker_${tag}.png` }); await p.getByRole('button', { name: 'Pronto' }).last().click();
    // chat sheet + drag
    await p.getByRole('button', { name: /Abrir o assistente/ }).click(); await p.waitForTimeout(400); await p.screenshot({ path: `/tmp/m_chat_${tag}.png` });
    await p.evaluate(() => { const h = document.querySelector('[aria-label="Assistente"] .md\\:hidden'); window.__swipe(h, 0, 220); }); await p.waitForTimeout(400);
    console.log(tag, 'chat closed by drag', await p.getByRole('dialog', { name: 'Assistente' }).count() === 0);
    // conta: reset
    await p.getByRole('button', { name: 'Conta', exact: true }).click(); await p.waitForTimeout(300); await p.screenshot({ path: `/tmp/m_conta_${tag}.png` });
    await p.getByRole('button', { name: 'Recomeçar do zero' }).click(); await p.getByRole('button', { name: /^Recomeçar$/ }).click(); await p.waitForTimeout(700);
    console.log(tag, 'reset -> home', await p.getByText('Crie sua conta para começar').count(), 'local', await p.evaluate(() => !!localStorage.getItem('superplanner-v4')));
    await c.close();
  }
  console.log('ERRS', errs); await b.close();
})();
