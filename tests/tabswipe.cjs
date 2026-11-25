const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const c = await b.newContext({ ...devices['Pixel 7'] }); const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:8000/'); await p.waitForTimeout(300); await p.getByRole('button', { name: /explorar com uma rotina de exemplo/ }).click(); await p.waitForTimeout(300);
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('superplanner-v4')); s.tourDone = true; localStorage.setItem('superplanner-v4', JSON.stringify(s)); }); await p.reload(); await p.waitForTimeout(500);
  await p.evaluate(() => { window.__swipe = (el, dx, dy, steps = 8) => { const r = el.getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + Math.min(r.height / 2, 30); const mk = (x, y) => new Touch({ identifier: 1, target: el, clientX: x, clientY: y });
    el.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [mk(x0, y0)], changedTouches: [mk(x0, y0)] }));
    for (let i = 1; i <= steps; i++) el.dispatchEvent(new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [mk(x0 + dx * i / steps, y0 + dy * i / steps)], changedTouches: [mk(x0 + dx * i / steps, y0 + dy * i / steps)] }));
    el.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], changedTouches: [mk(x0 + dx, y0 + dy)] })); }; });
  const h1 = () => p.locator('main h1').first().innerText();
  const sw = async (sel, dx) => { await p.evaluate(([sel, dx]) => window.__swipe(document.querySelector(sel), dx, 0), [sel, dx]); await p.waitForTimeout(350); };
  console.log('start', await h1());
  await sw('main h1', -200); console.log('left ->', await h1());
  await sw('main h1', -200); console.log('left ->', await h1());
  await sw('main h1', 200); console.log('right ->', await h1());
  // no Semana: deslize na lista troca o dia, não a aba
  await sw('main h1', 200); await sw('main h1', -200); console.log('at', await h1());
  await sw('.lg\\:hidden.space-y-2.max-w-2xl', -200); console.log('list swipe keeps tab', await h1());
  // cartão com deslize não troca aba
  const r = await p.evaluate(() => !!document.querySelector('.lg\\:hidden.space-y-2.max-w-2xl .relative.rounded-lg.overflow-hidden'));
  if (r) { await sw('.lg\\:hidden.space-y-2.max-w-2xl .relative.rounded-lg.overflow-hidden', 160); console.log('card swipe keeps tab', await h1(), 'toast', await p.getByText(/^Feito: /).count()); }
  // carrossel de dias com rolagem lateral não troca aba
  await sw('main .overflow-x-auto', -200); console.log('chips swipe keeps tab', await h1());
  // limites
  for (let i = 0; i < 6; i++) await sw('main h1', -200); console.log('end', await h1());
  for (let i = 0; i < 6; i++) await sw('main h1', 200); console.log('back to', await h1());
  console.log('ERRS', errs); await b.close();
})();
