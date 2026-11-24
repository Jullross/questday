const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 860 } }); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8000/'); await p.waitForTimeout(400);
  await p.getByRole('button', { name: /explorar com uma rotina de exemplo/ }).click(); await p.waitForTimeout(400);
  const setUi = async (ui) => { await p.evaluate((ui) => { const s = JSON.parse(localStorage.getItem('superplanner-v4')); s.ui = { ...s.ui, ...ui }; localStorage.setItem('superplanner-v4', JSON.stringify(s)); }, ui); await p.reload(); await p.waitForTimeout(500); };
  const mode = process.argv[2] || 'light';
  await setUi(mode === 'light' ? { theme: 'light', lowStim: false } : { theme: 'light', lowStim: true });
  await p.screenshot({ path: `/tmp/${mode}_agora.png` });
  for (const [t, f] of [['Semana', 'semana'], ['Cuidar', 'cuidar'], ['Minha Rotina', 'rotina'], ['Progresso', 'prog']]) { await p.locator('nav button', { hasText: t }).first().click(); await p.waitForTimeout(400); await p.screenshot({ path: `/tmp/${mode}_${f}.png` }); }
  await p.locator('nav button:has-text("Conta")').last().click(); await p.waitForTimeout(300); await p.screenshot({ path: `/tmp/${mode}_modal.png` }); await p.keyboard.press('Escape');
  // onboarding in light
  await p.evaluate(() => { localStorage.clear(); }); await p.reload(); await p.waitForTimeout(300);
  await p.evaluate(() => document.documentElement.classList.add('light')); await p.screenshot({ path: `/tmp/${mode}_home.png` });
  console.log('ERRS', errs); await b.close();
})();
