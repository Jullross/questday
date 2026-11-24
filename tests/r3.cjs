const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const vp of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const W = vp.width, p = await b.newPage({ viewport: vp }); p.on('pageerror', (e) => errs.push(W + ' ' + e.message));
    await p.goto('http://localhost:8000/'); await p.waitForTimeout(400);
    await p.getByRole('button', { name: /explorar com uma rotina de exemplo/ }).click(); await p.waitForTimeout(300);
    await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('superplanner-v4')); s.tourDone = true; localStorage.setItem('superplanner-v4', JSON.stringify(s)); }); await p.reload(); await p.waitForTimeout(400);
    // nome editável em Minha Rotina
    await p.locator('nav button', { hasText: 'Minha Rotina' }).first().click(); await p.getByRole('button', { name: /Horários fixos/ }).click(); await p.waitForTimeout(300);
    const ed = p.getByRole('button', { name: /^Editar Estágio/ }).first(); if (await ed.count()) { await ed.click(); } else { await p.getByText('Estágio', { exact: true }).first().click(); }
    await p.waitForTimeout(200); const nm = p.locator('input[id^="fx-nome-"]').first();
    await nm.fill(''); await nm.type('Estágio na NTS'); console.log(W, 'name typed', await nm.inputValue(), 'type', await nm.getAttribute('type'));
    // chat
    await p.getByRole('button', { name: /Abrir o assistente/ }).click(); await p.waitForTimeout(300);
    const ta = p.getByLabel('Mensagem para o assistente'); console.log(W, 'tag', await ta.evaluate((e) => e.tagName));
    await ta.click(); await ta.type('linha um'); await p.keyboard.press('Shift+Enter'); await ta.type('linha dois'); await p.keyboard.press('Shift+Tab'); await ta.type('linha três');
    const v = await ta.inputValue(); const h = await ta.evaluate((e) => e.offsetHeight); console.log(W, 'value', JSON.stringify(v), 'focused', await ta.evaluate((e) => document.activeElement === e), 'height', h);
    await p.keyboard.press('Enter'); await p.waitForTimeout(700);
    const bub = p.locator('p.whitespace-pre-wrap', { hasText: 'linha um' }).first(); console.log(W, 'bubble lines', (await bub.innerText()).split('\n').length, 'input cleared', (await ta.inputValue()) === '', 'height after', await ta.evaluate((e) => e.offsetHeight));
    await p.screenshot({ path: `/tmp/chat_${W}.png` }); await p.keyboard.press('Escape');
    // calendário
    await p.locator('nav button', { hasText: 'Semana' }).first().click(); await p.waitForTimeout(300);
    await p.getByRole('tab', { name: 'Calendário' }).click(); await p.waitForTimeout(300);
    console.log(W, 'month title', await p.locator('h2').first().innerText(), 'cells', await p.getByRole('gridcell').count());
    await p.screenshot({ path: `/tmp/cal_${W}.png`, fullPage: W > 800 });
    await p.getByRole('button', { name: 'Próximo mês' }).click(); await p.waitForTimeout(150); console.log(W, 'next', await p.locator('h2').first().innerText()); await p.getByRole('button', { name: 'Hoje', exact: true }).click();
    // abre amanhã
    const tom = await p.evaluate(() => JSON.parse(localStorage.getItem('superplanner-v4')).day + 1);
    await p.getByRole('gridcell').filter({ has: p.locator('span') }).nth(0); 
    const cells = p.getByRole('gridcell'); const n = await cells.count(); let idx = -1;
    for (let i = 0; i < n; i++) { const l = await cells.nth(i).getAttribute('aria-label'); if (/^(segunda|terça|quarta|quinta|sexta|sábado|domingo)/.test(l)) { const today = await cells.nth(i).evaluate((e) => e.className.includes('border-[#9f8fff]/60')); if (today) { idx = i + 1; break; } } }
    await cells.nth(idx).click(); await p.waitForTimeout(300);
    const dlg = p.getByRole('dialog'); console.log(W, 'modal', (await dlg.locator('h2').innerText()), 'items', await dlg.locator('li').count());
    await dlg.getByRole('button', { name: /Adicionar neste dia/ }).click(); await dlg.getByLabel('Nome do compromisso').fill('Consulta dentista');
    await dlg.getByRole('button', { name: /Marcar|mesmo assim/ }).click(); await p.waitForTimeout(500);
    console.log(W, 'added in modal', await dlg.getByText('Consulta dentista').count());
    await p.screenshot({ path: `/tmp/calmodal_${W}.png` }); await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    console.log(W, 'chip on cell', await cells.nth(idx).innerText().then((t) => t.includes('Consulta dentista') || W < 800));
    if (W > 800) { for (const [ui, f] of [[{ theme: 'light', lowStim: false }, 'cal_light'], [{ theme: 'light', lowStim: true }, 'cal_lowlight']]) { await p.evaluate((ui) => { const s = JSON.parse(localStorage.getItem('superplanner-v4')); s.ui = { ...s.ui, ...ui }; localStorage.setItem('superplanner-v4', JSON.stringify(s)); }, ui); await p.reload(); await p.waitForTimeout(500); await p.screenshot({ path: `/tmp/${f}.png` }); } }
    await p.close();
  }
  console.log('ERRS', errs); await b.close();
})();
