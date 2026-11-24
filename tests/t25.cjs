const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8000/'); await p.waitForTimeout(400);
  await p.getByRole('button', { name: /explorar com uma rotina/ }).click(); await p.waitForTimeout(500);
  // seed a past-started vacation and reload to test rollover/protect + end trimming
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('superplanner-v4')); s.vacations = [{ id: 'v1', label: 'Viagem', start: s.day - 2, end: null, keepCare: true, keepRoutines: true }]; localStorage.setItem('superplanner-v4', JSON.stringify(s)); });
  await p.reload(); await p.waitForTimeout(500);
  let s = await p.evaluate(() => JSON.parse(localStorage.getItem('superplanner-v4')));
  console.log('kept', [s.day-2,s.day-1,s.day].map(d=>s.keptDays[d]));
  // Lume
  await p.getByRole("button", { name: /Abrir o assistente/ }).click(); await p.waitForTimeout(300);
  const box = p.getByPlaceholder(/./).last(); await box.fill('voltei de viagem'); await box.press('Enter'); await p.waitForTimeout(600);
  await p.screenshot({ path: '/tmp/lume_vac.png' });
  const btn = p.getByRole('button', { name: /Voltar à rotina agora/ }).last(); console.log('btn', await btn.count()); if (await btn.count()) { await btn.click(); await p.waitForTimeout(400); }
  s = await p.evaluate(() => JSON.parse(localStorage.getItem('superplanner-v4')));
  console.log('after', JSON.stringify(s.vacations), s.day);
  await box.fill('vou viajar sexta'); await box.press('Enter'); await p.waitForTimeout(600);
  const w = p.getByRole('button', { name: /Uns dias/ }).last(); console.log('start btn', await w.count()); if (await w.count()) { await w.click(); await p.waitForTimeout(300); }
  s = await p.evaluate(() => JSON.parse(localStorage.getItem('superplanner-v4')));
  console.log('after2', JSON.stringify(s.vacations));
  console.log('ERRS', errs); await b.close();
})();
