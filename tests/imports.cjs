const { chromium } = require('playwright');
const fs = require('fs');
const pad = (n) => String(n).padStart(2, '0');
const loc = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
(async () => {
  const b = await chromium.launch(); const errs = [];
  const c = await b.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: 'America/Sao_Paulo' });
  let gcalCalls = 0;
  await c.route('https://accounts.google.com/gsi/client', (r) => r.fulfill({ contentType: 'text/javascript', body: `window.google={accounts:{oauth2:{initTokenClient:(o)=>({requestAccessToken:()=>setTimeout(()=>o.callback({access_token:'tok',expires_in:3600}),50)})}}};` }));
  await c.route('https://www.googleapis.com/calendar/v3/**', (r) => { gcalCalls++; const u = new URL(r.request().url()); const t0 = new Date(Date.now() + 86400000); t0.setHours(15, 0, 0, 0); const t1 = new Date(t0.getTime() + 90 * 60000);
    const page2 = u.searchParams.get('pageToken') === 'p2';
    const items = page2 ? [{ id: 'e3', status: 'confirmed', summary: 'Dentista', start: { dateTime: new Date(t0.getTime() + 2 * 86400000).toISOString() }, end: { dateTime: new Date(t1.getTime() + 2 * 86400000).toISOString() } }]
      : [{ id: 'e1', status: 'confirmed', summary: 'Reunião do estágio', start: { dateTime: t0.toISOString() }, end: { dateTime: t1.toISOString() } }, { id: 'e2', summary: 'Feriado', start: { date: '2026-12-25' }, end: { date: '2026-12-26' } }];
    r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ items, ...(page2 ? {} : { nextPageToken: 'p2' }) }) }); });
  const p = await c.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  const mode = process.argv[2];
  await p.goto('http://localhost:8000/'); await p.waitForTimeout(400);
  if (mode === 'sleep') {
    await p.getByRole('button', { name: /explorar com uma rotina de exemplo/ }).click(); await p.waitForTimeout(300);
    await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('superplanner-v4')); s.sleepGoal = { bed: '01:00', wake: '04:30' }; s.tourDone = true; localStorage.setItem('superplanner-v4', JSON.stringify(s)); }); await p.reload(); await p.waitForTimeout(400);
    await p.locator('nav button', { hasText: 'Minha Rotina' }).first().click(); await p.getByRole('button', { name: /Sono e cuidados/ }).click(); await p.waitForTimeout(300);
    const w = p.getByText('por noite é pouco'); console.log('warn shown', await w.count()); await w.first().scrollIntoViewIfNeeded(); await p.screenshot({ path: '/tmp/sleepwarn.png' });
    console.log('rec text', (await p.getByText(/Para acordar às 04:30/).innerText()).slice(0, 120));
    await p.getByRole('button', { name: 'Usar horário recomendado' }).click(); await p.waitForTimeout(300);
    console.log('bed now', await p.evaluate(() => JSON.parse(localStorage.getItem('superplanner-v4')).sleepGoal.bed), 'warn after', await p.getByText('por noite é pouco').count());
    // DurField 0..23
    await p.getByRole('button', { name: /^Tempo de transição/ }).first().click().catch(() => {});
  } else {
    await p.getByRole('button', { name: /explorar com uma rotina de exemplo/ }).click(); await p.waitForTimeout(300);
    await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('superplanner-v4')); s.tourDone = true; localStorage.setItem('superplanner-v4', JSON.stringify(s)); }); await p.reload(); await p.waitForTimeout(400);
    await p.locator('nav button', { hasText: 'Minha Rotina' }).first().click(); await p.getByRole('button', { name: /Conta e aparelhos/ }).click(); await p.waitForTimeout(300);
    // Google
    await p.getByRole('button', { name: /Importar da Google Agenda/ }).click(); await p.waitForTimeout(1500);
    console.log('google msg:', await p.locator('[role=status]').filter({ hasText: /Google|compromisso|agenda/i }).first().innerText());
    if (mode === 'google') { await p.getByRole('button', { name: /Importar da Google Agenda/ }).click(); await p.waitForTimeout(1500); console.log('google again:', await p.locator('[role=status]').filter({ hasText: /Google|compromisso|agenda/i }).first().innerText(), 'api calls', gcalCalls); }
    // ICS
    const now = new Date(), tm = new Date(now.getTime() + 2 * 86400000), past = new Date(now.getTime() - 5 * 86400000);
    const zt = new Date(Date.UTC(tm.getUTCFullYear(), tm.getUTCMonth(), tm.getUTCDate(), 13, 0, 0));
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0',
      'BEGIN:VEVENT', 'UID:aula-calc', 'SUMMARY:Cálculo II\\, sala 3', 'DTSTART;TZID=America/Sao_Paulo:20260803T190000', 'DTEND;TZID=America/Sao_Paulo:20260803T204000', 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261212T235959Z', 'END:VEVENT',
      'BEGIN:VEVENT', 'UID:terapia', 'SUMMARY:Terapia', `DTSTART:${loc(zt)}T${pad(zt.getUTCHours())}0000Z`.replace(loc(zt), `${zt.getUTCFullYear()}${pad(zt.getUTCMonth() + 1)}${pad(zt.getUTCDate())}`), 'DURATION:PT50M', 'END:VEVENT',
      'BEGIN:VEVENT', 'UID:aniv', 'SUMMARY:Aniversário', `DTSTART;VALUE=DATE:${loc(tm)}`, 'END:VEVENT',
      'BEGIN:VEVENT', 'UID:velho', 'SUMMARY:Coisa antiga', `DTSTART:${loc(past)}T100000`, `DTEND:${loc(past)}T110000`, 'END:VEVENT',
      'BEGIN:VEVENT', 'UID:old-weekly', 'SUMMARY:Curso que acabou', 'DTSTART:20250101T080000', 'DTEND:20250101T090000', 'RRULE:FREQ=WEEKLY;UNTIL=20250301T000000Z', 'END:VEVENT',
      'BEGIN:VEVENT', 'UID:longa-desc', 'SUMMARY:Yoga', 'DTSTART:20261101T070000', 'DTEND:20261101T080000', 'RRULE:FREQ=DAILY;COUNT=200', 'END:VEVENT',
      'END:VCALENDAR'].join('\r\n');
    fs.writeFileSync('/tmp/teste.ics', ics);
    await p.locator('input[type=file][accept*=".ics"]').last().setInputFiles('/tmp/teste.ics'); await p.waitForTimeout(800);
    console.log('ics msg:', await p.locator('[role=status]').filter({ hasText: /Importei|Nada novo|arquivo/ }).first().innerText());
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('superplanner-v4')));
    console.log('fixed from ics:', st.fixed.filter((f) => f.ics).map((f) => `${f.title} [${f.days}] ${f.start}-${f.end} until=${f.until}`).join(' | '));
    console.log('dated:', st.tasks.filter((t) => t.gcal).map((t) => `${t.title} ${t.event.start}-${t.event.end} d=${t.due - st.day}`).join(' | '));
    await p.locator('input[type=file][accept*=".ics"]').last().setInputFiles('/tmp/teste.ics'); await p.waitForTimeout(800);
    console.log('ics again:', await p.locator('[role=status]').filter({ hasText: /Importei|Nada novo|arquivo/ }).first().innerText());
    await p.screenshot({ path: `/tmp/imports_${mode}.png` });
  }
  console.log('ERRS', errs); await b.close();
})();
