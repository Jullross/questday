import { Cloud, Pwa, canCloud } from './cloud.js';
const { useState, useEffect, useRef } = React;
function useCloud() { const [, f] = useState(0); useEffect(() => Cloud.on(() => f((x) => x + 1)), []); }
const LU = (typeof window !== 'undefined' && window.LucideReact) || {};
function Ic({ n, className = 'w-4 h-4', style }) { const C = LU[n]; return C ? <C className={className} style={style} aria-hidden="true" strokeWidth={1.75} /> : null; }

/* ===================== utilidades ===================== */
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_LONGO = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DAYMS = 86400000, KEY = 'superplanner-v4', SEMANA = [1, 2, 3, 4, 5, 6, 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = () => Math.random().toString(36).slice(2, 9);
const realToday = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / DAYMS); };
const dateOf = (n) => new Date(n * DAYMS);
const weekdayOf = (n) => dateOf(n).getUTCDay();
const isoOf = (n) => dateOf(n).toISOString().slice(0, 10);
const dayFromIso = (v) => Math.floor(Date.UTC(+v.slice(0, 4), +v.slice(5, 7) - 1, +v.slice(8, 10)) / DAYMS);
const fmtCurto = (n) => { const d = dateOf(n); return `${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`; };
const fmtDia = (n) => `${DIAS_LONGO[weekdayOf(n)]}, ${fmtCurto(n)}`;
const toMin = (t) => { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
const hhmm = (m) => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
const fmtH = (h) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`; };
const ceil15 = (m) => Math.ceil(m / 15) * 15;
const nightMin = (t) => { const m = toMin(t); return m < 720 ? m + 1440 : m; };
const sleepHours = (bed, wake) => { let d = toMin(wake) - toMin(bed); if (d <= 0) d += 1440; return d / 60; };
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const realNow = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const nowRef = (s) => (s.simNow != null ? s.simNow : s.offset ? toMin(s.sleepGoal.wake) + 60 : realNow());

const PRIO = { alta: { t: 'Alta', c: '#ff7f5e' }, media: { t: 'Média', c: '#9f8fff' }, baixa: { t: 'Baixa', c: '#9a9cb0' } };
const LOAD = { pesada: { t: 'Pesada', c: '#9f8fff' }, media: { t: 'Média', c: '#2ee8c4' }, leve: { t: 'Leve', c: '#ffc24d' } };
const AREA = { casa: { t: 'Casa', c: '#ff9b54', icon: 'House' }, cuidado: { t: 'Autocuidado', c: '#ff6fb5', icon: 'Heart' } };
const CARE_RX = /cabelo|pele|skincare|unha|alonga|medita|autocuidado|cuidar de mim|banho relaxante|hidrata|dormir cedo|descanso/i;
const cycleArea = (c) => c.area || (CARE_RX.test(c.title) ? 'cuidado' : 'casa');
function areaOf(s, it) {
  if (it.kind === 'cycle') { const c = s.cycles.find((y) => y.id === it.ref); return c ? cycleArea(c) : 'casa'; }
  if (it.kind === 'routine') return 'cuidado';
  if (it.kind === 'task') { const t = s.tasks.find((y) => y.id === it.ref); if (t && (t.cat === 'Autocuidado' || t.care)) return 'cuidado'; }
  return null;
}
const ONDE = { transporte: 'Transporte', casa: 'Casa', qualquer: 'Qualquer lugar' };
const TIPOS = { trabalho: 'Trabalho', trajeto: 'Trajeto', compromisso: 'Compromisso' };
const RANK = { alta: 0, media: 1, baixa: 2, pesada: 0, leve: 2 };

/* ===================== dados iniciais ===================== */
const freshToday = (s) => ({ bed: s ? s.sleepGoal.bed : '23:00', wake: s ? s.sleepGoal.wake : '06:00', calib: 0, checkedIn: false, transport: 'padrao', legs: [], survival: false, adjusted: false, started: {}, startedAt: {}, socialAdj: 0, mealSnooze: {} });
function seedHistory(today) {
  const sono = [6.8, 7.1, 5.4, 6.2, 7.3, 8.1, 6.5, 5.9, 4.9, 7.0, 6.6, 7.8, 7.2, 6.4];
  return sono.map((h, i) => { const day = today - 14 + i, wd = weekdayOf(day), work = wd >= 1 && wd <= 5; return { day, bed: hhmm(360 - h * 60), wake: '06:00', sleep: h, trip: work ? [110, 125, 165, 115, 140][i % 5] : wd === 6 ? 80 : 0, sample: true }; });
}
function seedOutcomes(today) {
  const out = [];
  for (let i = 21; i >= 1; i--) {
    const day = today - i, wd = weekdayOf(day);
    if (wd === 1) out.push({ day, wd, ref: 'fac', load: 'pesada', start: 930, result: i % 2 ? 'min' : 'nao', sample: true });
    else if (wd >= 2 && wd <= 5) { out.push({ day, wd, ref: 'fac', load: 'pesada', start: 915, result: 'feito', sample: true }); if (wd === 4) out.push({ day, wd, ref: 'eletronica', load: 'pesada', start: 1290, result: 'min', sample: true }); }
    else out.push({ day, wd, ref: 'eletrica', load: 'pesada', start: 480, result: 'feito', sample: true });
  }
  return out;
}
function seed(today) {
  const s = {
    v: 4, day: today, offset: 0, simNow: null,
    sleepGoal: { bed: '23:00', wake: '06:00' }, fixedLog: {},
    fixed: [
      { id: 'f1', type: 'trabalho', title: 'Estágio', days: [1, 2, 3, 4, 5], start: '08:00', end: '14:00' },
      { id: 'f2', type: 'trajeto', title: 'Trajeto de ida', days: [1, 2, 3, 4, 5], start: '07:00', end: '07:55' },
      { id: 'f3', type: 'trajeto', title: 'Trajeto de volta', days: [1, 2, 3, 4, 5], start: '14:05', end: '15:00' },
      { id: 'f4', type: 'trajeto', title: 'Ida para a aula', days: [6], start: '09:15', end: '09:55' },
      { id: 'f5', type: 'compromisso', title: 'Aula de inglês', days: [6], start: '10:00', end: '11:30' },
      { id: 'f6', type: 'trajeto', title: 'Volta da aula', days: [6], start: '11:35', end: '12:15' },
    ],
    tasks: [
      { id: 'fac', title: 'Faculdade: revisar a matéria', cat: 'Faculdade', prio: 'alta', load: 'pesada', dur: 45, minText: 'Reler as anotações da aula', min: 10, freq: 5, where: 'casa' },
      { id: 'eletronica', title: 'Eletrônica: módulo e exercício', cat: 'Capacitação', prio: 'media', load: 'pesada', dur: 40, minText: 'Assistir um vídeo curto do módulo', min: 10, freq: 2, where: 'casa' },
      { id: 'eletrica', title: 'Elétrica: módulo e exercício', cat: 'Capacitação', prio: 'media', load: 'pesada', dur: 40, minText: 'Revisar um esquema ou fórmula', min: 10, freq: 2, where: 'casa' },
      { id: 'vocab', title: 'Vocabulário de inglês', cat: 'Idioma', prio: 'media', load: 'leve', dur: 15, minText: '5 palavras', min: 5, freq: 7, where: 'transporte' },
      { id: 'curio', title: 'Curiosidades fora da área', cat: 'Pessoal', prio: 'baixa', load: 'leve', dur: 20, minText: 'Um artigo curto', min: 5, freq: 4, where: 'transporte' },
      { id: 'calc', title: 'Entregar lista de Cálculo', cat: 'Faculdade', prio: 'alta', load: 'media', dur: 60, minText: 'Fazer 2 exercícios', min: 15, freq: 0, where: 'casa', due: today + 3 },
    ],
    cycles: [
      { id: 'cama', title: 'Arrumar a cama', every: 1, dur: 5, last: today - 1 },
      { id: 'quarto', title: 'Limpar o quarto', every: 7, dur: 30, last: today - 5 },
      { id: 'banheiro', title: 'Limpar o banheiro', every: 7, dur: 30, last: today - 8 },
      { id: 'beto', title: 'Dar banho no Beto', every: 15, dur: 40, last: today - 12 },
      { id: 'cabelo', title: 'Lavagem e cuidado do cabelo', every: 3, dur: 45, last: today - 2, area: 'cuidado' },
    ],
    log: [],
    streak: { count: 6, best: 9, keptDay: today - 1 },
    keptDays: Object.fromEntries([1, 2, 3, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((i) => [today - i, 'feito']).concat([[today - 4, 'protegido']])),
    history: seedHistory(today), attended: {}, adjustNote: null, dirty: false,
    exams: [{ id: 'e1', title: 'Prova de Cálculo', date: today + 9, hours: 4 }],
    projects: [{ id: 'p1', title: 'Atualizar o portfólio no GitHub', totalMin: 150, blockMin: 30, doneMin: 0, due: null, load: 'media', prio: 'baixa' }],
    outcomes: seedOutcomes(today), reviews: { [today - 1]: 'rendeu', [today - 2]: 'minimo', [today - 3]: 'rendeu', [today - 7]: 'dificil', [today - 14]: 'dificil' }, sampleReviewDays: [today - 1, today - 2, today - 3, today - 7, today - 14],
    transitionMin: 15, careCfg: { waterMl: 2000, meds: [] }, water: {}, waterMl: {}, medsTaken: {},
    cycleCfg: { on: false, start: today - 10, length: 28, period: 5 }, notify: false,
    plan: { days: [], items: [], unplaced: [], at: null },
  };
  s.today = freshToday(s);
  return { ...s, plan: distribute(s) };
}
const todayOf = (s) => realToday() + (s.offset || 0);
function rollover(s) {
  const t = todayOf(s);
  let n = s;
  if (s.day !== t) {
    const missed = s.plan.items.filter((it) => it.day < t && it.day >= s.day - 6 && it.status === 'pendente' && !it.recorded && it.kind !== 'cycle' && it.kind !== 'routine' && !vacationOn(s, it.day));
    const outcomes = [...(s.outcomes || []), ...missed.map((it) => ({ day: it.day, wd: weekdayOf(it.day), ref: it.ref, load: it.load, start: it.start, result: 'nao' }))].slice(-300);
    let away = 0; for (let d = s.day + 1; d < t; d++) if (!vacationOn(s, d)) away++;
    const gap = t - s.day, left = s.plan.items.filter((it) => it.day < t && it.day >= s.day && it.status === 'pendente' && it.kind !== 'cycle').length;
    n = { ...s, day: t, today: freshToday(s), simNow: null, adjustNote: null, attended: {}, outcomes, welcome: away > 2 ? { gap: away, left } : null, plan: { ...s.plan, items: s.plan.items.map((it) => (missed.includes(it) ? { ...it, recorded: true } : it)) } };
  }
  if (!n.plan.days.includes(n.day)) n = { ...n, plan: distribute(n), dirty: false };
  n = protectVac(n);
  return n;
}
function fromSaved(s) { let n = migrate(rollover(migrate(s))); if (!s.routines) n = { ...n, plan: distribute(n) }; return n; }
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); if (s && s.v === 4) return fromSaved(s); } } catch (e) {}
  return freshSeed();
}

/* ===================== extras: migração, semestre, social, primeiro passo ===================== */
/* sino suave gerado na hora (Web Audio), sem arquivos; respeita o modo baixo estímulo */
let AC = null;
function chime(kind, s) {
  const ui = (s && s.ui) || {};
  if (ui.sound === false) return;
  try {
    const low = !!ui.lowStim;
    if (navigator.vibrate) navigator.vibrate(low ? 60 : kind === 'aviso' ? [80, 60, 80] : [120, 80, 120]);
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const notes = low ? [523.25] : kind === 'fim' ? [659.25, 880, 1046.5] : kind === 'volta' ? [880, 659.25] : kind === 'aviso' ? [740, 740] : [587.33, 783.99];
    const vol = low ? 0.035 : 0.08, t0 = AC.currentTime + 0.02;
    notes.forEach((f, i) => {
      const o = AC.createOscillator(), g = AC.createGain(), t = t0 + i * 0.22;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + (low ? 0.6 : 1.1));
      o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + 1.2);
    });
  } catch (e) {}
}
function feriadosBR(y) {
  // Páscoa (algoritmo de Meeus) para Carnaval, Sexta-feira Santa e Corpus Christi
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  const pascoa = Math.floor(Date.UTC(y, mes - 1, dia) / DAYMS), D = (mm, dd) => Math.floor(Date.UTC(y, mm - 1, dd) / DAYMS);
  return [[D(1, 1), 'Confraternização Universal'], [pascoa - 48, 'Carnaval (ponto facultativo)'], [pascoa - 47, 'Carnaval'], [pascoa - 2, 'Sexta-feira Santa'], [D(4, 21), 'Tiradentes'], [D(5, 1), 'Dia do Trabalho'], [pascoa + 60, 'Corpus Christi'], [D(9, 7), 'Independência'], [D(10, 12), 'Nossa Senhora Aparecida'], [D(11, 2), 'Finados'], [D(11, 15), 'Proclamação da República'], [D(11, 20), 'Consciência Negra'], [D(12, 25), 'Natal']]
    .map(([date, label]) => ({ id: 'h' + date, date, label, kind: 'feriado' }));
}
const MEALS0 = [{ id: 'cafe', name: 'Café da manhã', time: '06:30' }, { id: 'almoco', name: 'Almoço', time: '14:30' }, { id: 'lanche', name: 'Lanche', time: '17:30' }, { id: 'jantar', name: 'Jantar', time: '20:00' }];
function seedDurLog(today) {
  const L = [];
  [[62, 50, 58, 55], [45, 40, 50], [30, 18, 22]].forEach((arr, k) => arr.forEach((a, i) => L.push({ ref: ['fac', 'eletronica', 'curio'][k], planned: [45, 40, 20][k], actual: a, day: today - 2 - i * 2, sample: true })));
  return L;
}
function freshSeed() { const m = migrate(seed(realToday())); return { ...m, plan: distribute(m) }; }
function migrate(s) {
  const t = s.day;
  const sem0 = { start: dayFromIso('2026-08-03'), end: dayFromIso('2026-12-12') };
  const hol = feriadosBR(dateOf(t).getUTCFullYear()).filter((h) => h.date >= sem0.start && h.date <= sem0.end);
  return {
    ...s,
    ui: { lowStim: false, theme: 'dark', font: 'padrao', size: 'normal', sound: true, ...(s.ui || {}) },
    inbox: s.inbox || [], vacations: s.vacations || [], routines: s.routines || ROUTINES0, moods: s.moods || {}, badges: s.badges || {}, missions: s.missions || {}, durLog: s.durLog || seedDurLog(t), durNotes: s.durNotes || [], dayNews: s.dayNews || null,
    semester: s.semester || { ...sem0, holidays: hol },
    leaveCfg: s.leaveCfg || { items: ['Chave', 'Carteira', 'Carregador', 'Crachá', 'Garrafa de água', 'Fone'] }, leaveCheck: s.leaveCheck || {},
    mealsDone: s.mealsDone || {}, socialCfg: s.socialCfg || { trabalho: 35, compromisso: 20, trajeto: 8, evento: 15 },
    careCfg: { meds: [], ...(s.careCfg || {}), waterMl: (s.careCfg && s.careCfg.waterMl != null) ? s.careCfg.waterMl : ((s.careCfg && s.careCfg.waterGoal != null ? s.careCfg.waterGoal : 8) * 250), meals: (s.careCfg && s.careCfg.meals) || MEALS0 },
    waterMl: s.waterMl || Object.fromEntries(Object.entries(s.water || {}).map(([d, n]) => [d, n * 250])),
    today: { startedAt: {}, socialAdj: 0, mealSnooze: {}, ...(s.today || {}) },
  };
}
const vacationOn = (s, day) => (s.vacations || []).find((v) => day >= v.start && (v.end == null || day <= v.end)) || null;
function restreakG(x) { let d = x.keptDays[x.day] ? x.day : x.day - 1, count = 0; const kd = d; while (x.keptDays[d]) { count++; d--; } return { ...x, streak: { count, best: Math.max(x.streak.best, count), keptDay: count ? kd : x.streak.keptDay } }; }
function protectVac(x) {
  const kd = { ...(x.keptDays || {}) }; let ch = false;
  (x.vacations || []).forEach((v) => { for (let d = v.start; d <= Math.min(v.end == null ? x.day : v.end, x.day); d++) if (kd[d] !== 'feito' && kd[d] !== 'protegido') { kd[d] = 'protegido'; ch = true; } });
  return ch ? restreakG({ ...x, keptDays: kd }) : x;
}
const holidayOn = (s, day) => ((s.semester && s.semester.holidays) || []).find((h) => h.date === day) || null;
function socialOf(s) {
  const now = nowRef(s), C = s.socialCfg || { trabalho: 35, compromisso: 20, trajeto: 8, evento: 15 };
  let planned = 0, passed = 0;
  fixedOn(s, s.day).forEach((f) => { const c = C[f.type] || 0; planned += c; passed += c * clamp((now - f.s) / Math.max(1, f.e - f.s), 0, 1); });
  s.plan.items.filter((it) => it.day === s.day && it.status !== 'removido').forEach((it) => { const t = it.kind === 'task' && s.tasks.find((x) => x.id === it.ref); if (t && t.event) { planned += C.evento; passed += C.evento * clamp((now - it.start) / Math.max(1, it.dur), 0, 1); } });
  const adj = (s.today && s.today.socialAdj) || 0;
  return { now: Math.round(clamp(100 - passed + adj, 0, 100)), end: Math.round(clamp(100 - planned + adj, 0, 100)), planned: Math.round(planned) };
}
function firstSteps(s, it) {
  const r = refOf(s, it); if (!r) return ['Deixar na mesa só o que precisa e mais nada.'];
  const out = [], t = semAcento(r.title);
  if (r.firstStep) out.push(r.firstStep);
  if (/lista|exercici/.test(t)) out.push('Abrir a lista e copiar o enunciado do primeiro exercício.', 'Escrever só o que o primeiro exercício pede, sem resolver.');
  if (/prova|revis|materia|faculdade|calculo|fisica/.test(t)) out.push('Abrir o caderno na última aula e ler só os títulos.', 'Escolher UM tópico e escrever o nome dele num papel.');
  if (/modulo|curso|eletr|video|aula/.test(t)) out.push('Abrir o módulo e dar play no primeiro vídeo, mesmo sem prestar atenção total.', 'Abrir a plataforma e achar onde parou.');
  if (/vocab|ingles|idioma|palavra/.test(t)) out.push('Abrir o app e olhar uma palavra só.');
  if (/portfolio|github|codigo|programa/.test(t)) out.push('Abrir o repositório e ler o README em voz alta.', 'Abrir o editor e criar um arquivo vazio com o nome da próxima parte.');
  if (/limpa|arrumar|quarto|banheiro|louca|roupa/.test(t)) out.push('Pegar UM objeto fora do lugar e guardar.', 'Separar o produto e o pano, só isso.');
  if (/cabelo|banho|pele|skincare/.test(t)) out.push('Separar a toalha e os produtos no banheiro.');
  if (/beto|cachorro|gato|pet/.test(t)) out.push('Pegar a toalha e o shampoo dele e deixar no lugar do banho.');
  if (/curiosidad|ler|artigo|livro/.test(t)) out.push('Abrir o artigo e ler só o primeiro parágrafo.');
  if (/pagar|boleto|email|mandar|enviar|ligar|marcar/.test(t)) out.push('Abrir o app ou o site e deixar a tela certa aberta.');
  if (r.minText) out.push(`${r.minText}, sem compromisso de terminar.`);
  out.push('Sentar no lugar e abrir o que vai usar. Só isso conta.', 'Pôr um timer de 2 minutos e fazer qualquer pedacinho.');
  return Array.from(new Set(out));
}
function nextAnchor(s) {
  const now = nowRef(s), fx = fixedOn(s, s.day);
  const evs = s.plan.items.filter((it) => it.day === s.day && it.status === 'pendente' && it.kind === 'task' && (s.tasks.find((t) => t.id === it.ref) || {}).event).map((it) => ({ s: it.start, e: it.start + it.dur, title: itemTitle(s, it), type: 'evento' }));
  const all = [...fx.map((f) => ({ s: f.s, e: f.e, title: f.title, type: f.type })), ...evs].sort((a, b) => a.s - b.s);
  const nxt = all.find((x) => x.s > now); if (!nxt) return null;
  const prevEnd = Math.max(toMin(s.sleepGoal.wake), ...all.filter((x) => x.e <= now).map((x) => x.e));
  const firstTrip = fx.find((f) => f.type === 'trajeto');
  const label = nxt.type === 'trajeto' ? (firstTrip && firstTrip.s === nxt.s ? 'sair de casa' : 'sair') : nxt.type === 'trabalho' ? nxt.title.toLowerCase() : nxt.title;
  return { ...nxt, from: Math.min(prevEnd, now), label, isLeave: nxt.type === 'trajeto' && firstTrip && firstTrip.s === nxt.s };
}

/* ===================== energia ===================== */
const fixedPlan = (s, day) => s.fixed.filter((f) => f.days.includes(weekdayOf(day)) && !(f.from != null && day < f.from) && !(f.until != null && day > f.until) && !(f.sem && s.semester && (day < s.semester.start || day > s.semester.end))).map((f) => ({ ...f, s: toMin(f.start), e: toMin(f.end) })).sort((a, b) => a.s - b.s);
function fixedAll(s, day) {
  const log = (s.fixedLog || {})[day] || {};
  const hol = holidayOn(s, day), vac = vacationOn(s, day);
  let ti = 0;
  return fixedPlan(s, day).map((f) => {
    const r = { ...f, plan: { start: f.start, end: f.end, s: f.s, e: f.e } };
    let L = log[f.id];
    if (f.type === 'trajeto') {
      const dir = ti++ === 0 ? 'ida' : 'volta';
      if (!L && day === s.day && s.today) {
        if (s.today.transport === 'remoto') L = { st: 'nao', auto: true };
        else { const sm = legSummary((s.today.legs || []).filter((l) => l.dir === dir)); if (sm) L = { st: 'foi', start: sm.from, end: sm.to, auto: true }; }
      }
    }
    if (!L && hol && (f.type === 'trabalho' || f.type === 'trajeto' || f.sem)) L = { st: 'nao', auto: true, feriado: hol.label };
    if (!L && vac && (f.type === 'trabalho' || f.type === 'trajeto' || f.sem)) L = { st: 'nao', auto: true, ferias: vac.label || 'Em pausa' };
    if (L) { r.log = L; if (L.st === 'nao') r.skip = true; else if (L.start) { r.start = L.start; r.end = L.end; r.s = toMin(L.start); r.e = toMin(L.end); } }
    return r;
  }).sort((a, b) => a.s - b.s);
}
const fixedOn = (s, day) => fixedAll(s, day).filter((f) => !f.skip);
const tripNormal = (s, day) => fixedPlan(s, day).filter((f) => f.type === 'trajeto').reduce((a, f) => a + (f.e - f.s), 0);
const LEG_TIPOS = ['Ônibus', 'Metrô', 'Trem', 'BRT', 'Barca', 'Van', 'Uber/App', 'A pé', 'Bicicleta'];
function tripDirs(s, day) {
  const tr = fixedPlan(s, day).filter((f) => f.type === 'trajeto');
  return { ida: tr[0] ? tr[0].e - tr[0].s : 0, volta: tr.slice(1).reduce((a, f) => a + f.e - f.s, 0), idaStart: tr[0] ? tr[0].s : 420, voltaStart: tr[1] ? tr[1].s : 1080 };
}
function legSummary(legs) {
  if (!legs || !legs.length) return null;
  const L = [...legs].sort((a, b) => toMin(a.from) - toMin(b.from));
  const dur = (l) => (toMin(l.to) - toMin(l.from) + 1440) % 1440;
  const ride = L.reduce((a, l) => a + dur(l), 0);
  const first = toMin(L[0].from), end = Math.max(...L.map((l) => toMin(l.from) + dur(l)));
  const span = end - first;
  return { span, ride, wait: Math.max(0, span - ride), from: L[0].from, to: hhmm(end), n: L.length };
}
function cyclePhase(s) {
  return null; // ciclo menstrual removido a pedido
  const c = s.cycleCfg; if (!c || !c.on) return null;
  const d = (((s.day - c.start) % c.length) + c.length) % c.length + 1;
  if (d <= c.period) return { d, t: 'menstruação', delta: -8 };
  if (d > c.length - 5) return { d, t: 'pré-menstrual', delta: -5 };
  if (Math.abs(d - (c.length - 14)) <= 1) return { d, t: 'ovulação', delta: 3 };
  return { d, t: d < c.length - 14 ? 'fase folicular' : 'fase lútea', delta: 0 };
}
function energyOf(s) {
  const t = s.today, h = sleepHours(t.bed, t.wake), goal = sleepHours(s.sleepGoal.bed, s.sleepGoal.wake), deficit = goal - h;
  const base = clamp(Math.round(85 - (deficit > 0 ? deficit * 20 : deficit * 4)), 5, 100);
  const nd = tripDirs(s, s.day), norm = nd.ida + nd.volta, remoto = t.transport === 'remoto';
  const legs = t.legs || [];
  const ida = legSummary(legs.filter((l) => l.dir === 'ida')), volta = legSummary(legs.filter((l) => l.dir === 'volta'));
  const real = remoto ? 0 : (ida ? ida.span : nd.ida) + (volta ? volta.span : nd.volta);
  const extra = remoto ? 0 : real - norm;
  const tr = remoto ? 5 : extra > 5 ? -clamp(Math.round(extra / 2.5), 0, 30) : extra < -10 ? 3 : 0;
  const rv = (s.reviews || {})[s.day - 1], ontem = rv === 'dificil' ? -5 : rv === 'rendeu' ? 3 : 0;
  const ph = cyclePhase(s), cyc = ph ? ph.delta : 0;
  return { h, goal, deficit, base, tr, extra, norm, real, nd, ida, volta, remoto, ontem, cyc, phase: ph, total: clamp(base + t.calib + tr + ontem + cyc, 0, 100) };
}
const MODOS = {
  descansada: { t: 'Dia com energia', c: '#2ee8c4' },
  normal: { t: 'Dia normal', c: '#9f8fff' },
  puxado: { t: 'Dia puxado', c: '#ffc24d' },
  recuperacao: { t: 'Dia de recuperação', c: '#ff7f5e' },
};
function modeOf(s, en) {
  if (s.today.survival) return 'recuperacao';
  if (en.total < 35 || en.deficit >= 2) return 'recuperacao';
  if (en.total < 55 || en.deficit >= 1 || en.extra >= 20) return 'puxado';
  if (en.total >= 85) return 'descansada';
  return 'normal';
}
const barColor = (e) => (e >= 65 ? '#2ee8c4' : e >= 40 ? '#9f8fff' : '#ffc24d');

/* ===================== motor de distribuição ===================== */
function planDays(s) {
  const wd = weekdayOf(s.day);
  if (wd === 0) return Array.from({ length: 8 }, (_, i) => s.day + i);
  const ws = s.day - (wd - 1); return Array.from({ length: 7 }, (_, i) => ws + i);
}
function focusAt(s, m, ctx) {
  const t = (m - toMin(s.sleepGoal.wake)) / 60;
  let f = t < 0 ? 0.3 : t < 1 ? 0.75 : t < 5 ? 1 : t < 7 ? 0.8 : t < 10 ? 0.9 : t < 13 ? 0.7 : 0.5;
  if (ctx && ctx.workEnds.some((e) => m >= e && m < e + 75)) f -= 0.25;
  const pk = (s.prefs || {}).peak, h0 = m / 60;
  if (pk === 'manha') f += h0 >= 7 && h0 < 12 ? 0.25 : h0 >= 18 ? -0.15 : 0;
  else if (pk === 'tarde') f += h0 >= 13 && h0 < 18 ? 0.25 : h0 < 9 ? -0.1 : 0;
  else if (pk === 'noite') f += h0 >= 18 && h0 < 23 ? 0.3 : h0 < 10 ? -0.2 : 0;
  if (ctx && ctx.learn) { const h = Math.floor(m / 60); if (ctx.learn.good.includes(h)) f += 0.15; if (ctx.learn.bad.includes(h)) f -= 0.2; }
  return f;
}
/* pontos de carga mental: pesada 3, média 2, leve 1 (mínimo vale metade) */
const PTS = { pesada: 3, media: 2, leve: 1 };
const ptsOf = (it) => (it.kind === 'routine' ? 0 : it.kind === 'cycle' ? (it.dur >= 20 ? 1 : 0) : (PTS[it.load] || 1) * (it.ver === 'min' ? 0.5 : 1));
const INTENS = { suave: 0.75, ritmo: 1, intenso: 1.25 };
const capOf = (s, d) => (fixedOn(s, d).some((f) => f.type === 'trabalho') ? 6 : 9) * (INTENS[(s.prefs || {}).intensity] || 1);
const suggestDur = (prio, load) => { const base = { pesada: 50, media: 30, leve: 15 }[load] * { alta: 1.2, media: 1, baixa: 0.7 }[prio]; const dur = Math.max(10, Math.round(base / 5) * 5); return { dur, min: clamp(Math.round(dur / 4 / 5) * 5, 5, 15) }; };
const cargaLabel = (p, cap) => (p / cap < 0.45 ? { t: 'leve', c: '#2ee8c4' } : p / cap <= 0.85 ? { t: 'equilibrado', c: '#9f8fff' } : { t: 'cheio', c: '#ffc24d' });
function cleanSample(x) {
  const sd = new Set(x.sampleReviewDays || []);
  const reviews = Object.fromEntries(Object.entries(x.reviews || {}).filter(([d]) => !sd.has(+d)));
  return { ...x, outcomes: (x.outcomes || []).filter((o) => !o.sample), history: (x.history || []).filter((h) => !h.sample), durLog: (x.durLog || []).filter((l) => !l.sample), reviews, sampleReviewDays: [], keptDays: x.sampleReviewDays && x.sampleReviewDays.length ? {} : x.keptDays, streak: x.sampleReviewDays && x.sampleReviewDays.length ? { count: 0, best: 0, keptDay: x.day - 2 } : x.streak };
}
const hasSample = (s) => (s.outcomes || []).some((o) => o.sample) || (s.history || []).some((h) => h.sample) || (s.sampleReviewDays || []).length > 0;
function learnOf(s) {
  const all = s.outcomes || [], real = all.filter((o) => !o.sample);
  const out = real.length >= 8 ? real : all, heavy = out.filter((o) => o.load === 'pesada');
  const byWd = {}, byH = {};
  heavy.forEach((o) => { const a = byWd[o.wd] || (byWd[o.wd] = { ok: 0, bad: 0 }); const hb = byH[Math.floor(o.start / 60)] || (byH[Math.floor(o.start / 60)] = { ok: 0, bad: 0 }); if (o.result === 'feito') { a.ok++; hb.ok++; } else { a.bad++; hb.bad++; } });
  const avoid = Object.keys(byWd).filter((w) => { const b = byWd[w]; return b.ok + b.bad >= 3 && b.bad / (b.ok + b.bad) >= 0.6; }).map(Number);
  const good = [], bad = [];
  Object.entries(byH).forEach(([h, b]) => { const n = b.ok + b.bad; if (n >= 3) { if (b.ok / n >= 0.7) good.push(+h); else if (b.ok / n <= 0.34) bad.push(+h); } });
  const sd = new Set(s.sampleReviewDays || []), realRv = Object.keys(s.reviews || {}).filter((d) => !sd.has(+d)).length;
  const tough = {}; Object.entries(s.reviews || {}).filter(([d]) => realRv < 3 || !sd.has(+d)).forEach(([d, r]) => { if (r === 'dificil') { const w = weekdayOf(+d); tough[w] = (tough[w] || 0) + 1; } });
  return { avoid, good, bad, byWd, tough: Object.keys(tough).filter((w) => tough[w] >= 2).map(Number), n: out.length };
}
function makeCtx(s, days) {
  const ctx = {}, L = learnOf(s), trans = s.transitionMin || 0;
  days.forEach((d) => {
    const fx = fixedOn(s, d);
    const wake = toMin(s.sleepGoal.wake) + 20;
    let start = wake;
    if (d === s.day) start = Math.max(wake, ceil15(nowRef(s) + 5));
    ctx[d] = {
      day: d, start, end: Math.min(nightMin(s.sleepGoal.bed) - 45, 1425), work: fx.some((f) => f.type === 'trabalho'), intensity: (s.prefs || {}).intensity,
      learn: L, bedLimit: nightMin(s.sleepGoal.bed) - 150,
      occ: [...fx.map((f) => [f.s, f.e]), ...(trans ? fx.filter((f) => f.type !== 'compromisso').map((f) => [f.e, f.e + trans]) : [])], workEnds: fx.filter((f) => f.type === 'trabalho').map((f) => f.e),
      trips: fx.filter((f) => f.type === 'trajeto').map((f) => ({ ...f, used: 0 })),
      heavy: 0, heavyN: 0, pts: 0, cap: capOf(s, d), total: fx.reduce((a, f) => a + (f.type === 'trajeto' ? 0 : f.e - f.s) * 0.4, 0), big: 0,
    };
  });
  return ctx;
}
function findSlot(s, c, dur, pref) {
  let best = null, bs = -1e9;
  for (let t = ceil15(c.start); t + dur <= c.end; t += 15) {
    if (c.occ.some(([a, b]) => t < b + 10 && t + dur + 10 > a)) continue;
    if (pref === 'foco' && c.bedLimit && t + dur > c.bedLimit) continue;
    if (pref === 'foco' && t < toMin(s.sleepGoal.wake) + 75) continue;
    let f = 0; for (let m = t; m < t + dur; m += 15) f += focusAt(s, m, c); f /= Math.max(1, Math.ceil(dur / 15));
    const sc = pref === 'foco' ? f * 100 - t / 200 : pref === 'cedo' ? -t : (1 - f) * 40 + t / 40;
    if (sc > bs) { bs = sc; best = t; }
  }
  return best;
}
function occupy(c, it) {
  if (it.inTrip) { const tr = c.trips.find((x) => x.id === it.inTrip); if (tr) { tr.used += it.dur; tr.cur = Math.max(tr.cur || tr.s, it.start + it.dur); } }
  else c.occ.push([it.start, it.start + it.dur]);
  if (it.load === 'pesada' && it.kind !== 'cycle') { c.heavy += it.dur; if (it.ver !== 'min') c.heavyN++; } c.total += it.dur; c.pts += ptsOf(it);
  if (it.kind === 'cycle' && it.dur >= 20) c.big++;
}
function whyFoco(s, c, start) {
  const t = (start - toMin(s.sleepGoal.wake)) / 60;
  if (c.learn && c.learn.good.includes(Math.floor(start / 60))) return 'Horário em que você costuma render, aprendido do seu histórico.';
  if (c.workEnds.some((e) => start >= e + 60 && start < e + 180)) return 'Depois do trabalho, com uma pausa antes: o melhor bloco livre que sobra.';
  return `Bloco livre de maior foco do dia, ${fmtH(t)} depois de acordar.`;
}
function placeTask(s, ctx, task, day, opts = {}) {
  const c = ctx[day]; if (!c) return null;
  const base = { id: uid(), kind: 'task', ref: task.id, day, prio: task.prio, load: task.load, where: task.where, status: 'pendente' };
  if (task.where === 'transporte') {
    for (const tr of c.trips) {
      if (day === s.day && tr.e <= c.start) continue;
      const st = Math.max(tr.cur || tr.s, day === s.day ? c.start : 0), room = tr.e - st;
      if (room >= task.dur && st + task.dur <= tr.e) return { ...base, start: st, dur: task.dur, ver: 'normal', inTrip: tr.id, why: `Janela de ${tr.title.toLowerCase()}: dá para fazer só com celular e fone.` };
      if (room >= task.min && st + task.min <= tr.e) return { ...base, start: st, dur: task.min, ver: 'min', inTrip: tr.id, why: `A janela de ${tr.title.toLowerCase()} já está cheia: coube a versão mínima.` };
    }
    const st = findSlot(s, c, task.dur, 'leve');
    if (st != null) return { ...base, start: st, dur: task.dur, ver: 'normal', why: c.trips.length ? 'Os trajetos deste dia já estão ocupados: encaixei num momento leve.' : 'Sem trajeto neste dia: encaixei num momento leve, sem exigir foco.' };
  } else {
    const pref = task.load === 'pesada' ? 'foco' : 'leve';
    const over = c.pts + PTS[task.load] > c.cap || (task.load === 'pesada' && c.heavyN >= 2);
    if (over && task.min < task.dur) {
      const sm0 = findSlot(s, c, task.min, pref);
      if (sm0 != null) return { ...base, start: sm0, dur: task.min, ver: 'min', why: `Este dia já tem bastante carga (${Math.round(c.pts)} de ${c.cap} pontos): entra só a versão mínima para não pesar.` };
    }
    const st = findSlot(s, c, task.dur, pref);
    if (st != null) return { ...base, start: st, dur: task.dur, ver: 'normal', why: opts.why || (task.load === 'pesada' ? whyFoco(s, c, st) : task.load === 'media' ? 'Carga média: fica num horário tranquilo, fora do seu pico de foco.' : 'Leve: vai bem num fim de tarde, sem exigir foco.') };
  }
  const sm = findSlot(s, c, task.min, task.load === 'pesada' ? 'foco' : 'leve');
  if (sm != null) return { ...base, start: sm, dur: task.min, ver: 'min', why: 'Dia cheio: só coube a versão mínima. Ainda conta.' };
  return null;
}
function pickDays(n, avail, ctx, task) {
  const heavy = task.load === 'pesada', w = PTS[task.load] || 1, chosen = [];
  for (let k = 0; k < n; k++) {
    let best = null, bs = 1e9;
    avail.forEach((d, idx) => {
      if (chosen.includes(d)) return;
      const c = ctx[d], gap = chosen.length ? Math.min(...chosen.map((x) => Math.abs(x - d))) : 3;
      const fill = (c.pts + w) / c.cap;
      let sc = fill * 60 + Math.max(0, fill - 1) * 200;
      const it0 = c.intensity, wk = c.work;
      const maxH = wk ? (it0 === 'intenso' ? 2 : 1) : it0 === 'suave' ? 1 : 2;
      if (heavy) sc += c.heavyN >= maxH ? 120 + c.heavyN * 40 : c.heavyN * 20;
      sc -= Math.min(gap, 3) * (heavy ? 8 : 10);
      if (heavy && c.learn && (c.learn.avoid.includes(weekdayOf(d)) || c.learn.tough.includes(weekdayOf(d)))) sc += 90;
      if (task.prio === 'alta') sc += idx * 1.5;
      if (task.prio === 'baixa') sc -= idx * 1;
      if (sc < bs) { bs = sc; best = d; }
    });
    if (best != null) chosen.push(best);
  }
  return chosen.sort((a, b) => a - b);
}
function distribute(s) {
  const days = planDays(s); let avail = days.filter((d) => d >= s.day);
  const old = (s.plan && s.plan.items) || [];
  const kept = old.filter((it) => it.day < s.day || it.status === 'feito' || it.status === 'removido' || (it.locked && it.status === 'pendente'));
  const ctx = makeCtx(s, days);
  if (ctx[s.day] && ctx[s.day].end - ctx[s.day].start < 60) avail = avail.filter((d) => d !== s.day);
  const vacOf = (d) => vacationOn(s, d), availWork = avail.filter((d) => !vacOf(d));
  const careOk = (cy, d) => { const v = vacOf(d); return !v || (v.keepCare && cycleArea(cy) === 'cuidado'); };
  kept.forEach((it) => it.status !== 'removido' && ctx[it.day] && occupy(ctx[it.day], it));
  const items = [], unplaced = [];
  const add = (it) => { items.push(it); occupy(ctx[it.day], it); };
  const has = (kind, ref, day) => kept.some((it) => it.kind === kind && it.ref === ref && it.day === day);
  // 0. rotinas de autocuidado (tarefas diárias, não eventos)
  const R0 = s.routines || {};
  [['manha', (d, dur) => toMin(s.sleepGoal.wake) + 5], ['noite', (d, dur) => nightMin(s.sleepGoal.bed) - 15 - dur]].forEach(([rid, at]) => {
    const r = R0[rid]; if (!r || !r.on || !r.steps.length) return;
    avail.forEach((d) => {
      if (has('routine', rid, d)) return;
      { const v = vacOf(d); if (v && !v.keepRoutines) return; }
      const dur = routineDur(r), c = ctx[d]; let st = at(d, dur);
      if (d === s.day && st < nowRef(s)) return;
      if (st + dur > 1439 || st < 0) return;
      if (c.occ.some(([a, b]) => st < b && st + dur > a)) { const alt = findSlot(s, { ...c, end: Math.max(c.end, st + dur) }, dur, rid === 'manha' ? 'cedo' : 'leve'); if (alt == null) return; st = alt; }
      add({ id: uid(), kind: 'routine', ref: rid, day: d, start: st, dur, ver: 'normal', prio: 'media', load: 'leve', status: 'pendente', why: rid === 'manha' ? 'Logo depois de acordar: começar o dia cuidando de você.' : 'Antes de deitar: desacelerar e preparar amanhã.' });
    });
  });
  // 1. cama ao acordar
  s.cycles.filter((c) => c.every === 1).forEach((cy) => avail.filter((d) => careOk(cy, d)).forEach((d) => {
    if (has('cycle', cy.id, d) || (d === s.day && cy.last === s.day)) return;
    const st = findSlot(s, ctx[d], cy.dur, 'cedo');
    if (st != null) add({ id: uid(), kind: 'cycle', ref: cy.id, day: d, start: st, dur: cy.dur, ver: 'normal', prio: 'media', load: 'leve', status: 'pendente', why: st <= toMin(s.sleepGoal.wake) + 90 ? 'Logo ao acordar: dois minutos e o dia já começa contando.' : 'Ainda dá tempo hoje: dois minutos e já conta.' });
  }));
  // 2. tarefas recorrentes, por prioridade e carga
  const rec = s.tasks.filter((t) => t.freq > 0).sort((a, b) => (PTS[b.load] * 2 + (2 - RANK[b.prio])) - (PTS[a.load] * 2 + (2 - RANK[a.prio])) || b.freq - a.freq);
  rec.forEach((task) => {
    const free = availWork.filter((d) => !has('task', task.id, d));
    const doneN = kept.filter((it) => it.kind === 'task' && it.ref === task.id && days.includes(it.day)).length;
    const n = task.freq >= 7 ? free.length : Math.max(0, Math.min(free.length, Math.round(task.freq * availWork.length / 7) - doneN));
    const pref = task.where === 'transporte' ? free.filter((d) => ctx[d].trips.length) : free;
    let chosen = pickDays(n, pref.length >= n ? pref : free, ctx, task);
    chosen.forEach((d) => {
      let it = placeTask(s, ctx, task, d);
      if (!it) { const alt = free.filter((x) => !chosen.includes(x)).sort((a, b) => ctx[a].heavy - ctx[b].heavy); for (const x of alt) { it = placeTask(s, ctx, task, x); if (it) break; } }
      if (it) add(it); else if (d !== s.day) unplaced.push({ ref: task.id, kind: 'task', why: 'Não coube nesta semana.' });
    });
  });
  // 3. tarefas avulsas: antes do prazo
  s.tasks.filter((t) => !t.freq && !t.done).sort((a, b) => (a.due ?? 1e9) - (b.due ?? 1e9) || RANK[a.prio] - RANK[b.prio]).forEach((task) => {
    if (kept.some((it) => it.kind === 'task' && it.ref === task.id)) return;
    const lim = task.due != null ? availWork.filter((d) => d <= task.due - (task.due > s.day ? 1 : 0)) : availWork;
    const cand = (lim.length ? lim : availWork).slice().sort((a, b) => (ctx[a].pts / ctx[a].cap) - (ctx[b].pts / ctx[b].cap) || (task.prio === 'alta' ? a - b : 0));
    let it = null;
    for (const d of cand) { it = placeTask(s, ctx, task, d, { why: task.due != null ? `Prazo ${DIAS[weekdayOf(task.due)].toLowerCase()} (${fmtCurto(task.due)}): encaixei um dia antes, num dia mais leve.` : 'Tarefa sem prazo: foi para o dia mais leve da semana.' }); if (it) break; }
    if (it) add(it); else unplaced.push({ ref: task.id, kind: 'task', why: 'Não coube antes do prazo.' });
  });
  // 3b. revisões de prova (crescendo perto da data)
  (s.exams || []).forEach((ex) => {
    const n = Math.max(1, Math.ceil(ex.hours * 60 / 45)), span = Math.max(1, Math.min(14, ex.date - s.day));
    const offs = Array.from(new Set(Array.from({ length: n }, (_, i) => Math.round(1 + (span - 1) * Math.pow((n - 1 - i) / Math.max(1, n - 1), 1.8))))).sort((a, b) => b - a);
    offs.forEach((off, idx) => {
      const d = ex.date - off;
      if (!availWork.includes(d) || kept.some((it) => it.kind === 'exam' && it.ref === ex.id && it.session === idx)) return;
      const last = idx === offs.length - 1, dur = last ? 60 : 45;
      const st = findSlot(s, ctx[d], dur, 'foco') ?? findSlot(s, ctx[d], 20, 'foco');
      if (st == null) { unplaced.push({ ref: ex.id, kind: 'exam', why: `Revisão de ${fmtCurto(d)} não coube.` }); return; }
      add({ id: uid(), kind: 'exam', ref: ex.id, session: idx, day: d, start: st, dur: findSlot(s, ctx[d], dur, 'foco') != null ? dur : 20, ver: 'normal', prio: 'alta', load: 'pesada', status: 'pendente',
        why: `${last ? 'Simulado final' : `Revisão ${idx + 1} de ${offs.length}`} para ${ex.title}: faltam ${off} ${off === 1 ? 'dia' : 'dias'}. As revisões ficam mais próximas perto da prova.` });
    });
  });
  // 3c. projetos quebrados em passos (no máximo 1 por dia)
  (s.projects || []).filter((pj) => pj.doneMin < pj.totalMin).forEach((pj) => {
    const pendKept = kept.filter((it) => it.kind === 'project' && it.ref === pj.id && it.status === 'pendente').reduce((a, it) => a + it.dur, 0);
    let left = pj.totalMin - pj.doneMin - pendKept;
    const cand = availWork.filter((d) => (pj.due == null || d <= pj.due) && !kept.some((it) => it.kind === 'project' && it.ref === pj.id && it.day === d)).sort((a, b) => (ctx[a].pts / ctx[a].cap) - (ctx[b].pts / ctx[b].cap));
    for (const d of cand) {
      if (left <= 0) break;
      const dur = Math.min(pj.blockMin, left), st = findSlot(s, ctx[d], dur, pj.load === 'leve' ? 'leve' : 'foco');
      if (st == null) continue;
      add({ id: uid(), kind: 'project', ref: pj.id, day: d, start: st, dur, ver: 'normal', prio: pj.prio || 'media', load: pj.load, status: 'pendente', why: `Passo de ${dur} min de “${pj.title}”: faltam ${fmtH(left / 60)} no total. Um passo por dia, no dia mais leve.` });
      left -= dur;
    }
  });
  // 4. ciclos em dias diferentes
  s.cycles.filter((c) => c.every > 1).sort((a, b) => b.dur - a.dur).forEach((cy) => {
    const last = avail[avail.length - 1];
    let due = cy.last + cy.every;
    const lastKept = kept.filter((it) => it.kind === 'cycle' && it.ref === cy.id).reduce((a, it) => Math.max(a, it.day), -1);
    if (lastKept >= 0) due = lastKept + cy.every;
    for (let guard = 0; due <= last && guard < 8; guard++) {
      const target = Math.max(due, avail[0]), overdue = due < avail[0];
      const cand = [target, target + 1, target - 1, target + 2, target - 2].filter((d) => avail.includes(d) && careOk(cy, d) && !items.some((it) => it.kind === 'cycle' && it.ref === cy.id && it.day === d));
      cand.sort((a, b) => (ctx[a].big * 100 + Math.abs(a - target) * 30 + ctx[a].total * 0.05) - (ctx[b].big * 100 + Math.abs(b - target) * 30 + ctx[b].total * 0.05));
      let placed = null;
      for (const d of cand) {
        const st = findSlot(s, ctx[d], cy.dur, 'leve');
        if (st != null) { placed = { id: uid(), kind: 'cycle', ref: cy.id, day: d, start: st, dur: cy.dur, ver: 'normal', prio: 'media', load: 'leve', status: 'pendente',
          why: overdue ? `Já faz ${s.day - cy.last} dias: encaixei no primeiro dia com folga.` : ctx[d].big === 0 ? `Ciclo de ${cy.every} dias. Neste dia não tem outra limpeza grande.` : `Ciclo de ${cy.every} dias, no horário mais leve do dia.` }; break; }
      }
      if (placed) { add(placed); due = placed.day + cy.every; } else { unplaced.push({ ref: cy.id, kind: 'cycle', why: 'Sem espaço livre neste período.' }); due += cy.every; }
    }
  });
  return { days, items: [...kept, ...items], unplaced, at: Date.now() };
}

/* ===================== reajuste do dia ===================== */
function moveFuture(s, ctx, it, task, cy, mode) {
  const future = s.plan.days.filter((d) => d > s.day);
  const dur = task ? task.dur : cy.dur, pref = task && task.load === 'pesada' ? 'foco' : 'leve';
  let best = null;
  future.forEach((d) => { const st = findSlot(s, ctx[d], dur, pref); if (st != null && (!best || ctx[d].heavy < best.h)) best = { d, st, h: ctx[d].heavy }; });
  if (!best) return { ...it, status: 'backlog', why: 'Sem espaço nesta semana: fica guardado para a próxima distribuição.' };
  const n = { ...it, day: best.d, start: best.st, dur, ver: 'normal', inTrip: null, moved: true, why: `Veio de ${DIAS_LONGO[weekdayOf(s.day)]} (${MODOS[mode].t.toLowerCase()}): aqui tem espaço com mais energia.` };
  occupy(ctx[best.d], n); return n;
}
function reajustar(s) {
  const en = energyOf(s), mode = modeOf(s, en);
  const ctx = makeCtx(s, s.plan.days);
  s.plan.items.forEach((it) => { if (!(it.day === s.day && it.status === 'pendente') && ctx[it.day] && it.status !== 'backlog') occupy(ctx[it.day], it); });
  const work = fixedOn(s, s.day).some((f) => f.type === 'trabalho');
  const motivo = en.deficit >= 0.5 ? `você dormiu ${fmtH(en.h)} (meta ${fmtH(en.goal)})` : en.extra >= 15 ? `o trajeto levou ${en.extra} min a mais` : s.today.survival ? 'hoje é dia de sobrevivência' : 'a energia está mais baixa';
  const pend = s.plan.items.filter((it) => it.day === s.day && it.status === 'pendente').sort((a, b) => a.start - b.start);
  const out = [], reduced = [], moved = [];
  let heavyKept = 0;
  const cT = ctx[s.day];
  pend.forEach((it) => {
    const task = it.kind !== 'cycle' ? refOf(s, it) : null, cy = it.kind === 'cycle' ? s.cycles.find((c) => c.id === it.ref) : null;
    if (!task && !cy) return;
    if (task && task.event) { occupy(cT, it); out.push(it); return; }
    let act = 'keep', ver = it.ver;
    if (task) {
      if (task.load === 'pesada') {
        if (mode === 'recuperacao') { if (task.prio === 'alta' && heavyKept === 0) { ver = 'min'; heavyKept++; } else act = 'move'; }
        else if (mode === 'puxado') { if (work && heavyKept >= 1) act = 'move'; else { ver = 'min'; heavyKept++; } }
      } else if (task.load === 'media' && mode !== 'normal' && mode !== 'descansada') { if (mode === 'recuperacao' && task.prio !== 'alta') act = 'move'; else ver = 'min'; }
      else if (mode === 'recuperacao' || (task.where === 'transporte' && en.extra >= 20)) ver = 'min';
    } else if (cy.every > 1 && mode === 'recuperacao') act = 'move';
    const dur = task ? (ver === 'min' ? task.min : task.dur) : cy.dur;
    if (act === 'keep') {
      let start = it.start, inTrip = it.inTrip;
      const trip = inTrip && cT.trips.find((x) => x.id === inTrip);
      if (trip) { const st2 = Math.max(start, trip.cur || cT.start, cT.start); if (st2 + dur <= trip.e) start = st2; else { inTrip = null; start = -1; } }
      const clash = !inTrip && cT.occ.some(([a, b]) => start < b + 5 && start + dur + 5 > a);
      if (start < cT.start || clash) {
        inTrip = null;
        start = findSlot(s, cT, dur, task && task.load === 'pesada' ? 'foco' : 'leve');
      }
      if (start == null) act = 'move';
      else {
        const n = { ...it, start, dur, ver, inTrip, why: ver !== it.ver ? `Reajustado porque ${motivo}: só a versão mínima, ${dur} min.` : start !== it.start ? 'Reajustado: o horário de antes já passou, encaixei mais tarde.' : it.why };
        occupy(cT, n); out.push(n); if (ver !== it.ver) reduced.push(task ? task.title : cy.title);
      }
    }
    if (act === 'move') { out.push(moveFuture(s, ctx, it, task, cy, mode)); moved.push(task ? task.title : cy.title); }
  });
  const items = [...s.plan.items.filter((it) => !(it.day === s.day && it.status === 'pendente')), ...out];
  return { ...s, plan: { ...s.plan, items }, today: { ...s.today, adjusted: true }, adjustNote: { mode, motivo, reduced, moved } };
}

/* ===================== readaptação automática =====================
 * Sempre que você mexe na grade ou no cadastro, o Lume redistribui o resto
 * da semana em volta do que você fixou (itens 'locked', feitos e removidos
 * ficam onde estão) e devolve um resumo do que mudou, com desfazer. */
function adapt(s, reason) {
  const prev = s.plan;
  let plan = distribute(s);
  if (s.today && s.today.adjusted && s.today.checkedIn) plan = reajustar({ ...s, plan }).plan;
  const daysOf = (pl) => { const m = {}; pl.items.filter((it) => it.status === 'pendente' && !it.locked && it.day >= s.day).forEach((it) => { const k = it.kind + ':' + it.ref; (m[k] = m[k] || []).push(it.day); }); return m; };
  const a = daysOf(prev), b = daysOf(plan), lines = [], changes = [];
  new Set([...Object.keys(a), ...Object.keys(b)]).forEach((k) => {
    const x = (a[k] || []).sort().join(','), y = (b[k] || []).sort().join(',');
    if (x === y) return;
    const [kind, ref] = k.split(':'); const r = { title: refTitle(s, kind, ref) }; if (!r.title) return;
    const fmt = (arr) => (arr && arr.length ? arr.sort((p, q) => p - q).map((d) => DIAS[weekdayOf(d)]).join(', ') : 'fora da semana');
    lines.push(`${r.title}: ${fmt(a[k])} → ${fmt(b[k])}`); changes.push({ title: r.title, kind, from: [...new Set(a[k] || [])].sort((p, q) => p - q), to: [...new Set(b[k] || [])].sort((p, q) => p - q) });
  });
  const K = (it) => it.kind + ':' + it.ref, T0 = (pl) => pl.items.filter((it) => it.day === s.day && it.status === 'pendente' && it.start + it.dur > nowRef(s));
  const p0 = T0(prev), p1 = T0(plan), news = [];
  p1.forEach((it) => { const o = p0.find((x) => K(x) === K(it)); const nm = refTitle(s, it.kind, it.ref); if (!nm) return; if (!o) news.push(`Entrou: ${nm} às ${hhmm(it.start)}`); else if (o.start !== it.start) news.push(`${nm}: ${hhmm(o.start)} → ${hhmm(it.start)}`); });
  p0.forEach((it) => { if (!p1.some((x) => K(x) === K(it))) { const nm = refTitle(s, it.kind, it.ref); const w = plan.items.find((x) => K(x) === K(it) && x.day > s.day && x.status === 'pendente'); if (nm) news.push(`Saiu de hoje: ${nm}${w ? ` (foi para ${DIAS[weekdayOf(w.day)].toLowerCase()})` : ''}`); } });
  const dayNews = news.length ? { day: s.day, lines: news.slice(0, 6), more: Math.max(0, news.length - 6), reason } : s.dayNews;
  return { ...s, plan, dirty: false, dayNews, adaptNote: { reason, lines: lines.slice(0, 5), more: Math.max(0, lines.length - 5), changes, prev, at: Date.now() } };
}

/* ===================== estilos ===================== */
const card = 'rounded-2xl border border-white/[0.07] bg-zinc-900/60 transition-[border-color,background-color,box-shadow] duration-300';
const btnP = 'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl btn-primary text-zinc-950 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9f8fff] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed press';
const btnG = 'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-white/10 text-zinc-200 hover:bg-white/[0.06] hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9f8fff] disabled:opacity-40 disabled:cursor-not-allowed press';
const btnL = 'inline-flex items-center gap-1.5 min-h-[44px] md:min-h-[36px] px-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]';
const inp = 'w-full h-11 rounded-xl bg-zinc-950 border border-white/10 px-3 text-base text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#9f8fff]/60';
const lbl = 'block text-sm text-zinc-400 mb-1.5';
const tag = 'inline-flex items-center text-xs px-2 py-0.5 rounded-full';

function Seg({ value, options, onChange, label }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-zinc-950 border border-white/[0.07]" role="group" aria-label={label}>
      {options.map(([v, l]) => <button type="button" key={v} aria-pressed={value === v} onClick={() => onChange(v)} className={`flex-1 min-h-[38px] px-3 rounded-lg text-sm transition-colors ${value === v ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-200'}`}>{l}</button>)}
    </div>
  );
}
function TimeField({ id, value, onChange, label, prefix, min, max }) {
  const [open, setOpen] = useState(false), mob = useMobile();
  const ref = useRef(null), hRef = useRef(null), mRef = useRef(null), popRef = useRef(null), btnRef = useRef(null);
  const [pos, setPos] = useState(null);
  const [h, m] = (value || '00:00').split(':');
  const place = () => {
    const b = btnRef.current; if (!b) return;
    const r = b.getBoundingClientRect(), H = 300, W = 224, below = window.innerHeight - r.bottom;
    const left = Math.max(8, Math.min(r.left, window.innerWidth - W - 8));
    setPos(below < H + 12 && r.top > below ? { left, bottom: window.innerHeight - r.top + 6 } : { left, top: r.bottom + 6 });
  };
  useEffect(() => {
    if (!open) return;
    place();
    const f = (e) => { if (ref.current && !ref.current.contains(e.target) && !(popRef.current && popRef.current.contains(e.target))) setOpen(false); };
    const k = (e) => { if (e.key === 'Escape') setOpen(false); };
    const re = () => place();
    document.addEventListener('mousedown', f); document.addEventListener('touchstart', f); document.addEventListener('keydown', k);
    window.addEventListener('resize', re); window.addEventListener('scroll', re, true);
    return () => { document.removeEventListener('mousedown', f); document.removeEventListener('touchstart', f); document.removeEventListener('keydown', k); window.removeEventListener('resize', re); window.removeEventListener('scroll', re, true); };
  }, [open]);
  useEffect(() => {
    if (!open || !pos) return;
    [hRef, mRef].forEach((r) => { const c = r.current, el = c && c.querySelector('[aria-pressed="true"]'); if (el) c.scrollTop = el.offsetTop - c.clientHeight / 2 + el.clientHeight / 2; });
  }, [open, !!pos]);
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const mins = Array.from(new Set([...Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')), m])).sort();
  const lo = min == null ? 0 : min, hi = max == null ? 1439 : max;
  const okT = (t) => t >= lo && t <= hi, hOk = (x) => +x * 60 + 59 >= lo && +x * 60 <= hi;
  const fit = (x, mm) => { let t = +x * 60 + +mm; if (t < lo) t = lo; if (t > hi) t = hi; return hhmm(t); };
  const cell = (on, dis) => `h-11 md:h-9 rounded-lg text-sm tabular-nums ${on ? 'bg-[#9f8fff] text-zinc-950 font-medium' : dis ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-300 hover:bg-white/[0.06]'}`;
  return (
    <div className="relative" ref={ref}>
      <button ref={btnRef} type="button" id={id} aria-haspopup="dialog" aria-expanded={open} aria-label={`${label}: ${value}`} onClick={() => setOpen(!open)}
        className={inp + ' flex items-center justify-between text-left'}><span className="tabular-nums">{prefix && <span className="text-zinc-500 text-sm mr-1.5">{prefix}</span>}{value}</span><Ic n="Clock" className="w-4 h-4 text-zinc-500" /></button>
      {open && pos && ReactDOM.createPortal(
        <>{mob && <PickBackdrop />}<div ref={popRef} role="dialog" aria-label={label} {...pickBox(mob, pos, "z-[90] w-56 pop-in rounded-xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60 p-2")}>{mob && <PickHandle />}
          <div className="grid grid-cols-2 gap-2">
            <div><p className="text-xs text-zinc-500 px-1 pb-1">Hora</p>
              <div ref={hRef} className="picker relative h-[38vh] md:h-52 overflow-y-auto grid gap-0.5 pr-1">{hours.map((x) => <button type="button" key={x} aria-pressed={x === h} disabled={!hOk(x)} className={cell(x === h, !hOk(x))} onClick={() => onChange(fit(x, m))}>{x}</button>)}</div></div>
            <div><p className="text-xs text-zinc-500 px-1 pb-1">Minuto</p>
              <div ref={mRef} className="picker relative h-[38vh] md:h-52 overflow-y-auto grid gap-0.5 pr-1">{mins.map((x) => { const dis = !okT(+h * 60 + +x); return <button type="button" key={x} aria-pressed={x === m} disabled={dis} className={cell(x === m, dis)} onClick={() => { onChange(`${h}:${x}`); setOpen(false); }}>{x}</button>; })}</div></div>
          </div>
          {(min != null || max != null) && <p className="text-[11px] text-zinc-500 px-1 pt-2">{max != null && min == null ? `Até ${hhmm(max)} (agora)` : min != null && max == null ? `A partir de ${hhmm(min)}` : `Entre ${hhmm(lo)} e ${hhmm(hi)}`}</p>}
          <button type="button" className="mt-2 w-full h-11 md:h-9 rounded-lg text-sm text-zinc-400 hover:bg-white/[0.05]" onClick={() => setOpen(false)}>Pronto</button>
        </div></>,
        document.body
      )}
    </div>
  );
}
// Popover no tema do app, preso a um botão (vai para cima se não couber embaixo).
function usePopover(W, H) {
  const [open, setOpen] = useState(false), [pos, setPos] = useState(null);
  const ref = useRef(null), btnRef = useRef(null), popRef = useRef(null);
  const place = () => {
    const b = btnRef.current; if (!b) return;
    const r = b.getBoundingClientRect(), below = window.innerHeight - r.bottom, left = Math.max(8, Math.min(r.left, window.innerWidth - W - 8));
    setPos(below < H + 12 && r.top > below ? { left, bottom: window.innerHeight - r.top + 6 } : { left, top: r.bottom + 6 });
  };
  useEffect(() => {
    if (!open) { setPos(null); return; }
    place();
    const f = (e) => { if (ref.current && !ref.current.contains(e.target) && !(popRef.current && popRef.current.contains(e.target))) setOpen(false); };
    const k = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', f); document.addEventListener('touchstart', f); document.addEventListener('keydown', k);
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => { document.removeEventListener('mousedown', f); document.removeEventListener('touchstart', f); document.removeEventListener('keydown', k); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);
  return { open, setOpen, pos, ref, btnRef, popRef };
}
const PICK_SHEET = 'fixed inset-x-0 bottom-0 z-[90] rounded-t-2xl border-t border-white/10 bg-zinc-900 shadow-2xl shadow-black/60 px-4 pt-2 sheet-up';
const pickBox = (mob, pos, cls) => (mob ? { style: { paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }, className: PICK_SHEET } : { style: { position: 'fixed', ...pos }, className: cls });
const PickHandle = () => <div className="flex justify-center pb-2" aria-hidden="true"><span className="w-10 h-1.5 rounded-full bg-white/20" /></div>;
const PickBackdrop = () => <div className="fixed inset-0 z-[89] bg-black/50" aria-hidden="true" />;
const pickCell = (on, dis) => `h-11 md:h-9 rounded-lg text-sm tabular-nums ${on ? 'bg-[#9f8fff] text-zinc-950 font-medium' : dis ? 'text-zinc-700 cursor-not-allowed' : 'text-zinc-300 hover:bg-white/[0.06]'}`;
const centerPicked = (refs) => refs.forEach((r) => { const c = r.current, el = c && c.querySelector('[aria-pressed="true"]'); if (el) c.scrollTop = el.offsetTop - c.clientHeight / 2 + el.clientHeight / 2; });
// Duração (horas + minutos): mesmo visual do seletor de horário, com todas as horas e minutos e campo para digitar.
function DurField({ value, onChange, label, min = 0, className = '' }) {
  const mob = useMobile();
  const MAX = 23 * 60 + 59;
  const v = Math.max(0, Math.round(value || 0)), h = Math.floor(v / 60), m = v % 60;
  const P = usePopover(240, 330), hRef = useRef(null), mRef = useRef(null);
  const [txt, setTxt] = useState(String(v));
  useEffect(() => { if (P.open && P.pos) centerPicked([hRef, mRef]); }, [P.open, !!P.pos]);
  useEffect(() => { setTxt(String(v)); }, [v]);
  const set = (hh, mm) => onChange(Math.min(MAX, Math.max(min, hh * 60 + mm)));
  const hours = Array.from({ length: 24 }, (_, i) => i), mins = Array.from({ length: 60 }, (_, i) => i);
  const fmt = h ? `${h}h${m ? String(m).padStart(2, '0') : ''}` : `${m} min`;
  return (
    <div className={'relative ' + (className.includes('mt-') ? className.split(' ').filter((c) => c.startsWith('mt-')).join(' ') : '')} ref={P.ref}>
      <button ref={P.btnRef} type="button" aria-haspopup="dialog" aria-expanded={P.open} aria-label={`${label}: ${fmt}`} onClick={() => P.setOpen(!P.open)}
        className={inp + ' flex items-center justify-between text-left ' + className.split(' ').filter((c) => !c.startsWith('mt-')).join(' ')}><span className="tabular-nums">{fmt}</span><Ic n="Timer" className="w-4 h-4 text-zinc-500" /></button>
      {P.open && P.pos && ReactDOM.createPortal(
        <>{mob && <PickBackdrop />}<div ref={P.popRef} role="dialog" aria-label={label} {...pickBox(mob, P.pos, "z-[90] w-60 pop-in rounded-xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60 p-2")}>{mob && <PickHandle />}
          <div className="grid grid-cols-2 gap-2">
            <div><p className="text-xs text-zinc-500 px-1 pb-1">Horas</p>
              <div ref={hRef} className="picker relative h-48 overflow-y-auto grid gap-0.5 pr-1">{hours.map((x) => { const dis = x * 60 + 59 < min; return <button type="button" key={x} aria-pressed={x === h} disabled={dis} className={pickCell(x === h, dis)} onClick={() => set(x, x * 60 + m < min ? min - x * 60 : m)}>{x}h</button>; })}</div></div>
            <div><p className="text-xs text-zinc-500 px-1 pb-1">Minutos</p>
              <div ref={mRef} className="picker relative h-48 overflow-y-auto grid gap-0.5 pr-1">{mins.map((x) => { const dis = h * 60 + x < min; return <button type="button" key={x} aria-pressed={x === m} disabled={dis} className={pickCell(x === m, dis)} onClick={() => set(h, x)}>{String(x).padStart(2, '0')}</button>; })}</div></div>
          </div>
          <label className="flex items-center gap-2 px-1 pt-2 text-xs text-zinc-500">Ou digite<input type="number" inputMode="numeric" min={min} max={MAX} value={txt} onChange={(e) => setTxt(e.target.value)} onBlur={() => { const n = Math.round(Number(txt)); if (Number.isFinite(n) && n >= 0) { const c = Math.min(MAX, Math.max(min, n)); onChange(c); setTxt(String(c)); } else setTxt(String(v)); }}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} className="w-20 h-8 rounded-md bg-zinc-950 border border-white/10 px-2 text-sm text-zinc-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#9f8fff]/60" aria-label={`${label} em minutos`} />min</label>
          <button type="button" className="mt-2 w-full h-11 md:h-9 rounded-lg text-sm text-zinc-400 hover:bg-white/[0.05]" onClick={() => P.setOpen(false)}>Pronto</button>
        </div></>, document.body)}
    </div>
  );
}
// "Ver como se fosse": hora real ou qualquer hora cheia do dia.
function SimTimeField({ value, onChange }) {
  const mob = useMobile();
  const P = usePopover(224, 320), lRef = useRef(null);
  useEffect(() => { if (P.open && P.pos) centerPicked([lRef]); }, [P.open, !!P.pos]);
  const opts = [null, ...Array.from({ length: 24 }, (_, i) => i * 60)];
  return (
    <div className="relative" ref={P.ref}>
      <button ref={P.btnRef} id="sim" type="button" aria-haspopup="dialog" aria-expanded={P.open} aria-label={`Ver como se fosse: ${value == null ? 'agora (hora real)' : hhmm(value)}`} onClick={() => P.setOpen(!P.open)}
        className={inp + ' h-10 flex items-center justify-between text-left'}><span className="tabular-nums">{value == null ? 'Agora (hora real)' : hhmm(value)}</span><Ic n="Clock" className="w-4 h-4 text-zinc-500" /></button>
      {P.open && P.pos && ReactDOM.createPortal(
        <>{mob && <PickBackdrop />}<div ref={P.popRef} role="dialog" aria-label="Ver como se fosse" {...pickBox(mob, P.pos, "z-[90] w-56 pop-in rounded-xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60 p-2")}>{mob && <PickHandle />}
          <div ref={lRef} className="picker relative h-60 overflow-y-auto grid grid-cols-2 gap-0.5 pr-1">{opts.map((x) => <button type="button" key={String(x)} aria-pressed={x === value} className={pickCell(x === value) + (x == null ? ' col-span-2' : '')} onClick={() => { onChange(x); P.setOpen(false); }}>{x == null ? 'Agora (hora real)' : hhmm(x)}</button>)}</div>
          <button type="button" className="mt-2 w-full h-11 md:h-9 rounded-lg text-sm text-zinc-400 hover:bg-white/[0.05]" onClick={() => P.setOpen(false)}>Pronto</button>
        </div></>, document.body)}
    </div>
  );
}
// Aviso de sono curto: sugere o horário de dormir a partir do horário de acordar (7h a 8h de sono).
function SleepWarn({ bed, wake, onApply }) {
  const h = sleepHours(bed, wake), [keep, setKeep] = useState(null);
  if (h >= 6 || keep === `${bed}-${wake}`) return null;
  const w = toMin(wake), rec = hhmm(w - 450), b7 = hhmm(w - 420), b8 = hhmm(w - 480);
  return (
    <div className="rounded-xl border border-[#ffc24d]/30 bg-[#ffc24d]/[0.07] p-4 space-y-3 rise" role="status">
      <p className="text-sm text-zinc-100 flex items-start gap-2"><Ic n="MoonStar" className="w-4 h-4 mt-0.5 text-[#ffc24d] shrink-0" /><span><b className="font-medium">{fmtH(h)} por noite é pouco.</b> Dormir menos de 6h não é recomendável: pesa na energia, no foco e na saúde, e o resto do dia fica mais difícil.</span></p>
      <p className="text-sm text-zinc-300">Para acordar às <b className="font-medium text-zinc-100">{wake}</b>, recomendo ir dormir por volta das <b className="font-medium text-zinc-100">{rec}</b> (7h30 de sono). Entre {b8} e {b7} você fica entre 8h e 7h.</p>
      <div className="flex flex-wrap gap-2"><button type="button" className={btnP + ' min-h-[38px] h-9 text-sm'} onClick={() => onApply(rec)}><Ic n="Moon" className="w-4 h-4" />Usar horário recomendado</button>
        <button type="button" className={btnL} onClick={() => setKeep(`${bed}-${wake}`)}>Manter o meu horário</button></div>
    </div>);
}
function DayChips({ days, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">{SEMANA.map((d) => { const on = days.includes(d); return (
      <button type="button" key={d} aria-pressed={on} onClick={() => onChange(on ? days.filter((x) => x !== d) : [...days, d].sort())}
        className={`w-11 h-10 rounded-lg text-sm ${on ? 'bg-[#9f8fff] text-zinc-950' : 'border border-white/10 text-zinc-400 hover:bg-white/5'}`}>{DIAS[d]}</button>); })}</div>
  );
}
const refOf = (s, it) => {
  if (it.kind === 'task') return s.tasks.find((t) => t.id === it.ref);
  if (it.kind === 'cycle') return s.cycles.find((c) => c.id === it.ref);
  if (it.kind === 'exam') { const e = (s.exams || []).find((x) => x.id === it.ref); return e && { id: e.id, title: `Revisar para ${e.title}`, load: 'pesada', prio: 'alta', dur: it.dur, min: 15, minText: 'Refazer 2 exercícios', where: 'casa', freq: 0 }; }
  if (it.kind === 'routine') { const r = s.routines && s.routines[it.ref]; return r && { id: it.ref, title: r.title, load: 'leve', prio: 'media', dur: routineDur(r), min: routineDur(r, true) || 3, minText: 'Só o essencial: ' + r.steps.filter((x) => x.ess).map((x) => x.t.toLowerCase()).join(', '), where: 'casa' }; }
  if (it.kind === 'project') { const pj = (s.projects || []).find((x) => x.id === it.ref); return pj && { id: pj.id, title: pj.title, load: pj.load, prio: pj.prio || 'media', dur: it.dur, min: Math.min(15, it.dur), minText: 'Só 15 min do próximo passo', where: 'qualquer', freq: 0 }; }
  return null;
};
const refTitle = (s, kind, ref) => { const r = refOf(s, { kind, ref, dur: 0 }); return r ? r.title : null; };
const itemTitle = (s, it) => { const r = refOf(s, it); return r ? r.title : '(removido)'; };
const itemDesc = (s, it) => { const r = refOf(s, it); if (!r) return ''; return it.kind === 'task' && it.ver === 'min' ? r.minText : it.kind === 'task' ? `${r.dur} min, versão completa` : `ciclo a cada ${r.every} ${r.every === 1 ? 'dia' : 'dias'}`; };

/* ===================== topo ===================== */
function TopBar({ s, en, setTab, act, bell }) {
  const so = socialOf(s);
  const st = s.streak, alive = st.keptDay >= s.day - 1;
  return (
    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
      <div className="flex-1 min-w-[180px]" data-tour="energia">
        <p className="text-sm text-zinc-500 capitalize">{fmtDia(s.day)}{s.offset ? ' · simulado' : ''}</p>
        <div className="mt-1.5 flex items-center gap-2" title="Energia de hoje">
          <Ic n="BatteryMedium" className="w-4 h-4 text-zinc-500" />
          <div className="flex-1 max-w-[220px] h-2 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full bar-anim" style={{ width: `${en.total}%`, background: barColor(en.total) }} /></div>
          <span className="text-sm text-zinc-300 tabular-nums">{en.total}%{s.today.checkedIn ? '' : ' est.'}</span>
        </div>
        <div className="mt-1 flex items-center gap-2" title="Bateria social e sensorial">
          <Ic n="Users" className="w-4 h-4 text-zinc-500" />
          <div className="flex-1 max-w-[220px] h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full bar-anim" style={{ width: `${so.now}%`, background: so.now >= 60 ? '#2ee8c4' : so.now >= 35 ? '#ffc24d' : '#ff7f5e' }} /></div>
          <span className="text-xs text-zinc-500 tabular-nums">social {so.now}%</span>
        </div>
      </div>
      <InstallButton />
      {bell}
      <button onClick={act.openAccount} aria-label="Conta" title="Conta" className="md:hidden w-11 h-11 grid place-items-center rounded-full bg-white/[0.05] text-zinc-300 text-sm font-medium">{Cloud.user && Cloud.user.email ? Cloud.user.email[0].toUpperCase() : <Ic n="Users" className="w-4 h-4" />}</button>
      <button onClick={() => act.setUi({ lowStim: !s.ui.lowStim })} aria-pressed={s.ui.lowStim} title="Modo baixo estímulo" aria-label="Modo baixo estímulo" className={`w-9 h-9 grid place-items-center rounded-full press ${s.ui.lowStim ? 'bg-[#9f8fff]/20 text-[#cdc4ff]' : 'bg-white/[0.05] text-zinc-400 hover:bg-white/[0.08]'}`}><Ic n="EyeOff" /></button>
      <button onClick={() => setTab('agora')} className="flex items-center gap-1.5 px-3 h-9 rounded-full bg-white/[0.05] text-sm text-zinc-300 hover:bg-white/[0.08]" title={`Melhor marca: ${st.best} dias`}>
        <Ic n="Flame" className="w-4 h-4 text-[#ffc24d] flame" />{st.count === 0 && st.best === 0 ? 'Começando' : alive ? `${st.count} ${st.count === 1 ? 'dia' : 'dias'}` : 'Recomeço'}{s.keptDays[s.day] ? <Ic n="Check" className="w-3.5 h-3.5 text-[#2ee8c4]" /> : null}{s.today.survival ? ' · protegida' : ''}{vacationOn(s, s.day) ? <span className="text-[#2ee8c4]"> · em pausa</span> : null}
      </button>
    </div>
  );
}

/* ===================== AGORA ===================== */
function LegGroup({ dir, title, legs, sum, normal, start, onChange, now }) {
  const mine = legs.filter((l) => l.dir === dir).sort((a, b) => toMin(a.from) - toMin(b.from));
  const upd = (id, p) => onChange(legs.map((l) => (l.id === id ? { ...l, ...p } : l)));
  const cap = now == null ? 1439 : now;
  const nextFrom = () => { const last = mine[mine.length - 1]; return Math.min(last ? toMin(last.to) + 10 : start, cap - 5); };
  const canAdd = now == null || (mine.length ? toMin(mine[mine.length - 1].to) + 1 <= cap : start - 60 <= cap);
  const add = () => { if (!canAdd) return; const last = mine[mine.length - 1]; const from = Math.max(last ? toMin(last.to) : 0, nextFrom()); onChange([...legs, { id: uid(), dir, tipo: last ? 'Metrô' : 'Ônibus', from: hhmm(from), to: hhmm(Math.min(from + 30, cap)) }]); };
  const ordinal = (i) => `${i + 1}º`;
  return (
    <div className="rounded-xl bg-zinc-950 border border-white/[0.07] p-3 space-y-2">
      <div className="flex items-baseline justify-between gap-2 flex-wrap px-1">
        <p className="text-sm text-zinc-200 font-medium">{title}</p>
        <p className="text-xs text-zinc-500">{sum ? <>{sum.from} → {sum.to} · <b className="text-zinc-300">{fmtH(sum.span / 60)}</b> ({fmtH(sum.ride / 60)} em condução{sum.wait ? `, ${fmtH(sum.wait / 60)} de espera` : ''}) · padrão {normal} min</> : `Sem registro: conta o padrão de ${normal} min`}</p>
      </div>
      {mine.map((l, i) => {
        const prev = mine[i - 1], wait = prev ? toMin(l.from) - toMin(prev.to) : 0;
        return (
          <div key={l.id}>
            {prev && wait > 0 && <p className="text-xs text-zinc-500 pl-10 pb-1 flex items-center gap-1.5"><Ic n="Hourglass" className="w-3 h-3" />espera de {wait} min</p>}
            <div className="grid grid-cols-[28px_minmax(0,1fr)_40px] sm:grid-cols-[28px_minmax(0,1fr)_140px_130px_40px] gap-2 items-center">
              <span className="text-xs text-zinc-500 tabular-nums text-center">{ordinal(i)}</span>
              <select className={inp + ' h-10'} value={l.tipo} onChange={(e) => upd(l.id, { tipo: e.target.value })} aria-label={`Tipo da ${ordinal(i)} condução`}>{LEG_TIPOS.map((t) => <option key={t}>{t}</option>)}</select>
              <button type="button" className="sm:order-last h-10 grid place-items-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5" aria-label="Remover condução" onClick={() => onChange(legs.filter((x) => x.id !== l.id))}><Ic n="X" /></button>
              <div className="col-start-2 sm:col-start-auto"><TimeField id={`lf-${l.id}`} label="Peguei às" prefix="peguei" value={l.from} max={Math.min(cap, toMin(l.to))} min={prev ? toMin(prev.to) : null} onChange={(v) => upd(l.id, { from: v })} /></div>
              <div className="col-start-2 sm:col-start-auto"><TimeField id={`lt-${l.id}`} label="Desci às" prefix="desci" value={l.to} min={toMin(l.from)} max={cap} onChange={(v) => upd(l.id, { to: v })} /></div>
            </div>
          </div>
        );
      })}
      {canAdd ? <button type="button" className={btnL + ' text-[#9f8fff]'} onClick={add}><Ic n="Plus" className="w-3.5 h-3.5" />Adicionar condução</button>
        : <p className="text-xs text-zinc-500 px-1">{mine.length ? 'A próxima condução você registra quando descer da atual.' : `Ainda não começou (por volta de ${hhmm(start)}). Registre quando acontecer.`}</p>}
    </div>
  );
}
function CheckIn({ s, up, act, en }) {
  const t = s.today, setT = (p) => up((x) => ({ ...x, today: { ...x.today, ...p } }));
  const norm = en.norm;
  const preset = (tipo) => (tipo === 'remoto' ? 0 : tipo === 'atalho' ? Math.max(0, norm - 15) : tipo === 'atraso' ? norm + 30 : norm);
  return (
    <div className={card + ' p-5 space-y-5'}>
      <div>
        <p className="text-sm text-[#9f8fff]">Sua babá</p>
        <h2 className="text-2xl font-semibold text-zinc-50 mt-1 tracking-tight">{t.checkedIn ? 'Ajustar o check-in de hoje' : 'Bom dia. Antes de tudo: como foi a noite?'}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={lbl} htmlFor="bed">Fui dormir às</label><TimeField id="bed" label="Fui dormir às" value={t.bed} onChange={(v) => setT({ bed: v })} /></div>
        <div><label className={lbl} htmlFor="wake">Acordei às</label><TimeField id="wake" label="Acordei às" value={t.wake} max={nowRef(s)} onChange={(v) => setT({ wake: v })} /></div>
      </div>
      <div className="rounded-xl bg-zinc-950 border border-white/[0.07] p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <p className="text-zinc-100">Dormi <b className="text-xl">{fmtH(en.h)}</b> <span className="text-zinc-500">· meta {fmtH(en.goal)} ({s.sleepGoal.bed}–{s.sleepGoal.wake})</span></p>
          <p className="text-sm" style={{ color: en.deficit >= 0.5 ? '#ffc24d' : '#2ee8c4' }}>{en.deficit >= 0.25 ? `${fmtH(en.deficit)} a menos` : en.deficit <= -0.25 ? `${fmtH(-en.deficit)} a mais` : 'na meta'}</p>
        </div>
        <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full bar-anim" style={{ width: `${en.total}%`, background: barColor(en.total) }} /></div>
        <p className="text-sm text-zinc-400">Energia do dia: <b className="text-zinc-100">{en.total}%</b> <span className="text-zinc-500">(sono {en.base}%{t.calib ? `, ajuste ${t.calib > 0 ? '+' : ''}${t.calib}` : ''}{en.tr ? `, trajeto ${en.tr > 0 ? '+' : ''}${en.tr}` : ''}{en.ontem ? `, ontem ${en.ontem > 0 ? '+' : ''}${en.ontem}` : ''}{en.cyc ? `, ciclo ${en.cyc > 0 ? '+' : ''}${en.cyc}` : ''})</span></p>
      </div>
      <div>
        <label className={lbl} htmlFor="calib">Como eu realmente me sinto ({t.calib > 0 ? '+' : ''}{t.calib})</label>
        <input id="calib" type="range" min="-40" max="40" step="5" value={t.calib} onChange={(e) => setT({ calib: Number(e.target.value) })} className="w-full h-11 accent-[#9f8fff]" />
        <div className="flex justify-between text-xs text-zinc-500"><span>Bem mais cansada</span><span>Como o sono diz</span><span>Mais disposta</span></div>
      </div>
      {norm > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-zinc-100 font-medium">Transporte de hoje</p>
            <button type="button" role="switch" aria-checked={en.remoto} onClick={() => setT({ transport: en.remoto ? 'padrao' : 'remoto' })} className="flex items-center gap-2.5 text-sm text-zinc-300 min-h-[40px]">
              <span className={`w-10 h-6 rounded-full p-0.5 transition-colors ${en.remoto ? 'bg-[#9f8fff]' : 'bg-white/10'}`}><span className={`block w-5 h-5 rounded-full bg-white transition-transform ${en.remoto ? 'translate-x-4' : ''}`} /></span>
              Hoje é remoto (sem transporte)</button>
          </div>
          {!en.remoto && <>
            <LegGroup dir="ida" title="Ida" legs={t.legs || []} sum={en.ida} normal={en.nd.ida} start={en.nd.idaStart} now={nowRef(s)} onChange={(legs) => setT({ legs })} />
            {en.nd.volta > 0 && <LegGroup dir="volta" title="Volta" legs={t.legs || []} sum={en.volta} normal={en.nd.volta} start={en.nd.voltaStart} now={nowRef(s)} onChange={(legs) => setT({ legs })} />}
            <p className="text-sm text-zinc-400">Trajeto de hoje: <b className="text-zinc-100">{fmtH(en.real / 60)}</b> <span className="text-zinc-500">(padrão {fmtH(en.norm / 60)})</span>
              {en.extra > 5 ? <span className="text-[#ffc24d]"> · {fmtH(en.extra / 60)} a mais, tira {-en.tr} de energia. Ao salvar, eu alivio o dia.</span> : en.extra < -10 ? <span className="text-[#2ee8c4]"> · mais rápido que o normal.</span> : <span className="text-zinc-500"> · dentro do normal.</span>}</p>
          </>}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button className={btnP} type="button" onClick={() => act.checkIn()}><Ic n="Check" />{t.checkedIn ? 'Salvar' : 'Salvar check-in'}</button>
        <button type="button" className={btnL} onClick={() => setT({ bed: '01:30', wake: '06:00', calib: -10 })}><Ic n="FlaskConical" />Testar: noite curta (4h30)</button>
      </div>
    </div>
  );
}

function StreakMini({ s }) {
  const st = s.streak, alive = st.keptDay >= s.day - 1, n = alive ? st.count : 0;
  const last = Array.from({ length: 7 }, (_, i) => s.day - 6 + i);
  const hoje = s.keptDays[s.day];
  return (
    <div className={card + ' p-4 space-y-3'}>
      <div className="flex items-center gap-3">
        <Ic n="Flame" className="w-6 h-6 text-[#ffc24d] flame" />
        <p className="flex-1 text-zinc-100"><b className="text-2xl tabular-nums">{n}</b> <span className="text-zinc-400">{n === 1 ? 'dia de ofensiva' : 'dias de ofensiva'}</span></p>
        <span className="text-xs text-zinc-500">melhor {st.best}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-400 whitespace-nowrap"><Pet mood="calmo" size={22} /><span>Lume nível {lumeLevel(s).lv}</span>{lumeLevel(s).next != null && <span className="text-zinc-500 truncate">· presente em {lumeLevel(s).next - lumeLevel(s).pts} {lumeLevel(s).next - lumeLevel(s).pts === 1 ? 'dia' : 'dias'}</span>}</div>
      <div className="grid grid-cols-7 gap-1.5">
        {last.map((d) => { const k = s.keptDays[d]; return (
          <div key={d} className="flex flex-col items-center gap-1" title={`${fmtCurto(d)}${k === 'feito' ? ': cumprido' : k === 'protegido' ? ': protegido' : ''}`}>
            <span className={`w-full aspect-square max-w-[30px] rounded-md grid place-items-center ${k === 'feito' ? 'bg-[#2ee8c4]/80 text-zinc-950' : k === 'protegido' ? 'border border-[#ffc24d]/60 text-[#ffc24d]' : 'bg-white/[0.05]'} ${d === s.day ? 'ring-1 ring-[#9f8fff] ring-offset-1 ring-offset-zinc-900' : ''}`}>
              {k === 'feito' ? <Ic n="Check" className="w-3.5 h-3.5" /> : k === 'protegido' ? <Ic n="ShieldCheck" className="w-3.5 h-3.5" /> : null}</span>
            <span className={`text-[10px] ${d === s.day ? 'text-zinc-200' : 'text-zinc-500'}`}>{DIAS[weekdayOf(d)][0]}</span>
          </div>); })}
      </div>
      <p className="text-xs text-zinc-500">{hoje === 'feito' ? 'Hoje já conta.' : hoje === 'protegido' ? 'Hoje está protegido.' : 'Hoje conta com um item feito, até o mínimo.'}</p>
    </div>
  );
}

const NOTICE_T = { pulse: 'como você está', welcome: 'boas-vindas', check: 'check-in', hyper: 'hiperfoco', leave: 'saída', meal: 'refeição', wind: 'desacelerar', confirm: 'confirmar bloco', pause: 'pausa', mode: 'reajuste', med: 'remédio', news: 'mudanças', adj: 'reajuste feito', sun: 'revisão' };
function Agora({ s, up, act, en, timer, setTab, openFocus, openWeekly, openComp }) {
  const [quick, setQuick] = useState(null);
  const [runR, setRunR] = useState(null);
  const [stepFor, setStepFor] = useState(null);
  const [moreN, setMoreN] = useState(false);
  const [editing, setEditing] = useState(false);
  const mode = modeOf(s, en), now = nowRef(s);
  if (editing) return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-start">
      <CheckIn s={s} up={up} act={{ ...act, checkIn: () => { act.checkIn(); setEditing(false); } }} en={en} />
      <aside><StreakMini s={s} /></aside>
    </div>
  );
  const items = s.plan.items.filter((it) => it.day === s.day && it.status === 'pendente' && refOf(s, it)).sort((a, b) => a.start - b.start);
  const fx = fixedOn(s, s.day);
  const toConfirm = fixedAll(s, s.day).find((f) => f.type !== 'trajeto' && (!f.log || f.log.aindaLa) && now >= f.e && now < f.e + 360);
  const curFixed = fx.find((f) => f.s <= now && now < f.e);
  const inWindow = curFixed && curFixed.type === 'trajeto' ? items.filter((it) => it.inTrip === curFixed.id || (it.start >= curFixed.s && it.start < curFixed.e)) : [];
  const overdue = items.filter((it) => it.start + it.dur < now && !(curFixed && inWindow.includes(it)));
  const upcoming = items.filter((it) => it.start + it.dur >= now);
  let order = null, mood = null;
  if (curFixed && curFixed.type === 'trabalho') mood = { icon: 'Briefcase', title: `${curFixed.title} até ${curFixed.end}.`, sub: 'Lá, foque só no trabalho. O resto eu seguro.' };
  else if (curFixed && curFixed.type === 'compromisso') mood = { icon: 'CalendarClock', title: `${curFixed.title} até ${curFixed.end}.`, sub: 'Só estar lá já vale.', attend: curFixed };
  else if (curFixed && curFixed.type === 'trajeto' && !inWindow.length) mood = { icon: 'Bus', title: `${curFixed.title} até ${curFixed.end}.`, sub: 'Nada planejado para este trajeto: pode só descansar ou ouvir música.' };
  else if (inWindow.length) order = inWindow[0];
  else if (upcoming.length) order = upcoming[0];
  const vacNow = vacationOn(s, s.day);
  if (vacNow && !mood && (!order || !((order.kind === 'task' && (refOf(s, order) || {}).event) || areaOf(s, order)))) { order = null; mood = { icon: 'Sun', title: `${vacNow.label} · rotina em pausa`, sub: `${vacUntil(s, vacNow)[0].toUpperCase() + vacUntil(s, vacNow).slice(1)}. Trabalho, tarefas recorrentes e casa estão pausados. Sua ofensiva está protegida.`, vac: vacNow }; }
  const nextFixed = fx.find((f) => f.s > now);
  const freeUntil = order && order.start > now + 20 ? (nextFixed && nextFixed.s < order.start ? nextFixed : { s: order.start }) : null;
  const next = upcoming.filter((it) => it !== order).slice(0, 2);
  const sunEl = <div className={card + ' p-4 flex items-center gap-3 flex-wrap'}><Ic n="CalendarCheck" className="w-5 h-5 text-[#9f8fff]" /><p className="flex-1 text-[15px] text-zinc-200 min-w-[200px]">Domingo: que tal fechar a semana em 2 minutos?</p><button className={btnG} onClick={openWeekly}>Revisão da semana</button></div>;
  const confirmEl = toConfirm ? <div className={card + ' p-4 space-y-3'}><div className="flex items-center gap-3"><Ic n={toConfirm.type === 'trajeto' ? 'Bus' : toConfirm.type === 'trabalho' ? 'Briefcase' : 'CalendarClock'} className="w-5 h-5 text-[#9f8fff]" /><div><p className="text-zinc-100 font-medium">Como foi {toConfirm.title.toLowerCase()} hoje?</p><p className="text-sm text-zinc-500">Previsto {toConfirm.plan.start}–{toConfirm.plan.end}. Se mudou, eu ajusto o resto do dia.</p></div></div><FixedCheck key={toConfirm.id} s={s} day={s.day} f={toConfirm} act={act} inline /></div> : null;
  const pauseEl = <div className={card + ' p-4 flex items-center gap-3 flex-wrap border-[#2ee8c4]/30'}><Ic n="Coffee" className="w-5 h-5 text-[#2ee8c4]" /><p className="flex-1 text-[15px] text-zinc-200 min-w-[200px]">Bloco pesado feito. Pausa de 10 min antes do próximo: água, alongar ou comer algo.</p><button className={btnG} onClick={act.pauseDone}>Pausa feita</button></div>;
  const modeEl = (
          <div className={card + ' p-4 flex items-center gap-3 flex-wrap border-[#ffc24d]/30'}>
            <Ic n="Sparkles" className="w-5 h-5 text-[#ffc24d]" />
            <p className="flex-1 text-[15px] text-zinc-200 min-w-[200px]">Hoje está mais pesado ({MODOS[mode].t.toLowerCase()}). Quer que eu reajuste a sua grade de hoje?</p>
            <button className={btnP} onClick={act.reajustar}><Ic n="Wand2" />Reajustar meu dia</button>
          </div>
  );
  const adjEl = s.adjustNote ? (
          <div className={card + ' p-4 space-y-1.5'}>
            <p className="text-sm text-[#9f8fff] flex items-center gap-2"><Ic n="Wand2" />Dia reajustado porque {s.adjustNote.motivo}</p>
            {s.adjustNote.reduced.length > 0 && <p className="text-sm text-zinc-300">Versão mínima: {s.adjustNote.reduced.join(', ')}.</p>}
            {s.adjustNote.moved.length > 0 && <p className="text-sm text-zinc-300">Foram para outro dia, sem culpa: {s.adjustNote.moved.join(', ')}.</p>}
            {!s.adjustNote.reduced.length && !s.adjustNote.moved.length && <p className="text-sm text-zinc-300">Nada precisou mudar: a grade de hoje já cabe.</p>}
          </div>
  ) : null;
  const bedT = nightMin(s.sleepGoal.bed);
  const tm = timer.state && order && timer.state.key === order.id ? timer.state : null;
  const task = order && order.kind !== 'cycle' ? refOf(s, order) : null;
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-start">
      <div className="space-y-4">
        {(() => {
          const N = [];
          if (s.welcome) N.push({ k: 'welcome', el: <WelcomeBack s={s} act={act} setTab={setTab} /> });
          if (!s.today.checkedIn && !s.today.skipCheck && !vacationOn(s, s.day)) N.push({ k: 'check', el: <QuickCheck s={s} act={act} onDetail={() => setEditing(true)} /> });
          if (s.today.askPulse && !s.today.pulse) N.push({ k: 'pulse', el: <div className="swap-in"><PulseCard s={s} act={act} /></div> });
          if (order && hyperDue(s, order)) N.push({ k: 'hyper', el: <HyperCard s={s} it={order} act={act} /> });
          if (leaveDue(s) && !vacationOn(s, s.day)) N.push({ k: 'leave', el: <LeaveCheck s={s} act={act} /> });
          if (mealDue(s)) N.push({ k: 'meal', el: <MealNudge s={s} act={act} /> });
          if (now >= bedT - 60) N.push({ k: 'wind', el: <WindDown s={s} now={now} act={act} /> });
          if (toConfirm) N.push({ k: 'confirm', el: confirmEl });
          if (s.today.pause) N.push({ k: 'pause', el: pauseEl });
          if (mode !== 'normal' && mode !== 'descansada' && !s.today.adjusted && s.today.checkedIn) N.push({ k: 'mode', el: modeEl });
          if (medLow(s).length) N.push({ k: 'med', el: <MedStockNudge s={s} /> });
          if (s.dayNews && s.dayNews.day === s.day && s.dayNews.lines.length) N.push({ k: 'news', el: <DayNews s={s} act={act} /> });
          if (s.adjustNote && s.today.adjusted) N.push({ k: 'adj', el: adjEl });
          if (weekdayOf(s.day) === 0) N.push({ k: 'sun', el: sunEl });
          if (!N.length) return null;
          const rest = N.slice(1);
          return <>
            <div key={N[0].k}>{N[0].el}</div>
            {rest.length > 0 && <div className="space-y-2">
              <button className="w-full h-9 rounded-xl text-xs text-zinc-400 bg-white/[0.03] hover:bg-white/[0.06] flex items-center justify-center gap-1.5 press" aria-expanded={moreN} onClick={() => setMoreN(!moreN)}><Ic n={moreN ? 'ChevronUp' : 'ChevronDown'} className="w-3.5 h-3.5" />{moreN ? 'Esconder avisos' : `+${rest.length} ${rest.length === 1 ? 'aviso' : 'avisos'} (${rest.map((x) => NOTICE_T[x.k]).join(', ')})`}</button>
              {moreN && rest.map((x) => <div key={x.k} className="rise">{x.el}</div>)}
            </div>}
          </>;
        })()}
        <section key={order ? order.id : mood ? mood.title : 'vazio'} className={card + ' p-5 sm:p-6 space-y-4 swap-in agora-glow'} aria-label="Agora" data-tour="agora">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[#9f8fff] flex items-center gap-2"><i className="live-dot" />Agora · {hhmm(now)}</span>
            <span className={tag} style={{ background: MODOS[mode].c + '1f', color: MODOS[mode].c }}>{MODOS[mode].t}</span>
          </div>
          {mood ? (
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-50 tracking-tight leading-tight flex items-start gap-3"><Ic n={mood.icon} className="w-7 h-7 mt-1 text-zinc-500 shrink-0" />{mood.title}</h2>
              <p className="text-zinc-400">{mood.sub}</p>
              {curFixed && curFixed.type !== 'trajeto' && <details className="text-sm"><summary className="text-zinc-500 cursor-pointer hover:text-zinc-300">Saí mais cedo, cheguei atrasada ou não fui?</summary><div className="mt-3"><FixedCheck s={s} day={s.day} f={curFixed} act={act} inline /></div></details>}
              {mood.vac && <div className="flex flex-wrap gap-2"><button className={btnG} onClick={() => act.endVacation(mood.vac.id)}><Ic n="Play" />Encerrar pausa</button><button className={btnL} onClick={() => setTab('cadastro', 'semestre')}><Ic n="CalendarRange" className="w-3.5 h-3.5" />Ajustar datas</button></div>}
              {mood.attend && (s.attended[mood.attend.id] ? <p className="text-sm text-[#2ee8c4]">Presença registrada. Conta para a ofensiva.</p> : <button className={btnP} onClick={() => act.attend(mood.attend)}><Ic n="Check" />Estou aqui</button>)}
            </div>
          ) : order ? (
            <div className="space-y-4">
              {freeUntil && <p className="text-zinc-400">Você está livre até {hhmm(freeUntil.s)}{freeUntil.title ? ` (${freeUntil.title.toLowerCase()})` : ''}. {freeUntil.title ? `Isto fica para as ${hhmm(order.start)}:` : 'Se quiser adiantar:'}</p>}
              <div>
                <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-50 tracking-tight leading-tight">{itemTitle(s, order)}</h2>
                <p className="text-zinc-300 mt-1.5">{order.ver === 'min' && task ? `Só isto: ${task.minText.toLowerCase()} (${order.dur} min).` : `${order.dur} min${order.inTrip ? ', no trajeto, com celular e fone' : ''}.`}</p>
                <p className="text-sm text-zinc-500 mt-2 border-l-2 border-[#9f8fff]/40 pl-3 hint">{order.why}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {areaOf(s, order) && <span className={tag + ' flex items-center gap-1'} style={{ background: AREA[areaOf(s, order)].c + '22', color: AREA[areaOf(s, order)].c }}><Ic n={AREA[areaOf(s, order)].icon} className="w-3 h-3" />{areaOf(s, order) === 'cuidado' ? 'Cuidando de você · não é produtividade' : 'Rotina da casa'}</span>}
                {order.ver === 'min' && <span className={tag + ' bg-[#ffc24d]/15 text-[#ffc24d]'}>Mínimo viável</span>}
                <span className={tag + ' bg-white/[0.06]'} style={{ color: PRIO[order.prio].c }}>Prioridade {PRIO[order.prio].t.toLowerCase()}</span>
                <span className={tag + ' bg-white/[0.06] text-zinc-400'}>{hhmm(order.start)}–{hhmm(order.start + order.dur)}</span>
              </div>
              {tm && (
                <div className="flex items-center gap-3 rounded-xl bg-zinc-950 border border-white/[0.07] px-3 py-2">
                  <span className="font-mono text-2xl text-zinc-50 tabular-nums">{mmss(tm.left)}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full bg-[#9f8fff]" style={{ width: `${100 - (tm.left / tm.total) * 100}%` }} /></div>
                  <button className="p-2 rounded-lg hover:bg-white/5" aria-label={tm.running ? 'Pausar' : 'Retomar'} onClick={timer.toggle}><Ic n={tm.running ? 'Pause' : 'Play'} /></button>
                  <button className="p-2 rounded-lg hover:bg-white/5" aria-label="Parar o timer" onClick={timer.stop}><Ic n="X" /></button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {!tm && <><button className={btnG} onClick={() => act.startTimer(order, 10)}><Ic n="Timer" />Começar 10 min</button>
                  <button className={btnG + ' px-3'} onClick={() => act.startTimer(order, 15)} aria-label="Começar 15 minutos">15</button></>}
                {order.kind === 'routine' && <button className={btnP} onClick={() => setRunR(order.ref)}><Ic n="ListChecks" />Começar passo a passo</button>}
                <button className={order.kind === 'routine' ? btnG : btnP} onClick={() => act.done(order)}><Ic n="Check" />Feito</button>
                <button className={btnG} onClick={() => openFocus(order)}><Ic n="Maximize2" />Modo foco</button>
                <button className={btnG} onClick={() => openComp(order)}><Ic n="Users" />Trabalhar junto</button>
                <button className={btnL + ' text-[#2ee8c4]'} onClick={() => setStepFor(stepFor === order.id ? null : order.id)}><Ic n="Footprints" />Não sei por onde começar</button>
                <button className={btnL} onClick={() => act.travou(order)}><Ic n="LifeBuoy" />Travou / trocar por algo mais leve</button>
              </div>
            </div>
          ) : (
            !s.plan.items.some((it) => it.day === s.day) && now < bedT - 120 ? (
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-50 tracking-tight">Sua grade de hoje está vazia.</h2>
              <p className="text-zinc-400">Quando a semana foi distribuída, o dia já estava no fim. Quer que eu monte de novo a partir de agora?</p>
              <button className={btnP} onClick={act.distribuir}><Ic n="Sparkles" />Distribuir minha semana</button>
            </div>
          ) : (
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-semibold text-zinc-50 tracking-tight">{now >= bedT - 90 ? `Hora de desacelerar. Deitar até ${s.sleepGoal.bed}.` : 'Por hoje é isso.'}</h2>
              <p className="text-zinc-400">{now >= bedT - 90 ? 'Sem celular na cama. Amanhã a gente continua.' : 'Você fez o que dava, e isso basta. O resto do dia é seu.'}</p>
            </div>
          ))}
          {overdue.length > 0 && (
            <div className="flex items-center gap-3 flex-wrap rounded-xl bg-zinc-950 border border-white/[0.07] px-3 py-2.5">
              <p className="flex-1 text-sm text-zinc-400 min-w-[180px]">{overdue.length} {overdue.length === 1 ? 'item de mais cedo ficou' : 'itens de mais cedo ficaram'} para trás. Sem problema.</p>
              <button className={btnL + ' text-[#9f8fff]'} onClick={act.reajustar}><Ic n="Wand2" />Reajustar meu dia</button>
            </div>
          )}
          {order && stepFor === order.id && <FirstStep s={s} it={order} act={act} onClose={() => setStepFor(null)} />}
        </section>
        <TimeLeft s={s} />
        {(s.today.checkedIn || s.today.skipCheck) && !vacationOn(s, s.day) ? <Missions s={s} act={act} /> : null}
        {now >= bedT - 240 && !s.reviews[s.day] && <ReviewCard s={s} act={act} />}
        {next.length > 0 && (
          <div className="px-1 space-y-1.5">
            <p className="text-sm text-zinc-500">Depois disso</p>
            {next.map((it) => <SwipeRow key={it.id} onRight={() => act.swipeDone(it)} onLeft={() => setQuick(it)} leftLabel="Adiar / trocar"><p className="text-sm text-zinc-300 flex gap-3 min-h-[44px] md:min-h-0 items-center md:items-start bg-[#0b0c0f] md:bg-transparent"><span className="text-zinc-500 tabular-nums w-11">{hhmm(it.start)}</span>{itemTitle(s, it)}{it.ver === 'min' ? <span className="text-[#ffc24d]">· mínimo</span> : null}</p></SwipeRow>)}
          </div>
        )}
      </div>
      {runR && <RoutineRunner s={s} rid={runR} act={act} onClose={() => setRunR(null)} />}
      {quick && <QuickItemSheet s={s} it={quick} act={act} onClose={() => setQuick(null)} />}
      <aside className="space-y-3" data-tour="cuidados">
        <StreakMini s={s} />
        <AsideTabs s={s} act={act}>{(tab) => <>
          {tab === 'cuidar' && <CareCard s={s} act={act} setTab={setTab} bare />}
          {tab === 'energia' && <div className="space-y-5"><PulseCard s={s} act={act} bare /><div className="border-t border-white/[0.06] pt-4"><SocialCard s={s} act={act} bare /></div></div>}
          {tab === 'caixa' && <InboxCard s={s} act={act} bare />}
          {tab === 'dia' && <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2"><p className="text-sm text-zinc-300">Check-in de hoje</p><button className={btnL} onClick={() => setEditing(true)}><Ic n="Pencil" className="w-3.5 h-3.5" />Editar</button></div>
              <p className="text-sm text-zinc-400">Dormi {s.today.bed}–{s.today.wake} · <b className="text-zinc-200">{fmtH(en.h)}</b> (meta {fmtH(en.goal)})</p>
              {en.norm > 0 && <p className="text-sm text-zinc-400">Trajeto: {en.remoto ? 'remoto hoje' : `${fmtH(en.real / 60)} (padrão ${fmtH(en.norm / 60)})${en.extra > 5 ? `, +${en.extra} min` : ''}`}</p>}
            </div>
            {now < bedT - 240 && !s.reviews[s.day] && <details className="border-t border-white/[0.06] pt-3"><summary className="text-sm text-zinc-300 cursor-pointer">Avaliar o dia agora</summary><div className="mt-3"><ReviewCard s={s} act={act} compact /></div></details>}
            <div className="border-t border-white/[0.06] pt-3 space-y-2"><p className="text-sm text-zinc-300">Dia de exaustão?</p><p className="text-xs text-zinc-500 hint">Protege a ofensiva, deixa só o essencial e manda o resto para outros dias.</p>
              <button className={btnG + ' w-full'} onClick={act.survival}><Ic n="ShieldCheck" />{s.today.survival ? 'Sair do modo sobrevivência' : 'Hoje é dia de sobrevivência'}</button></div>
            <div className="border-t border-white/[0.06] pt-3"><PauseBlock s={s} act={act} setTab={setTab} /></div>
            <div className="border-t border-white/[0.06] pt-3 space-y-1.5"><p className="text-sm text-zinc-300">Ver como se fosse</p>
              <SimTimeField value={s.simNow == null ? null : s.simNow} onChange={(v) => up((x) => ({ ...x, simNow: v }))} />
              <p className="text-xs text-zinc-500 hint">Para testar a babá em outros horários.</p></div>
          </div>}
        </>}</AsideTabs>
        <button className={btnL} onClick={() => setTab('semana')}><Ic n="CalendarRange" />Ver a grade da semana</button>
      </aside>
    </div>
  );
}

/* ===================== bem-estar: revisão do dia, pausa, desacelerar, cuidados ===================== */
function ReviewCard({ s, act, compact }) {
  const r = s.reviews[s.day];
  const opts = [['rendeu', 'Rendeu', 'Sparkles'], ['minimo', 'Deu o mínimo', 'Check'], ['dificil', 'Foi difícil', 'CloudRain']];
  if (r) return compact ? null : <div className={card + ' p-4 text-sm text-zinc-300 flex items-center gap-2'}><Ic n="Check" className="w-4 h-4 text-[#2ee8c4]" />Dia avaliado: {opts.find((o) => o[0] === r)[1].toLowerCase()}. Amanhã eu levo isso em conta.</div>;
  return (
    <div className={card + ' p-4 space-y-3'}>
      <div><p className="text-zinc-100 font-medium">Como foi o dia?</p><p className="text-sm text-zinc-500">Um toque. Eu uso isso para calibrar amanhã, além do sono.</p></div>
      <div className="grid grid-cols-3 gap-2">{opts.map(([k, l, ic]) => <button key={k} onClick={() => act.review(k)} className="min-h-[64px] rounded-xl border border-white/10 hover:bg-white/[0.05] text-sm text-zinc-200 flex flex-col items-center justify-center gap-1.5"><Ic n={ic} className="w-5 h-5 text-zinc-400" />{l}</button>)}</div>
    </div>
  );
}
function WindDown({ s, now, act }) {
  const ok = s.today.wind || {}, setOk = (o) => act.windTick(o);
  const bedT = nightMin(s.sleepGoal.bed);
  const tomorrow = s.plan.items.filter((it) => it.day === s.day + 1 && it.status === 'pendente' && refOf(s, it)).sort((a, b) => a.start - b.start);
  const work = fixedOn(s, s.day + 1).find((f) => f.type !== 'compromisso');
  const items = ['Telas mais escuras, nada de tarefa pesada agora', work ? `Separar o que precisa para amanhã (${work.title.toLowerCase()} às ${work.start})` : 'Deixar o quarto pronto para dormir', `Deitar até ${s.sleepGoal.bed}`];
  return (
    <div className={card + ' p-5 space-y-3 border-[#9f8fff]/25'}>
      <div className="flex items-center gap-3"><Ic n="Moon" className="w-5 h-5 text-[#9f8fff]" /><p className="text-zinc-100 font-medium flex-1">Hora de desacelerar</p><span className="text-sm text-zinc-500">{bedT - now > 0 ? `faltam ${Math.round(bedT - now)} min` : 'já passou da hora'}</span></div>
      <div className="space-y-1.5">{items.map((t, i) => <button key={i} onClick={() => setOk({ ...ok, [i]: !ok[i] })} className={`w-full flex items-center gap-3 text-left text-[15px] min-h-[44px] px-2 -mx-2 rounded-xl press transition-colors ${ok[i] ? 'bg-[#2ee8c4]/[0.06]' : 'hover:bg-white/[0.04]'}`}>
        <span className={`chk w-5 h-5 rounded-md border grid place-items-center shrink-0 transition-colors ${ok[i] ? 'bg-[#2ee8c4] border-[#2ee8c4] text-zinc-950 pop' : 'border-zinc-600'}`}>{ok[i] && <Ic n="Check" className="w-3 h-3" />}</span><span className={ok[i] ? 'text-zinc-500 line-through' : 'text-zinc-200'}>{t}</span></button>)}</div>
      {tomorrow.length > 0 && <p className="text-sm text-zinc-500">Amanhã: {tomorrow.length} itens, o primeiro às {hhmm(tomorrow[0].start)} ({itemTitle(s, tomorrow[0]).toLowerCase()}). Já está tudo planejado.</p>}
    </div>
  );
}
const fmtL = (ml) => `${(Math.round(ml / 50) * 50 / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} L`;
const wMl = (s) => (s.waterMl || {})[s.day] || 0, gMl = (s) => (s.careCfg && s.careCfg.waterMl) || 0;
function WaterBar({ s, act, big }) {
  const w = wMl(s), g = gMl(s), pct = g ? clamp((w / g) * 100, 0, 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between"><span className={`${big ? 'text-lg' : 'text-sm'} text-zinc-100 tabular-nums`}>{fmtL(w)} <span className="text-zinc-500 text-sm">de {fmtL(g)}</span></span>{w >= g && g > 0 && <span className="text-xs text-[#2ee8c4]">meta batida</span>}</div>
      <div className={`relative ${big ? 'h-4' : 'h-3'} rounded-full bg-white/[0.06] overflow-hidden`}><div className="h-full rounded-full bar-anim" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#2ee8c4,#7fd8ff)' }} />
        {Array.from({ length: Math.max(0, Math.round(g / 500) - 1) }, (_, i) => <span key={i} className="absolute top-0 bottom-0 w-px bg-black/30" style={{ left: `${((i + 1) * 500 / g) * 100}%` }} />)}</div>
      <div className="flex gap-1.5">
        <button className="h-9 px-3 rounded-lg border border-white/10 text-zinc-400 text-sm press" aria-label="Tirar 250 ml" onClick={() => act.water(-250)}>−</button>
        <button className="h-9 flex-1 rounded-lg bg-[#2ee8c4]/15 text-[#2ee8c4] text-sm press" onClick={() => act.water(250)}>+ 250 ml</button>
        <button className="h-9 flex-1 rounded-lg bg-[#2ee8c4]/15 text-[#2ee8c4] text-sm press" onClick={() => act.water(500)}>+ 500 ml</button>
      </div>
    </div>
  );
}
function CareCard({ s, act, setTab, bare }) {
  const now = nowRef(s), taken = s.medsTaken[s.day] || {};
  return (
    <div className={(bare ? '' : card + ' p-4 ') + 'space-y-3'}>
      <div className="flex items-center justify-between"><p className="text-sm text-zinc-300">Cuidados de hoje</p><button className={btnL + ' text-xs'} onClick={() => setTab('cadastro', 'sono')}>ajustar</button></div>
      {gMl(s) > 0 && <div className="flex items-start gap-2"><Ic n="GlassWater" className="w-4 h-4 text-[#2ee8c4] mt-0.5" /><div className="flex-1"><WaterBar s={s} act={act} /></div></div>}
      {s.careCfg.meds.map((m) => { const late = !taken[m.id] && now > toMin(m.time) + 15; return (
        <button key={m.id} onClick={() => act.med(m.id)} className="w-full flex items-center gap-3 text-left text-sm min-h-[36px]">
          <span className={`w-5 h-5 rounded-md border grid place-items-center shrink-0 ${taken[m.id] ? 'bg-[#2ee8c4] border-[#2ee8c4] text-zinc-950' : late ? 'border-[#ffc24d]' : 'border-zinc-600'}`}>{taken[m.id] && <Ic n="Check" className="w-3 h-3" />}</span>
          <span className={taken[m.id] ? 'text-zinc-500 line-through' : 'text-zinc-200'}>{m.name}</span><span className={`ml-auto tabular-nums ${late ? 'text-[#ffc24d]' : 'text-zinc-500'}`}>{m.time}</span></button>); })}
      {!s.careCfg.meds.length && <p className="text-xs text-zinc-500 hint">Remédios com horário entram aqui, se você cadastrar.</p>}
      {s.careCfg.meds.filter((m) => m.stock != null && m.stock / (m.dose || 1) <= 7).map((m) => <p key={m.id} className="text-xs text-[#ffc24d]">{m.name}: restam {m.stock} ({Math.floor(m.stock / (m.dose || 1))} dias)</p>)}
      <div className="flex flex-wrap gap-1.5 pt-1">{(s.careCfg.meals || []).map((m) => { const ok = (s.mealsDone[s.day] || {})[m.id], late = !ok && now > toMin(m.time) + 30; return (
        <button key={m.id} onClick={() => act.meal(m.id)} aria-pressed={!!ok} className={`h-8 px-2.5 rounded-lg text-xs flex items-center gap-1.5 press ${ok ? 'bg-[#ff6fb5]/15 text-[#ffb3d9]' : late ? 'border border-[#ff6fb5]/40 text-zinc-200' : 'bg-white/[0.05] text-zinc-400'}`}>
          <Ic n={ok ? 'Check' : 'Utensils'} className="w-3 h-3" />{m.name}<span className="opacity-60 tabular-nums">{m.time}</span></button>); })}</div>
    </div>
  );
}
function FocusMode({ s, it, act, onClose }) {
  const r = refOf(s, it);
  const [mins, setMins] = useState(25), [left, setLeft] = useState(null), [run, setRun] = useState(false), [phase, setPhase] = useState('foco');
  const endAt = useRef(0);
  useEffect(() => { if (!run) return; const tick = () => setLeft(Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000))); tick(); const id = setInterval(tick, 500); const vis = () => tick(); document.addEventListener('visibilitychange', vis); return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); }; }, [run]);
  useEffect(() => { if (left === 0 && run) { setRun(false); chime(phase === 'foco' ? 'fim' : 'volta', s); setPhase(phase === 'foco' ? 'pausa?' : 'volta'); } }, [left]);
  const toggleRun = () => { if (run) { setRun(false); } else { endAt.current = Date.now() + (left || 0) * 1000; setRun(true); } };
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);
  const start = (m, ph) => { setMins(m); endAt.current = Date.now() + m * 60000; setLeft(m * 60); setRun(true); setPhase(ph); };
  return (
    <div className="fixed inset-0 z-[60] bg-[#07080a] flex flex-col items-center justify-center p-6 text-center" role="dialog" aria-modal="true" aria-label="Modo foco">
      <button className="absolute top-4 right-4 h-10 px-3 rounded-lg text-zinc-400 hover:bg-white/5 flex items-center gap-2" onClick={onClose}><Ic n="X" />Sair do foco</button>
      {phase === 'pausa?' ? (
        <div className="space-y-5 max-w-md">
          <p className="text-[#2ee8c4]">Bloco de foco feito.</p>
          <h2 className="text-3xl font-semibold text-zinc-50">Pausa de 5 minutos?</h2>
          <p className="text-zinc-400">Água, alongar, olhar pela janela. Longe da tela.</p>
          <div className="flex flex-wrap gap-2 justify-center"><button className={btnP} onClick={() => start(5, 'pausa')}><Ic n="Coffee" />Começar pausa</button><button className={btnG} onClick={() => start(10, 'foco')}>Mais 10 min de foco</button><button className={btnG} onClick={() => { act.done(it); onClose(); }}><Ic n="Check" />Terminei</button></div>
        </div>
      ) : (
        <div className="space-y-6 w-full max-w-lg">
          <p className="text-sm text-zinc-500">{phase === 'pausa' ? 'Pausa' : phase === 'volta' ? 'Pausa acabou' : 'Foco em uma coisa só'}</p>
          <h2 className="text-3xl sm:text-4xl font-semibold text-zinc-50 tracking-tight">{r ? r.title : ''}</h2>
          {it.ver === 'min' && r && <p className="text-zinc-400">Só isto: {r.minText.toLowerCase()}.</p>}
          <div className="relative mx-auto w-[min(78vw,340px)] aspect-square grid place-items-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="2.5" />
              <circle cx="50" cy="50" r="46" fill="none" stroke={phase === 'pausa' ? '#2ee8c4' : 'url(#fg)'} strokeWidth="2.5" strokeLinecap="round" pathLength="100" strokeDasharray="100" style={{ strokeDashoffset: left == null ? 0 : 100 - (left / (mins * 60)) * 100, transition: 'stroke-dashoffset 1s linear' }} />
              <defs><linearGradient id="fg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9f8fff" /><stop offset="1" stopColor="#2ee8c4" /></linearGradient></defs>
            </svg>
            <p className={`font-mono text-6xl sm:text-7xl text-zinc-100 tabular-nums ${run ? 'breathe' : ''}`}>{mmss(left == null ? mins * 60 : left)}</p>
          </div>
          {left == null || phase === 'volta' ? (
            <div className="space-y-3">
              <div className="flex gap-2 justify-center">{[10, 15, 25].map((m) => <button key={m} aria-pressed={mins === m} onClick={() => setMins(m)} className={`h-10 px-4 rounded-full text-sm ${mins === m ? 'bg-zinc-100 text-zinc-900' : 'bg-white/[0.06] text-zinc-300'}`}>{m} min</button>)}</div>
              <button className={btnP + ' min-w-[200px]'} onClick={() => start(mins, 'foco')}><Ic n="Play" />{phase === 'volta' ? 'Voltar ao foco' : 'Começar'}</button>
            </div>
          ) : (
            <div className="flex gap-2 justify-center">
              <button className={btnG} onClick={toggleRun}><Ic n={run ? 'Pause' : 'Play'} />{run ? 'Pausar' : 'Retomar'}</button>
              {phase === 'foco' && <button className={btnP} onClick={() => { act.done(it); onClose(); }}><Ic n="Check" />Feito</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function WeeklyReview({ s, act, onClose }) {
  const past = s.plan.items.filter((it) => it.day <= s.day && it.status !== 'backlog' && it.status !== 'removido' && !areaOf(s, it) && refOf(s, it));
  const done = past.filter((it) => it.status === 'feito'), mins = done.filter((it) => it.ver === 'min'), miss = past.filter((it) => it.status === 'pendente' && it.day < s.day);
  const L = learnOf(s), rv = Object.entries(s.reviews).filter(([d]) => +d >= s.plan.days[0] && +d <= s.day).map(([, r]) => r);
  return (
    <div className={card + ' p-5 space-y-4 border-[#9f8fff]/30'}>
      <div className="flex items-start gap-3"><Pet mood="calmo" size={36} /><div className="flex-1"><p className="text-zinc-100 font-medium">Revisão da semana</p><p className="text-sm text-zinc-500">Dois minutos para fechar a semana sem culpa.</p></div>
        <button className="w-9 h-9 grid place-items-center rounded-lg text-zinc-500 hover:bg-white/5" aria-label="Fechar revisão" onClick={onClose}><Ic n="X" /></button></div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[['Feitos', done.length - mins.length, '#2ee8c4'], ['No mínimo', mins.length, '#ffc24d'], ['Escorregaram', miss.length, '#9a9cb0']].map(([l, n, c]) => <div key={l} className="rounded-xl bg-zinc-950 border border-white/[0.06] py-3"><p className="text-2xl font-semibold tabular-nums" style={{ color: c }}>{n}</p><p className="text-xs text-zinc-500">{l}</p></div>)}
      </div>
      {rv.length > 0 && <p className="text-sm text-zinc-400">Seus dias: {rv.filter((r) => r === 'rendeu').length} renderam, {rv.filter((r) => r === 'minimo').length} no mínimo, {rv.filter((r) => r === 'dificil').length} difíceis.</p>}
      {miss.length > 0 && <div><p className="text-sm text-zinc-300 mb-1">O que escorregou (tudo bem):</p><ul className="text-sm text-zinc-500 space-y-0.5">{miss.slice(0, 6).map((it) => <li key={it.id}>{DIAS[weekdayOf(it.day)]} · {itemTitle(s, it)}</li>)}</ul></div>}
      <div><p className="text-sm text-zinc-300 mb-1">O que eu aprendi sobre você:</p><ul className="text-sm text-zinc-400 space-y-0.5">{learnLines(s, L).map((l, i) => <li key={i}>• {l}</li>)}</ul></div>
      <div className="flex flex-wrap gap-2"><button className={btnP} onClick={() => { act.distribuir(); onClose(); }}><Ic n="Sparkles" />Replanejar o resto da semana</button><button className={btnG} onClick={onClose}>Fechar</button></div>
    </div>
  );
}
function learnLines(s, L) {
  const out = [], W = (ws) => ws.map((w) => DIAS_LONGO[w]).join(' e ');
  if (L.avoid.length) out.push(`Estudo pesado costuma virar mínimo na ${W(L.avoid)}: lá eu coloco coisas mais leves.`);
  if (L.tough.length) out.push(`A ${W(L.tough)} costuma ser um dia difícil para você.`);
  if (L.good.length) out.push(`Você rende melhor por volta de ${L.good.map((h) => `${h}h`).join(', ')}: prefiro esses horários para o que pede foco.`);
  if (L.bad.length) out.push(`Por volta de ${L.bad.map((h) => `${h}h`).join(', ')} quase nada pesado sai: evito esses horários.`);
  const h = s.history.filter((x) => x.sleep != null), goal = sleepHours(s.sleepGoal.bed, s.sleepGoal.wake);
  const short = h.filter((x) => x.sleep < goal - 1).map((x) => x.day), badAfter = short.filter((d) => ['minimo', 'dificil'].includes(s.reviews[d])).length;
  if (short.length >= 2) out.push(`Em ${short.length} noites curtas recentes, ${badAfter} viraram dia difícil ou mínimo.`);
  if (!out.length) out.push('Ainda estou juntando dados. Com uma ou duas semanas de uso eu começo a ver padrões.');
  return out;
}

/* ===================== PROGRESSO ===================== */
function Bars({ data, max, goal, color, label }) {
  return (
    <div>
      <div className="relative h-40 flex items-end gap-1.5 border-b border-white/[0.08]">
        {goal != null && <div className="absolute inset-x-0 border-t border-dashed border-zinc-500/60" style={{ bottom: `${(goal / max) * 100}%` }}><span className="absolute right-0 -top-5 text-[11px] text-zinc-500 bg-[#0b0c0f] px-1">meta {label(goal)}</span></div>}
        {data.map((d) => <div key={d.k} className="flex-1 h-full flex flex-col justify-end items-center group" title={`${d.t}: ${label(d.v)}`}>
          <span className="text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 tabular-nums mb-0.5">{label(d.v)}</span>
          <div className="w-full max-w-[26px] rounded-t-md bar-anim" style={{ height: `${clamp((d.v / max) * 100, 1, 100)}%`, background: typeof color === 'function' ? color(d.v) : color, opacity: d.v ? (d.sample ? 0.55 : 1) : 0.2 }} /></div>)}
      </div>
      <div className="flex gap-1.5 mt-1">{data.map((d) => <span key={d.k} className="flex-1 text-center text-[10px] text-zinc-500">{d.x}</span>)}</div>
    </div>
  );
}
function Progresso({ s, act }) {
  const h = [...s.history].sort((a, b) => a.day - b.day).slice(-14), goal = sleepHours(s.sleepGoal.bed, s.sleepGoal.wake);
  const L = learnOf(s), out = s.outcomes || [];
  const wk = SEMANA.map((w) => { const xs = out.filter((o) => o.wd === w); return { w, feito: xs.filter((o) => o.result === 'feito').length, min: xs.filter((o) => o.result === 'min').length, nao: xs.filter((o) => o.result === 'nao' || o.result === 'travou').length }; });
  const mx = Math.max(1, ...wk.map((x) => x.feito + x.min + x.nao));
  const last14 = Array.from({ length: 14 }, (_, i) => s.day - 13 + i);
  const RC = { rendeu: '#2ee8c4', minimo: '#ffc24d', dificil: '#ff7f5e' };
  return (
    <div className="space-y-4 max-w-5xl">
      <LumeLevelCard s={s} />
      <BadgesCard s={s} />
      <MoodStrip s={s} />
      <div className={card + ' p-5 space-y-2 border-[#9f8fff]/25'}>
        <div className="flex items-center gap-3"><Pet mood="alerta" size={34} /><p className="text-zinc-100 font-medium">O que o Lume aprendeu</p></div>
        <ul className="text-[15px] text-zinc-300 space-y-1">{learnLines(s, L).map((l, i) => <li key={i}>• {l}</li>)}</ul>
        <p className="text-xs text-zinc-500">Isso já entra na distribuição da semana. Os dados de antes do seu primeiro uso são exemplo.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={card + ' p-5 space-y-3'}><p className="text-zinc-100 font-medium">Sono, noite a noite</p>
          <Bars data={h.map((x) => ({ k: x.day, v: x.sleep, x: DIAS[weekdayOf(x.day)][0], t: fmtCurto(x.day), sample: x.sample }))} max={10} goal={goal} label={fmtH} color={(v) => (v >= goal - 0.25 ? '#2ee8c4' : v >= goal - 1 ? '#9f8fff' : '#ffc24d')} /></div>
        <div className={card + ' p-5 space-y-3'}><p className="text-zinc-100 font-medium">Tempo de trajeto por dia</p>
          <Bars data={h.map((x) => ({ k: x.day, v: x.trip || 0, x: DIAS[weekdayOf(x.day)][0], t: fmtCurto(x.day), sample: x.sample }))} max={Math.max(60, ...h.map((x) => x.trip || 0)) * 1.1} label={(v) => `${Math.round(v)} min`} color="#9f8fff" /></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={card + ' p-5 space-y-3'}><p className="text-zinc-100 font-medium">Tarefas pesadas por dia da semana</p>
          <div className="space-y-2">{wk.map((x) => <div key={x.w} className="flex items-center gap-3 text-sm"><span className="w-9 text-zinc-500">{DIAS[x.w]}</span>
            <div className="flex-1 flex h-3.5 rounded-full overflow-hidden bg-white/[0.04]">{[['feito', '#2ee8c4'], ['min', '#ffc24d'], ['nao', '#52525b']].map(([k, c]) => x[k] ? <div key={k} style={{ width: `${(x[k] / mx) * 100}%`, background: c }} title={`${x[k]} ${k === 'feito' ? 'completas' : k === 'min' ? 'no mínimo' : 'não feitas'}`} /> : null)}</div>
            <span className="w-14 text-right text-zinc-500 tabular-nums">{x.feito}/{x.feito + x.min + x.nao}</span></div>)}</div>
          <p className="text-xs text-zinc-500 flex gap-4"><span><i className="inline-block w-2.5 h-2.5 rounded-sm bg-[#2ee8c4] mr-1" />completa</span><span><i className="inline-block w-2.5 h-2.5 rounded-sm bg-[#ffc24d] mr-1" />mínimo</span><span><i className="inline-block w-2.5 h-2.5 rounded-sm bg-zinc-600 mr-1" />não feita</span></p></div>
        <div className={card + ' p-5 space-y-3'}><p className="text-zinc-100 font-medium">Como foram os dias</p>
          <div className="grid grid-cols-7 gap-1.5">{last14.map((d) => { const r = s.reviews[d]; return <div key={d} className="flex flex-col items-center gap-1" title={`${fmtCurto(d)}${r ? ': ' + r : ''}`}><span className="w-full aspect-square max-w-[34px] rounded-lg" style={{ background: r ? RC[r] : 'rgba(255,255,255,.05)', opacity: r ? 0.85 : 1 }} /><span className={`text-[10px] ${d === s.day ? 'text-zinc-200' : 'text-zinc-500'}`}>{DIAS[weekdayOf(d)][0]}</span></div>; })}</div>
          <p className="text-xs text-zinc-500 flex gap-4"><span style={{ color: RC.rendeu }}>rendeu</span><span style={{ color: RC.minimo }}>mínimo</span><span style={{ color: RC.dificil }}>difícil</span><span>vazio = sem avaliação</span></p></div>
      </div>
      <PrevistoReal s={s} act={act} />
    </div>
  );
}

/* ===================== PROVAS E PROJETOS ===================== */
function ExamForm({ f, setF, onSave, onCancel }) {
  return (
    <div className="grid grid-cols-2 gap-3 p-4 pt-0">
      <div className="col-span-2"><label className={lbl}>Prova ou entrega</label><input className={inp} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ex.: Prova de Cálculo" /></div>
      <div><label className={lbl}>Data</label><input type="date" className={inp} value={isoOf(f.date)} onChange={(e) => e.target.value && setF({ ...f, date: dayFromIso(e.target.value) })} /></div>
      <div><label className={lbl}>Horas de estudo no total</label><input type="number" min="1" step="0.5" className={inp} value={f.hours} onChange={(e) => setF({ ...f, hours: Math.max(0.5, Number(e.target.value) || 1) })} /></div>
      <p className="col-span-2 text-sm text-zinc-500">Vira {Math.max(1, Math.ceil(f.hours * 60 / 45))} revisões de 45 min, cada vez mais próximas da data, com um simulado na véspera.</p>
      <div className="col-span-2 flex gap-2"><button type="button" className={btnP} onClick={() => f.title.trim() && onSave(f)}>Salvar</button><button type="button" className={btnG} onClick={onCancel}>Cancelar</button></div>
    </div>
  );
}
function ProjectForm({ f, setF, onSave, onCancel }) {
  return (
    <div className="grid grid-cols-2 gap-3 p-4 pt-0">
      <div className="col-span-2"><label className={lbl}>Meta grande</label><input className={inp} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ex.: Atualizar o portfólio" /></div>
      <div><label className={lbl}>Tempo total (h)</label><input type="number" min="0.5" step="0.5" className={inp} value={f.totalMin / 60} onChange={(e) => setF({ ...f, totalMin: Math.round((Number(e.target.value) || 0.5) * 60) })} /></div>
      <div><p className={lbl}>Tamanho de cada passo</p><DurField label="Tamanho de cada passo" min={10} value={f.blockMin} onChange={(v) => setF({ ...f, blockMin: v })} /></div>
      <div><label className={lbl}>Carga mental</label><Seg value={f.load} onChange={(v) => setF({ ...f, load: v })} options={[['pesada', 'Pesada'], ['media', 'Média'], ['leve', 'Leve']]} label="Carga" /></div>
      <div><label className={lbl}>Prazo (opcional)</label><input type="date" className={inp} value={f.due != null ? isoOf(f.due) : ''} onChange={(e) => setF({ ...f, due: e.target.value ? dayFromIso(e.target.value) : null })} /></div>
      <p className="col-span-2 text-sm text-zinc-500">Vira {Math.ceil((f.totalMin - (f.doneMin || 0)) / f.blockMin)} passos de {f.blockMin} min, no máximo um por dia.</p>
      <div className="col-span-2 flex gap-2"><button type="button" className={btnP} onClick={() => f.title.trim() && onSave(f)}>Salvar</button><button type="button" className={btnG} onClick={onCancel}>Cancelar</button></div>
    </div>
  );
}
/* ===================== iCalendar (.ics) ===================== */
// Lê VEVENTs (SUMMARY, DTSTART, DTEND, RRULE, UID). Horários com Z viram hora local; com TZID são convertidos do fuso.
function tzOffsetMin(utcMs, tz) {
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
    return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - utcMs) / 60000;
  } catch (e) { return null; }
}
function icsDate(v, params) {
  const m = String(v || '').match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/); if (!m) return null;
  const [, Y, Mo, D, hh, mm, ss, z] = m;
  if (!hh || /VALUE=DATE(?!-)/.test(params || '')) return { allDay: true, date: new Date(+Y, +Mo - 1, +D) };
  if (z) return { date: new Date(Date.UTC(+Y, +Mo - 1, +D, +hh, +mm, +(ss || 0))) };
  const tz = ((params || '').match(/TZID=([^;:]+)/) || [])[1];
  if (tz) { const guess = Date.UTC(+Y, +Mo - 1, +D, +hh, +mm, +(ss || 0)); const o1 = tzOffsetMin(guess, tz); if (o1 != null) { const o2 = tzOffsetMin(guess - o1 * 60000, tz); return { date: new Date(guess - (o2 != null ? o2 : o1) * 60000) }; } }
  return { date: new Date(+Y, +Mo - 1, +D, +hh, +mm, +(ss || 0)) };
}
function parseIcs(txt) {
  const lines = String(txt || '').replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const evs = []; let cur = null;
  const unesc = (v) => v.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim();
  for (const ln of lines) {
    if (ln === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (ln === 'END:VEVENT') { if (cur) evs.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = ln.indexOf(':'); if (i < 0) continue;
    const head = ln.slice(0, i), val = ln.slice(i + 1), [name, ...ps] = head.split(';'), params = ps.join(';');
    const N = name.toUpperCase();
    if (N === 'SUMMARY') cur.title = unesc(val);
    else if (N === 'UID') cur.uid = val.trim();
    else if (N === 'DTSTART') cur.start = icsDate(val.trim(), params);
    else if (N === 'DTEND') cur.end = icsDate(val.trim(), params);
    else if (N === 'DURATION') { const d = val.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/); if (d) cur.durMin = (+(d[1] || 0)) * 1440 + (+(d[2] || 0)) * 60 + (+(d[3] || 0)); }
    else if (N === 'RRULE') cur.rrule = Object.fromEntries(val.split(';').map((kv) => kv.split('=')).filter((kv) => kv.length === 2).map(([k, v]) => [k.toUpperCase(), v]));
    else if (N === 'STATUS') cur.status = val.trim().toUpperCase();
    else if (N === 'RECURRENCE-ID') cur.recurrenceId = true;
  }
  return evs;
}
// Validação antes do parse: tamanho, extensão/tipo e cabeçalho de iCalendar.
const ICS_MAX = 2 * 1024 * 1024;
async function readIcsFile(fl) {
  if (!fl) throw new Error('Nenhum arquivo escolhido.');
  if (fl.size > ICS_MAX) throw new Error('Arquivo grande demais (máx. 2 MB). Exporte só o calendário que você quer.');
  if (!/\.ics$/i.test(fl.name || '') && !/text\/calendar/i.test(fl.type || '')) throw new Error('Esse arquivo não é um .ics de calendário.');
  const txt = (await fl.text()).replace(/^\uFEFF/, '');
  if (!/^\s*BEGIN:VCALENDAR/i.test(txt) || !/END:VCALENDAR\s*$/i.test(txt)) throw new Error('O arquivo não parece um calendário .ics válido.');
  if ((txt.match(/BEGIN:VEVENT/g) || []).length > 5000) throw new Error('Esse calendário tem eventos demais para importar de uma vez.');
  return txt;
}
const dayOfDate = (d) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / DAYMS);
const minOfDate = (d) => d.getHours() * 60 + d.getMinutes();
// Separa em: horários semanais fixos (RRULE semanal/diária) e compromissos com data (eventos únicos no futuro).
function icsToQuestDay(txt, today) {
  const BY = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 }, out = { weekly: [], once: [], skipped: { allDay: 0, past: 0, other: 0 }, total: 0 };
  for (const e of parseIcs(txt)) {
    out.total++;
    if (!e.start || e.status === 'CANCELLED' || e.recurrenceId) { out.skipped.other++; continue; }
    if (e.start.allDay) { out.skipped.allDay++; continue; }
    const st = e.start.date, en = e.end && !e.end.allDay ? e.end.date : new Date(st.getTime() + (e.durMin || 60) * 60000);
    let a = minOfDate(st), b = minOfDate(en); if (en - st >= DAYMS || b <= a) b = Math.min(1439, a + Math.max(15, Math.round((en - st) / 60000) || 60));
    const title = (e.title || 'Compromisso').slice(0, 80), startDay = dayOfDate(st);
    const rr = e.rrule;
    if (rr && (rr.FREQ === 'WEEKLY' || rr.FREQ === 'DAILY') && (!rr.INTERVAL || rr.INTERVAL === '1')) {
      let until = null;
      if (rr.UNTIL) { const u = icsDate(rr.UNTIL, ''); if (u) until = dayOfDate(u.date); }
      if (rr.COUNT && !until) until = startDay + (rr.FREQ === 'DAILY' ? +rr.COUNT - 1 : Math.ceil(+rr.COUNT / Math.max(1, (rr.BYDAY || 'x').split(',').length)) * 7);
      if (until != null && until < today) { out.skipped.past++; continue; }
      const days = rr.FREQ === 'DAILY' ? [0, 1, 2, 3, 4, 5, 6] : rr.BYDAY ? [...new Set(rr.BYDAY.split(',').map((x) => BY[x.slice(-2)]).filter((x) => x != null))].sort() : [st.getDay()];
      if (!days.length) { out.skipped.other++; continue; }
      out.weekly.push({ id: uid(), ics: e.uid || `${title}-${a}-${days.join('')}`, type: 'compromisso', title, days, start: hhmm(a), end: hhmm(b), ...(startDay > today ? { from: startDay } : {}), ...(until != null ? { until } : {}) });
    } else if (rr) out.skipped.other++;
    else if (startDay < today) out.skipped.past++;
    else out.once.push({ id: `ics:${e.uid || title}:${st.getTime()}`, title, day: startDay, start: a, end: b });
  }
  return out;
}

/* ===================== validação dos blocos fixos ===================== */
function FixedCheck({ s, day, f, act, onClose, inline }) {
  const now = nowRef(s), today = day === s.day;
  const past = day < s.day || (today && now >= f.plan.e), future = day > s.day || (today && now < f.plan.s);
  const L = f.log && !f.log.auto ? f.log : null;
  const [mode, setMode] = useState(L ? (L.st === 'nao' ? 'nao' : L.start ? 'outro' : 'ok') : null);
  const trip = f.type === 'trajeto', work = f.type === 'trabalho';
  // hoje: antes de começar tudo é previsão; depois de começar, chegada só até agora e saída só até agora se já saiu
  const before = today && now < f.plan.s;
  const [left, setLeft] = useState(L ? !L.aindaLa || (today && now >= toMin(L.end)) : !today || now >= f.plan.e);
  const clampT = (t, lo, hi) => hhmm(Math.max(lo, Math.min(hi, t)));
  const [st, setSt] = useState(L && L.start ? L.start : today && !before ? clampT(f.plan.s, 0, now) : before ? clampT(f.plan.s, now, 1439) : f.plan.start);
  const [en, setEn] = useState(L && L.end ? L.end : today && !before ? (left ? clampT(f.plan.e, 0, now) : clampT(f.plan.e, now, 1439)) : f.plan.end);
  const [trips, setTrips] = useState(true), [moveT, setMoveT] = useState(true);
  const hasTrips = (work || f.type === 'compromisso') && fixedPlan(s, day).some((t) => t.type === 'trajeto' && (t.of ? t.of === f.id : work));
  const stMin = before ? now : null, stMax = today && !before ? now : null;
  const enMin = Math.max(toMin(st) + 5, today && (!left || before) ? now : 0), enMax = today && left && !before ? now : null;
  const startedOrAfter = today && !before;
  const W = before ? (trip ? ['Vou sair às', 'Devo chegar às'] : ['Vou chegar às', 'Devo sair às'])
    : startedOrAfter && !left ? (trip ? ['Saí às', 'Devo chegar às'] : ['Cheguei às', 'Devo sair às'])
    : trip ? ['Saí às', 'Cheguei às'] : ['Cheguei às', 'Saí às'];
  const lNao = trip ? (future ? 'Não vai ter' : 'Não teve') : future ? 'Não vou' : 'Não fui';
  const lOk = future ? 'Vai ser como sempre' : today && !past ? 'Até agora, no horário' : 'Foi no horário';
  const lOutro = future ? 'Vai ser em outro horário' : 'Foi em outro horário';
  const bad = mode !== 'outro' ? null
    : stMax != null && toMin(st) > stMax ? `${W[0]} precisa ser até agora (${hhmm(now)}).`
    : stMin != null && toMin(st) < stMin ? `Já passou de ${hhmm(now)}: escolha um horário a partir de agora.`
    : toMin(en) <= toMin(st) ? `${W[1]} precisa ser depois de ${W[0].toLowerCase()}.`
    : enMax != null && toMin(en) > enMax ? `Você ainda não saiu? Marque “ainda estou lá” e coloque uma previsão.`
    : today && (!left || before) && toMin(en) < now ? `A previsão precisa ser depois de agora (${hhmm(now)}).` : null;
  const save = () => {
    if (mode === 'ok') act.logFixed(day, f.id, { st: 'foi' });
    else if (mode === 'nao') act.logFixed(day, f.id, { st: 'nao' }, { trips: hasTrips && trips });
    else if (mode === 'outro') { if (bad) return; act.logFixed(day, f.id, { st: 'foi', start: st, end: en, ...(startedOrAfter && !left ? { aindaLa: true } : {}) }, { moveTrips: hasTrips && moveT }); }
    onClose && onClose();
  };
  const setLeftFix = (v) => { setLeft(v); if (v && toMin(en) > now) setEn(hhmm(Math.max(toMin(st) + 5, now))); if (!v && toMin(en) < now) setEn(hhmm(Math.max(now, f.plan.e))); };
  const chip = (k, l, ic) => <button key={k} aria-pressed={mode === k} onClick={() => setMode(k)} className={`min-h-[44px] px-3.5 rounded-xl border text-sm flex items-center gap-2 ${mode === k ? 'border-[#9f8fff] bg-[#9f8fff]/10 text-zinc-50' : 'border-white/10 text-zinc-300 hover:bg-white/[0.04]'}`}><Ic n={ic} className="w-4 h-4" />{l}</button>;
  return (
    <div className={(inline ? '' : card + ' p-4 border-[#9f8fff]/30 ') + 'space-y-3'}>
      {!inline && <div className="flex items-start gap-3"><div className="flex-1">
        <p className="text-zinc-50 font-medium">{f.title}</p>
        <p className="text-sm text-zinc-400 capitalize">{fmtDia(day)} · previsto {f.plan.start}–{f.plan.end}{f.log && f.log.auto ? ' · horário real vindo do check-in' : ''}</p></div>
        <button className="p-2 rounded-lg text-zinc-500 hover:bg-white/5" aria-label="Fechar" onClick={onClose}><Ic n="X" /></button></div>}
      {!inline && <p className="text-sm text-zinc-500">{past ? 'Confirme como foi de verdade. O resto da semana se ajusta ao tempo que sobrou ou faltou.' : future ? 'Se já sabe que vai ser diferente (folga, feriado, saída mais cedo), avise agora e eu replanejo.' : 'Está acontecendo agora. Se mudou, me conte.'}</p>}
      <div className="flex flex-wrap gap-2">{chip('ok', lOk, 'Check')}{chip('outro', lOutro, 'Clock')}{chip('nao', lNao, 'X')}</div>
      {mode === 'outro' && <div className="grid grid-cols-2 gap-3 max-w-sm">
        {startedOrAfter && <div className="col-span-2"><Seg value={left ? 'sim' : 'nao'} onChange={(v) => setLeftFix(v === 'sim')} label="Já saiu?" options={trip ? [['nao', 'Ainda no caminho'], ['sim', 'Já cheguei']] : [['nao', 'Ainda estou lá'], ['sim', 'Já saí']]} /></div>}
        <div><label className={lbl} htmlFor={`fxs-${f.id}`}>{W[0]}</label><TimeField id={`fxs-${f.id}`} label={W[0]} value={st} min={stMin} max={stMax} onChange={(v) => { setSt(v); if (toMin(en) <= toMin(v)) setEn(hhmm(Math.min(enMax == null ? 1439 : enMax, toMin(v) + 30))); }} /></div>
        <div><label className={lbl} htmlFor={`fxe-${f.id}`}>{W[1]}</label><TimeField id={`fxe-${f.id}`} label={W[1]} value={en} min={enMin} max={enMax} onChange={setEn} /></div>
        {bad && <p className="col-span-2 text-sm text-[#ffc24d]">{bad}</p>}
        {!bad && startedOrAfter && !left && <p className="col-span-2 text-sm text-zinc-500">A saída é uma previsão: quando sair de verdade, confirme aqui.</p>}
        {!bad && (() => { const d = (toMin(en) - toMin(st)) - (f.plan.e - f.plan.s); return d ? <p className="col-span-2 text-sm text-zinc-400">{d > 0 ? `${fmtH(d / 60)} a mais que o previsto: tiro coisas do dia se precisar.` : `${fmtH(-d / 60)} livres a mais: posso usar para adiantar algo leve.`}</p> : null; })()}
        {hasTrips && <label className="col-span-2 flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={moveT} onChange={(e) => setMoveT(e.target.checked)} className="accent-[#9f8fff] w-4 h-4" />Mover os trajetos de ida e volta junto</label>}
      </div>}
      {mode === 'nao' && hasTrips && <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" checked={trips} onChange={(e) => setTrips(e.target.checked)} className="accent-[#9f8fff] w-4 h-4" />Os trajetos desse dia também não {future ? 'vão acontecer' : 'aconteceram'}</label>}
      <div className="flex flex-wrap gap-2">
        <button className={btnP} disabled={!mode || !!bad} onClick={save}>Salvar</button>
        {L && <button className={btnL} onClick={() => { act.logFixed(day, f.id, null, { trips: hasTrips && L.st === 'nao' }); onClose && onClose(); }}><Ic n="RotateCcw" className="w-3.5 h-3.5" />Voltar ao previsto</button>}
      </div>
    </div>
  );
}
function fixedBadge(s, day, f) {
  const L = f.log;
  if (L && L.ferias) return { t: 'em pausa · ' + L.ferias.toLowerCase(), c: 'text-[#2ee8c4]' };
  if (L && L.feriado) return { t: L.feriado.toLowerCase(), c: 'text-zinc-500' };
  if (L && L.st === 'nao') return { t: f.type === 'trajeto' ? 'não teve' : 'não fui', c: 'text-zinc-500' };
  if (L && L.aindaLa) return { t: `saída prevista ${L.end}`, c: 'text-zinc-500' };
  if (L && L.start && (L.start !== f.plan.start || L.end !== f.plan.end)) return { t: `previsto ${f.plan.start}–${f.plan.end}`, c: 'text-zinc-500', real: true };
  if (L) return { ok: true };
  if (day < s.day || (day === s.day && nowRef(s) >= f.plan.e)) return { t: 'confirmar', c: 'text-[#ffc24d]', ask: true };
  return null;
}

/* ===================== babá+: tempo visível, primeiro passo, hiperfoco, saída, comida, social ===================== */
/* voz: reconhecimento nativo do navegador, em português */
const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
function VoiceButton({ onText, className = '' }) {
  const [on, setOn] = useState(false), [err, setErr] = useState(''), rec = useRef(null);
  if (!SR) return null;
  const toggle = () => {
    if (on && rec.current) { rec.current.stop(); return; }
    try {
      const r = new SR(); r.lang = 'pt-BR'; r.interimResults = false; r.continuous = false;
      r.onresult = (e) => { const t = Array.from(e.results).map((x) => x[0].transcript).join(' ').trim(); if (t) onText(t); };
      r.onerror = (e) => { setErr(e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'Microfone bloqueado aqui.' : 'Não entendi, tenta de novo.'); setOn(false); };
      r.onend = () => setOn(false);
      rec.current = r; setErr(''); setOn(true); r.start();
    } catch (e) { setErr('Voz indisponível neste navegador.'); setOn(false); }
  };
  return (
    <span className="relative inline-flex">
      <button type="button" onClick={toggle} aria-pressed={on} aria-label={on ? 'Parar de ouvir' : 'Falar em vez de digitar'} title={err || 'Falar'} className={`w-11 h-11 shrink-0 rounded-xl grid place-items-center press ${on ? 'bg-[#ff6fb5]/20 text-[#ff6fb5] live-mic' : 'border border-white/10 text-zinc-300 hover:bg-white/5'} ${className}`}><Ic n={on ? 'MicOff' : 'Mic'} /></button>
      {err && <span className="absolute right-0 top-full mt-1 whitespace-nowrap text-[11px] text-[#ffc24d]">{err}</span>}
    </span>
  );
}
const leaveDue = (s) => { const a = nextAnchor(s); if (!a || !a.isLeave || a.s - nowRef(s) > 45) return false; const d = s.leaveCheck[s.day] || {}; return s.leaveCfg.items.some((x) => !d[x]); };
const mealDue = (s) => { const now = nowRef(s), done = s.mealsDone[s.day] || {}, snz = (s.today && s.today.mealSnooze) || {}; return (s.careCfg.meals || []).find((x) => !done[x.id] && now >= toMin(x.time) + 30 && now < toMin(x.time) + 180 && !(snz[x.id] && snz[x.id] > now)) || null; };
const medLow = (s) => (s.careCfg.meds || []).filter((m) => m.stock != null && m.stock / (m.dose || 1) <= 3);
const hyperDue = (s, it) => { const st = it && s.today.startedAt && s.today.startedAt[it.id]; if (!st) return false; const el = Math.round((Date.now() - st.ms) / 60000); return el - it.dur >= 15 && !(s.today.hyperOk && s.today.hyperOk[it.id] > Date.now()); };
function AsideTabs({ s, act, children }) {
  const so = socialOf(s), goal = gMl(s), w = wMl(s);
  const tabs = [['cuidar', 'Cuidados', 'Heart', goal ? fmtL(w).replace(' L', '') + 'L' : null], ['energia', 'Energia', 'BatteryMedium', `${so.now}%`], ['caixa', 'Caixa', 'Inbox', s.inbox.length || null], ['dia', 'Dia', 'SlidersHorizontal', null]];
  const cur = (s.ui && s.ui.asideTab) || 'cuidar';
  return (
    <div className={card + ' overflow-hidden'}>
      <div role="tablist" aria-label="Painel do dia" className="grid grid-cols-4 border-b border-white/[0.06]">{tabs.map(([k, l, ic, badge]) => (
        <button key={k} role="tab" aria-selected={cur === k} onClick={() => act.setUi({ asideTab: k })} className={`relative py-2.5 flex flex-col items-center gap-0.5 text-[11px] transition-colors ${cur === k ? 'text-zinc-50' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <Ic n={ic} className="w-4 h-4" /><span>{l}{badge != null && <span className="ml-1 opacity-60 tabular-nums">{badge}</span>}</span>
          {cur === k && <i className="absolute bottom-0 inset-x-3 h-0.5 rounded-full bg-[#9f8fff] grow-x" />}</button>))}</div>
      <div key={cur} role="tabpanel" className="p-4 view-in">{children(cur)}</div>
    </div>
  );
}
function QuickCheck({ s, act, onDetail }) {
  const g = sleepHours(s.sleepGoal.bed, s.sleepGoal.wake);
  const opts = [['bem', 'Dormi bem', 'Sun', `~${fmtH(g)}`], ['medio', 'Mais ou menos', 'CloudSun', `~${fmtH(g - 1.5)}`], ['mal', 'Dormi mal', 'CloudRain', `~${fmtH(Math.max(2, g - 3))}`]];
  return (
    <div className={card + ' p-4 space-y-3 swap-in'}>
      <div className="flex items-baseline justify-between gap-2 flex-wrap"><p className="text-zinc-100 font-medium">Como foi a noite?</p><p className="text-xs text-zinc-500">Um toque. Dá para detalhar depois.</p></div>
      <div className="grid grid-cols-3 gap-2">{opts.map(([k, l, ic, h]) => <button key={k} onClick={() => act.quickCheck(k)} className="min-h-[68px] rounded-xl border border-white/10 hover:bg-white/[0.05] text-sm text-zinc-200 flex flex-col items-center justify-center gap-1 press lift"><Ic n={ic} className="w-5 h-5 text-zinc-400" />{l}<span className="text-[11px] text-zinc-500">{h}</span></button>)}</div>
      <div className="flex flex-wrap gap-x-4 gap-y-1"><button className={btnL} onClick={onDetail}><Ic n="Pencil" className="w-3.5 h-3.5" />Detalhar sono e trajeto</button><button className={btnL} onClick={act.skipCheck}>Pular por agora</button></div>
    </div>
  );
}
function WelcomeBack({ s, act, setTab }) {
  const w = s.welcome; if (!w) return null;
  return (
    <div className={card + ' p-5 space-y-3 border-[#ff6fb5]/35 swap-in'}>
      <div className="flex items-start gap-3"><Pet mood="calmo" size={44} /><div><p className="text-zinc-50 font-medium text-lg">Que bom que você voltou.</p><p className="text-sm text-zinc-400">Faz {w.gap} dias. {w.left ? `Ficaram ${w.left} coisas para trás, e tudo bem: a vida acontece.` : 'Nada ficou pendurado.'} Não precisa compensar nada.</p></div></div>
      <div className="flex flex-wrap gap-2"><button className={btnP} onClick={act.welcomeClean}><Ic n="Sparkles" />Arquivar o que passou e começar de hoje</button><button className={btnG} onClick={() => { act.welcomeSeen(); setTab('semana'); }}>Ver o que ficou</button></div>
    </div>
  );
}
function PulseCard({ s, act, bare }) {
  const p = s.today.pulse;
  const opts = [['bem', 'Bem', 'Smile'], ['cansada', 'Cansada', 'BatteryLow'], ['esgotada', 'Esgotada', 'BatteryWarning'], ['sobrecarga', 'Sobrecarregada', 'Waves']];
  return (
    <div className={(bare ? '' : card + ' p-4 ') + 'space-y-2.5'}>
      <div className="flex items-baseline justify-between"><p className="text-sm text-zinc-300">Como estou agora?</p>{p && <span className="text-xs text-zinc-500">às {hhmm(p.at)}</span>}</div>
      <div className="grid grid-cols-2 gap-1.5">{opts.map(([k, l, ic]) => <button key={k} aria-pressed={p && p.kind === k} onClick={() => act.pulse(k)} className={`h-9 rounded-lg text-xs flex items-center justify-center gap-1.5 press ${p && p.kind === k ? 'bg-[#9f8fff]/20 text-[#cdc4ff]' : 'bg-white/[0.05] text-zinc-300 hover:bg-white/[0.09]'}`}><Ic n={ic} className="w-3.5 h-3.5" />{l}</button>)}</div>
      <p className="text-xs text-zinc-500 hint">Muda a energia de agora e, se cair muito, eu alivio o resto do dia.</p>
    </div>
  );
}
function TimeLeft({ s }) {
  const a = nextAnchor(s); if (!a) return null;
  const now = nowRef(s), left = a.s - now, total = Math.max(1, a.s - a.from), pct = clamp((left / total) * 100, 0, 100);
  const soon = left <= 10, mid = left <= 30;
  const c = soon ? '#ffc24d' : mid ? '#9f8fff' : '#2ee8c4';
  return (
    <div className={card + ` p-4 space-y-2.5 ${soon ? 'border-[#ffc24d]/50 transition-warn' : ''}`} role="status" aria-live="polite">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <p className="text-[15px] text-zinc-100">{soon ? <><b className="text-[#ffc24d]">Em {left} min</b> você precisa parar o que está fazendo e se preparar para {a.label}.</> : <>Faltam <b style={{ color: c }}>{left < 60 ? `${left} min` : fmtH(left / 60)}</b> para {a.label}</>}</p>
        <span className="text-sm text-zinc-500 tabular-nums">{a.title} · {hhmm(a.s)}</span>
      </div>
      <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full bar-anim" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${c}, ${c}aa)` }} /></div>
      {soon && <p className="text-sm text-zinc-400 hint">Feche a aba, salve o que fez, beba água. Mudança avisada pesa menos.</p>}
    </div>
  );
}
function FirstStep({ s, it, act, onClose }) {
  const opts = firstSteps(s, it); const [i, setI] = useState(0); const [edit, setEdit] = useState(false); const [txt, setTxt] = useState(opts[0]);
  const r = refOf(s, it);
  return (
    <div className="rounded-xl border border-[#2ee8c4]/30 bg-[#2ee8c4]/[0.06] p-4 space-y-3 swap-in">
      <p className="text-sm text-[#a8f7e8]">Esquece a tarefa inteira. O primeiro passo é só:</p>
      {edit ? <input className={inp} value={txt} onChange={(e) => setTxt(e.target.value)} aria-label="Primeiro passo" autoFocus />
        : <p key={i} className="text-xl text-zinc-50 font-medium leading-snug rise">{opts[i % opts.length]}</p>}
      <div className="flex flex-wrap gap-2">
        <button className={btnP} onClick={() => { act.markStuck(); act.startTimer(it, 2); onClose(); }}><Ic n="Timer" />Fazer por 2 min</button>
        {!edit && <button className={btnG} onClick={() => setI(i + 1)}><Ic n="RefreshCw" />Outro passo</button>}
        {it.kind === 'task' && (edit ? <button className={btnG} onClick={() => { act.saveFirstStep(r.id, txt); setEdit(false); }}><Ic n="Check" />Salvar como primeiro passo</button>
          : <button className={btnL} onClick={() => { setTxt(opts[i % opts.length]); setEdit(true); }}><Ic n="Pencil" className="w-3.5 h-3.5" />Escrever o meu</button>)}
        <button className={btnL} onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}
function HyperCard({ s, it, act }) {
  const st = s.today.startedAt && s.today.startedAt[it.id]; if (!st) return null;
  const el = Math.round((Date.now() - st.ms) / 60000), over = el - it.dur;
  if (over < 15 || (s.today.hyperOk && s.today.hyperOk[it.id] > Date.now())) return null;
  const w = wMl(s) / 250;
  return (
    <div className={card + ' p-4 space-y-3 border-[#ff6fb5]/40 swap-in'}>
      <p className="text-zinc-100 font-medium flex items-center gap-2"><Ic n="Hourglass" className="w-4 h-4 text-[#ff6fb5]" />Você está nisso há {fmtH(el / 60)} (o previsto era {it.dur} min).</p>
      <p className="text-sm text-zinc-400">Hiperfoco é bom, mas o corpo conta: {w < 3 ? 'água (você bebeu pouco hoje), ' : 'água, '}comer algo e levantar por 5 min.</p>
      <div className="flex flex-wrap gap-2"><button className={btnP} onClick={() => act.hyperPause(it)}><Ic n="Coffee" />Pausa de 5 min</button><button className={btnG} onClick={() => act.hyperOk(it)}>Estou bem, mais 20 min</button><button className={btnG} onClick={() => act.done(it)}><Ic n="Check" />Terminei</button></div>
    </div>
  );
}
function LeaveCheck({ s, act }) {
  const a = nextAnchor(s); const now = nowRef(s);
  if (!a || !a.isLeave || a.s - now > 45) return null;
  const done = (s.leaveCheck[s.day] || {}), items = s.leaveCfg.items, n = items.filter((x) => done[x]).length;
  if (n === items.length) return <div className={card + ' p-4 text-sm text-[#a8f7e8] flex items-center gap-2'}><Ic n="Check" className="w-4 h-4" />Tudo na bolsa. Boa saída!</div>;
  return (
    <div className={card + ' p-4 space-y-3'}>
      <div className="flex items-baseline justify-between gap-2"><p className="text-zinc-100 font-medium flex items-center gap-2"><Ic n="Backpack" className="w-4 h-4 text-[#9f8fff]" />Antes de sair ({hhmm(a.s)})</p><span className="text-sm text-zinc-500">{n}/{items.length}</span></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{items.map((x) => <button key={x} onClick={() => act.leaveTick(x)} className={`min-h-[44px] rounded-xl border px-3 text-sm flex items-center gap-2 text-left press ${done[x] ? 'border-[#2ee8c4]/40 bg-[#2ee8c4]/10 text-[#a8f7e8]' : 'border-white/10 text-zinc-200 hover:bg-white/[0.04]'}`}>
        <span className={`chk w-[18px] h-[18px] rounded-[5px] border grid place-items-center shrink-0 ${done[x] ? 'bg-[#2ee8c4] border-[#2ee8c4] text-zinc-950 pop' : 'border-zinc-600'}`}>{done[x] && <Ic n="Check" className="w-3 h-3" />}</span>{x}</button>)}</div>
    </div>
  );
}
function MealNudge({ s, act }) {
  const m = mealDue(s);
  if (!m) return null;
  return (
    <div className={card + ' p-4 flex items-center gap-3 flex-wrap border-[#ff6fb5]/30 swap-in'}>
      <Ic n="Utensils" className="w-5 h-5 text-[#ff6fb5]" />
      <p className="flex-1 min-w-[180px] text-[15px] text-zinc-200">Já comeu? O {m.name.toLowerCase()} era às {m.time}.</p>
      <button className={btnP} onClick={() => act.meal(m.id)}>Comi</button><button className={btnG} onClick={() => act.mealSnooze(m.id)}>Daqui a 30 min</button>
    </div>
  );
}
function MedStockNudge({ s }) {
  const low = (s.careCfg.meds || []).filter((m) => m.stock != null && m.stock / (m.dose || 1) <= 3);
  if (!low.length) return null;
  return <div className={card + ' p-4 flex items-center gap-3 border-[#ffc24d]/40'}><Ic n="Pill" className="w-5 h-5 text-[#ffc24d]" /><p className="text-[15px] text-zinc-200">{low.map((m) => `${m.name} acaba em ${Math.floor(m.stock / (m.dose || 1))} ${Math.floor(m.stock / (m.dose || 1)) === 1 ? 'dia' : 'dias'}`).join(' · ')}. Vale comprar ou pedir receita.</p></div>;
}
function SocialCard({ s, act, bare }) {
  const so = socialOf(s), c = so.now >= 60 ? '#2ee8c4' : so.now >= 35 ? '#ffc24d' : '#ff7f5e';
  return (
    <div className={(bare ? '' : card + ' p-4 ') + 'space-y-3'}>
      <div className="flex items-center justify-between gap-2"><p className="text-sm text-zinc-300 flex items-center gap-2"><Ic n="Users" className="w-4 h-4" style={{ color: c }} />Bateria social e sensorial</p><span className="text-sm tabular-nums" style={{ color: c }}>{so.now}%</span></div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full bar-anim" style={{ width: `${so.now}%`, background: c }} /></div>
      <p className="text-xs text-zinc-500 hint">Separada da energia. Hoje deve terminar em {so.end}% com o que está marcado.</p>
      <div className="flex flex-wrap gap-1.5">
        <button className="h-8 px-2.5 rounded-lg text-xs bg-white/[0.05] text-zinc-300 hover:bg-white/[0.09] press" onClick={() => act.social(-15)}>Muita gente −15</button>
        <button className="h-8 px-2.5 rounded-lg text-xs bg-white/[0.05] text-zinc-300 hover:bg-white/[0.09] press" onClick={() => act.social(-20)}>Barulho/sobrecarga −20</button>
        <button className="h-8 px-2.5 rounded-lg text-xs bg-white/[0.05] text-zinc-300 hover:bg-white/[0.09] press" onClick={() => act.social(15)}>Recarreguei +15</button>
      </div>
      {so.now < 40 && <button className={btnP + ' w-full'} onClick={() => act.pulse('sobrecarga', true)}><Ic n="Wand2" />Aliviar o resto do dia</button>}
      {so.end < 35 && <button className={btnG + ' w-full'} onClick={act.emptyEvening} title="Deixa só o essencial depois das 18h"><Ic n="Moon" />Esvaziar a noite</button>}
    </div>
  );
}
function InboxCard({ s, act, bare }) {
  const [txt, setTxt] = useState(''); const [org, setOrg] = useState(false);
  const add = () => { const lines = txt.split(/\n+/).map((x) => x.trim()).filter(Boolean); if (!lines.length) return; act.inboxAdd(lines); setTxt(''); };
  return (
    <div className={(bare ? '' : card + ' p-4 ') + 'space-y-3'}>
      <div className="flex items-center justify-between"><p className="text-sm text-zinc-300 flex items-center gap-2"><Ic n="Inbox" className="w-4 h-4 text-[#9f8fff]" />Caixa de entrada</p>{s.inbox.length > 0 && <span className="text-xs text-zinc-500">{s.inbox.length} sem organizar</span>}</div>
      <textarea className={inp + ' h-20 py-2 resize-none'} value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) add(); }} placeholder={'Despeja aqui, uma coisa por linha.\nNão precisa organizar.'} aria-label="Caixa de entrada" />
      <div className="flex gap-2"><VoiceButton onText={(t) => setTxt((x) => (x.trim() ? x.trim() + '\n' : '') + t)} /><button className={btnG + ' flex-1'} onClick={add} disabled={!txt.trim()}><Ic n="Plus" />Jogar na caixa</button>{s.inbox.length > 0 && <button className={btnP + ' flex-1'} onClick={() => setOrg(!org)}><Ic n="Sparkles" />{org ? 'Fechar' : 'Organizar'}</button>}</div>
      {org && <InboxOrganize s={s} act={act} />}
      {!org && s.inbox.length > 0 && <ul className="text-sm text-zinc-400 space-y-1">{s.inbox.slice(0, 4).map((x) => <li key={x.id} className="truncate">• {x.text}</li>)}{s.inbox.length > 4 && <li className="text-zinc-500">e mais {s.inbox.length - 4}</li>}</ul>}
    </div>
  );
}
function inboxSuggest(s, text) {
  const pc = parseCmd(text, s);
  if (pc.isEvent) { const len = pc.dur || (pc.eventWord ? 60 : 30); const rec = !!(pc.days && pc.days.length); let day = pc.day != null ? pc.day : s.day; if (!rec && pc.day == null && pc.start <= nowRef(s)) day = s.day + 1;
    return { kind: 'event', draft: { title: pc.title || text, day, start: hhmm(pc.start), end: hhmm(Math.min(1439, pc.start + len)), recurring: rec, days: rec ? pc.days : [weekdayOf(day)] }, label: `Compromisso · ${rec ? diasTxt(pc.days) : day === s.day ? 'hoje' : fmtDia(day).toLowerCase()} ${hhmm(pc.start)}` }; }
  const d = draftFromText(text, s);
  return { kind: 'task', draft: d, label: `Tarefa · ${d.dur} min · ${LOAD[d.load].t.toLowerCase()}${d.freq ? ` · ${d.freq === 7 ? 'todo dia' : d.freq + 'x/sem'}` : d.due != null ? ` · até ${fmtCurto(d.due)}` : ''}${d.cat === 'Casa' ? ' · casa' : ''}` };
}
function InboxOrganize({ s, act }) {
  const rows = s.inbox.map((x) => ({ x, sug: inboxSuggest(s, x.text) }));
  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500">O Lume leu cada linha. Confira e aceite.</p>
      {rows.map(({ x, sug }, i) => (
        <div key={x.id} className="rounded-xl border border-white/10 bg-zinc-950 p-3 space-y-2 rise" style={{ animationDelay: `${i * 40}ms` }}>
          <p className="text-sm text-zinc-100">{sug.draft.title}</p>
          <p className="text-xs text-zinc-500">{sug.label}</p>
          <div className="flex gap-1.5"><button className="h-8 px-3 rounded-lg text-xs btn-primary text-zinc-950 press" onClick={() => act.inboxAccept(x.id, sug)}>Adicionar</button><button className="h-8 px-3 rounded-lg text-xs border border-white/10 text-zinc-300 hover:bg-white/5 press" onClick={() => act.inboxDrop(x.id)}>Descartar</button></div>
        </div>))}
      {rows.length > 1 && <button className={btnG + ' w-full'} onClick={() => act.inboxAcceptAll(rows.map(({ x, sug }) => [x.id, sug]))}><Ic n="CheckCheck" />Adicionar tudo</button>}
    </div>
  );
}
function DayNews({ s, act }) {
  const n = s.dayNews; if (!n || n.day !== s.day || !n.lines.length) return null;
  return (
    <div className={card + ' p-4 space-y-2 border-[#9f8fff]/35 swap-in'}>
      <p className="text-zinc-100 font-medium flex items-center gap-2"><Ic n="Bell" className="w-4 h-4 text-[#9f8fff]" />O que mudou hoje</p>
      <ul className="text-sm text-zinc-300 space-y-0.5">{n.lines.map((l, i) => <li key={i}>• {l}</li>)}{n.more > 0 && <li className="text-zinc-500">e mais {n.more}</li>}</ul>
      <button className={btnG} onClick={act.newsSeen}>Entendi</button>
    </div>
  );
}
function Companion({ s, comp, act, onEnd }) {
  const [t, setT] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setT(Date.now()), 1000); return () => clearInterval(id); }, []);
  const it = s.plan.items.find((y) => y.id === comp.itemId);
  const el = Math.floor((t - comp.start) / 1000), every = comp.every * 60;
  const nudge = el >= every && Math.floor(el / every) > comp.acked;
  const rung = useRef(0);
  useEffect(() => { const k = Math.floor(el / every); if (nudge && rung.current !== k) { rung.current = k; chime('lume', s); } }, [nudge, el]);
  const mm = (x) => `${String(Math.floor(x / 60)).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`;
  return (
    <div className="fixed z-40 left-4 right-4 sm:right-auto sm:w-[340px] bottom-[88px] md:bottom-6 md:left-[248px] rounded-2xl border border-[#9f8fff]/40 bg-zinc-900/95 backdrop-blur shadow-2xl shadow-black/60 p-4 space-y-3 drawer-in" role="region" aria-label="Trabalhando junto com o Lume">
      <div className="flex items-center gap-3"><Pet mood="calmo" size={40} /><div className="flex-1 min-w-0"><p className="text-sm text-zinc-100">Estou aqui com você</p><p className="text-xs text-zinc-500 truncate">{it ? itemTitle(s, it) : 'Trabalhando'} · <span className="tabular-nums">{mm(el)}</span></p></div>
        <button className="w-9 h-9 grid place-items-center rounded-lg text-zinc-500 hover:bg-white/5" aria-label="Encerrar companhia" onClick={onEnd}><Ic n="X" /></button></div>
      {nudge ? <div className="rounded-xl bg-[#9f8fff]/10 border border-[#9f8fff]/30 p-3 space-y-2 swap-in">
        <p className="text-sm text-zinc-100">Ainda aí? {Math.floor(el / 60)} min. Se travou, tudo bem.</p>
        <div className="flex flex-wrap gap-1.5"><button className="h-8 px-3 rounded-lg text-xs btn-primary text-zinc-950 press" onClick={() => act.compAck()}>Sigo</button>
          {it && <button className="h-8 px-3 rounded-lg text-xs border border-white/10 text-zinc-200 press" onClick={() => { act.travou(it); onEnd(); }}>Travei</button>}
          {it && <button className="h-8 px-3 rounded-lg text-xs border border-white/10 text-zinc-200 press" onClick={() => { act.done(it); onEnd(); }}>Terminei</button>}</div></div>
        : <p className="text-xs text-zinc-500">Eu dou um toque a cada {comp.every} min. Sem pressão.</p>}
    </div>
  );
}
function PrevistoReal({ s, act }) {
  const by = {};
  (s.durLog || []).forEach((l) => { (by[l.ref] = by[l.ref] || []).push(l); });
  const rows = Object.entries(by).map(([ref, ls]) => { const t = s.tasks.find((x) => x.id === ref); if (!t) return null; const last = ls.slice(-6); const real = Math.round(last.reduce((a, l) => a + l.actual, 0) / last.length); return { t, n: last.length, real, plan: t.dur, ratio: real / t.dur }; }).filter(Boolean);
  if (!rows.length) return null;
  const mx = Math.max(...rows.map((r) => Math.max(r.real, r.plan)));
  return (
    <div className={card + ' p-5 space-y-3'}>
      <p className="text-zinc-100 font-medium">Previsto vs. real</p>
      <p className="text-xs text-zinc-500">Quando você usa o timer, o modo foco ou a companhia, eu anoto quanto levou. Com 3 ou mais registros, ajusto a duração sozinho.</p>
      <div className="space-y-3">{rows.map((r) => (
        <div key={r.t.id} className="space-y-1">
          <div className="flex items-baseline justify-between gap-2 text-sm"><span className="text-zinc-200 truncate">{r.t.title}</span><span className={`shrink-0 tabular-nums ${r.ratio > 1.15 ? 'text-[#ffc24d]' : r.ratio < 0.85 ? 'text-[#2ee8c4]' : 'text-zinc-400'}`}>{r.real} min real · {r.plan} previsto</span></div>
          <div className="space-y-1"><div className="h-1.5 rounded-full bg-[#9f8fff]/70 grow-x" style={{ width: `${(r.plan / mx) * 100}%` }} /><div className="h-1.5 rounded-full grow-x" style={{ width: `${(r.real / mx) * 100}%`, background: r.ratio > 1.15 ? '#ffc24d' : '#2ee8c4' }} /></div>
          {Math.abs(r.ratio - 1) > 0.15 && r.n >= 3 && <button className={btnL + ' text-xs text-[#9f8fff]'} onClick={() => act.setDur(r.t.id, Math.round(r.real / 5) * 5)}>Ajustar para {Math.round(r.real / 5) * 5} min</button>}
        </div>))}</div>
      {(s.durNotes || []).slice(-3).map((n, i) => <p key={i} className="text-xs text-zinc-400">• Ajustei {n.title}: {n.from} → {n.to} min.</p>)}
      <p className="text-xs text-zinc-500 flex gap-4"><span><i className="inline-block w-2.5 h-1.5 rounded-full bg-[#9f8fff] mr-1 align-middle" />previsto</span><span><i className="inline-block w-2.5 h-1.5 rounded-full bg-[#ffc24d] mr-1 align-middle" />real</span></p>
    </div>
  );
}
const vacUntil = (s, v) => (v.end == null ? 'sem data para voltar' : v.end === s.day ? 'até hoje' : v.end === s.day + 1 ? 'até amanhã' : `até ${DIAS_LONGO[weekdayOf(v.end)]}, ${fmtCurto(v.end)}`);
function VacationForm({ s, act, onDone, compact }) {
  const [f, setF] = useState({ label: 'Férias', start: s.day, end: s.day + 6, open: false, keepCare: true, keepRoutines: false });
  const sw = (on, fn, label) => <button type="button" role="switch" aria-checked={on} onClick={fn} className="w-full flex items-center justify-between gap-3 text-left text-sm text-zinc-300 min-h-[40px]">{label}<span className={`block w-10 h-6 rounded-full p-0.5 shrink-0 transition-colors ${on ? 'bg-[#2ee8c4]' : 'bg-white/10'}`}><span className={`block w-5 h-5 rounded-full bg-white transition-transform ${on ? 'translate-x-4' : ''}`} /></span></button>;
  const bad = !f.open && f.end < f.start ? 'A volta precisa ser depois da ida.' : null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">{['Férias', 'Viagem', 'Recesso', 'Pausa'].map((l) => <button key={l} aria-pressed={f.label === l} onClick={() => setF({ ...f, label: l })} className={`h-8 px-3 rounded-full text-xs press ${f.label === l ? 'bg-[#2ee8c4]/20 text-[#7ff0d8]' : 'bg-white/[0.05] text-zinc-400'}`}>{l}</button>)}</div>
      <input className={inp + ' h-10'} value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} aria-label="Nome da pausa" placeholder="Ex.: Viagem para a praia" />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-zinc-500">Começa<input type="date" className={inp + ' h-10 mt-1'} min={isoOf(s.day)} value={isoOf(f.start)} onChange={(e) => e.target.value && setF({ ...f, start: Math.max(s.day, dayFromIso(e.target.value)) })} /></label>
        <label className="text-xs text-zinc-500">Volta (último dia)<input type="date" disabled={f.open} className={inp + ' h-10 mt-1 disabled:opacity-40'} min={isoOf(f.start)} value={isoOf(f.end)} onChange={(e) => e.target.value && setF({ ...f, end: dayFromIso(e.target.value) })} /></label>
      </div>
      <label className="flex items-center gap-2 text-sm text-zinc-300"><input type="checkbox" className="accent-[#2ee8c4] w-4 h-4" checked={f.open} onChange={(e) => setF({ ...f, open: e.target.checked })} />Sem data para voltar</label>
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-1">
        {sw(f.keepCare, () => setF({ ...f, keepCare: !f.keepCare }), 'Manter autocuidado (água, remédios, cabelo/pele)')}
        {sw(f.keepRoutines, () => setF({ ...f, keepRoutines: !f.keepRoutines }), 'Manter rotinas da manhã e da noite')}
      </div>
      {bad && <p className="text-xs text-[#ffc24d]">{bad}</p>}
      <div className="flex flex-wrap gap-2"><button className={btnP + (compact ? ' min-h-[38px] h-9 text-sm' : '')} disabled={!!bad || !f.label.trim()} onClick={() => { act.addVacation({ label: f.label.trim(), start: f.start, end: f.open ? null : f.end, keepCare: f.keepCare, keepRoutines: f.keepRoutines }); onDone && onDone(); }}><Ic n="Sun" />Pausar rotina</button>{onDone && <button className={btnG + (compact ? ' min-h-[38px] h-9 text-sm' : '')} onClick={onDone}>Cancelar</button>}</div>
    </div>
  );
}
function VacationList({ s, act }) {
  const list = (s.vacations || []).filter((v) => v.end == null || v.end >= s.day).sort((a, b) => a.start - b.start);
  if (!list.length) return <p className="text-sm text-zinc-500">Nenhuma pausa marcada.</p>;
  return (
    <ul className="divide-y divide-white/[0.05]">{list.map((v) => { const on = v.start <= s.day; return (
      <li key={v.id} className="py-2.5 flex items-center gap-3">
        <span className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${on ? 'bg-[#2ee8c4]/15 text-[#2ee8c4]' : 'bg-white/[0.05] text-zinc-400'}`}><Ic n={on ? 'Sun' : 'Backpack'} className="w-4 h-4" /></span>
        <span className="flex-1 min-w-0"><span className="block text-sm text-zinc-100 truncate">{v.label}{on && <span className="ml-2 text-xs text-[#2ee8c4]">agora</span>}</span>
          <span className="block text-xs text-zinc-500">{on ? 'desde ' + fmtCurto(v.start) : 'de ' + fmtCurto(v.start)} · {vacUntil(s, v)}{v.keepCare ? ' · autocuidado mantido' : ''}{v.keepRoutines ? ' · rotinas mantidas' : ''}</span></span>
        {on ? <button className={btnG + ' min-h-[36px] h-9 text-sm'} onClick={() => act.endVacation(v.id)}><Ic n="Play" className="w-3.5 h-3.5" />Encerrar agora</button>
          : <button className="w-9 h-9 grid place-items-center rounded-lg text-zinc-500 hover:bg-white/5" aria-label={`Remover ${v.label}`} onClick={() => act.removeVacation(v.id)}><Ic n="Trash2" className="w-4 h-4" /></button>}
      </li>); })}</ul>
  );
}
function PauseBlock({ s, act, setTab }) {
  const v = vacationOn(s, s.day), [form, setForm] = useState(false);
  if (v) return (
    <div className="space-y-2"><p className="text-sm text-zinc-300 flex items-center gap-2"><Ic n="Sun" className="w-4 h-4 text-[#2ee8c4]" />{v.label} · rotina em pausa</p>
      <p className="text-xs text-zinc-500">{vacUntil(s, v)[0].toUpperCase() + vacUntil(s, v).slice(1)}. Sua ofensiva está protegida.</p>
      <button className={btnG + ' w-full'} onClick={() => act.endVacation(v.id)}><Ic n="Play" />Voltar à rotina agora</button></div>);
  return (
    <div className="space-y-2"><p className="text-sm text-zinc-300">Pausa de rotina (férias / viagem)</p>
      <p className="text-xs text-zinc-500 hint">Pausa trabalho, tarefas e casa. A ofensiva fica protegida.</p>
      {form ? <VacationForm s={s} act={act} compact onDone={() => setForm(false)} /> : <div className="grid grid-cols-2 gap-1.5">
        <button className="h-9 rounded-lg text-xs bg-white/[0.05] text-zinc-300 hover:bg-white/[0.09] press" onClick={() => act.addVacation({ label: 'Pausa', start: s.day, end: s.day + 2, keepCare: true, keepRoutines: false })}>Só uns dias (3)</button>
        <button className="h-9 rounded-lg text-xs bg-white/[0.05] text-zinc-300 hover:bg-white/[0.09] press" onClick={() => act.addVacation({ label: 'Férias', start: s.day, end: s.day + 6, keepCare: true, keepRoutines: false })}>Uma semana</button>
        <button className="h-9 rounded-lg text-xs bg-white/[0.05] text-zinc-300 hover:bg-white/[0.09] press" onClick={() => setForm(true)}>Definir datas</button>
        <button className="h-9 rounded-lg text-xs bg-white/[0.05] text-zinc-300 hover:bg-white/[0.09] press" onClick={() => setTab('cadastro', 'semestre')}>Ver no Semestre</button>
      </div>}
    </div>);
}
function SemestreSection({ s, act, edit, open, f, setF, save, close, del }) {
  const [vf, setVf] = useState(false);
  const sem = s.semester, [hd, setHd] = useState({ date: s.day + 1, label: '', kind: 'folga' });
  const aulas = s.fixed.filter((x) => x.sem), year = dateOf(s.day).getUTCFullYear();
  const total = sem.end - sem.start, gone = clamp(s.day - sem.start, 0, total);
  const hol = [...(sem.holidays || [])].sort((a, b) => a.date - b.date);
  return (
    <div className="space-y-4">
      <div className={card + ' p-5 space-y-3'}>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <label className="text-xs text-zinc-500">Começa<input type="date" className={inp + ' mt-1'} value={isoOf(sem.start)} onChange={(e) => e.target.value && act.setSem({ start: dayFromIso(e.target.value) })} /></label>
          <label className="text-xs text-zinc-500">Termina<input type="date" className={inp + ' mt-1'} value={isoOf(sem.end)} onChange={(e) => e.target.value && act.setSem({ end: dayFromIso(e.target.value) })} /></label>
        </div>
        <div className="space-y-1"><div className="h-2 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full bar-anim" style={{ width: `${(gone / Math.max(1, total)) * 100}%`, background: 'linear-gradient(90deg,#9f8fff,#2ee8c4)' }} /></div>
          <p className="text-xs text-zinc-500">{s.day > sem.end ? 'Semestre encerrado.' : `Semana ${Math.floor(gone / 7) + 1} de ${Math.ceil(total / 7)} · faltam ${Math.max(0, sem.end - s.day)} dias`}</p></div>
      </div>
      <div className={card + ' p-5 space-y-3'}>
        <div className="flex items-center justify-between gap-2 flex-wrap"><p className="text-zinc-100 font-medium">Aulas do semestre</p><button className={btnG} onClick={() => edit('newAula', { id: 'new', type: 'compromisso', title: '', days: [1], start: '19:00', end: '20:40', sem: true })}><Ic n="Plus" />Nova aula</button></div>
        <p className="text-xs text-zinc-500">Só valem entre o início e o fim do semestre. Depois somem sozinhas da semana.</p>
        {open === 'newAula' && <div className="rounded-xl bg-zinc-950/60 border border-white/[0.06]"><FixedForm f={f} setF={setF} onSave={save('fixed')} onCancel={close} /></div>}
        {aulas.map((x) => <div key={x.id} className="flex items-center gap-3 text-sm"><span className="w-1 self-stretch rounded-full bg-[#2ee8c4]" /><span className="flex-1 text-zinc-200">{x.title}</span><span className="text-zinc-500">{x.days.map((d) => DIAS[d]).join(', ')} {x.start}–{x.end}</span><button className="w-8 h-8 grid place-items-center rounded-lg text-zinc-500 hover:bg-white/5" aria-label={`Excluir ${x.title}`} onClick={del('fixed', x.id)}><Ic n="Trash2" className="w-3.5 h-3.5" /></button></div>)}
        {!aulas.length && open !== 'newAula' && <p className="text-sm text-zinc-500">Nenhuma aula cadastrada. Dica: peça ao Lume “toda terça e quinta aula de física 19h-20h40”.</p>}
      </div>
      <div className={card + ' p-5 space-y-3 border-[#2ee8c4]/20'}>
        <div className="flex items-center justify-between gap-2 flex-wrap"><p className="text-zinc-100 font-medium flex items-center gap-2"><Ic n="Sun" className="w-4 h-4 text-[#2ee8c4]" />Férias e viagens</p>{!vf && <button className={btnG} onClick={() => setVf(true)}><Ic n="Plus" />Nova pausa</button>}</div>
        <p className="text-xs text-zinc-500">Trabalho, trajetos, aulas, tarefas e casa ficam pausados. Compromissos com hora (voo, jantar) continuam. A ofensiva fica protegida.</p>
        {vf && <div className="rounded-xl border border-[#2ee8c4]/25 bg-zinc-950/50 p-4"><VacationForm s={s} act={act} onDone={() => setVf(false)} /></div>}
        <VacationList s={s} act={act} />
      </div>
      <div className={card + ' p-5 space-y-3'}>
        <div className="flex items-center justify-between gap-2 flex-wrap"><p className="text-zinc-100 font-medium">Feriados e folgas</p><button className={btnG} onClick={() => act.addHolidays(year)}><Ic n="CalendarCheck" />Feriados nacionais de {year}</button></div>
        <p className="text-xs text-zinc-500">Nesses dias, estágio, trajetos e aulas saem da semana, e o Lume usa o dia livre com calma.</p>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto_auto] gap-2 items-end">
          <label className="text-xs text-zinc-500">Dia<input type="date" className={inp + ' h-10 mt-1'} value={isoOf(hd.date)} onChange={(e) => e.target.value && setHd({ ...hd, date: dayFromIso(e.target.value) })} /></label>
          <label className="text-xs text-zinc-500">Nome<input className={inp + ' h-10 mt-1'} value={hd.label} placeholder="Ex.: folga do estágio" onChange={(e) => setHd({ ...hd, label: e.target.value })} /></label>
          <select className={inp + ' h-10 px-2'} value={hd.kind} onChange={(e) => setHd({ ...hd, kind: e.target.value })} aria-label="Tipo"><option value="folga">Folga</option><option value="feriado">Feriado</option></select>
          <button className={btnP + ' min-h-[40px] h-10'} onClick={() => { act.addHoliday({ ...hd, label: hd.label.trim() || (hd.kind === 'folga' ? 'Folga' : 'Feriado') }); setHd({ ...hd, label: '' }); }}><Ic n="Plus" /></button>
        </div>
        <ul className="divide-y divide-white/[0.05]">{hol.map((h) => <li key={h.id} className={`flex items-center gap-3 py-2 text-sm ${h.date < s.day ? 'opacity-50' : ''}`}><span className="w-24 text-zinc-400 tabular-nums">{DIAS[weekdayOf(h.date)]} {fmtCurto(h.date)}</span><span className="flex-1 text-zinc-200">{h.label}</span><span className="text-xs text-zinc-500">{h.kind}</span><button className="w-8 h-8 grid place-items-center rounded-lg text-zinc-500 hover:bg-white/5" aria-label={`Remover ${h.label}`} onClick={() => act.delHoliday(h.id)}><Ic n="X" className="w-3.5 h-3.5" /></button></li>)}</ul>
      </div>
    </div>
  );
}
function ConfortoSection({ s, act }) {
  const ui = s.ui, [msg, setMsg] = useState(''), [imp, setImp] = useState(null);
  const sw = (on, fn, label) => <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={fn}><span className={`block w-10 h-6 rounded-full p-0.5 transition-colors ${on ? 'bg-[#9f8fff]' : 'bg-white/10'}`}><span className={`block w-5 h-5 rounded-full bg-white transition-transform ${on ? 'translate-x-4' : ''}`} /></span></button>;
  const exportar = () => {
    const safe = { ...s, ai: s.ai ? { ...s.ai, key: '' } : undefined };
    const data = JSON.stringify(safe, null, 1), name = `questday-backup-${isoOf(s.day)}.json`;
    try { const url = URL.createObjectURL(new Blob([data], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000); setMsg(`Baixando ${name}. Se nada acontecer, use “Copiar dados”.`); }
    catch (e) { setMsg('O navegador bloqueou o download aqui. Use “Copiar dados”.'); }
  };
  const copiar = async () => { try { await navigator.clipboard.writeText(JSON.stringify({ ...s, ai: s.ai ? { ...s.ai, key: '' } : undefined })); setMsg('Dados copiados. Cole num arquivo .json ou numa nota para guardar.'); } catch (e) { setMsg('Não consegui copiar aqui. Tente o botão de baixar.'); } };
  const ler = (txt) => { try { const d = JSON.parse(txt); if (!d || d.v !== 4 || !d.plan || !d.tasks) throw new Error('x'); setImp(d); setMsg(''); } catch (e) { setImp(null); setMsg('Esse arquivo não parece um backup do QuestDay.'); } };
  return (
    <div className="space-y-4">
      <div className={card + ' p-5 space-y-4'}>
        <p className="text-zinc-100 font-medium">Aparência e conforto</p>
        <div className="flex items-center justify-between gap-4"><div><p className="text-sm text-zinc-200">Modo baixo estímulo</p><p className="text-xs text-zinc-500">Sem animação, cores apagadas e menos texto. Para dias de sobrecarga.</p></div>{sw(ui.lowStim, () => act.setUi({ lowStim: !ui.lowStim }), 'Modo baixo estímulo')}</div>
        <div className="flex items-center justify-between gap-4"><div><p className="text-sm text-zinc-200">Sons e vibração</p><p className="text-xs text-zinc-500">Sino suave no fim do timer, na troca foco/pausa, no aviso de 10 min e no “ainda aí?”. No baixo estímulo fica mais baixo e curto.</p></div>
          <div className="flex items-center gap-2"><button className={btnL + ' text-xs'} onClick={() => chime('fim', { ui: { ...ui, sound: true } })}>Ouvir</button>{sw(ui.sound !== false, () => act.setUi({ sound: ui.sound === false }), 'Sons e vibração')}</div></div>
        <div><p className="text-sm text-zinc-200 mb-1.5">Tema</p><Seg value={ui.theme} onChange={(v) => act.setUi({ theme: v })} options={[['dark', 'Escuro'], ['light', 'Claro']]} label="Tema" /></div>
        <div><p className="text-sm text-zinc-200 mb-1.5">Fonte</p><Seg value={ui.font} onChange={(v) => act.setUi({ font: v })} options={[['padrao', 'Padrão'], ['legivel', 'Mais legível']]} label="Fonte" /><p className="text-xs text-zinc-500 mt-1.5">A “mais legível” (Atkinson Hyperlegible) diferencia melhor letras parecidas.</p></div>
        <div><p className="text-sm text-zinc-200 mb-1.5">Tamanho do texto</p><Seg value={ui.size} onChange={(v) => act.setUi({ size: v })} options={[['normal', 'Normal'], ['grande', 'Grande']]} label="Tamanho" /></div>
      </div>
      <div className={card + ' p-5 space-y-3'}>
        <p className="text-zinc-100 font-medium">Backup</p>
        <p className="text-sm text-zinc-500">Hoje tudo fica só neste navegador. Exporte de vez em quando para não perder nada.</p>
        <div className="flex flex-wrap gap-2"><button className={btnP} onClick={exportar}><Ic n="Download" />Baixar backup</button><button className={btnG} onClick={copiar}><Ic n="Copy" />Copiar dados</button>
          <label className={btnG + ' cursor-pointer'}><Ic n="Upload" />Importar backup<input type="file" accept=".json,application/json" className="sr-only" onChange={(e) => { const fl = e.target.files[0]; if (fl) fl.text().then(ler); e.target.value = ''; }} /></label></div>
        {imp && <div className="rounded-xl border border-[#ffc24d]/40 bg-[#ffc24d]/[0.06] p-3 space-y-2"><p className="text-sm text-zinc-200">Backup de {fmtDia(imp.day).toLowerCase()} com {imp.tasks.length} tarefas e {imp.fixed.length} horários fixos. Ele substitui tudo o que está aqui agora.</p>
          <div className="flex gap-2"><button className={btnP} onClick={() => { act.importData(imp); setImp(null); setMsg('Backup restaurado.'); }}>Substituir pelos dados do backup</button><button className={btnG} onClick={() => setImp(null)}>Cancelar</button></div></div>}
        {msg && <p className="text-sm text-zinc-400" role="status">{msg}</p>}
      </div>
    </div>
  );
}

/* ===================== CUIDAR: rotinas guiadas, humor, gamificação ===================== */
const ROUTINES0 = {
  manha: { on: true, title: 'Rotina da manhã', steps: [
    { id: 'm1', t: 'Beber um copo de água', min: 1, ess: true }, { id: 'm2', t: 'Escovar os dentes', min: 3, ess: true }, { id: 'm3', t: 'Lavar o rosto', min: 2, ess: false },
    { id: 'm4', t: 'Tomar o remédio, se tiver', min: 1, ess: true }, { id: 'm5', t: 'Trocar de roupa', min: 5, ess: false }, { id: 'm6', t: 'Comer alguma coisa', min: 10, ess: false }] },
  noite: { on: true, title: 'Rotina da noite', steps: [
    { id: 'n1', t: 'Separar a roupa e a bolsa de amanhã', min: 4, ess: false }, { id: 'n2', t: 'Escovar os dentes', min: 3, ess: true }, { id: 'n3', t: 'Cuidar da pele', min: 4, ess: false },
    { id: 'n4', t: 'Celular carregando longe da cama', min: 1, ess: true }, { id: 'n5', t: 'Luz baixa e algo calmo (ler, música)', min: 10, ess: false }] },
};
const routineDur = (r, min) => r.steps.filter((x) => !min || x.ess).reduce((a, x) => a + x.min, 0);
const LEVELS = [0, 3, 7, 14, 21, 30, 45, 60, 90];
const LUME_ITEMS = [null, ['cachecol', 'Cachecol'], ['planta', 'Plantinha'], ['abajur', 'Abajur'], ['estrelas', 'Estrelas na parede'], ['livros', 'Pilha de livros'], ['flores', 'Coroa de flores'], ['janela', 'Janela com lua'], ['tapete', 'Tapete fofinho']];
function lumeLevel(s) {
  const pts = Object.values(s.keptDays || {}).filter((v) => v === 'feito').length + Object.keys(s.missions || {}).filter((d) => (s.missions[d] || {}).full).length * 0.5;
  let lv = 0; LEVELS.forEach((t, i) => { if (pts >= t) lv = i; });
  return { lv, pts: Math.floor(pts), next: LEVELS[lv + 1] ?? null, cur: LEVELS[lv] };
}
let LUME_LV = 0;
const BADGES = [
  ['travada', 'Comecei travada', 'Usar “não sei por onde começar” ou “travou” e mesmo assim concluir algo', 'Footprints'],
  ['voltei', 'Voltei', 'Voltar depois de dias sem abrir o app', 'DoorOpen'],
  ['pausa', 'Respeitei a pausa', 'Fazer a pausa que a babá sugeriu', 'Coffee'],
  ['sobrevivencia', 'Sobrevivi ao dia', 'Usar o Dia de Sobrevivência em vez de desistir', 'ShieldCheck'],
  ['minimo', 'Mínimo também conta', 'Concluir algo na versão mínima', 'Feather'],
  ['missoes', 'Missões do dia', 'Completar as 3 missões de um dia', 'Target'],
  ['rotina', 'Rotina até o fim', 'Seguir uma rotina guiada até o último passo', 'ListChecks'],
  ['humor', 'Me escutei', 'Registrar como estava em 3 dias diferentes', 'HeartHandshake'],
  ['semana', 'Sete dias de constância', 'Somar 7 dias com pelo menos uma coisa feita', 'CalendarCheck'],
  ['caixa', 'Caixa zerada', 'Organizar a caixa de entrada até o fim', 'Inbox'],
];
function badge(n, id) { if (!n.badges || n.badges[id]) return n; return { ...n, badges: { ...n.badges, [id]: n.day }, newBadge: id }; }
function missionsFor(s) {
  const en = energyOf(s).total, w = wMl(s), its = s.plan.items.filter((it) => it.day === s.day);
  const done = its.filter((it) => it.status === 'feito'), prodDone = done.filter((it) => !areaOf(s, it));
  const manual = (s.missions && s.missions[s.day]) || {};
  const meals = s.mealsDone[s.day] || {}, meds = s.careCfg.meds || [], mt = s.medsTaken[s.day] || {};
  const routineDone = done.some((it) => it.kind === 'routine');
  const P = {
    agua3: ['Beber 750 ml de água', () => w >= 750], agua6: ['Beber 1,5 L de água', () => w >= 1500], agua8: ['Bater a meta de água', () => w >= (gMl(s) || 2000)],
    um: ['Fazer 1 coisa, nem que seja o mínimo', () => done.length >= 1], duas: ['Fazer 2 tarefas', () => prodDone.length >= 2], tres: ['Fazer 3 tarefas', () => prodDone.length >= 3],
    pesada: ['Fazer 1 tarefa pesada (o mínimo vale)', () => prodDone.some((it) => it.load === 'pesada')],
    comer: ['Comer uma refeição de verdade', () => Object.values(meals).some(Boolean)], remedio: ['Tomar o remédio', () => meds.length > 0 && meds.every((m) => mt[m.id])],
    rotina: ['Fazer uma rotina (manhã ou noite)', () => routineDone], deitar: ['Deitar no horário', null], pausa: ['Fazer uma pausa longe da tela', null], caixa: ['Organizar a caixa de entrada', () => s.inbox.length === 0],
  };
  const band = en < 45 ? ['agua3', 'um', 'deitar', 'comer', meds.length ? 'remedio' : 'pausa'] : en < 70 ? ['agua6', 'duas', 'rotina', 'pausa', s.inbox.length ? 'caixa' : 'comer'] : ['agua8', 'pesada', 'tres', 'rotina', s.inbox.length ? 'caixa' : 'deitar'];
  const seed = s.day * 7; const pick = []; const pool = [...band];
  while (pick.length < 3 && pool.length) pick.push(pool.splice((seed + pick.length * 3) % pool.length, 1)[0]);
  return pick.map((k) => { const [t, f] = P[k]; const auto = f ? f() : null; return { k, t, manual: !f, ok: f ? auto : !!manual[k] }; });
}
function Missions({ s, act }) {
  const ms = missionsFor(s), n = ms.filter((m) => m.ok).length;
  useEffect(() => { if (n === 3) act.missionsFull(); }, [n]);
  return (
    <div className={card + ' p-4 space-y-2.5'}>
      <div className="flex items-baseline justify-between"><p className="text-sm text-zinc-300 flex items-center gap-2"><Ic n="Target" className="w-4 h-4 text-[#9f8fff]" />Missões de hoje</p><span className={`text-xs tabular-nums ${n === 3 ? 'text-[#2ee8c4]' : 'text-zinc-500'}`}>{n === 3 ? 'dia cumprido ✓' : `${n}/3`}</span></div>
      <div className="grid sm:grid-cols-3 gap-2">{ms.map((m) => (
        <button key={m.k} disabled={!m.manual} onClick={() => act.missionTick(m.k)} className={`min-h-[52px] rounded-xl border px-3 py-2 text-left text-sm flex items-center gap-2.5 press ${m.ok ? 'border-[#2ee8c4]/40 bg-[#2ee8c4]/10 text-[#a8f7e8]' : 'border-white/10 text-zinc-300'} ${m.manual ? 'hover:bg-white/[0.04] cursor-pointer' : 'cursor-default'}`}>
          <span className={`chk w-[18px] h-[18px] rounded-full border grid place-items-center shrink-0 ${m.ok ? 'bg-[#2ee8c4] border-[#2ee8c4] text-zinc-950 pop' : 'border-zinc-600'}`}>{m.ok && <Ic n="Check" className="w-3 h-3" />}</span>
          <span className="leading-snug">{m.t}{m.manual && !m.ok && <span className="block text-[11px] text-zinc-500">toque quando fizer</span>}</span></button>))}</div>
    </div>
  );
}
function LumeRoom({ s, big }) {
  const L = lumeLevel(s), has = (k) => LUME_ITEMS.slice(1, L.lv + 1).some((x) => x && x[0] === k);
  return (
    <div className={`relative overflow-hidden rounded-2xl ${big ? 'h-56' : 'h-28'} bg-gradient-to-b from-[#1a1830] to-[#121218] border border-white/[0.06]`} aria-hidden="true">
      {has('janela') && <div className="absolute top-4 right-6 w-14 h-14 rounded-lg bg-[#1d2444] border border-white/10"><span className="absolute top-2.5 right-3 w-4 h-4 rounded-full bg-[#ffe9a8] shadow-[0_0_14px_#ffe9a8]" /></div>}
      {has('estrelas') && <>{[[12, 14], [30, 26], [52, 12], [70, 30]].map(([x, y], i) => <span key={i} className="absolute text-[#ffe9a8] text-xs flame" style={{ left: `${x}%`, top: y, animationDelay: `${i * 0.4}s` }}>✦</span>)}</>}
      <div className="absolute bottom-0 inset-x-0 h-8 bg-[#18161f] border-t border-white/[0.05]" />
      {has('tapete') && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-3 rounded-full bg-[#9f8fff]/30" />}
      {has('planta') && <div className="absolute bottom-7 left-6 flex flex-col items-center"><span className="text-2xl leading-none">🌱</span><span className="w-6 h-4 rounded-b-md bg-[#c98a5e]" /></div>}
      {has('abajur') && <div className="absolute bottom-7 right-8 flex flex-col items-center"><span className="w-8 h-5 rounded-t-full bg-[#ffc24d]/90 shadow-[0_0_30px_rgba(255,194,77,.6)]" /><span className="w-1 h-8 bg-zinc-500" /></div>}
      {has('livros') && <div className="absolute bottom-7 left-16 flex flex-col gap-0.5">{['#ff7f5e', '#2ee8c4', '#9f8fff'].map((c) => <span key={c} className="w-9 h-2 rounded-sm" style={{ background: c }} />)}</div>}
      {!has('planta') && <div className="absolute bottom-7 left-6 w-6 h-10 rounded-md border border-dashed border-white/10" />}
      {!has('abajur') && <div className="absolute bottom-7 right-8 w-8 h-12 rounded-md border border-dashed border-white/10" />}
      {!has('janela') && <div className="absolute top-4 right-6 w-14 h-14 rounded-lg border border-dashed border-white/10" />}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 pet-float"><Pet mood="calmo" size={big ? 84 : 56} /></div>
    </div>
  );
}
function LumeLevelCard({ s }) {
  const L = lumeLevel(s), nxt = LUME_ITEMS[L.lv + 1];
  return (
    <div className={card + ' p-5'}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] items-center">
        <LumeRoom s={s} big />
        <div className="space-y-4">
          <div><div className="flex items-baseline justify-between gap-3"><p className="text-zinc-100 font-medium text-lg">O quarto do Lume</p><span className="text-sm text-[#cdc4ff] tabular-nums">nível {L.lv}</span></div>
            <p className="text-sm text-zinc-500">Cresce com os dias de constância. O mínimo conta igual ao completo.</p></div>
          {L.next != null ? <div className="space-y-1.5"><div className="h-2 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full bar-anim" style={{ width: `${clamp(((L.pts - L.cur) / (L.next - L.cur)) * 100, 3, 100)}%`, background: 'linear-gradient(90deg,#9f8fff,#2ee8c4)' }} /></div>
            <p className="text-xs text-zinc-400">{L.next - L.pts} {L.next - L.pts === 1 ? 'dia' : 'dias'} para ganhar: <b className="text-zinc-200 font-medium">{nxt ? nxt[1].toLowerCase() : 'o próximo nível'}</b></p></div>
            : <p className="text-xs text-zinc-400">Quarto completo.</p>}
          <div className="grid grid-cols-2 gap-1.5">{LUME_ITEMS.slice(1).map((x, i) => { const on = i + 1 <= L.lv; return (
            <div key={x[0]} className={`h-9 rounded-lg px-2.5 flex items-center gap-2 text-xs ${on ? 'bg-[#9f8fff]/12 text-zinc-200' : 'border border-dashed border-white/10 text-zinc-500'}`}>
              <Ic n={on ? 'Check' : 'Lock'} className={`w-3.5 h-3.5 shrink-0 ${on ? 'text-[#2ee8c4]' : ''}`} /><span className="truncate">{x[1]}</span><span className="ml-auto tabular-nums opacity-70">{on ? '' : `${LEVELS[i + 1]}d`}</span></div>); })}</div>
        </div>
      </div>
    </div>
  );
}
function BadgesCard({ s }) {
  const b = s.badges || {}, got = BADGES.filter((x) => b[x[0]] != null), rest = BADGES.filter((x) => b[x[0]] == null);
  const tile = ([id, t, d, ic], on) => (
    <div key={id} title={d} className={`rounded-xl p-3 flex flex-col items-center text-center gap-2 ${on ? 'border border-[#9f8fff]/40 bg-[#9f8fff]/[0.08]' : 'border border-dashed border-white/10'}`}>
      <span className={`w-11 h-11 rounded-full grid place-items-center ${on ? 'bg-[#9f8fff]/25 text-[#cdc4ff]' : 'bg-white/[0.04] text-zinc-600'}`}><Ic n={ic} className="w-5 h-5" /></span>
      <span className={`text-sm leading-tight ${on ? 'text-zinc-100' : 'text-zinc-400'}`}>{t}</span>
      <span className="text-[11px] leading-snug text-zinc-500 line-clamp-2">{on ? `em ${fmtCurto(b[id])}` : d}</span>
    </div>);
  return (
    <div className={card + ' p-5 space-y-3'}>
      <div className="flex items-baseline justify-between"><p className="text-zinc-100 font-medium">Conquistas</p><span className="text-xs text-zinc-500 tabular-nums">{got.length} de {BADGES.length}</span></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">{got.map((x) => tile(x, true))}{rest.map((x) => tile(x, false))}</div>
    </div>
  );
}
function MoodStrip({ s }) {
  const days = Array.from({ length: 14 }, (_, i) => s.day - 13 + i), M = s.moods || {};
  const HC = ['#ff7f5e', '#ffa86b', '#ffc24d', '#8fe3b5', '#2ee8c4'], SC = { ok: '#2ee8c4', cheio: '#ffc24d', sobrecarga: '#ff7f5e' };
  if (!Object.keys(M).length) return null;
  return (
    <div className={card + ' p-5 space-y-3'}>
      <p className="text-zinc-100 font-medium">Humor e sensorial</p>
      {[['Humor', (d) => (M[d] && M[d].humor != null ? HC[M[d].humor] : null)], ['Sensorial', (d) => (M[d] && M[d].sens ? SC[M[d].sens] : null)]].map(([l, f]) => (
        <div key={l} className="flex items-center gap-3"><span className="w-16 text-xs text-zinc-500">{l}</span><div className="flex-1 grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1">{days.map((d) => <span key={d} title={fmtCurto(d)} className="h-5 rounded" style={{ background: f(d) || 'rgba(255,255,255,.05)' }} />)}</div></div>))}
      <div className="flex items-center gap-3"><span className="w-16" /><div className="flex-1 grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1">{days.map((d) => <span key={d} className={`text-center text-[10px] ${d === s.day ? 'text-zinc-200' : 'text-zinc-500'}`}>{DIAS[weekdayOf(d)][0]}</span>)}</div></div>
    </div>
  );
}
const HUMOR_C = ['#ff7f5e', '#ffa86b', '#ffc24d', '#8fe3b5', '#2ee8c4'];
const HUMOR = [['Muito mal', 'Frown'], ['Mal', 'Frown'], ['Ok', 'Meh'], ['Bem', 'Smile'], ['Muito bem', 'Laugh']];
const SENS = [['ok', 'Tranquilo'], ['cheio', 'Cheio'], ['sobrecarga', 'Sobrecarregado']];
function RoutineRunner(props) { return ReactDOM.createPortal(<RoutineRunnerIn {...props} />, document.body); }
function RoutineRunnerIn({ s, rid, act, onClose }) {
  const r = s.routines[rid], [min, setMin] = useState(energyOf(s).total < 45), steps = r.steps.filter((x) => !min || x.ess);
  const [i, setI] = useState(0), [done, setDone] = useState([]);
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);
  const st = steps[i], last = i >= steps.length;
  const finish = () => { act.routineFinish(rid, min); onClose(); };
  return (
    <div className="fixed inset-0 z-[60] bg-[#07080a] flex flex-col p-6" role="dialog" aria-modal="true" aria-label={r.title}>
      <div className="flex items-center gap-3 max-w-xl w-full mx-auto"><button className="h-10 px-3 rounded-lg text-zinc-400 hover:bg-white/5 flex items-center gap-2" onClick={onClose}><Ic n="X" />Sair</button>
        <div className="flex-1 h-1.5 rounded-full bg-white/[0.07] overflow-hidden"><div className="h-full rounded-full bar-anim" style={{ width: `${(Math.min(i, steps.length) / steps.length) * 100}%`, background: 'linear-gradient(90deg,#ff6fb5,#9f8fff)' }} /></div>
        <span className="text-xs text-zinc-500 tabular-nums">{Math.min(i + 1, steps.length)}/{steps.length}</span></div>
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 max-w-xl w-full mx-auto">
        {!last ? <>
          <p className="text-sm text-[#ff9fcf]">{r.title}{min ? ' · versão mínima' : ''}</p>
          <h2 key={st.id} className="text-3xl sm:text-4xl font-semibold text-zinc-50 tracking-tight leading-tight swap-in">{st.t}</h2>
          <p className="text-zinc-500">mais ou menos {st.min} min</p>
          <div className="flex flex-wrap gap-2 justify-center"><button className={btnP + ' min-w-[200px] text-base'} onClick={() => { setDone([...done, st.id]); setI(i + 1); }}><Ic n="Check" />Feito, próximo</button><button className={btnG} onClick={() => setI(i + 1)}>Pular este</button></div>
          {i === 0 && <button className={btnL} onClick={() => { setMin(!min); setI(0); }}>{min ? 'Fazer a versão completa' : 'Dia ruim? Fazer só o essencial'}</button>}
        </> : <>
          <div className="pet-float"><Pet mood="calmo" size={96} /></div>
          <h2 className="text-3xl font-semibold text-zinc-50">{done.length ? 'Rotina feita.' : 'Tudo bem pular hoje.'}</h2>
          <p className="text-zinc-400">{done.length ? `${done.length} de ${steps.length} passos. Isso é cuidar de você.` : 'Amanhã tem de novo, sem cobrança.'}</p>
          <button className={btnP + ' min-w-[200px]'} onClick={finish}><Ic n="Sparkles" />Concluir</button>
        </>}
      </div>
    </div>
  );
}
function MinStepper({ value, onChange, label, max = 120 }) {
  const step = (d) => { const v = value + d * (value >= 10 || (d > 0 && value >= 5) ? 5 : 1); onChange(clamp(v, 1, max)); };
  return (
    <div role="group" aria-label={label} className="inline-flex items-center rounded-lg border border-white/10 h-9">
      <button type="button" className="w-8 h-full grid place-items-center text-zinc-400 hover:text-zinc-100 press" aria-label={`Menos tempo: ${label}`} onClick={() => step(-1)}>−</button>
      <span className="min-w-[52px] text-center text-sm text-zinc-100 tabular-nums">{value} min</span>
      <button type="button" className="w-8 h-full grid place-items-center text-zinc-400 hover:text-zinc-100 press" aria-label={`Mais tempo: ${label}`} onClick={() => step(1)}>+</button>
    </div>
  );
}
function RoutineEditor({ s, rid, act, onClose }) {
  const r = s.routines[rid], [steps, setSteps] = useState(r.steps), [t, setT] = useState('');
  const up = (id, p) => setSteps(steps.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= steps.length) return; const a = [...steps]; [a[i], a[j]] = [a[j], a[i]]; setSteps(a); };
  const add = () => { if (!t.trim()) return; setSteps([...steps, { id: uid(), t: t.trim(), min: 3, ess: false }]); setT(''); };
  const tot = steps.reduce((a, x) => a + x.min, 0), essT = steps.filter((x) => x.ess).reduce((a, x) => a + x.min, 0);
  return (
    <div className="space-y-3 pt-1 rise">
      <p className="text-xs text-zinc-500"><span className="text-[#ff9fcf]">Essencial</span> é o que fica no dia ruim. Total: {tot} min completa · {essT} min no essencial.</p>
      <ol className="space-y-2">{steps.map((x, i) => (
        <li key={x.id} className="rounded-xl border border-white/[0.08] bg-zinc-950/50 p-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 text-center text-xs text-zinc-500 tabular-nums shrink-0">{i + 1}</span>
            <input className={inp + ' h-10 flex-1'} value={x.t} onChange={(e) => up(x.id, { t: e.target.value })} aria-label={`Passo ${i + 1}`} />
            <button className="w-9 h-10 grid place-items-center rounded-lg text-zinc-500 hover:bg-white/5 shrink-0" aria-label={`Remover passo ${i + 1}`} onClick={() => setSteps(steps.filter((y) => y.id !== x.id))}><Ic n="X" className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 sm:pl-8">
            <MinStepper label={x.t || `passo ${i + 1}`} value={x.min} onChange={(v) => up(x.id, { min: v })} />
            <button aria-pressed={x.ess} onClick={() => up(x.id, { ess: !x.ess })} className={`h-9 px-2.5 rounded-lg text-xs flex items-center gap-1.5 shrink-0 press ${x.ess ? 'bg-[#ff6fb5]/15 text-[#ff9fcf]' : 'border border-white/10 text-zinc-400'}`}><Ic n={x.ess ? 'Heart' : 'Plus'} className="w-3.5 h-3.5" />{x.ess ? 'Essencial' : 'Extra'}</button>
            <span className="ml-auto flex shrink-0">
              <button className="w-8 h-9 grid place-items-center rounded-lg text-zinc-500 hover:bg-white/5 disabled:opacity-30" disabled={i === 0} aria-label="Subir passo" onClick={() => move(i, -1)}><Ic n="ChevronUp" className="w-4 h-4" /></button>
              <button className="w-8 h-9 grid place-items-center rounded-lg text-zinc-500 hover:bg-white/5 disabled:opacity-30" disabled={i === steps.length - 1} aria-label="Descer passo" onClick={() => move(i, 1)}><Ic n="ChevronDown" className="w-4 h-4" /></button>
            </span>
          </div>
        </li>))}</ol>
      <div className="flex gap-2"><input className={inp + ' h-10 flex-1'} value={t} placeholder="Novo passo, ex.: passar protetor" onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} aria-label="Novo passo" /><button className={btnG + ' h-10 min-h-[40px]'} onClick={add} disabled={!t.trim()}><Ic n="Plus" />Adicionar</button></div>
      <div className="flex gap-2 pt-1"><button className={btnP} onClick={() => { act.setRoutine(rid, { steps }); onClose(); }}><Ic n="Check" />Salvar</button><button className={btnG} onClick={onClose}>Cancelar</button></div>
    </div>
  );
}
function CyclesCard({ s, act }) {
  const [open, setOpen] = useState(null), [f, setF] = useState(null), [flt, setFlt] = useState('todos');
  const edit = (c) => { if (open === c.id) { setOpen(null); setF(null); } else { setOpen(c.id); setF({ ...c, area: cycleArea(c) }); } };
  const list = s.cycles.filter((c) => flt === 'todos' || cycleArea(c) === flt).slice().sort((a, b) => (a.every - (s.day - a.last)) - (b.every - (s.day - b.last)));
  return (
    <div className={card + ' p-5 space-y-3'}>
      <div className="flex items-center justify-between gap-2"><p className="text-zinc-100 font-medium">Casa e autocuidado</p>
        <button className={btnG + ' min-h-[36px] h-9 text-sm'} onClick={() => { setOpen('new'); setF({ id: 'new', title: '', every: 7, dur: 20, last: s.day - 1, area: 'cuidado' }); }}><Ic n="Plus" className="w-3.5 h-3.5" />Novo</button></div>
      <p className="text-xs text-zinc-500">O que se repete a cada X dias. Entra na semana sozinho e não conta como produtividade.</p>
      <div className="flex gap-1.5">{[['todos', 'Todos'], ['cuidado', 'Autocuidado'], ['casa', 'Casa']].map(([k, l]) => <button key={k} aria-pressed={flt === k} onClick={() => setFlt(k)} className={`h-8 px-3 rounded-full text-xs press ${flt === k ? 'bg-zinc-100 text-zinc-900' : 'bg-white/[0.05] text-zinc-400'}`}>{l}</button>)}</div>
      {open === 'new' && <div className="rounded-xl border border-[#9f8fff]/30 bg-zinc-950/50 pt-4"><CycleForm f={f} setF={setF} onSave={(v) => { act.saveEntity('cycles', v); setOpen(null); }} onCancel={() => setOpen(null)} /></div>}
      <ul className="divide-y divide-white/[0.05]">{list.map((c) => { const n = s.day - c.last, due = n >= c.every, ar = cycleArea(c); return (
        <li key={c.id} className="py-2">
          <div className="flex items-center gap-3 text-sm">
            <Ic n={AREA[ar].icon} className="w-4 h-4 shrink-0" style={{ color: AREA[ar].c }} />
            <button className="flex-1 min-w-0 text-left" onClick={() => edit(c)}><span className="block text-zinc-200 truncate">{c.title}</span><span className="block text-xs text-zinc-500">a cada {c.every} {c.every === 1 ? 'dia' : 'dias'} · {c.dur} min · {n <= 0 ? <span className="text-[#2ee8c4]">feito hoje</span> : due ? <span style={{ color: AREA[ar].c }}>bom momento</span> : `em ${c.every - n} ${c.every - n === 1 ? 'dia' : 'dias'}`}</span></button>
            <button className="h-8 px-2.5 rounded-lg text-xs border border-white/10 text-zinc-200 hover:bg-white/5 disabled:opacity-40 press shrink-0" disabled={n <= 0} onClick={() => act.cycleToday(c)}>{n <= 0 ? 'Feito' : 'Fiz hoje'}</button>
            <button className="w-8 h-8 grid place-items-center rounded-lg text-zinc-500 hover:bg-white/5 shrink-0" aria-label={`Editar ${c.title}`} onClick={() => edit(c)}><Ic n="Pencil" className="w-3.5 h-3.5" /></button>
          </div>
          {open === c.id && <div className="mt-3 rounded-xl border border-white/[0.08] bg-zinc-950/50 pt-4"><CycleForm f={f} setF={setF} onSave={(v) => { act.saveEntity('cycles', v); setOpen(null); }} onCancel={() => setOpen(null)} onDelete={() => { act.deleteEntity('cycles', c.id); setOpen(null); }} /></div>}
        </li>); })}</ul>
      {!list.length && <p className="text-sm text-zinc-500">Nada aqui ainda.</p>}
    </div>
  );
}
function HojeCard({ s, act }) {
  const [ed, setEd] = useState(false);
  const en = energyOf(s), now = nowRef(s), goal = gMl(s), w = wMl(s), taken = s.medsTaken[s.day] || {}, meals = s.mealsDone[s.day] || {};
  const M = s.careCfg.meals || [], D = s.careCfg.meds || [];
  const setMeal = (id, p) => act.setCare({ meals: M.map((x) => (x.id === id ? { ...x, ...p } : x)) });
  const setMed = (id, p) => act.setCare({ meds: D.map((x) => (x.id === id ? { ...x, ...p } : x)) });
  const sec = (ic, color, t, extra) => <div className="flex items-center gap-2"><Ic n={ic} className="w-4 h-4" style={{ color }} /><p className="text-sm text-zinc-200 font-medium">{t}</p>{extra}</div>;
  const rm = (label, fn) => <button className="w-9 h-10 grid place-items-center rounded-lg text-zinc-500 hover:bg-white/5 shrink-0" aria-label={label} onClick={fn}><Ic n="X" className="w-4 h-4" /></button>;
  return (
    <div className={card + ' p-5 space-y-5'}>
      <div className="flex items-center justify-between"><p className="text-zinc-100 font-medium">Hoje</p>
        <button className={(ed ? btnP : btnG) + ' min-h-[36px] h-9 text-sm'} onClick={() => setEd(!ed)}><Ic n={ed ? 'Check' : 'Pencil'} className="w-3.5 h-3.5" />{ed ? 'Pronto' : 'Editar'}</button></div>
      <section className="space-y-2">
        {sec('GlassWater', '#2ee8c4', 'Água')}
        {ed ? <div className="flex items-center gap-3"><span className="text-sm text-zinc-400">Meta por dia</span>
            <button className="w-9 h-9 rounded-lg border border-white/10 text-zinc-300 press" aria-label="Diminuir a meta em 250 ml" onClick={() => act.setCare({ waterMl: clamp(goal - 250, 0, 5000) })}>−</button>
            <span className="w-20 text-center text-zinc-100 tabular-nums">{goal ? fmtL(goal) : 'desligado'}</span>
            <button className="w-9 h-9 rounded-lg border border-white/10 text-zinc-300 press" aria-label="Aumentar a meta em 250 ml" onClick={() => act.setCare({ waterMl: clamp(goal + 250, 0, 5000) })}>+</button></div>
          : goal > 0 ? <WaterBar s={s} act={act} big />
          : <p className="text-sm text-zinc-500">Desligado. Toque em Editar para pôr uma meta.</p>}
      </section>
      <section className="space-y-2 border-t border-white/[0.06] pt-4">
        {sec('Utensils', '#ff6fb5', 'Refeições', !ed && M.length > 0 && <span className="ml-auto text-xs text-zinc-500">{M.filter((m) => meals[m.id]).length} de {M.length}</span>)}
        {ed ? <div className="space-y-2">{M.map((m) => <div key={m.id} className="grid grid-cols-[minmax(0,1fr)_104px_auto] gap-2 items-center">
            <input className={inp + ' h-10'} value={m.name} aria-label="Nome da refeição" onChange={(e) => setMeal(m.id, { name: e.target.value })} />
            <TimeField id={`hm-${m.id}`} label={`Horário de ${m.name}`} value={m.time} onChange={(v) => setMeal(m.id, { time: v })} />
            {rm(`Remover ${m.name}`, () => act.setCare({ meals: M.filter((x) => x.id !== m.id) }))}</div>)}
            <button className={btnL + ' text-[#9f8fff]'} onClick={() => act.setCare({ meals: [...M, { id: uid(), name: 'Lanche', time: '16:00' }] })}><Ic n="Plus" className="w-3.5 h-3.5" />Adicionar refeição</button></div>
          : M.length ? <div className="grid grid-cols-2 gap-2">{M.map((m) => { const ok = meals[m.id], late = !ok && now > toMin(m.time) + 30; return (
            <button key={m.id} onClick={() => act.meal(m.id)} aria-pressed={!!ok} className={`h-11 px-3 rounded-xl text-sm flex items-center gap-2 press ${ok ? 'bg-[#ff6fb5]/15 text-[#ffb3d9]' : late ? 'border border-[#ff6fb5]/50 text-zinc-100' : 'border border-white/10 text-zinc-300 hover:bg-white/[0.04]'}`}>
              <span className={`chk w-4 h-4 rounded-full border grid place-items-center shrink-0 ${ok ? 'bg-[#ff6fb5] border-[#ff6fb5] text-zinc-950 pop' : 'border-zinc-600'}`}>{ok && <Ic n="Check" className="w-2.5 h-2.5" />}</span>
              <span className="truncate">{m.name}</span><span className="ml-auto text-xs opacity-60 tabular-nums">{m.time}</span></button>); })}</div>
          : <p className="text-sm text-zinc-500">Nenhuma refeição com lembrete.</p>}
      </section>
      <section className="space-y-2 border-t border-white/[0.06] pt-4">
        {sec('Pill', '#ffc24d', 'Remédios')}
        {ed ? <div className="space-y-2">{D.map((m) => <div key={m.id} className="grid grid-cols-[minmax(0,1fr)_104px_auto] gap-2 items-center">
            <input className={inp + ' h-10'} value={m.name} aria-label="Nome do remédio" onChange={(e) => setMed(m.id, { name: e.target.value })} />
            <TimeField id={`hd-${m.id}`} label={`Horário de ${m.name}`} value={m.time} onChange={(v) => setMed(m.id, { time: v })} />
            {rm(`Remover ${m.name}`, () => act.setCare({ meds: D.filter((x) => x.id !== m.id) }))}</div>)}
            <button className={btnL + ' text-[#9f8fff]'} onClick={() => act.setCare({ meds: [...D, { id: uid(), name: '', time: '08:00', stock: null, dose: 1 }] })}><Ic n="Plus" className="w-3.5 h-3.5" />Adicionar remédio</button>
            {D.length > 0 && <p className="text-xs text-zinc-500">Estoque e dose ficam em Minha Rotina → Sono e cuidados.</p>}</div>
          : D.length ? D.map((m) => <button key={m.id} onClick={() => act.med(m.id)} className="w-full flex items-center gap-3 text-left text-sm min-h-[40px]"><span className={`chk w-5 h-5 rounded-md border grid place-items-center ${taken[m.id] ? 'bg-[#2ee8c4] border-[#2ee8c4] text-zinc-950 pop' : 'border-zinc-600'}`}>{taken[m.id] && <Ic n="Check" className="w-3 h-3" />}</span><span className={taken[m.id] ? 'text-zinc-500 line-through' : 'text-zinc-200'}>{m.name || 'Remédio'}</span><span className="ml-auto text-zinc-500 tabular-nums">{m.time}{m.stock != null ? ` · resta ${m.stock}` : ''}</span></button>)
          : <button className={btnL + ' text-[#9f8fff]'} onClick={() => { setEd(true); act.setCare({ meds: [{ id: uid(), name: '', time: '08:00', stock: null, dose: 1 }] }); }}><Ic n="Plus" className="w-3.5 h-3.5" />Adicionar remédio</button>}
      </section>
      <section className="space-y-2 border-t border-white/[0.06] pt-4">
        {sec('Moon', '#9f8fff', 'Sono')}
        {ed ? <div className="grid grid-cols-2 gap-2 max-w-sm"><div><span className="text-xs text-zinc-500">Deitar</span><TimeField id="hs-b" label="Deitar" value={s.sleepGoal.bed} onChange={(v) => act.setGoal({ bed: v })} /></div><div><span className="text-xs text-zinc-500">Acordar</span><TimeField id="hs-w" label="Acordar" value={s.sleepGoal.wake} onChange={(v) => act.setGoal({ wake: v })} /></div>
            <p className="col-span-2 text-xs text-zinc-500">Meta: {fmtH(sleepHours(s.sleepGoal.bed, s.sleepGoal.wake))} por noite. Muda a semana inteira.</p></div>
          : <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3"><p className="text-xs text-zinc-500">Noite passada</p><p className="text-lg text-zinc-100 tabular-nums">{s.today.checkedIn ? fmtH(en.h) : '—'}</p><p className="text-xs text-zinc-500">{s.today.checkedIn ? `meta ${fmtH(en.goal)}` : 'sem check-in hoje'}</p></div>
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3"><p className="text-xs text-zinc-500">Hoje</p><p className="text-lg text-zinc-100 tabular-nums">{s.sleepGoal.bed}</p><p className="text-xs text-zinc-500">deitar até · acordar {s.sleepGoal.wake}</p></div></div>}
      </section>
    </div>
  );
}
function Cuidar({ s, act, setTab }) {
  const [run, setRun] = useState(null), [edit, setEdit] = useState(null);
  const md = (s.moods || {})[s.day] || {}, en = energyOf(s), now = nowRef(s);
  const taken = s.medsTaken[s.day] || {}, meals = s.mealsDone[s.day] || {};
  const rItem = (rid) => s.plan.items.find((it) => it.day === s.day && it.kind === 'routine' && it.ref === rid);
  const cy = s.cycles.filter((c) => cycleArea(c) === 'cuidado'), casa = s.cycles.filter((c) => cycleArea(c) === 'casa');
  return (
    <div className="space-y-4 max-w-5xl">
      <div className={card + ' p-5 space-y-4 mood-card'} style={md.humor != null ? { borderColor: HUMOR_C[md.humor] + '66', background: `radial-gradient(120% 140% at 0% 0%, ${HUMOR_C[md.humor]}22, transparent 60%), rgba(24,24,27,.6)` } : null}>
        <p className="text-zinc-100 font-medium flex items-center gap-2">Como você está hoje?{md.humor != null && <span className="text-sm font-normal" style={{ color: HUMOR_C[md.humor] }}>{HUMOR[md.humor][0].toLowerCase()}</span>}</p>
        <div className="grid grid-cols-5 gap-2">{HUMOR.map(([l, ic], i) => <button key={l} aria-pressed={md.humor === i} onClick={() => act.mood({ humor: i })} className="min-h-[64px] rounded-xl border text-xs flex flex-col items-center justify-center gap-1 press transition-colors" style={md.humor === i ? { borderColor: HUMOR_C[i], background: HUMOR_C[i] + '26', color: '#fafafa' } : { borderColor: 'rgba(255,255,255,.1)', color: HUMOR_C[i] + 'cc' }}><Ic n={ic} className="w-5 h-5" /><span className={md.humor === i ? '' : 'text-zinc-400'}>{l}</span></button>)}</div>
        <div className="flex flex-wrap items-center gap-2"><span className="text-sm text-zinc-400 mr-1">Sensorial:</span>{SENS.map(([k, l]) => <button key={k} aria-pressed={md.sens === k} onClick={() => act.mood({ sens: k })} className={`h-9 px-3.5 rounded-full text-sm press ${md.sens === k ? 'bg-[#9f8fff]/20 text-[#cdc4ff]' : 'bg-white/[0.05] text-zinc-400 hover:bg-white/[0.08]'}`}>{l}</button>)}</div>
        <p className="text-xs text-zinc-500 hint">Um toque por dia. Aparece no Progresso e ajuda o Lume a entender seus dias.{md.sens === 'sobrecarga' ? ' Hoje eu peguei mais leve com você.' : ''}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {['manha', 'noite'].map((rid) => { const r = s.routines[rid], it = rItem(rid), dn = it && it.status === 'feito'; return (
          <div key={rid} className={card + ' p-5 space-y-3'}>
            <div className="flex items-center justify-between gap-2"><p className="text-zinc-100 font-medium flex items-center gap-2"><Ic n={rid === 'manha' ? 'Sunrise' : 'MoonStar'} className="w-4 h-4 text-[#ff6fb5]" />{r.title}</p>
              <button type="button" role="switch" aria-checked={r.on} aria-label={`Usar ${r.title}`} onClick={() => act.setRoutine(rid, { on: !r.on })}><span className={`block w-10 h-6 rounded-full p-0.5 transition-colors ${r.on ? 'bg-[#ff6fb5]' : 'bg-white/10'}`}><span className={`block w-5 h-5 rounded-full bg-white transition-transform ${r.on ? 'translate-x-4' : ''}`} /></span></button></div>
            <p className="text-sm text-zinc-500">{routineDur(r)} min completa · {routineDur(r, true)} min no dia ruim{it ? ` · hoje às ${hhmm(it.start)}` : ''}</p>
            {edit === rid ? <RoutineEditor s={s} rid={rid} act={act} onClose={() => setEdit(null)} /> : <>
              <ol className="space-y-1">{r.steps.map((x) => <li key={x.id} className="flex items-center gap-2 text-sm"><span className={`w-1.5 h-1.5 rounded-full ${x.ess ? 'bg-[#ff6fb5]' : 'bg-zinc-600'}`} /><span className={dn ? 'text-zinc-500 line-through' : 'text-zinc-300'}>{x.t}</span><span className="ml-auto text-xs text-zinc-500">{x.min} min</span></li>)}</ol>
              <div className="flex flex-wrap gap-2 pt-1">{r.on && <button className={btnP} disabled={dn} onClick={() => setRun(rid)}><Ic n={dn ? 'Check' : 'Play'} />{dn ? 'Feita hoje' : 'Começar passo a passo'}</button>}<button className={btnG} onClick={() => setEdit(rid)}><Ic n="Pencil" />Editar passos</button></div>
            </>}
            <p className="text-xs text-zinc-500 hint">Entra na sua semana como tarefa de autocuidado, todo dia. Não conta como produtividade.</p>
          </div>); })}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <HojeCard s={s} act={act} />
        <CyclesCard s={s} act={act} />
      </div>
      {run && <RoutineRunner s={s} rid={run} act={act} onClose={() => setRun(null)} />}
    </div>
  );
}
function Celebrate({ s, act }) {
  const id = s.newBadge; useEffect(() => { if (!id) return; const t = setTimeout(act.badgeSeen, 3800); return () => clearTimeout(t); }, [id]);
  if (!id) return null; const b = BADGES.find((x) => x[0] === id); if (!b) return null;
  return (
    <div className="fixed z-[70] left-1/2 -translate-x-1/2 top-6 swap-in" role="status">
      {!s.ui.lowStim && <div className="confetti" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ '--x': `${(i - 7) * 14}px`, '--r': `${i * 47}deg`, background: ['#9f8fff', '#2ee8c4', '#ffc24d', '#ff6fb5'][i % 4], animationDelay: `${(i % 5) * 40}ms` }} />)}</div>}
      <div className="rounded-2xl border border-[#9f8fff]/50 bg-zinc-900/95 backdrop-blur shadow-2xl shadow-black/60 px-4 py-3 flex items-center gap-3">
        <span className="w-10 h-10 rounded-full grid place-items-center bg-[#9f8fff]/25 text-[#cdc4ff] pop"><Ic n={b[3]} className="w-5 h-5" /></span>
        <div><p className="text-xs text-[#cdc4ff]">Conquista nova</p><p className="text-zinc-50 font-medium">{b[1]}</p></div>
      </div>
    </div>
  );
}

/* ===================== SEMANA ===================== */
const STYLE = {
  trabalho: 'bg-zinc-800/80 border-white/10 text-zinc-300',
  compromisso: 'bg-[#2ee8c4]/12 border-[#2ee8c4]/40 text-[#a8f7e8]',
  trajeto: 'trip-stripes border-[#9f8fff]/25 text-[#cdc4ff]',
};
function ItemDetail({ s, it, act, onClose }) {
  const r = refOf(s, it); if (!r) return null;
  const task = it.kind !== 'cycle' ? r : null;
  const future = s.plan.days.filter((d) => d >= s.day);
  return (
    <div className={card + ' p-4 space-y-3 border-[#9f8fff]/30'}>
      <div className="flex items-start gap-3"><div className="flex-1">
        <p className="text-zinc-50 font-medium flex items-center gap-2">{r.title}{it.locked && <span className={tag + ' bg-[#9f8fff]/15 text-[#cdc4ff]'}><Ic n="Pin" className="w-3 h-3 mr-1" />fixado por você</span>}</p>
        <p className="text-sm text-zinc-400 capitalize">{fmtDia(it.day)} · {hhmm(it.start)}–{hhmm(it.start + it.dur)}</p></div>
        <button className="p-2 rounded-lg text-zinc-500 hover:bg-white/5" aria-label="Fechar" onClick={onClose}><Ic n="X" /></button></div>
      <p className="text-sm text-zinc-300 border-l-2 border-[#9f8fff]/40 pl-3">{it.why}</p>
      <div className="flex flex-wrap gap-1.5">
        <span className={tag + ' bg-white/[0.06]'} style={{ color: PRIO[it.prio].c }}>Prioridade {PRIO[it.prio].t.toLowerCase()}</span>
        {task && <span className={tag + ' bg-white/[0.06] text-zinc-400'}>Carga {LOAD[task.load].t.toLowerCase()}</span>}
        {it.ver === 'min' && <span className={tag + ' bg-[#ffc24d]/15 text-[#ffc24d]'}>Mínimo viável</span>}
        {it.status === 'feito' && <span className={tag + ' bg-[#2ee8c4]/15 text-[#2ee8c4]'}>Feito</span>}
      </div>
      {it.status === 'pendente' && <>
        <div className="flex flex-wrap gap-2">
          {it.day < s.plan.days[s.plan.days.length - 1] && <button className={btnG} onClick={() => { act.moveTo(it, it.day + 1); onClose(); }}><Ic n="CalendarArrowUp" />Jogar para {it.day === s.day ? 'amanhã' : DIAS_LONGO[weekdayOf(it.day + 1)]}</button>}
          <button className={btnG} onClick={() => act.editItem(it, { start: Math.min(1425 - it.dur, it.start + 15) })}><Ic n="Clock" />+15 min</button>
          <button className={btnG} onClick={() => act.editItem(it, { start: Math.max(0, it.start - 15) })}>−15 min</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <label className="text-xs text-zinc-500">Dia<select className={inp + ' h-10 mt-1 px-2'} value={it.day} onChange={(e) => act.moveTo(it, Number(e.target.value))}>
            {future.map((d) => <option key={d} value={d}>{DIAS[weekdayOf(d)]} {fmtCurto(d)}</option>)}</select></label>
          <div className="text-xs text-zinc-500"><span>Começa</span><div className="mt-1"><TimeField id={`st-${it.id}`} label="Começa" value={hhmm(it.start)} onChange={(v) => act.editItem(it, { start: toMin(v) })} /></div></div>
          <div className="text-xs text-zinc-500"><span>Duração</span><DurField label="Duração" className="h-10 mt-1" min={5} value={it.dur} onChange={(v) => act.editItem(it, { dur: v })} /></div>
          {task ? <label className="text-xs text-zinc-500">Versão<select className={inp + ' h-10 mt-1 px-2'} value={it.ver} onChange={(e) => act.editItem(it, { ver: e.target.value, dur: e.target.value === 'min' ? task.min : task.dur })}><option value="normal">Completa ({task.dur} min)</option><option value="min">Mínimo ({task.min} min)</option></select></label> : <span />}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {it.day === s.day && <button className={btnP} onClick={() => { act.done(it); onClose(); }}><Ic n="Check" />Feito</button>}
          {it.locked && <button className={btnG} onClick={() => act.unlock(it)}><Ic n="Sparkles" />Deixar o Lume decidir</button>}
          <button className={btnL} onClick={() => { act.removeItem(it); onClose(); }}><Ic n="Trash2" className="w-3.5 h-3.5" />Tirar deste dia</button>
        </div>
        <p className="text-xs text-zinc-500">Qualquer mudança aqui fixa este bloco, e o Lume reorganiza o resto da semana em volta dele.</p>
      </>}
    </div>
  );
}
// ---------- celular: sheets, gestos e vibração ----------
const useMobile = () => !useWide('(min-width: 768px)');
const lowStimOn = () => typeof document !== 'undefined' && document.documentElement.classList.contains('low-stim');
const haptic = (ms = 10) => { try { if (!lowStimOn() && navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };
// Deslize horizontal (troca de dia/mês). Ignora quando o gesto é mais vertical (rolagem).
function swipeX(onLeft, onRight, min = 60) {
  let x0 = null, y0 = null;
  return {
    onTouchStart: (e) => { const t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; },
    onTouchEnd: (e) => { if (x0 == null) return; const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null; if (Math.abs(dx) > min && Math.abs(dx) > Math.abs(dy) * 1.6) { if ((dx < 0 ? onLeft : onRight)() !== false) { haptic(8); e.stopPropagation(); } } },
  };
}
// Bottom sheet no celular (alça + arrastar para baixo fecha); modal centralizado no computador.
function Sheet({ onClose, label, children, wide }) {
  const mobile = useMobile(), [dy, setDy0] = useState(0), st = useRef(null), panel = useRef(null), dyR = useRef(0);
  const setDy = (v) => { dyR.current = v; setDy0(v); };
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);
  const ts = (e) => { const fromHandle = !!e.target.closest('[data-handle]'); st.current = fromHandle || (panel.current && panel.current.scrollTop <= 0) ? e.touches[0].clientY : null; };
  const tm = (e) => { if (st.current == null) return; const d = e.touches[0].clientY - st.current; if (d > 0) setDy(d); };
  const te = () => { if (dyR.current > 110) { haptic(); onClose(); } setDy(0); st.current = null; };
  return ReactDOM.createPortal(
    <div className={`fixed inset-0 z-[70] flex ${mobile ? 'items-end' : 'items-center justify-center p-4'}`} role="dialog" aria-modal="true" aria-label={label}>
      <button className="absolute inset-0 bg-black/55 backdrop-blur-[2px] cursor-default" aria-label="Fechar" tabIndex={-1} onClick={onClose} style={{ opacity: mobile ? Math.max(0.2, 1 - dy / 400) : 1 }} />
      <div ref={panel} onTouchStart={mobile ? ts : undefined} onTouchMove={mobile ? tm : undefined} onTouchEnd={mobile ? te : undefined}
        className={mobile ? 'relative w-full max-h-[92vh] overflow-y-auto overscroll-contain rounded-t-2xl border-t border-white/10 bg-zinc-950 sheet-up no-scrollbar' : `relative w-full ${wide ? 'max-w-lg' : 'max-w-md'} max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950 pop-in`}
        style={mobile ? { transform: dy ? `translateY(${dy}px)` : undefined, transition: dy ? 'none' : 'transform .2s', paddingBottom: 'env(safe-area-inset-bottom)' } : undefined}>
        {mobile && <div data-handle className="sticky top-0 z-10 pt-2.5 pb-1.5 flex justify-center bg-zinc-950/95 backdrop-blur" aria-hidden="true"><span className="w-10 h-1.5 rounded-full bg-white/20" /></div>}
        {children}
      </div>
    </div>, document.body);
}
// Cartão com gesto: direita = feito, esquerda = adiar / trocar. Só reage a toque.
function SwipeRow({ onRight, onLeft, rightLabel = 'Feito', leftLabel = 'Adiar', children, disabled }) {
  const [dx, setDx0] = useState(0), st = useRef(null), fired = useRef(false), dxR = useRef(0);
  const setDx = (v) => { dxR.current = v; setDx0(v); };
  if (disabled) return children;
  const ts = (e) => { const t = e.touches[0]; st.current = { x: t.clientX, y: t.clientY, lock: null }; fired.current = false; };
  const tm = (e) => { const o = st.current; if (!o) return; const t = e.touches[0], ddx = t.clientX - o.x, ddy = t.clientY - o.y;
    if (o.lock == null && (Math.abs(ddx) > 8 || Math.abs(ddy) > 8)) o.lock = Math.abs(ddx) > Math.abs(ddy) * 1.3 ? 'x' : 'y';
    if (o.lock !== 'x') return; const v = Math.max(-130, Math.min(130, ddx)); if (!fired.current && Math.abs(v) >= 80) { fired.current = true; haptic(12); } setDx(v); };
  const te = (e) => { const v = dxR.current; if (st.current && st.current.lock === 'x') e.stopPropagation(); setDx(0); st.current = null; if (v >= 80 && onRight) onRight(); else if (v <= -80 && onLeft) onLeft(); };
  return (
    <div className="relative rounded-lg overflow-hidden" onTouchStart={ts} onTouchMove={tm} onTouchEnd={te} onTouchCancel={() => { setDx(0); st.current = null; }}>
      {dx !== 0 && <div className={`absolute inset-0 flex items-center px-4 text-sm font-medium ${dx > 0 ? 'justify-start bg-[#2ee8c4]/20 text-[#7ff0d8]' : 'justify-end bg-[#9f8fff]/20 text-[#cdc4ff]'}`} aria-hidden="true">
        <span className="flex items-center gap-1.5" style={{ opacity: Math.min(1, Math.abs(dx) / 80) }}><Ic n={dx > 0 ? 'Check' : 'Clock'} className="w-4 h-4" />{dx > 0 ? rightLabel : leftLabel}</span></div>}
      <div style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: dx ? 'none' : 'transform .18s' }}>{children}</div>
    </div>);
}
// Ações do deslize para a esquerda.
function QuickItemSheet({ s, it, act, onClose }) {
  const r = refOf(s, it); if (!r) return null;
  const tomorrow = s.plan.days.includes(it.day + 1) ? it.day + 1 : null;
  const go = (fn) => () => { fn(); haptic(); onClose(); };
  return (
    <Sheet onClose={onClose} label={`Ações para ${r.title}`}>
      <div className="p-5 pt-2 space-y-2">
        <p className="text-zinc-50 font-medium">{r.title}</p><p className="text-xs text-zinc-500 pb-1">{hhmm(it.start)}–{hhmm(it.start + it.dur)}</p>
        {tomorrow != null && <button className={btnG + ' w-full justify-start'} onClick={go(() => act.moveTo(it, tomorrow))}><Ic n="CalendarArrowUp" />Adiar para amanhã</button>}
        <button className={btnG + ' w-full justify-start'} onClick={go(() => act.travou(it))}><Ic n="LifeBuoy" />Trocar por algo mais leve</button>
        <button className={btnG + ' w-full justify-start'} onClick={go(() => act.toggleDone(it))}><Ic n="Check" />Marcar como feito</button>
        <button className={btnL + ' w-full justify-center'} onClick={onClose}>Cancelar</button>
      </div>
    </Sheet>);
}
// Instalar no celular / computador.
function InstallSheet({ onClose }) {
  useCloud();
  const ios = Pwa.ios, phone = Pwa.phone, url = 'https://jullross.github.io/questday/';
  const step = (n, t, ic) => <li className="flex items-start gap-3"><span className="w-8 h-8 rounded-full grid place-items-center bg-[#9f8fff]/15 text-[#cdc4ff] text-sm font-semibold shrink-0">{n}</span><span className="flex-1 pt-1 text-sm text-zinc-200">{t}</span>{ic && <span className="w-9 h-9 rounded-lg grid place-items-center bg-white/[0.06] text-zinc-300 shrink-0"><Ic n={ic} className="w-4 h-4" /></span>}</li>;
  return (
    <Sheet onClose={onClose} label="Instalar o QuestDay" wide>
      <div className="p-5 pt-2 sm:pt-5 space-y-4">
        <div className="flex items-center gap-3"><img src="icons/icon-192.png" alt="" className="w-12 h-12 rounded-xl" /><div className="flex-1"><p className="text-zinc-50 font-medium">Instalar o QuestDay</p><p className="text-xs text-zinc-500">Ícone na tela, abre em tela cheia e funciona offline.</p></div>
          <button className="w-9 h-9 grid place-items-center rounded-lg text-zinc-500 hover:bg-white/5" aria-label="Fechar" onClick={onClose}><Ic n="X" className="w-4 h-4" /></button></div>
        {ios ? <ol className="space-y-3">{step(1, <>Toque em <b className="font-medium">Compartilhar</b>, o quadrado com a seta para cima, na barra do Safari.</>, 'Upload')}{step(2, <>Role a lista e toque em <b className="font-medium">Adicionar à Tela de Início</b>.</>, 'Plus')}{step(3, <>Confirme em <b className="font-medium">Adicionar</b>. O QuestDay aparece com o ícone da Lume.</>, 'Check')}</ol>
          : phone ? <ol className="space-y-3">{step(1, <>Toque no menu <b className="font-medium">⋮</b> do navegador, no canto de cima.</>, 'SlidersHorizontal')}{step(2, <>Escolha <b className="font-medium">Instalar app</b> ou <b className="font-medium">Adicionar à tela inicial</b>.</>, 'Download')}{step(3, <>Confirme. O QuestDay aparece com o ícone da Lume.</>, 'Check')}</ol>
          : <div className="space-y-4">
              <div className="rounded-xl border border-white/10 p-4 space-y-2"><p className="text-sm text-zinc-100 font-medium flex items-center gap-2"><Ic n="Download" className="w-4 h-4" />Neste computador</p>
                {Pwa.canInstall ? <button className={btnP + ' w-full'} onClick={async () => { await Pwa.install(); onClose(); }}>Instalar como app</button> : <p className="text-xs text-zinc-400">No Chrome ou no Edge, clique no ícone de instalar na barra de endereço, ou no menu ⋮ → Instalar QuestDay.</p>}</div>
              <div className="rounded-xl border border-white/10 p-4 flex items-center gap-4"><img src="icons/qr-questday.svg" alt="QR code com o link do QuestDay" className="w-32 h-32 rounded-lg bg-white p-1 shrink-0" />
                <div className="space-y-1"><p className="text-sm text-zinc-100 font-medium flex items-center gap-2"><Ic n="Smartphone" className="w-4 h-4" />No celular</p><p className="text-xs text-zinc-400">Aponte a câmera para o código, abra o link e instale por lá.</p><p className="text-[11px] text-zinc-500 break-all">{url}</p></div></div>
            </div>}
      </div>
    </Sheet>);
}
function InstallButton({ variant = 'icon', className = '' }) {
  useCloud();
  const [open, setOpen] = useState(false);
  if (Pwa.installed) return null;
  const click = async () => { if (Pwa.canInstall) { haptic(); const ok = await Pwa.install(); if (ok) return; } setOpen(true); };
  return <>
    {variant === 'icon' ? <button onClick={click} aria-label="Baixar app: instalar no celular" title="Baixar app" className={'w-11 h-11 md:w-9 md:h-9 grid place-items-center rounded-full bg-white/[0.05] text-zinc-300 hover:bg-white/[0.08] ' + className}><Ic n="Smartphone" className="w-4 h-4" /></button>
      : variant === 'side' ? <button onClick={click} className={'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] ' + className}><Ic n="Smartphone" className="w-5 h-5" /><span className="text-left"><span className="block text-zinc-200">Baixar app</span><span className="block text-[11px] text-zinc-500">Instalar no celular</span></span></button>
      : <button onClick={click} className={btnG + ' ' + className}><Ic n="Smartphone" />Baixar app no celular</button>}
    {open && <InstallSheet onClose={() => setOpen(false)} />}
  </>;
}
function useWide(q) {
  const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q) : null;
  const [w, setW] = useState(mq ? mq.matches : false);
  useEffect(() => { if (!mq) return; const f = () => setW(mq.matches); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); }, []);
  return w;
}
function ItemCard({ s, it, sel, onClick, nested, onToggle, idx = 0 }) {
  const r = refOf(s, it); const ar = areaOf(s, it); const col = ar ? AREA[ar].c : LOAD[r.load].c, done = it.status === 'feito';
  return (
    <div draggable={!done} onDragStart={(e) => { e.dataTransfer.setData('text/plain', it.id); e.dataTransfer.effectAllowed = 'move'; }} className={`rise item-card ${done ? 'is-done' : 'cursor-grab active:cursor-grabbing'} flex items-start rounded-lg border transition-colors ${nested ? 'bg-zinc-950/70 border-white/[0.06]' : 'bg-zinc-900 border-white/[0.07] hover:bg-zinc-800/60'} ${sel ? 'ring-2 ring-[#9f8fff]' : ''}`} style={{ borderLeft: `3px solid ${col}`, animationDelay: `${Math.min(idx, 14) * 28}ms` }}>
      <button role="checkbox" aria-checked={done} aria-label={`${done ? 'Desmarcar' : 'Marcar como feito'}: ${r.title}`} onClick={onToggle}
        className="shrink-0 w-10 self-stretch grid place-items-center rounded-l-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9f8fff]">
        <span className={`chk w-[18px] h-[18px] rounded-[5px] border grid place-items-center transition-colors ${done ? 'bg-[#2ee8c4] border-[#2ee8c4] text-zinc-950 pop' : 'border-zinc-600 hover:border-zinc-300'}`}>{done && <Ic n="Check" className="w-3 h-3" />}</span>
      </button>
      <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }} className="flex-1 min-w-0 text-left py-2 pr-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9f8fff] rounded-r-lg cursor-pointer">
        <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-zinc-500 tabular-nums">{ar && <Ic n={AREA[ar].icon} className="w-3 h-3 shrink-0" style={{ color: AREA[ar].c }} />}<span className="whitespace-nowrap">{hhmm(it.start)} · {it.dur} min</span>
          {it.locked && !done && <Ic n="Pin" className="w-3 h-3 text-[#9f8fff]" />}
          {it.prio === 'alta' && !done && <span className="ml-auto whitespace-nowrap flex items-center gap-1 text-[#ff7f5e]"><i className="w-1.5 h-1.5 rounded-full bg-[#ff7f5e]" />alta</span>}</span>
        <span className={`block text-[14px] leading-snug mt-0.5 ${done ? 'text-zinc-500 line-through decoration-zinc-600' : 'text-zinc-100'}`}>{r.title}</span>
        {it.ver === 'min' && !done && <span className={tag + ' bg-[#ffc24d]/15 text-[#ffc24d] mt-1'}>só o mínimo</span>}
      </div>
    </div>
  );
}
function AdaptNote({ s, act }) {
  const n = s.adaptNote, [all, setAll] = useState(false);
  const ch = (n.changes || []).slice().sort((x, y) => { const near = (c) => Math.min(...[...c.from, ...c.to].map((d) => Math.abs(d - s.day)), 99); return near(x) - near(y); });
  const touch = ch.filter((c) => [...c.from, ...c.to].some((d) => d <= s.day + 1));
  const shown = all ? ch : ch.slice(0, 3);
  const DayChip = ({ d, st }) => <span className={`h-6 min-w-[38px] px-1.5 rounded-md text-[11px] grid place-items-center tabular-nums ${st === 'out' ? 'bg-[#ff7f5e]/12 text-[#ff9f85] line-through decoration-[#ff9f85]/60' : st === 'in' ? 'bg-[#2ee8c4]/15 text-[#7ff0d8] font-medium' : 'bg-white/[0.05] text-zinc-400'}`}>{d === s.day ? 'hoje' : d === s.day + 1 ? 'amanhã' : DIAS[weekdayOf(d)]}</span>;
  return (
    <div className={card + ' p-4 sm:p-5 space-y-3 border-[#9f8fff]/35 swap-in'}>
      <div className="flex items-start gap-3">
        <Pet mood="alerta" size={36} />
        <div className="flex-1 min-w-0">
          <p className="text-zinc-50 font-medium text-[15px]">{ch.length ? <><span className="text-[#cdc4ff] tabular-nums">{ch.length}</span> {ch.length === 1 ? 'coisa mudou' : 'coisas mudaram'} de dia</> : 'Semana reorganizada, nada mudou de dia'}</p>
          <p className="text-xs text-zinc-500 truncate">Readaptei {n.reason}.</p>
        </div>
        <div className="flex gap-1 shrink-0">
          <button className={btnL} onClick={act.undoAdapt}><Ic n="Undo2" className="w-3.5 h-3.5" />Desfazer</button>
          <button className="w-9 h-9 grid place-items-center rounded-lg text-zinc-500 hover:bg-white/5" aria-label="Fechar aviso" onClick={act.dismissAdapt}><Ic n="X" className="w-4 h-4" /></button>
        </div>
      </div>
      {touch.length > 0 && <p className="text-sm text-[#ffc24d] flex items-center gap-2"><Ic n="Bell" className="w-4 h-4" />{touch.length === 1 ? 'Uma delas mexe' : `${touch.length} delas mexem`} com hoje ou amanhã.</p>}
      {shown.length > 0 && <ul className="space-y-1.5">{shown.map((c, i) => {
        const days = [...new Set([...c.from, ...c.to])].sort((p, q) => p - q);
        return <li key={i} className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 rise" style={{ animationDelay: `${i * 50}ms` }}>
          <span className="text-sm text-zinc-200 flex-1 min-w-[140px] truncate">{c.title}</span>
          <span className="flex flex-wrap gap-1">{days.map((d) => <DayChip key={d} d={d} st={c.from.includes(d) && !c.to.includes(d) ? 'out' : !c.from.includes(d) && c.to.includes(d) ? 'in' : 'same'} />)}</span>
        </li>; })}</ul>}
      {ch.length > 3 && <button className={btnL + ' text-xs'} onClick={() => setAll(!all)}><Ic n={all ? 'ChevronUp' : 'ChevronDown'} className="w-3.5 h-3.5" />{all ? 'Mostrar menos' : `Ver as outras ${ch.length - 3}`}</button>}
      {ch.length > 0 && <p className="text-[11px] text-zinc-500 flex gap-3 hint"><span><i className="inline-block w-2 h-2 rounded-sm bg-[#2ee8c4] mr-1" />entrou</span><span><i className="inline-block w-2 h-2 rounded-sm bg-[#ff7f5e] mr-1" />saiu</span></p>}
    </div>
  );
}
function UnplacedCard({ s, act, backlog }) {
  const rows = [...backlog.map((it) => ({ t: itemTitle(s, it), ar: areaOf(s, it), it })), ...s.plan.unplaced.map((u) => ({ t: refTitle(s, u.kind, u.ref), ar: u.kind === 'cycle' ? areaOf(s, { kind: 'cycle', ref: u.ref }) : null }))].filter((r) => r.t);
  if (!rows.length) return null;
  return (
    <div className={card + ' p-4 sm:p-5 space-y-3 border-[#ffc24d]/30'}>
      <div className="flex items-start gap-3"><span className="w-9 h-9 rounded-full grid place-items-center bg-[#ffc24d]/15 text-[#ffc24d] shrink-0"><Ic n="Archive" className="w-4 h-4" /></span>
        <div className="flex-1"><p className="text-zinc-50 font-medium text-[15px]"><span className="text-[#ffc24d] tabular-nums">{rows.length}</span> {rows.length === 1 ? 'coisa não coube' : 'coisas não couberam'} nesta semana</p>
          <p className="text-xs text-zinc-500">A semana está cheia. Ficam guardadas e voltam sozinhas na próxima distribuição, sem culpa.</p></div></div>
      <div className="flex flex-wrap gap-1.5">{rows.map((r, i) => <span key={i} className="h-8 pl-2.5 pr-1.5 rounded-lg bg-white/[0.05] text-sm text-zinc-200 flex items-center gap-1.5">
        {r.ar ? <Ic n={AREA[r.ar].icon} className="w-3.5 h-3.5" style={{ color: AREA[r.ar].c }} /> : <Ic n="Clock" className="w-3.5 h-3.5 text-zinc-500" />}{r.t}
        {r.it && <button className="w-6 h-6 grid place-items-center rounded text-zinc-500 hover:bg-white/10" aria-label={`Descartar ${r.t}`} onClick={() => act.removeItem(r.it)}><Ic n="X" className="w-3 h-3" /></button>}</span>)}</div>
      <div className="flex flex-wrap gap-2"><button className={btnG + ' min-h-[38px] h-9 text-sm'} onClick={act.distribuir}><Ic n="Sparkles" className="w-3.5 h-3.5" />Tentar encaixar de novo</button></div>
    </div>
  );
}
function DayList({ s, d, sel, setSel, act }) {
  const [quick, setQuick] = useState(null);
  const fx = fixedAll(s, d).filter((f) => !(f.log && f.log.ferias));
  const its = s.plan.items.filter((it) => it.day === d && it.status !== 'backlog' && it.status !== 'removido' && refOf(s, it));
  const tripIds = new Set(fx.filter((f) => f.type === 'trajeto' && !f.skip).map((f) => f.id));
  const fsel = (f) => setSel(sel === `fx|${d}|${f.id}` ? null : `fx|${d}|${f.id}`);
  const Badge = ({ f }) => { const b = fixedBadge(s, d, f); if (!b) return null; if (b.ok) return <span className="flex items-center gap-1 text-[11px] text-[#2ee8c4]"><Ic n="Check" className="w-3 h-3" />confirmado</span>; return <span className={`flex items-center gap-1 text-[11px] leading-tight ${b.c}`}>{b.ask && <i className="w-1.5 h-1.5 rounded-full bg-[#ffc24d] shrink-0" />}{b.t}</span>; };
  const rows = [...fx.map((f) => ({ t: f.s, f })), ...its.filter((it) => !(it.inTrip && tripIds.has(it.inTrip))).map((it) => ({ t: it.start, it }))].sort((a, b) => a.t - b.t || (a.f ? -1 : 1));
  const pick = (it) => setSel(sel === it.id ? null : it.id);
  if (!rows.length) return <p className="text-sm text-zinc-600 px-1 py-3">Nada planejado.</p>;
  return (
    <div className="space-y-1.5">
      {quick && <QuickItemSheet s={s} it={quick} act={act} onClose={() => setQuick(null)} />}
      {rows.map((row, ri) => {
        if (row.it) return <SwipeRow key={row.it.id} disabled={row.it.status !== 'pendente'} onRight={() => act.swipeDone(row.it)} onLeft={() => setQuick(row.it)} leftLabel="Adiar / trocar"><ItemCard idx={ri} s={s} it={row.it} sel={sel === row.it.id} onClick={() => pick(row.it)} onToggle={() => act.toggleDone(row.it)} /></SwipeRow>;
        const f = row.f;
        const on = sel === `fx|${d}|${f.id}`;
        if (f.skip) return (
          <button key={f.id} onClick={() => fsel(f)} aria-pressed={on} className={`w-full text-left rounded-lg border border-dashed px-2.5 py-1.5 text-xs flex items-start gap-2 ${on ? 'border-[#9f8fff]/60' : 'border-white/10'} text-zinc-500 hover:bg-white/[0.03]`}>
            <Ic n={f.type === 'trajeto' ? 'Bus' : f.type === 'trabalho' ? 'Briefcase' : 'CalendarClock'} className="w-3.5 h-3.5 shrink-0 self-start mt-0.5" /><span className="flex-1 min-w-0"><span className="block line-through truncate">{f.title}</span><span className="block tabular-nums line-through">{f.plan.start}–{f.plan.end}</span><Badge f={f} /></span></button>);
        if (f.type === 'trajeto') {
          const inner = its.filter((it) => it.inTrip === f.id).sort((a, b) => a.start - b.start);
          return (
            <div key={f.id} className={`rounded-lg border trip-stripes p-1.5 space-y-1 ${on ? 'border-[#9f8fff]/70' : 'border-[#9f8fff]/25'}`}>
              <button onClick={() => fsel(f)} aria-pressed={on} aria-label={`${f.title}: confirmar horário`} className="w-full text-left flex items-start gap-1.5 px-1 py-0.5 text-xs rounded hover:bg-white/[0.04]"><Ic n="Bus" className="w-3.5 h-3.5 shrink-0 mt-px text-[#cdc4ff]" /><span className="flex-1 min-w-0 space-y-0.5"><span className="block font-medium text-[#cdc4ff] truncate">{f.title}</span><span className="block tabular-nums text-zinc-500">{f.start}–{f.end}</span><Badge f={f} /></span></button>
              {inner.length ? inner.map((it) => <SwipeRow key={it.id} disabled={it.status !== 'pendente'} onRight={() => act.swipeDone(it)} onLeft={() => setQuick(it)} leftLabel="Adiar / trocar"><ItemCard s={s} it={it} nested sel={sel === it.id} onClick={() => pick(it)} onToggle={() => act.toggleDone(it)} /></SwipeRow>) : <p className="px-1 pb-0.5 text-xs text-zinc-500">Livre: descansar ou ouvir música.</p>}
            </div>
          );
        }
        return (
          <button key={f.id} onClick={() => fsel(f)} aria-pressed={on} aria-label={`${f.title}: confirmar horário`} className={`w-full text-left rounded-lg border px-2.5 py-2 text-xs flex items-start gap-2 hover:brightness-125 ${on ? 'ring-1 ring-[#9f8fff]/70' : ''} ${f.type === 'trabalho' ? 'bg-zinc-800/60 border-white/[0.06] text-zinc-400' : 'bg-[#2ee8c4]/10 border-[#2ee8c4]/30 text-[#a8f7e8]'}`}>
            <Ic n={f.type === 'trabalho' ? 'Briefcase' : 'CalendarClock'} className="w-3.5 h-3.5 shrink-0 self-start mt-0.5" /><span className="flex-1 min-w-0 space-y-0.5"><span className="block text-[13px] truncate">{f.title}</span><span className="block tabular-nums">{f.start}–{f.end}</span><Badge f={f} /></span>
          </button>
        );
      })}
    </div>
  );
}
function AddToDay({ s, d, act }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button className="w-full h-9 rounded-lg border border-dashed border-white/10 text-xs text-zinc-500 hover:text-zinc-200 hover:border-white/25 flex items-center justify-center gap-1.5" onClick={() => setOpen(true)}><Ic n="Plus" className="w-3.5 h-3.5" />Adicionar neste dia</button>;
  return (
    <select autoFocus className={inp + ' h-10 text-sm px-2'} value="" onBlur={() => setOpen(false)} onChange={(e) => { const [k, id] = e.target.value.split(':'); if (id) act.addToDay(d, k, id); setOpen(false); }} aria-label="Escolher o que adicionar">
      <option value="">Escolha o que adicionar…</option>
      <optgroup label="Tarefas e estudos">{s.tasks.filter((t) => !t.done).map((t) => <option key={t.id} value={`task:${t.id}`}>{t.title}</option>)}</optgroup>
      <optgroup label="Casa e autocuidado">{s.cycles.map((c) => <option key={c.id} value={`cycle:${c.id}`}>{c.title}</option>)}</optgroup>
    </select>
  );
}
function Semana(props) {
  const { s, act } = props, view = (s.ui && s.ui.semanaView) || 'semana';
  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] w-fit" role="tablist" aria-label="Visualização">
        {[['semana', 'Semana', 'Columns3'], ['cal', 'Calendário', 'CalendarDays']].map(([k, l, ic]) => <button key={k} role="tab" aria-selected={view === k} onClick={() => act.setUi({ semanaView: k })} className={`h-9 px-3.5 rounded-lg text-sm flex items-center gap-2 press ${view === k ? 'bg-white/10 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}><Ic n={ic} className="w-4 h-4" />{l}</button>)}
      </div>
      {view === 'cal' ? <MonthCal s={s} act={act} /> : <SemanaGrid {...props} />}
    </div>);
}
// O que aparece num dia do calendário: horários fixos (sem trajetos), compromissos com data e tarefas planejadas.
function dayAgenda(s, d) {
  const fx = fixedAll(s, d).filter((f) => !f.skip && f.type !== 'trajeto' && !(f.log && (f.log.st === 'nao'))).map((f) => ({ k: 'fx' + f.id, t: f.title, a: f.s, b: f.e, kind: f.type === 'trabalho' ? 'trabalho' : 'evento', sub: f.type === 'trabalho' ? 'Trabalho' : f.sem ? 'Aula' : 'Horário fixo' }));
  const its = s.plan.items.filter((it) => it.day === d && it.status !== 'backlog' && it.status !== 'removido' && refOf(s, it)).map((it) => { const r = refOf(s, it), ev = it.kind === 'task' && r.event; return { k: it.id, t: itemTitle(s, it), a: it.start, b: it.start + it.dur, kind: ev ? 'evento' : areaOf(s, it) ? 'cuidado' : 'tarefa', sub: ev ? (r.gcal && String(r.gcal).startsWith('gcal:') ? 'Google Agenda' : r.gcal && String(r.gcal).startsWith('ics:') ? 'Calendário (.ics)' : 'Compromisso') : areaOf(s, it) === 'casa' ? 'Casa' : areaOf(s, it) ? 'Autocuidado' : 'Tarefa', done: it.status === 'feito' }; });
  return [...fx, ...its].sort((x, y) => (x.a ?? 9999) - (y.a ?? 9999));
}
const KIND_C = { evento: 'bg-[#2ee8c4]/15 text-[#7ff0d8]', trabalho: 'bg-white/[0.07] text-zinc-300', tarefa: 'bg-[#9f8fff]/15 text-[#cdc4ff]', cuidado: 'bg-[#ff6fb5]/15 text-[#ffb3d9]' };
const KIND_DOT = { evento: 'bg-[#2ee8c4]', trabalho: 'bg-zinc-500', tarefa: 'bg-[#9f8fff]', cuidado: 'bg-[#ff6fb5]' };
const MESES_L = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
function MonthCal({ s, act }) {
  const d0 = dateOf(s.day), [ym, setYm] = useState({ y: d0.getUTCFullYear(), m: d0.getUTCMonth() }), [open, setOpen] = useState(null);
  const first = Math.floor(Date.UTC(ym.y, ym.m, 1) / DAYMS), lead = (weekdayOf(first) + 6) % 7, start = first - lead;
  const nDays = new Date(Date.UTC(ym.y, ym.m + 1, 0)).getUTCDate(), weeks = Math.ceil((lead + nDays) / 7);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => start + i);
  const go = (k) => setYm((x) => { const t = new Date(Date.UTC(x.y, x.m + k, 1)); return { y: t.getUTCFullYear(), m: t.getUTCMonth() }; });
  const isCur = ym.y === d0.getUTCFullYear() && ym.m === d0.getUTCMonth();
  return (
    <div className={card + ' p-3 sm:p-5 space-y-3'}>
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-lg font-semibold text-zinc-50 capitalize">{MESES_L[ym.m]} <span className="text-zinc-500 font-normal">{ym.y}</span></h2>
        <button className="w-9 h-9 grid place-items-center rounded-lg border border-white/10 text-zinc-300 hover:bg-white/[0.06] press" aria-label="Mês anterior" onClick={() => go(-1)}><Ic n="ChevronLeft" className="w-4 h-4" /></button>
        <button className="h-9 px-3 rounded-lg border border-white/10 text-sm text-zinc-300 hover:bg-white/[0.06] disabled:opacity-40 press" disabled={isCur} onClick={() => setYm({ y: d0.getUTCFullYear(), m: d0.getUTCMonth() })}>Hoje</button>
        <button className="w-9 h-9 grid place-items-center rounded-lg border border-white/10 text-zinc-300 hover:bg-white/[0.06] press" aria-label="Próximo mês" onClick={() => go(1)}><Ic n="ChevronRight" className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] uppercase tracking-wide text-zinc-500">{SEMANA.map((w) => <span key={w} className="py-1">{DIAS[w]}</span>)}</div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5" {...swipeX(() => go(1), () => go(-1))} role="grid" aria-label={`Calendário de ${MESES_L[ym.m]} de ${ym.y}`}>
        {cells.map((d) => {
          const inM = dateOf(d).getUTCMonth() === ym.m, past = d < s.day, ag = dayAgenda(s, d), hol = holidayOn(s, d), vac = vacationOn(s, d);
          const ev = ag.filter((x) => x.kind === 'evento' || x.kind === 'trabalho'), rest = ag.length - ev.length;
          return (
            <button key={d} role="gridcell" onClick={() => setOpen(d)} aria-label={`${fmtDia(d)}: ${ag.length ? `${ag.length} ${ag.length > 1 ? 'itens' : 'item'}` : 'livre'}${hol ? `, ${hol.label}` : ''}${vac ? `, ${vac.label}` : ''}`}
              className={`relative text-left min-h-[64px] sm:min-h-[108px] rounded-lg sm:rounded-xl border p-1 sm:p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9f8fff] ${d === s.day ? 'border-[#9f8fff]/60 bg-[#9f8fff]/[0.08]' : 'border-white/[0.06] hover:bg-white/[0.04]'} ${inM ? '' : 'opacity-35'} ${past && d !== s.day ? 'opacity-60' : ''}`}>
              <span className={`flex items-center justify-between text-xs sm:text-sm tabular-nums ${d === s.day ? 'text-[#cdc4ff] font-semibold' : 'text-zinc-300'}`}>{dateOf(d).getUTCDate()}
                {(hol || vac) && <span className={`hidden sm:inline text-[10px] truncate ml-1 ${vac ? 'text-[#7ff0d8]' : 'text-[#ffc24d]'}`}>{vac ? vac.label : hol.label}</span>}</span>
              <span className="hidden sm:block mt-1 space-y-0.5">
                {ev.slice(0, 3).map((x) => <span key={x.k} className={`block truncate rounded px-1.5 py-0.5 text-[11px] leading-tight ${KIND_C[x.kind]}`}>{x.a != null && <span className="tabular-nums opacity-70 mr-1">{hhmm(x.a)}</span>}{x.t}</span>)}
                {ev.length > 3 && <span className="block text-[10px] text-zinc-500 px-1">+{ev.length - 3} compromisso{ev.length - 3 > 1 ? 's' : ''}</span>}
                {rest > 0 && <span className="block text-[10px] text-zinc-500 px-1">{rest} tarefa{rest > 1 ? 's' : ''} e cuidado{rest > 1 ? 's' : ''}</span>}
              </span>
              <span className="sm:hidden absolute left-1 right-1 bottom-1 flex flex-wrap gap-0.5">{ag.slice(0, 5).map((x) => <i key={x.k} className={`w-1.5 h-1.5 rounded-full ${KIND_DOT[x.kind]}`} />)}{(hol || vac) && <i className={`w-1.5 h-1.5 rounded-full ${vac ? 'bg-[#2ee8c4]' : 'bg-[#ffc24d]'}`} />}</span>
            </button>);
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">{[['evento', 'Compromisso'], ['trabalho', 'Trabalho'], ['tarefa', 'Tarefa'], ['cuidado', 'Casa e cuidado']].map(([k, l]) => <span key={k} className="flex items-center gap-1.5"><i className={`w-2 h-2 rounded-full ${KIND_DOT[k]}`} />{l}</span>)}
        <span className="text-zinc-600">Tarefas aparecem até onde a semana já foi planejada.</span></div>
      {open != null && <DayModal s={s} act={act} d={open} onClose={() => setOpen(null)} />}
    </div>);
}
function DayModal({ s, act, d, onClose }) {
  const [adding, setAdding] = useState(false), ag = dayAgenda(s, d), hol = holidayOn(s, d), vac = vacationOn(s, d), canAdd = d >= s.day;
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);
  const groups = [['Compromissos', ag.filter((x) => x.kind === 'evento' || x.kind === 'trabalho')], ['Tarefas', ag.filter((x) => x.kind === 'tarefa')], ['Casa e cuidado', ag.filter((x) => x.kind === 'cuidado')]].filter(([, xs]) => xs.length);
  const draft = { title: '', recurring: false, day: d, days: [], start: d === s.day ? hhmm(Math.min(1380, Math.ceil((nowRef(s) + 30) / 30) * 30)) : '09:00', end: d === s.day ? hhmm(Math.min(1439, Math.ceil((nowRef(s) + 30) / 30) * 30 + 60)) : '10:00' };
  return (
    <Sheet onClose={onClose} label={fmtDia(d)}>
      <div className="p-5 pt-2 sm:pt-5 space-y-4">
        <div className="flex items-start gap-3"><div className="flex-1"><h2 id="dm-t" className="text-lg font-semibold text-zinc-50 capitalize">{fmtDia(d)}</h2>
          <p className="text-xs text-zinc-500">{d === s.day ? 'Hoje' : d === s.day + 1 ? 'Amanhã' : d < s.day ? 'Já passou' : `Daqui a ${d - s.day} dias`}{hol ? ` · ${hol.label}` : ''}{vac ? ` · ${vac.label} (rotina em pausa)` : ''}</p></div>
          <button className="w-9 h-9 grid place-items-center rounded-lg text-zinc-500 hover:bg-white/5" aria-label="Fechar" onClick={onClose}><Ic n="X" className="w-4 h-4" /></button></div>
        {groups.length ? groups.map(([g, xs]) => <section key={g} className="space-y-1.5"><p className="text-xs uppercase tracking-wide text-zinc-500">{g}</p>
          <ul className="space-y-1.5">{xs.map((x) => <li key={x.k} className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2"><i className={`w-1.5 self-stretch rounded-full ${KIND_DOT[x.kind]}`} />
            <span className="w-24 shrink-0 text-xs text-zinc-400 tabular-nums">{x.a != null ? `${hhmm(x.a)}–${hhmm(x.b)}` : 'sem hora'}</span>
            <span className="flex-1 min-w-0"><span className={`block text-sm truncate ${x.done ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>{x.t}</span><span className="block text-[11px] text-zinc-500">{x.sub}</span></span></li>)}</ul></section>)
          : <p className="text-sm text-zinc-500">Nada marcado neste dia.</p>}
        {canAdd ? (adding ? <EventCard s={s} draft={draft} onApply={(f) => { act.addEvent(f); setAdding(false); }} /> : <button className={btnP + ' w-full'} onClick={() => setAdding(true)}><Ic n="Plus" />Adicionar neste dia</button>)
          : <p className="text-xs text-zinc-600">Não dá para marcar compromissos em dias que já passaram.</p>}
      </div>
    </Sheet>);
}
function SemanaGrid({ s, act, en, weekly, setWeekly }) {
  const [sel, setSel] = useState(null), mobile = useMobile();
  const gridRef = useRef(null);
  useEffect(() => { const g = gridRef.current; if (!g) return; const i = s.plan.days.indexOf(s.day); const el = g.children[i]; if (el && i > 1) g.scrollLeft = el.offsetLeft - g.offsetLeft - 8; }, []);
  const [over, setOver] = useState(null);
  const drop = (d) => (e) => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData('text/plain'); const it = s.plan.items.find((y) => y.id === id); if (it && it.day !== d) act.moveTo(it, d); };
  const [dSel, setDSel] = useState(s.day);
  const days = s.plan.days;
  const selIt = sel && s.plan.items.find((it) => it.id === sel);
  const selFx = (() => { if (!sel || !String(sel).startsWith('fx|')) return null; const [, d, id] = sel.split('|'); const f = fixedAll(s, +d).find((x) => x.id === id); return f ? { day: +d, f } : null; })();
  const backlog = s.plan.items.filter((it) => it.status === 'backlog');
  const mode = modeOf(s, en);
  const stat = (d) => { const its = s.plan.items.filter((it) => it.day === d && it.status !== 'backlog' && it.status !== 'removido' && refOf(s, it)); const min = its.reduce((a, it) => a + it.dur, 0); const pts = its.reduce((a, it) => a + ptsOf(it), 0), cap = capOf(s, d); const prod = its.filter((it) => !areaOf(s, it)), care = its.filter((it) => areaOf(s, it)); return { n: prod.length, done: prod.filter((it) => it.status === 'feito').length, cn: care.length, cdone: care.filter((it) => it.status === 'feito').length, all: its.length, min, heavy: its.filter((it) => it.kind === 'task' && it.load === 'pesada' && it.ver !== 'min').length, pts, cap, cg: cargaLabel(pts, cap) }; };
  const futureDays = days.filter((d) => d >= s.day), wkPts = futureDays.reduce((a, d) => a + stat(d).pts, 0), wkCap = futureDays.reduce((a, d) => a + capOf(s, d), 0);
  const minCount = s.plan.items.filter((it) => it.day >= s.day && it.ver === 'min' && it.kind === 'task' && it.status === 'pendente').length;
  const shown = days.filter((d) => d >= s.day || stat(d).n);
  return (
    <div className="space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-center gap-3">
        <div className="flex-1">
          <p className="text-zinc-300">{DIAS[weekdayOf(days[0])]} {fmtCurto(days[0])} – {DIAS[weekdayOf(days[days.length - 1])]} {fmtCurto(days[days.length - 1])}</p>
          <p className="text-sm text-zinc-500"><span className="hidden lg:inline">Arraste um bloco para outro dia ou toque nele</span><span className="lg:hidden">Toque num bloco</span> para mudar dia, horário e duração{' '}<span className="lg:hidden">(ou “Jogar para amanhã”)</span>. O Lume reorganiza o resto sozinho.</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 shrink-0">
          <button className={btnG} onClick={act.reajustar} disabled={!s.today.checkedIn} title={s.today.checkedIn ? '' : 'Faça o check-in primeiro'}><Ic n="Wand2" />Reajustar dia</button>
          <button className={btnG} onClick={() => setWeekly(true)}><Ic n="CalendarCheck" />Revisão</button>
          <button className={btnP + ' col-span-2'} onClick={act.distribuir}><Ic n="Sparkles" />Distribuir minha semana</button>
        </div>
      </div>
      {weekly && <WeeklyReview s={s} act={act} onClose={() => setWeekly(false)} />}
      <div className={card + ' p-4 flex items-center gap-4 flex-wrap'}>
        <div className="flex-1 min-w-[220px]">
          <p className="text-sm text-zinc-300">Equilíbrio da semana</p>
          <p className="text-sm text-zinc-500">Carga mental planejada: {Math.round(wkPts)} de {wkCap} pontos possíveis. Até 1 tarefa pesada em dia de trabalho e 2 nos outros; {minCount ? `${minCount} ${minCount === 1 ? 'entrou' : 'entraram'} na versão mínima para não pesar.` : 'nenhuma precisou virar mínima.'}</p>
        </div>
        <div className="w-full sm:w-56"><div className="h-2 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full bar-anim" style={{ width: `${clamp((wkPts / Math.max(1, wkCap)) * 100, 3, 100)}%`, background: cargaLabel(wkPts, wkCap).c }} /></div>
          <p className="text-xs text-zinc-500 mt-1">Pesada vale 3 pontos, média 2, leve 1. Dia com trabalho comporta 6; sem trabalho, 9.</p></div>
      </div>
      {s.adaptNote && <AdaptNote s={s} act={act} />}
      {s.today.checkedIn && mode !== 'normal' && mode !== 'descansada' && !s.today.adjusted && <p className="text-sm text-[#ffc24d]">Hoje é {MODOS[mode].t.toLowerCase()}. “Reajustar meu dia” reduz e redistribui o que ficou pesado.</p>}
      {selIt && (mobile ? <Sheet onClose={() => setSel(null)} label="Detalhes"><div className="p-3 pt-1"><ItemDetail s={s} it={selIt} act={act} onClose={() => setSel(null)} /></div></Sheet> : <ItemDetail s={s} it={selIt} act={act} onClose={() => setSel(null)} />)}
      {selFx && (mobile ? <Sheet onClose={() => setSel(null)} label="Confirmar horário"><div className="p-3 pt-1"><FixedCheck key={sel} s={s} day={selFx.day} f={selFx.f} act={act} onClose={() => setSel(null)} /></div></Sheet> : <FixedCheck key={sel} s={s} day={selFx.day} f={selFx.f} act={act} onClose={() => setSel(null)} />)}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar lg:hidden -mx-4 px-4 sm:mx-0 sm:px-0">
        {shown.map((d) => { const st = stat(d); return <button key={d} onClick={() => setDSel(d)} aria-pressed={dSel === d} className={`shrink-0 w-14 sm:flex-1 sm:min-w-[56px] h-16 rounded-xl flex flex-col items-center justify-center text-sm ${dSel === d ? 'bg-[#9f8fff] text-zinc-950 font-medium' : d === s.day ? 'border border-[#9f8fff]/60 text-zinc-100' : 'text-zinc-300 bg-white/[0.04]'}`}>
          <span className="text-xs">{DIAS[weekdayOf(d)]}</span>{dateOf(d).getUTCDate()}<span className={`text-[10px] ${dSel === d ? 'text-zinc-800' : vacationOn(s, d) ? 'text-[#2ee8c4]' : 'text-zinc-500'}`}>{vacationOn(s, d) ? 'pausa' : st.n ? `${st.n} itens` : 'livre'}</span></button>; })}
      </div>
      <div className="lg:hidden space-y-2 max-w-2xl" {...swipeX(() => { const i = shown.indexOf(dSel); if (i >= 0 && i < shown.length - 1) { setDSel(shown[i + 1]); return true; } return false; }, () => { const i = shown.indexOf(dSel); if (i > 0) { setDSel(shown[i - 1]); return true; } return false; })}><DayList s={s} d={dSel} sel={sel} setSel={setSel} act={act} />{dSel >= s.day && <AddToDay s={s} d={dSel} act={act} />}</div>
      <div className="hidden lg:max-[1599px]:flex justify-end gap-1 -mb-2">
        <button className="w-9 h-9 grid place-items-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5" aria-label="Dias anteriores" onClick={() => gridRef.current && gridRef.current.scrollBy({ left: -230, behavior: 'smooth' })}><Ic n="ChevronLeft" className="w-4 h-4" /></button>
        <button className="w-9 h-9 grid place-items-center rounded-lg border border-white/10 text-zinc-400 hover:bg-white/5" aria-label="Próximos dias" onClick={() => gridRef.current && gridRef.current.scrollBy({ left: 230, behavior: 'smooth' })}><Ic n="ChevronRight" className="w-4 h-4" /></button>
      </div>
      <div ref={gridRef} className="hidden lg:grid grid-flow-col auto-cols-[216px] min-[1600px]:grid-flow-row min-[1600px]:grid-cols-7 min-[1600px]:auto-cols-auto gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scroll-px-1 thin-scroll">
        {shown.map((d) => { const st = stat(d); return (
          <section key={d} onDragOver={(e) => { e.preventDefault(); if (over !== d) setOver(d); }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(null); }} onDrop={drop(d)}
            className={`snap-start rounded-2xl border p-2.5 space-y-2.5 transition-colors ${over === d ? 'border-[#9f8fff] bg-[#9f8fff]/[0.08]' : d === s.day ? 'border-[#9f8fff]/40 bg-[#9f8fff]/[0.04]' : 'border-white/[0.07] bg-zinc-900/40'}`}>
            <header className="px-1">
              <p className="flex items-baseline gap-2"><span className={`font-semibold ${d === s.day ? 'text-zinc-50' : 'text-zinc-200'}`}>{DIAS[weekdayOf(d)]} {dateOf(d).getUTCDate()}</span>{d === s.day && <span className="text-xs text-[#9f8fff]">hoje</span>}</p>
              {vacationOn(s, d) && <p className="mt-1"><span className="inline-flex items-center gap-1 h-5 px-2 rounded-md text-[11px] bg-[#2ee8c4]/15 text-[#7ff0d8]"><Ic n="Sun" className="w-3 h-3" />{vacationOn(s, d).label || 'Em pausa'}</span></p>}
              <p className="text-xs text-zinc-500">{st.all ? <>{st.done} de {st.n} tarefas · {fmtH(st.min / 60)}{st.cn ? <span style={{ color: AREA.cuidado.c }}> · <Ic n="Heart" className="inline w-3 h-3 -mt-0.5" /> {st.cdone}/{st.cn}</span> : null}</> : 'Dia livre'}</p>
              {st.n > 0 && <div className="mt-1.5 h-1 rounded-full bg-white/[0.06] overflow-hidden" title="Progresso do dia"><div className="h-full rounded-full bg-[#2ee8c4] bar-anim" style={{ width: `${(st.done / st.n) * 100}%` }} /></div>}
              {st.n > 0 && <div className="mt-1.5 flex items-center gap-2" title={`Carga mental ${Math.round(st.pts)} de ${st.cap} pontos`}>
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${clamp((st.pts / st.cap) * 100, 4, 100)}%`, background: st.cg.c }} /></div>
                <span className="text-[11px]" style={{ color: st.cg.c }}>{st.cg.t}</span></div>}
            </header>
            <DayList s={s} d={d} sel={sel} setSel={setSel} act={act} />
            {d >= s.day && <AddToDay s={s} d={d} act={act} />}
          </section>); })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
        <span>Cor da borda = carga mental:</span>
        {Object.entries(LOAD).map(([k, v]) => <span key={k} className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm" style={{ background: v.c }} />{v.t.toLowerCase()}</span>)}
        <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm bg-[#ffc24d]" />ciclos da casa</span>
        <span className="flex items-center gap-1.5"><Ic n="Bus" className="w-3.5 h-3.5" />trajeto, com o que dá para fazer nele</span>
      </div>
      {(backlog.length > 0 || s.plan.unplaced.length > 0) && <UnplacedCard s={s} act={act} backlog={backlog} />}
    </div>
  );
}

/* ===================== CADASTRO ===================== */
function TaskForm({ f, setF, onSave, onCancel, onDelete }) {
  const set = (p) => setF({ ...f, ...p });
  const sug = suggestDur(f.prio, f.load);
  const pickPL = (p) => { const n = { ...f, ...p }; const g = suggestDur(n.prio, n.load); setF(n.durTouched ? n : { ...n, dur: g.dur, min: g.min }); };
  return (
    <div className="grid grid-cols-2 gap-3 p-4 pt-0">
      <div className="col-span-2"><label className={lbl}>Nome</label><input className={inp} value={f.title} onChange={(e) => set({ title: e.target.value })} /></div>
      <div><label className={lbl}>Categoria</label><input className={inp} list="cats" value={f.cat} onChange={(e) => set({ cat: e.target.value })} />
        <datalist id="cats">{['Faculdade', 'Capacitação', 'Idioma', 'Carreira', 'Pessoal', 'Casa', 'Autocuidado'].map((c) => <option key={c} value={c} />)}</datalist></div>
      <div><label className={lbl}>Onde pode ser feita</label><select className={inp} value={f.where} onChange={(e) => set({ where: e.target.value })}>{Object.entries(ONDE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
      <div className="col-span-2 grid sm:grid-cols-2 gap-3">
        <div><p className={lbl}>Prioridade</p><Seg value={f.prio} onChange={(v) => pickPL({ prio: v })} options={[['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']]} label="Prioridade" /></div>
        <div><p className={lbl}>Carga mental</p><Seg value={f.load} onChange={(v) => pickPL({ load: v })} options={[['pesada', 'Pesada'], ['media', 'Média'], ['leve', 'Leve']]} label="Carga mental" /></div>
      </div>
      <div className="col-span-2 -mt-1 text-sm text-zinc-500 flex flex-wrap items-center gap-x-2">
        <span>Sugestão para prioridade {PRIO[f.prio].t.toLowerCase()} + carga {LOAD[f.load].t.toLowerCase()}: <b className="text-zinc-300">{sug.dur} min</b> (mínimo {sug.min}).</span>
        {(f.dur !== sug.dur || f.min !== sug.min) ? <button type="button" className={btnL + ' text-[#9f8fff]'} onClick={() => set({ dur: sug.dur, min: sug.min, durTouched: false })}>Usar sugestão</button> : <span className="text-[#2ee8c4]">em uso</span>}
      </div>
      <div><p className={lbl}>Duração normal</p><DurField label="Duração normal" min={5} value={f.dur} onChange={(v) => set({ dur: v, durTouched: true })} /></div>
      <div><label className={lbl}>Frequência na semana</label><select className={inp} value={f.freq} onChange={(e) => set({ freq: Number(e.target.value) })}>
        <option value={0}>Avulsa (uma vez)</option>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}x por semana</option>)}<option value={7}>Todo dia</option></select></div>
      <div><label className={lbl}>Mínimo viável</label><input className={inp} value={f.minText} onChange={(e) => set({ minText: e.target.value })} placeholder="Ex.: 5 palavras" /></div>
      <div className="col-span-2"><label className={lbl}>Primeiro passo de 2 min (opcional)</label><input className={inp} value={f.firstStep || ''} onChange={(e) => set({ firstStep: e.target.value })} placeholder="Ex.: abrir o caderno na página da lista" /></div>
      <div><p className={lbl}>Mínimo</p><DurField label="Mínimo" min={1} value={f.min} onChange={(v) => set({ min: v, durTouched: true })} /></div>
      {f.freq === 0 && <div className="col-span-2"><label className={lbl}>Prazo (opcional)</label><input type="date" className={inp} value={f.due != null ? isoOf(f.due) : ''} onChange={(e) => set({ due: e.target.value ? dayFromIso(e.target.value) : null })} /></div>}
      <div className="col-span-2 flex flex-wrap gap-2"><button type="button" className={btnP} onClick={() => { if (f.title.trim()) onSave(f); }}>Salvar</button><button type="button" className={btnG} onClick={onCancel}>Cancelar</button>
        {onDelete && <button type="button" className={btnL + ' ml-auto'} onClick={onDelete}><Ic n="Trash2" className="w-3.5 h-3.5" />Excluir</button>}</div>
    </div>
  );
}
function FixedForm({ f, setF, onSave, onCancel, onDelete }) {
  const set = (p) => setF({ ...f, ...p });
  return (
    <div className="grid grid-cols-2 gap-3 p-4 pt-0">
      <div className="col-span-2"><p className={lbl}>Tipo</p><Seg value={f.type} onChange={(v) => set({ type: v })} options={Object.entries(TIPOS)} label="Tipo de bloco" /></div>
      <div className="col-span-2"><label className={lbl} htmlFor={`fx-nome-${f.id || 'novo'}`}>Nome</label><input id={`fx-nome-${f.id || 'novo'}`} type="text" autoComplete="off" maxLength={60} className={inp} value={f.title} placeholder={f.type === 'trabalho' ? 'Ex.: Estágio, Trabalho' : f.type === 'trajeto' ? 'Ex.: Ida para a faculdade' : 'Ex.: Faculdade, Academia, Terapia'} onChange={(e) => set({ title: e.target.value })} />
        {!f.title.trim() && <p className="text-xs text-zinc-500 mt-1">Dê um nome para salvar.</p>}</div>
      <div className="col-span-2"><p className={lbl}>Dias</p><DayChips days={f.days} onChange={(d) => set({ days: d })} /></div>
      <div><label className={lbl} htmlFor="fs">Começa</label><TimeField id="fs" label="Começa" value={f.start} onChange={(v) => set({ start: v })} /></div>
      <div><label className={lbl} htmlFor="fe">Termina</label><TimeField id="fe" label="Termina" value={f.end} onChange={(v) => set({ end: v })} /></div>
      <div className="col-span-2 flex flex-wrap gap-2"><button type="button" className={btnP} onClick={() => { if (f.title.trim() && f.days.length) onSave(f); }}>Salvar</button><button type="button" className={btnG} onClick={onCancel}>Cancelar</button>
        {onDelete && <button type="button" className={btnL + ' ml-auto'} onClick={onDelete}><Ic n="Trash2" className="w-3.5 h-3.5" />Excluir</button>}</div>
    </div>
  );
}
function CycleForm({ f, setF, onSave, onCancel, onDelete }) {
  const set = (p) => setF({ ...f, ...p });
  return (
    <div className="grid grid-cols-2 gap-3 p-4 pt-0">
      <div className="col-span-2"><label className={lbl}>Nome</label><input className={inp} value={f.title} onChange={(e) => set({ title: e.target.value })} /></div>
      <div className="col-span-2"><label className={lbl}>Tipo</label><Seg value={cycleArea(f)} onChange={(v) => set({ area: v })} options={[['casa', 'Casa'], ['cuidado', 'Autocuidado']]} label="Tipo" />
        <p className="text-xs text-zinc-500 mt-1.5">Nenhum dos dois conta como produtividade. A babá lembra igual.</p></div>
      <div><label className={lbl}>Frequência ideal (a cada X dias)</label><input type="number" min="1" className={inp} value={f.every} onChange={(e) => set({ every: Math.max(1, Number(e.target.value) || 1) })} /></div>
      <div><p className={lbl}>Leva</p><DurField label="Leva" min={5} value={f.dur} onChange={(v) => set({ dur: v })} /></div>
      <div className="col-span-2"><label className={lbl}>Última vez</label><input type="date" className={inp} value={isoOf(f.last)} onChange={(e) => e.target.value && set({ last: dayFromIso(e.target.value) })} /></div>
      <div className="col-span-2 flex flex-wrap gap-2"><button type="button" className={btnP} onClick={() => { if (f.title.trim()) onSave(f); }}>Salvar</button><button type="button" className={btnG} onClick={onCancel}>Cancelar</button>
        {onDelete && <button type="button" className={btnL + ' ml-auto'} onClick={onDelete}><Ic n="Trash2" className="w-3.5 h-3.5" />Excluir</button>}</div>
    </div>
  );
}
const GRUPOS = { estudos: ['Faculdade', 'Capacitação', 'Idioma', 'Estudo', 'Curso'], casa: ['Casa', 'Limpeza'], pessoal: [] };
const grupoOf = (cat) => (GRUPOS.estudos.includes(cat) ? 'estudos' : GRUPOS.casa.includes(cat) ? 'casa' : 'pessoal');
const freqLabel = (t) => (t.event ? `compromisso ${t.due != null ? fmtCurto(t.due) : ''} ${t.event.start}–${t.event.end}` : t.freq === 0 ? `avulsa${t.due != null ? `, até ${fmtCurto(t.due)}` : ''}` : t.freq === 7 ? 'todo dia' : `${t.freq}x por semana`);
function Actions({ onEdit, onDup, onDel, open, name }) {
  const [ask, setAsk] = useState(false);
  useEffect(() => { if (!ask) return; const id = setTimeout(() => setAsk(false), 3500); return () => clearTimeout(id); }, [ask]);
  const ib = 'w-9 h-9 grid place-items-center rounded-lg text-zinc-500 hover:text-zinc-100 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9f8fff]';
  if (ask) return (
    <div className="flex items-center gap-1 shrink-0">
      <button className="h-9 px-3 rounded-lg text-sm bg-[#ff7f5e]/15 text-[#ff7f5e] hover:bg-[#ff7f5e]/25" onClick={() => { setAsk(false); onDel(); }}>Excluir</button>
      <button className="h-9 px-2 rounded-lg text-sm text-zinc-400 hover:bg-white/5" onClick={() => setAsk(false)}>Não</button>
    </div>
  );
  return (
    <div className="flex items-center gap-0.5 shrink-0 sm:opacity-60 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
      <button className={ib} aria-label={`${open ? 'Fechar' : 'Editar'} ${name}`} aria-expanded={open} onClick={onEdit}><Ic n={open ? 'ChevronUp' : 'Pencil'} className="w-4 h-4" /></button>
      {onDup && <button className={ib} aria-label={`Duplicar ${name}`} onClick={onDup}><Ic n="Copy" className="w-4 h-4" /></button>}
      <button className={ib} aria-label={`Excluir ${name}`} onClick={() => setAsk(true)}><Ic n="Trash2" className="w-4 h-4" /></button>
    </div>
  );
}
function RRow({ accent, title, meta, right, actions, open, children }) {
  return (
    <div className="group">
      <div className="flex items-center gap-3 px-4 py-3">
        <i className="w-1 self-stretch rounded-full shrink-0" style={{ background: accent || 'transparent' }} />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] text-zinc-100 leading-snug">{title}</p>
          {meta && <div className="text-sm text-zinc-500 mt-0.5">{meta}</div>}
        </div>
        {right}
        {actions}
      </div>
      {open && <div className="border-t border-white/[0.05] bg-zinc-950/40 pt-4">{children}</div>}
    </div>
  );
}
const SECOES = [
  { id: 'tarefas', t: 'Tarefas e estudos', d: 'O que entra na sua semana', icon: 'ListChecks', n: (s) => s.tasks.length, novo: 'Nova tarefa' },
  { id: 'fixos', t: 'Horários fixos', d: 'Trabalho, trajetos e compromissos que não mudam', icon: 'CalendarClock', n: (s) => s.fixed.length, novo: 'Novo horário' },
  { id: 'metas', t: 'Provas e metas', d: 'Revisões antes de provas e projetos em passos', icon: 'Target', n: (s) => (s.exams || []).length + (s.projects || []).length, novo: null },
  { id: 'ciclos', t: 'Casa e autocuidado', d: 'Agora fica na aba Cuidar', icon: 'Heart', n: (s) => s.cycles.length, novo: null, go: 'cuidar' },
  { id: 'semestre', t: 'Semestre', d: 'Aulas, feriados e folgas', icon: 'GraduationCap', n: (s) => s.fixed.filter((f) => f.sem).length + ((s.semester && s.semester.holidays) || []).filter((h) => h.date >= s.day).length },
  { id: 'sono', t: 'Sono e cuidados', d: 'Sono, comida, remédios, saída de casa, social', icon: 'Moon', n: () => null },
  { id: 'conforto', t: 'Conforto e backup', d: 'Baixo estímulo, tema, fonte, exportar', icon: 'EyeOff', n: () => null },
  { id: 'conta', t: 'Conta e aparelhos', d: 'Login, sincronizar, celular, lembretes, Google Agenda', icon: 'Users', n: () => null },
];
/* ===================== notificações: plano do dia (usado no app e no push do servidor) ===================== */
const NOTIF0 = { blocks: true, lead: 10, care: true, sleep: true, sound: true, quiet: true };
const notifCfg = (s) => ({ ...NOTIF0, ...(s.notif || {}) });
// Em silêncio entre a hora de dormir e a de acordar (o aviso de desacelerar vem antes).
function inSleep(s, m) { const b = toMin(s.sleepGoal.bed), w = toMin(s.sleepGoal.wake); return b > w ? m >= b || m < w : m >= b && m < w; }
function notifPlan(s, day, opts = {}) {
  const c = notifCfg(s), low = !!(s.ui && s.ui.lowStim), out = [], vac = vacationOn(s, day);
  const lead = c.lead, when = (t) => (lead ? `Em ${lead} min: ${t}` : `Agora: ${t}`);
  if (c.blocks) {
    s.plan.items.filter((it) => it.day === day && it.status === 'pendente' && it.start != null && refOf(s, it) && !areaOf(s, it)).forEach((it) => out.push({ id: `it-${it.id}`, at: it.start - lead, title: when(itemTitle(s, it)), body: low ? '' : 'Hora de ir fechando o que está fazendo.', kind: 'bloco' }));
    fixedOn(s, day).filter((f) => !(f.log && f.log.st === 'nao')).forEach((f) => out.push({ id: `fx-${day}-${f.id}`, at: f.s - lead, title: when(f.title), body: low ? '' : f.type === 'trajeto' ? 'Hora de se arrumar para sair.' : 'Hora de ir fechando o que está fazendo.', kind: 'bloco' }));
  }
  if (c.care && !(vac && !vac.keepCare)) {
    const taken = (s.medsTaken || {})[day] || {}; (s.careCfg.meds || []).filter((m) => m.name && !taken[m.id]).forEach((m) => out.push({ id: `med-${day}-${m.id}`, at: toMin(m.time), title: `Hora do remédio: ${m.name}`, body: low ? '' : 'Marque quando tomar.', kind: 'cuidado' }));
    const ate = (s.mealsDone || {})[day] || {}; (s.careCfg.meals || []).filter((m) => m.on !== false && !ate[m.id]).forEach((m) => out.push({ id: `meal-${day}-${m.id}`, at: toMin(m.time), title: `Hora do ${String(m.name || 'refeição').toLowerCase()}`, body: low ? '' : 'Comer também é cuidar de você.', kind: 'cuidado' }));
    if (opts.water && day === s.day && gMl(s) > 0) [630, 870, 1110].forEach((t) => { const wake = toMin(s.sleepGoal.wake), bed = nightMin(s.sleepGoal.bed), frac = Math.max(0, Math.min(1, (t - wake) / Math.max(60, bed - wake))); if (wMl(s) < gMl(s) * frac * 0.7) out.push({ id: `water-${day}-${t}`, at: t, title: 'Um copo de água?', body: low ? '' : `${fmtL(wMl(s))} de ${fmtL(gMl(s))} até agora.`, kind: 'cuidado' }); });
  }
  if (c.sleep) out.push({ id: `sleep-${day}`, at: ((toMin(s.sleepGoal.bed) - 30) + 1440) % 1440, title: 'Hora de desacelerar', body: low ? '' : `Daqui a 30 min é hora de dormir (${s.sleepGoal.bed}).`, kind: 'sono' });
  return out.filter((n) => n.at >= 0 && n.at < 1440 && !(c.quiet && n.kind !== 'sono' && inSleep(s, n.at)));
}
const NKEY = 'qd-notif';
const nLoad = (day) => { try { const v = JSON.parse(localStorage.getItem(NKEY)); if (v && v.day === day) return v; } catch (e) {} return { day, fired: [], hist: [], snooze: [] }; };
const nSave = (v) => { try { localStorage.setItem(NKEY, JSON.stringify(v)); } catch (e) {} };
// Ações rápidas a partir do id (o mesmo id é usado como "tag" no push do servidor).
function notifRef(s, id) {
  const m = String(id || '').replace(/:s\d+$/, '').match(/^(it|fx|med|meal|water|sleep)-(.+)$/); if (!m) return null;
  if (m[1] === 'it') { const it = s.plan.items.find((y) => y.id === m[2]); return it ? { type: 'item', it } : null; }
  const [d, ...rest] = m[2].split('-'); return { type: m[1], day: +d, id: rest.join('-') };
}

/* ===================== lembretes push (calculados aqui, enviados pelo servidor) ===================== */
function remindersFor(s) {
  const out = [], min = Date.now() + 60000;
  const at = (day, m) => { const [y, mo, d] = isoOf(day).split('-').map(Number); return new Date(y, mo - 1, d, Math.floor(m / 60), m % 60).getTime(); };
  for (const day of [s.day, s.day + 1, s.day + 2]) notifPlan(s, day).forEach((n) => out.push({ at: at(day, n.at), title: n.title, body: n.body, tag: n.id }));
  return out.filter((r) => r.at > min).sort((a, b) => a.at - b.at).slice(0, 120).map((r) => ({ ...r, at: new Date(r.at).toISOString() }));
}

/* ===================== CONTA E APARELHOS ===================== */
const AUTH_ERR = (e) => { const m = String((e && e.message) || ''); return /invalid login/i.test(m) ? 'E-mail ou senha não conferem.' : /not confirmed/i.test(m) ? 'Falta confirmar o e-mail: abra o link que chegou na sua caixa.' : /already registered|already exists/i.test(m) ? 'Esse e-mail já tem conta. Use "Entrar".' : /password/i.test(m) && /6|characters|least/i.test(m) ? 'A senha precisa de pelo menos 6 caracteres.' : /rate|too many|seconds/i.test(m) ? 'Muitas tentativas seguidas. Espere um minuto e tente de novo.' : /fetch|network/i.test(m) ? 'Sem conexão agora. Tente de novo quando tiver internet.' : m || 'Não deu certo agora. Tente de novo.'; };
const fmtSync = (st) => st.sync === 'syncing' ? 'Sincronizando…' : st.sync === 'error' ? 'Não consegui sincronizar agora. Tento de novo na próxima mudança.' : st.sync === 'login' ? 'A sessão expirou. Entre de novo.' : st.at ? `Sincronizado às ${new Date(st.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Pronto para sincronizar.';
function AccountPanel({ s, onLoggedIn, initial, onLogout }) {
  useCloud();
  const [mode, setMode] = useState(initial || 'entrar'), [email, setEmail] = useState(''), [pw, setPw] = useState(''), [busy, setBusy] = useState(false), [msg, setMsg] = useState(null);
  if (!canCloud()) return <p className="text-sm text-zinc-400">Conta e sincronização funcionam no endereço do app. Este arquivo aberto direto no computador continua só local.</p>;
  const u = Cloud.user;
  if (u) return (
    <div className="space-y-3">
      <div className="flex items-center gap-3"><span className="w-9 h-9 rounded-full grid place-items-center bg-[#9f8fff]/15 text-[#c4b9ff] shrink-0"><Ic n="Users" className="w-4 h-4" /></span>
        <span className="flex-1 min-w-0"><span className="block text-sm text-zinc-100 truncate">{u.email || 'Conta conectada'}</span><span className={`block text-xs ${Cloud.status.sync === 'error' || Cloud.status.sync === 'login' ? 'text-[#ffc24d]' : 'text-zinc-500'}`} role="status">{fmtSync(Cloud.status)}</span></span></div>
      <div className="flex flex-wrap gap-2"><button className={btnG + ' min-h-[38px] h-9 text-sm'} onClick={() => Cloud.pushNow(s)}><Ic n="RefreshCw" className="w-3.5 h-3.5" />Sincronizar agora</button><button className={btnL} onClick={() => (onLogout ? onLogout() : Cloud.signOut())}>Sair da conta</button></div>
      <p className="text-xs text-zinc-500 hint">Seus dados ficam salvos na nuvem e aparecem em qualquer aparelho em que você entrar. Ao sair, este aparelho continua com uma cópia local.</p>
    </div>);
  const go = async () => {
    setBusy(true); setMsg(null);
    try {
      if (mode === 'senha') { await Cloud.recover(email.trim()); setMsg({ ok: true, t: 'Se esse e-mail tiver conta, chegou um link para criar uma senha nova.' }); }
      else if (mode === 'criar') { const r = await Cloud.signUp(email.trim(), pw); if (r.confirm) setMsg({ ok: true, t: 'Conta criada. Confirme pelo link que chegou no seu e-mail e depois entre aqui.' }); else onLoggedIn && onLoggedIn(); }
      else { await Cloud.signIn(email.trim(), pw); onLoggedIn && onLoggedIn(); }
    } catch (e) { setMsg({ t: AUTH_ERR(e) }); }
    setBusy(false);
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] w-fit" role="tablist">{[['criar', 'Criar conta'], ['entrar', 'Entrar']].map(([k, l]) => <button key={k} role="tab" aria-selected={mode === k} onClick={() => { setMode(k); setMsg(null); }} className={`h-8 px-3 rounded-lg text-sm press ${mode === k ? 'bg-white/10 text-zinc-100' : 'text-zinc-500'}`}>{l}</button>)}</div>
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); go(); }}>
        <input className={inp} type="email" autoComplete="email" required placeholder="seu@email.com" aria-label="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        {mode !== 'senha' && <input className={inp} type="password" autoComplete={mode === 'criar' ? 'new-password' : 'current-password'} required minLength={6} placeholder={mode === 'criar' ? 'Crie uma senha (6+ caracteres)' : 'Senha'} aria-label="Senha" value={pw} onChange={(e) => setPw(e.target.value)} />}
        <button className={btnP + ' w-full'} disabled={busy || !email.trim() || (mode !== 'senha' && pw.length < 6)}>{busy ? 'Um instante…' : mode === 'criar' ? 'Criar conta' : mode === 'senha' ? 'Mandar link' : 'Entrar'}</button>
      </form>
      {msg && <p className={`text-sm ${msg.ok ? 'text-[#7ff0d8]' : 'text-[#ffc24d]'}`} role="status">{msg.t}</p>}
      <div className="flex items-center gap-3 text-xs text-zinc-600"><i className="h-px flex-1 bg-white/10" />ou<i className="h-px flex-1 bg-white/10" /></div>
      <button className={btnG + ' w-full'} onClick={() => Cloud.signInGoogle()}><svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z"/></svg>Continuar com Google</button>
      {mode === 'entrar' && <button className={btnL + ' text-xs'} onClick={() => { setMode('senha'); setMsg(null); }}>Esqueci a senha</button>}
    </div>);
}
function ContaSection({ s, act }) {
  useCloud();
  const u = Cloud.user, [g, setG] = useState(null), [fmsg, setF] = useState(null), [pmsg, setPmsg] = useState(null), [bk, setBk] = useState(null), [conf, setConf] = useState(null);
  useEffect(() => { if (u) Cloud.lumeCheck(); }, [u && u.id]);
  const ai = Cloud.status.aiReady;
  const pushTxt = !Cloud.pushSupported() ? (Pwa.ios && !Pwa.installed ? 'No iPhone, as notificações só funcionam depois de instalar o app na tela de início (abaixo).' : 'Este navegador não recebe notificações push.') : null;
  const togglePush = async () => {
    setPmsg(null);
    try { if (Cloud.pushOn) { await Cloud.disablePush(); setPmsg('Notificações desligadas neste aparelho.'); } else { await Cloud.enablePush(); Cloud.setReminders(remindersFor(s)); setPmsg('Pronto. Os lembretes chegam mesmo com o app fechado.'); } }
    catch (e) { setPmsg(e.message === 'denied' ? 'O aparelho não deu permissão. Libere as notificações do QuestDay nas configurações e tente de novo.' : e.status === 401 ? 'Entre na conta primeiro.' : 'Não consegui ligar agora. Tente de novo.'); }
  };
  const importG = async () => {
    setG({ busy: true, t: 'Buscando seus compromissos dos próximos 14 dias…' });
    try {
      const r = await Cloud.gcalEvents(14), n = act.importGcal(r.events), dup = r.events.length - n;
      setG({ ok: true, t: !r.total ? 'Sua agenda está vazia nos próximos 14 dias. Nada para importar.' : n ? `${n} compromisso${n > 1 ? 's' : ''} da Google Agenda ${n > 1 ? 'entraram' : 'entrou'} na sua semana.${dup ? ` ${dup} já estava${dup > 1 ? 'm' : ''} aqui.` : ''}${r.allDay ? ` ${r.allDay} de dia inteiro ${r.allDay > 1 ? 'ficaram' : 'ficou'} de fora.` : ''}` : r.events.length ? 'Nada novo: esses compromissos já estavam na sua semana.' : `Só achei evento de dia inteiro (${r.allDay}), que não vira bloco com horário.` });
    } catch (e) {
      setG({ err: true, t: e.code === 'no_client_id' ? 'A integração com o Google ainda não foi configurada: falta o Client ID OAuth (GOOGLE_CLIENT_ID no .env do build).' : e.code === 'closed' || e.code === 'denied' ? 'A permissão do Google foi cancelada. Nada foi importado.' : e.code === 'api_disabled' ? 'O Google recusou: a Google Calendar API precisa estar ativada no projeto do Google Cloud.' : e.code === 'expired' ? 'A autorização expirou. Toque em importar de novo.' : e.code === 'offline' ? 'Não consegui falar com o Google agora. Confira a internet.' : 'Não consegui ler a agenda agora. Tente de novo.' });
    }
  };
  const importF = async (fl) => { if (!fl) return; setF({ busy: true, t: 'Lendo o arquivo…' }); try { const txt = await readIcsFile(fl); const r = act.importIcsFile(txt); const n = r.weekly + r.once;
    setF({ ok: true, t: !r.total ? 'Não achei eventos nesse arquivo. Confira se é um .ics exportado do calendário.' : n ? `Importei ${[r.weekly ? `${r.weekly} horário${r.weekly > 1 ? 's' : ''} semana${r.weekly > 1 ? 'is' : 'l'}` : '', r.once ? `${r.once} compromisso${r.once > 1 ? 's' : ''} com data` : ''].filter(Boolean).join(' e ')}.${r.dupes ? ` ${r.dupes} já estava${r.dupes > 1 ? 'm' : ''} aqui.` : ''}${r.skipped.past ? ` ${r.skipped.past} já ${r.skipped.past > 1 ? 'passaram' : 'passou'}.` : ''}${r.skipped.allDay ? ` ${r.skipped.allDay} de dia inteiro ${r.skipped.allDay > 1 ? 'ficaram' : 'ficou'} de fora.` : ''}` : 'Nada novo: os eventos já estavam aqui, já passaram ou são de dia inteiro.' }); }
    catch (e) { setF({ err: true, t: e && e.message && !/^[A-Z][a-z]+Error/.test(e.message) ? e.message : 'Não consegui ler esse arquivo.' }); } };
  const loadBk = async () => { try { setBk(await Cloud.backups()); } catch (e) { setBk([]); } };
  const row = (icon, title, sub, right) => <div className="flex items-center gap-3"><span className="w-9 h-9 rounded-full grid place-items-center bg-white/[0.05] text-zinc-300 shrink-0"><Ic n={icon} className="w-4 h-4" /></span><span className="flex-1 min-w-0"><span className="block text-sm text-zinc-100">{title}</span>{sub && <span className="block text-xs text-zinc-500">{sub}</span>}</span>{right}</div>;
  return (
    <div className="space-y-4">
      <div className={card + ' p-5 space-y-3'}><p className="text-zinc-100 font-medium">Sua conta</p><AccountPanel s={s} onLoggedIn={() => act.cloudLogin()} onLogout={act.logout} /></div>
      <div className={card + ' p-5 space-y-3'}>
        {row('Download', 'App no celular', Pwa.installed ? 'Instalado. Abra pelo ícone na tela de início.' : Pwa.ios ? 'No Safari: toque em Compartilhar e depois em "Adicionar à Tela de Início".' : Pwa.canInstall ? 'Ganha ícone, abre em tela cheia e funciona offline.' : 'No Chrome do celular: menu ⋮ e "Instalar app".',
          Pwa.canInstall && !Pwa.installed ? <button className={btnP + ' min-h-[38px] h-9 text-sm'} onClick={() => Pwa.install()}>Instalar</button> : null)}
      </div>
      <NotifCard s={s} act={act} />
      <div className={card + ' p-5 space-y-3'}>
        {row('CalendarArrowUp', 'Google Agenda e calendários', 'Traz seus compromissos para a semana como blocos fixos. Só leitura: o QuestDay não muda nada no seu calendário.', null)}
        <div className="flex flex-wrap gap-2">
          <button className={btnG + ' min-h-[38px] h-9 text-sm'} disabled={g && g.busy} onClick={importG}><Ic n={g && g.busy ? 'RefreshCw' : 'Download'} className={'w-3.5 h-3.5' + (g && g.busy ? ' animate-spin' : '')} />{g && g.busy ? 'Importando…' : 'Importar da Google Agenda (14 dias)'}</button>
          <label className={btnG + ' min-h-[38px] h-9 text-sm cursor-pointer'}><Ic n="Upload" className="w-3.5 h-3.5" />Arquivo .ics<input type="file" accept=".ics,text/calendar" className="sr-only" onChange={(e) => { importF(e.target.files[0]); e.target.value = ''; }} /></label>
        </div>
        {!Cloud.gcalConfigured() && !g && <p className="text-xs text-zinc-500">A conexão direta com a Google Agenda ainda precisa do Client ID OAuth. Enquanto isso, o arquivo .ics funciona: exporte do Google, Outlook, Apple ou do portal da faculdade.</p>}
        {g && <p className={`text-xs ${g.err ? 'text-[#ffc24d]' : g.busy ? 'text-zinc-400' : 'text-zinc-300'}`} role="status">{g.t}</p>}
        {fmsg && <p className={`text-xs ${fmsg.err ? 'text-[#ffc24d]' : fmsg.busy ? 'text-zinc-400' : 'text-zinc-300'}`} role="status">{fmsg.t}</p>}
      </div>
      {u && <div className={card + ' p-5 space-y-3'}>
        {row('Sparkles', 'Lume com IA pelo servidor', ai === true ? 'Ligado, com o Gemini. A chave fica guardada no servidor, nunca neste aparelho.' : ai === 'not_configured' ? 'Falta a chave da IA no servidor. Enquanto isso o Lume usa o modo local.' : ai === 'forbidden' ? 'A IA do servidor está liberada só para a conta da dona do app. O modo local continua funcionando.' : ai === false ? 'Não consegui falar com o servidor agora.' : 'Verificando…', null)}
      </div>}
      {u && <div className={card + ' p-5 space-y-3'}>
        {row('Archive', 'Versões anteriores', 'Guardo uma cópia a cada 6 horas de uso (as 30 últimas).', bk ? null : <button className={btnL} onClick={loadBk}>Ver</button>)}
        {bk && (bk.length ? <ul className="divide-y divide-white/[0.05]">{bk.slice(0, 10).map((b) => <li key={b.id} className="py-2 flex items-center justify-between gap-2 text-sm"><span className="text-zinc-300">{new Date(b.saved_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          {conf === b.id ? <span className="flex gap-1"><button className={btnL + ' text-[#ffc24d]'} onClick={async () => { const d = await Cloud.backup(b.id); if (d) act.loadRemote(d, 'Versão anterior restaurada.'); setConf(null); }}>Trocar por esta</button><button className={btnL} onClick={() => setConf(null)}>Cancelar</button></span> : <button className={btnL} onClick={() => setConf(b.id)}>Restaurar</button>}</li>)}</ul> : <p className="text-xs text-zinc-500">Ainda não há versões anteriores.</p>)}
      </div>}
    </div>);
}

function AccountModal({ s, act, onClose, goSettings }) {
  useCloud();
  const [reset, setReset] = useState(false), [rerr, setRerr] = useState(null);
  const u = Cloud.user, [del, setDel] = useState(false), [typed, setTyped] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState(null);
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') (del ? setDel(false) : onClose()); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [del]);
  const doDelete = async () => { setBusy(true); setErr(null); try { await act.deleteAccount(); } catch (e) { setErr('Não consegui excluir agora. Confira a internet e tente de novo.'); setBusy(false); } };
  return (
    <Sheet onClose={() => (del ? setDel(false) : onClose())} label="Conta">
      <div className="p-5 pt-2 sm:p-6 space-y-5">
        <div className="flex items-center justify-between"><h2 id="acct-t" className="text-lg font-semibold text-zinc-50">Conta</h2><button className="w-9 h-9 grid place-items-center rounded-lg text-zinc-500 hover:bg-white/5" aria-label="Fechar" onClick={onClose}><Ic n="X" className="w-4 h-4" /></button></div>
        <section className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Sessão</p>
          {u ? <div className="flex items-center gap-3"><span className="w-10 h-10 rounded-full grid place-items-center bg-[#9f8fff]/15 text-[#c4b9ff] font-medium shrink-0">{(u.email || '?')[0].toUpperCase()}</span>
              <span className="min-w-0"><span className="block text-sm text-zinc-100 truncate">{u.email || 'Conta conectada'}</span><span className="block text-xs text-zinc-500">{fmtSync(Cloud.status)}</span></span></div>
            : s.demo ? <div className="rounded-xl border border-[#ffc24d]/25 bg-[#ffc24d]/[0.06] p-4 space-y-3"><p className="text-sm text-zinc-200">Você está no <b className="font-medium">modo demonstração</b>. Os dados são de exemplo e nada é salvo na nuvem.</p><button className={btnP + ' w-full'} onClick={act.exitDemo}>Sair da demonstração e criar conta</button></div>
            : <div className="space-y-3"><p className="text-sm text-zinc-400">Seus dados estão só neste aparelho. Entre para salvar na nuvem.</p><AccountPanel s={s} onLoggedIn={() => { act.cloudLogin(); }} /></div>}
          <button className={btnL + ' -ml-2'} onClick={goSettings}><Ic n="SlidersHorizontal" className="w-3.5 h-3.5" />Lembretes, celular e Google Agenda</button>
        </section>
        {u && <section className="space-y-2 border-t border-white/[0.06] pt-4"><button className={btnG + ' w-full'} onClick={act.logout}><Ic n="DoorOpen" />Sair da conta</button><p className="text-xs text-zinc-500">Seus dados continuam salvos na conta. Você volta para a tela inicial.</p></section>}
        <section className="space-y-2 border-t border-white/[0.06] pt-4">
          <p className="text-sm text-zinc-100 font-medium">Recomeçar do zero</p>
          <p className="text-xs text-zinc-500">{u ? 'Apaga sua rotina, tarefas, histórico e ofensiva e abre a montagem da rotina de novo. A conta continua, e a versão atual fica guardada em "Versões anteriores".' : s.demo ? 'Apaga os dados de exemplo e volta para a tela inicial.' : 'Apaga tudo deste aparelho e abre a montagem da rotina de novo.'}</p>
          {reset ? <div className="rounded-xl border border-[#ffc24d]/30 bg-[#ffc24d]/[0.06] p-3 space-y-2"><p className="text-sm text-zinc-200">Tem certeza? Sua rotina atual sai da tela agora.</p>
              {rerr && <p className="text-xs text-[#ffc24d]" role="status">{rerr}</p>}
              <div className="flex gap-2"><button className={btnG + ' flex-1'} disabled={busy} onClick={() => setReset(false)}>Cancelar</button><button className={btnP + ' flex-1'} disabled={busy} onClick={async () => { setBusy(true); setRerr(null); try { await act.resetAll(); } catch (e) { setRerr('Não consegui recomeçar agora. Confira a internet e tente de novo.'); setBusy(false); } }}><Ic n="RotateCcw" />{busy ? 'Recomeçando…' : 'Recomeçar'}</button></div></div>
            : <button className={btnG + ' w-full'} onClick={() => setReset(true)}><Ic n="RotateCcw" />Recomeçar do zero</button>}
        </section>
        {u && <section className="space-y-3 rounded-xl border border-[#ff5c7a]/30 bg-[#ff5c7a]/[0.05] p-4">
          <p className="text-sm font-medium text-[#ff8da1]">Zona de perigo</p>
          <p className="text-xs text-zinc-400">Apaga para sempre sua rotina, histórico, lembretes e versões salvas do QuestDay. Não dá para desfazer.</p>
          <button className="inline-flex items-center justify-center gap-2 w-full min-h-[44px] px-4 rounded-xl bg-[#ff5c7a] text-zinc-950 font-medium hover:bg-[#ff7590] press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8da1]" onClick={() => { setDel(true); setTyped(''); }}><Ic n="Trash2" />Excluir minha conta</button>
        </section>}
      </div>
      {del && <div className="fixed inset-0 z-[80] grid place-items-center p-4 bg-black/70" role="alertdialog" aria-modal="true" aria-labelledby="del-t" aria-describedby="del-d">
        <div className="w-full max-w-sm rounded-2xl border border-[#ff5c7a]/40 bg-zinc-950 p-5 space-y-4 pop-in">
          <h3 id="del-t" className="text-base font-semibold text-zinc-50">Excluir a conta de vez?</h3>
          <div id="del-d" className="space-y-2 text-sm text-zinc-400"><p>Tudo do QuestDay em <b className="text-zinc-200 font-medium">{u && u.email}</b> será apagado: rotina, histórico, ofensiva, lembretes e versões salvas. Isso não tem volta.</p>
            <p className="text-xs text-zinc-500">Se esse login também for usado no Fluxo Previsto, ele continua existindo lá. Só os dados do QuestDay são apagados.</p></div>
          <label className="block text-xs text-zinc-500">Para confirmar, digite <b className="text-zinc-300">EXCLUIR</b><input className={inp + ' mt-1'} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" aria-label="Digite EXCLUIR para confirmar" /></label>
          {err && <p className="text-sm text-[#ffc24d]" role="status">{err}</p>}
          <div className="flex gap-2 justify-end"><button className={btnG} onClick={() => setDel(false)} disabled={busy}>Cancelar</button>
            <button className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl bg-[#ff5c7a] text-zinc-950 font-medium disabled:opacity-40 press" disabled={typed.trim().toUpperCase() !== 'EXCLUIR' || busy} onClick={doDelete}>{busy ? 'Excluindo…' : 'Excluir para sempre'}</button></div>
        </div></div>}
    </Sheet>);
}

const TOUR = [
  { k: 'energia', t: 'Seu dia no seu ritmo', d: 'Toda manhã um check-in rápido de sono e energia. Com ele eu deixo o dia mais leve ou mais cheio, e a barra mostra quanto você ainda tem.' },
  { k: 'agora', t: 'Uma coisa de cada vez', d: 'Aqui fica só o que importa agora. Se travar, use "Não sei por onde começar" ou "Travou / trocar por algo mais leve": eu quebro em passos ou troco a tarefa.' },
  { k: 'cuidados', t: 'Cuidados e o Lume', d: 'Água, refeições e remédios ficam aqui, junto com a sua ofensiva. Cuidar de você também conta, e o Lume cresce com a sua constância.' },
  { k: 'menu', t: 'Tudo no menu', d: 'Na Semana você vê o plano inteiro. Em Minha Rotina ajusta horários, tarefas e preferências. E em Conta cuida do login, dos lembretes e do celular.' },
];
function Tour({ onEnd }) {
  const [i, setI] = useState(0), [r, setR] = useState(null), [vw, setVw] = useState(() => window.innerWidth);
  const step = TOUR[i];
  useEffect(() => {
    const find = () => { const els = [...document.querySelectorAll(`[data-tour="${step.k}"]`)].filter((e) => e.getClientRects().length); return els[0]; };
    const el = find(); if (el && step.k !== 'menu') el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const upd = () => { const e = find(); setVw(window.innerWidth); if (!e) { setR(null); return; } const b = e.getBoundingClientRect(); setR({ x: b.left, y: b.top, w: b.width, h: b.height }); };
    const t = setTimeout(upd, 380); upd();
    window.addEventListener('resize', upd); window.addEventListener('scroll', upd, true);
    const k = (e) => { if (e.key === 'Escape') onEnd(); if (e.key === 'ArrowRight') setI((x) => Math.min(TOUR.length - 1, x + 1)); };
    document.addEventListener('keydown', k);
    return () => { clearTimeout(t); window.removeEventListener('resize', upd); window.removeEventListener('scroll', upd, true); document.removeEventListener('keydown', k); };
  }, [i]);
  const last = i === TOUR.length - 1, pad = 8, W = Math.min(340, vw - 24);
  let box = { left: 12, bottom: 96 };
  if (r) {
    const below = window.innerHeight - (r.y + r.h), cx = Math.max(12, Math.min(vw - W - 12, r.x + r.w / 2 - W / 2));
    if (r.w < 260 && r.x + r.w + W + 24 < vw) box = { left: r.x + r.w + 16, top: Math.max(12, Math.min(window.innerHeight - 230, r.y + 8)) };
    else if (below > 240) box = { left: cx, top: r.y + r.h + 14 };
    else if (r.y > 240) box = { left: cx, top: Math.max(12, r.y - 14 - 200) };
    else box = { left: cx, bottom: 16 };
  }
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[75]" role="dialog" aria-modal="true" aria-labelledby="tour-t" aria-describedby="tour-d">
      {r ? <div className="fixed rounded-2xl pointer-events-none transition-all duration-300 ring-2 ring-[#9f8fff]" style={{ left: r.x - pad, top: r.y - pad, width: r.w + pad * 2, height: r.h + pad * 2, boxShadow: '0 0 0 9999px rgba(5,6,10,.66)' }} />
        : <div className="fixed inset-0 bg-black/60" />}
      <div className="fixed pop-in rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60 p-5 space-y-3" style={{ ...box, width: W }} key={i}>
        <div className="flex items-center gap-3"><Pet mood="alerta" size={34} /><div className="min-w-0"><p className="text-[11px] text-zinc-500 tabular-nums">{i + 1} de {TOUR.length}</p><p id="tour-t" className="text-zinc-50 font-medium">{step.t}</p></div></div>
        <p id="tour-d" className="text-sm text-zinc-400 leading-relaxed">{step.d}</p>
        <div className="flex items-center gap-2 pt-1"><div className="flex gap-1 flex-1" aria-hidden="true">{TOUR.map((_, j) => <i key={j} className={`h-1.5 rounded-full transition-all ${j === i ? 'w-5 bg-[#9f8fff]' : 'w-1.5 bg-white/15'}`} />)}</div>
          {!last && <button className={btnL} onClick={onEnd}>Pular</button>}
          <button className={btnP + ' min-h-[40px] h-10 text-sm'} autoFocus onClick={() => (last ? onEnd() : setI(i + 1))}>{last ? 'Começar' : 'Próximo'}<Ic n={last ? 'Check' : 'ArrowRight'} className="w-4 h-4" /></button></div>
      </div>
    </div>, document.body);
}

const permOf = () => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
function NotifCard({ s, act }) {
  useCloud();
  const c = notifCfg(s), [perm, setPerm] = useState(permOf), [msg, setMsg] = useState(null), u = Cloud.user;
  const on = perm === 'granted' && s.notify, setC = (p) => act.setNotif(p);
  const sw = (val, fn, label, sub) => <button type="button" role="switch" aria-checked={val} onClick={fn} className="w-full flex items-center justify-between gap-3 text-left py-2"><span><span className="block text-sm text-zinc-200">{label}</span>{sub && <span className="block text-xs text-zinc-500">{sub}</span>}</span><span className={`block w-10 h-6 rounded-full p-0.5 shrink-0 transition-colors ${val ? 'bg-[#2ee8c4]' : 'bg-white/10'}`}><span className={`block w-5 h-5 rounded-full bg-white transition-transform ${val ? 'translate-x-4' : ''}`} /></span></button>;
  const ask = async () => { setMsg(null); if (perm === 'unsupported') return; const r = await Notification.requestPermission(); setPerm(r); act.setNotify(r === 'granted'); if (r === 'granted') setMsg('Pronto. Os avisos chegam como notificação do aparelho quando o app não estiver na tela.'); };
  const pushToggle = async () => { setMsg(null); try { if (Cloud.pushOn) { await Cloud.disablePush(); setMsg('Avisos com o app fechado desligados neste aparelho.'); } else { await Cloud.enablePush(); setPerm(permOf()); act.setNotify(true); Cloud.setReminders(remindersFor(s)); setMsg('Pronto. Os avisos chegam mesmo com o app fechado.'); } } catch (e) { setPerm(permOf()); setMsg(e.message === 'denied' ? 'O aparelho não deu permissão para notificações.' : e.message === 'unsupported' ? 'Este navegador não recebe avisos com o app fechado.' : 'Não consegui ligar agora. Tente de novo.'); } };
  const st = perm === 'unsupported' ? ['Indisponível', 'text-zinc-500', 'Este navegador não mostra notificações. Os avisos aparecem dentro do app.'] : perm === 'denied' ? ['Bloqueadas no navegador', 'text-[#ff8da1]', 'Para liberar: toque no cadeado ao lado do endereço (no celular, em Configurações do app) → Notificações → Permitir. Depois volte aqui.'] : on ? ['Ativadas', 'text-[#7ff0d8]', null] : ['Desativadas', 'text-zinc-400', 'Os avisos aparecem só dentro do app.'];
  return (
    <div className={card + ' p-5 space-y-3'}>
      <div className="flex items-start gap-3"><span className="w-9 h-9 rounded-full grid place-items-center bg-white/[0.05] text-zinc-300 shrink-0"><Ic n="Bell" className="w-4 h-4" /></span>
        <span className="flex-1 min-w-0"><span className="block text-sm text-zinc-100">Notificações</span><span className={`block text-xs ${st[1]}`} role="status">{st[0]}</span></span>
        {perm === 'default' || (perm === 'granted' && !s.notify) ? <button className={btnP + ' min-h-[36px] h-9 text-sm'} onClick={perm === 'granted' ? () => act.setNotify(true) : ask}>Ativar</button> : on ? <button className={btnL} onClick={() => act.setNotify(false)}>Desativar</button> : null}</div>
      {st[2] && <p className="text-xs text-zinc-500">{st[2]}</p>}
      <div className="flex flex-wrap gap-2"><button className={btnG + ' min-h-[36px] h-9 text-sm'} onClick={() => act.testNotif()}><Ic n="Bell" className="w-3.5 h-3.5" />Enviar notificação de teste</button></div>
      <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
        <div>{sw(c.blocks, () => setC({ blocks: !c.blocks }), 'Blocos e compromissos', 'Antes de cada tarefa, aula, trabalho ou trajeto.')}
          {c.blocks && <div className="pb-2"><Seg value={String(c.lead)} onChange={(v) => setC({ lead: +v })} options={[['0', 'Na hora'], ['5', '5 min'], ['10', '10 min'], ['15', '15 min']]} label="Antecedência" /></div>}</div>
        {sw(c.care, () => setC({ care: !c.care }), 'Cuidados', 'Água, refeições e remédios cadastrados.')}
        {sw(c.sleep, () => setC({ sleep: !c.sleep }), 'Hora de desacelerar', `Aviso suave 30 min antes de dormir (${s.sleepGoal.bed}).`)}
        {sw(c.sound, () => setC({ sound: !c.sound }), 'Som suave', s.ui && s.ui.lowStim ? 'No baixo estímulo o som fica desligado.' : null)}
        {sw(c.quiet, () => setC({ quiet: !c.quiet }), 'Silêncio no horário de sono', `Nada entre ${s.sleepGoal.bed} e ${s.sleepGoal.wake}.`)}
        {canCloud() && <div className="pt-1">{u ? (Cloud.pushSupported() ? sw(Cloud.pushOn, pushToggle, 'Também com o app fechado', 'Pelo servidor, mesmo sem abrir o QuestDay. No iPhone, só com o app instalado.') : <p className="text-xs text-zinc-500 py-2">{Pwa.ios && !Pwa.installed ? 'No iPhone, os avisos com o app fechado funcionam depois de instalar o app na tela de início.' : 'Este navegador não recebe avisos com o app fechado.'}</p>) : <p className="text-xs text-zinc-500 py-2">Entre na conta para receber avisos também com o app fechado.</p>}</div>}
      </div>
      {msg && <p className="text-xs text-zinc-300" role="status">{msg}</p>}
    </div>);
}
// Sino no topo: histórico de avisos do dia.
function Bell({ hist, onOpen }) {
  const P = usePopover(300, 360), unread = hist.filter((h) => !h.read).length;
  useEffect(() => { if (P.open) onOpen(); }, [P.open]);
  return (
    <div className="relative" ref={P.ref}>
      <button ref={P.btnRef} onClick={() => P.setOpen(!P.open)} aria-label={`Avisos de hoje${unread ? `, ${unread} novo${unread > 1 ? 's' : ''}` : ''}`} aria-haspopup="dialog" aria-expanded={P.open} className="relative w-11 h-11 md:w-9 md:h-9 grid place-items-center rounded-full bg-white/[0.05] text-zinc-300 hover:bg-white/[0.08]">
        <Ic n="Bell" className="w-4 h-4" />{unread > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff6fb5] text-[10px] font-semibold text-zinc-950 grid place-items-center tabular-nums">{unread > 9 ? '9+' : unread}</span>}</button>
      {P.open && P.pos && ReactDOM.createPortal(
        <div ref={P.popRef} role="dialog" aria-label="Avisos de hoje" style={{ position: 'fixed', ...P.pos, left: Math.max(8, Math.min(P.pos.left, window.innerWidth - 308)) }} className="z-[90] w-[300px] max-h-[360px] overflow-y-auto pop-in rounded-xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60 p-2">
          <p className="px-2 pt-1 pb-2 text-xs uppercase tracking-wide text-zinc-500">Avisos de hoje</p>
          {hist.length ? <ul className="space-y-1">{[...hist].reverse().map((h, i) => <li key={h.id + i} className="rounded-lg px-2.5 py-2 hover:bg-white/[0.04]"><p className="text-sm text-zinc-100 flex items-baseline gap-2"><span className="text-[11px] text-zinc-500 tabular-nums shrink-0">{h.time}</span><span className="min-w-0">{h.title}</span></p>{h.body && <p className="text-xs text-zinc-500 pl-11">{h.body}</p>}</li>)}</ul>
            : <p className="px-2 pb-2 text-sm text-zinc-500">Nenhum aviso ainda hoje.</p>}
        </div>, document.body)}
    </div>);
}

/* ===================== MINHA ROTINA: visão geral ===================== */
function RestartOnb({ onRestart }) {
  const [sure, setSure] = useState(false);
  return sure ? <div className="rounded-xl border border-[#ffc24d]/40 bg-[#ffc24d]/[0.06] p-3 space-y-2"><p className="text-sm text-zinc-200">Isso apaga tudo deste navegador e abre a apresentação de novo. Se quiser guardar, baixe um backup antes (Conforto e backup).</p><div className="flex gap-2"><button className={btnP} onClick={onRestart}>Apagar e recomeçar</button><button className={btnG} onClick={() => setSure(false)}>Cancelar</button></div></div>
    : <button className={btnL} onClick={() => setSure(true)}><Ic n="RotateCcw" className="w-3.5 h-3.5" />Montar minha rotina do zero (apresentação)</button>;
}
function LeaveAdd({ onAdd }) {
  const [v, setV] = useState('');
  return <div className="flex gap-2"><input className={inp + ' h-10'} value={v} placeholder="Ex.: guarda-chuva" onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && v.trim()) { onAdd(v.trim()); setV(''); } }} aria-label="Novo item da saída" /><button className={btnG + ' min-h-[40px] h-10'} onClick={() => { if (v.trim()) { onAdd(v.trim()); setV(''); } }}><Ic n="Plus" /></button></div>;
}
function RotinaOverview({ s, setSec, goTab }) {
  const W0 = Math.max(0, toMin(s.sleepGoal.wake) - 30), W1 = Math.min(1440, nightMin(s.sleepGoal.bed) + 30), span = W1 - W0;
  const X = (m) => `${clamp(((m - W0) / span) * 100, 0, 100)}%`;
  const ticks = [6, 9, 12, 15, 18, 21].map((h) => h * 60).filter((m) => m > W0 && m < W1);
  const col = { trabalho: '#7a6cff', compromisso: '#2ee8c4', trajeto: '#9f8fff' };
  const rec = s.tasks.filter((t) => t.freq > 0 && areaOf(s, { kind: 'task', ref: t.id }) !== 'cuidado');
  const casa = s.cycles.filter((c) => cycleArea(c) === 'casa'), cuid = s.cycles.filter((c) => cycleArea(c) === 'cuidado');
  const quando = (c) => { const n = c.every - (s.day - c.last); return n <= 0 ? 'hoje' : n === 1 ? 'amanhã' : `em ${n} dias`; };
  return (
    <section className="space-y-4 view-in">
      <div className={card + ' p-5 space-y-4'}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap"><p className="text-zinc-100 font-medium">Sua semana-tipo</p><p className="text-xs text-zinc-500">acorda {s.sleepGoal.wake} · dorme {s.sleepGoal.bed}</p></div>
        <div className="space-y-2">
          {SEMANA.map((wd, r) => { const fx = s.fixed.filter((f) => f.days.includes(wd)).map((f) => ({ ...f, a: toMin(f.start), b: toMin(f.end) })); const free = fx.length === 0; return (
            <div key={wd} className="flex items-center gap-3 rise" style={{ animationDelay: `${r * 40}ms` }}>
              <span className="w-9 text-sm text-zinc-400 shrink-0">{DIAS[wd]}</span>
              <div className="relative flex-1 h-7 rounded-lg bg-white/[0.04] overflow-hidden">
                {ticks.map((m) => <span key={m} className="absolute inset-y-0 w-px bg-white/[0.06]" style={{ left: X(m) }} />)}
                {fx.map((f) => <span key={f.id} title={`${f.title} ${f.start}–${f.end}`} className={`absolute inset-y-1 rounded-md grow-x ${f.type === 'trajeto' ? 'trip-stripes border border-[#9f8fff]/40' : ''}`} style={{ left: X(f.a), width: `calc(${X(f.b)} - ${X(f.a)})`, background: f.type === 'trajeto' ? undefined : col[f.type] + (f.type === 'trabalho' ? 'cc' : '66'), animationDelay: `${r * 40 + 120}ms` }}>
                  {f.b - f.a >= 75 && f.type !== 'trajeto' && <span className="absolute inset-0 px-2 flex items-center text-[11px] font-medium text-white/90 truncate">{f.title}</span>}</span>)}
                {free && <span className="absolute inset-0 flex items-center px-3 text-[11px] text-zinc-500">livre</span>}
              </div>
            </div>); })}
          <div className="flex items-center gap-3"><span className="w-9 shrink-0" /><div className="relative flex-1 h-4">{ticks.map((m) => <span key={m} className="absolute -translate-x-1/2 text-[10px] text-zinc-500 tabular-nums" style={{ left: X(m) }}>{m / 60}h</span>)}</div></div>
        </div>
        <p className="text-xs text-zinc-500 flex flex-wrap gap-x-4 gap-y-1"><span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: col.trabalho }} />trabalho</span><span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle trip-stripes border border-[#9f8fff]/40" />trajeto</span><span><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1 align-middle" style={{ background: col.compromisso }} />compromisso</span><span>o resto é tempo que o Lume distribui</span></p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <button onClick={() => setSec('tarefas')} className={card + ' p-4 text-left space-y-2 lift flex flex-col justify-start items-stretch'}>
          <p className="flex items-center gap-2 text-zinc-100 font-medium"><Ic n="Target" className="w-4 h-4 text-[#9f8fff]" />Produtividade</p>
          <p className="text-xs text-zinc-500">Conta no seu progresso.</p>
          <ul className="text-sm text-zinc-300 space-y-1">{rec.slice(0, 5).map((t) => <li key={t.id} className="flex justify-between gap-2"><span className="truncate">{t.title}</span><span className="text-zinc-500 shrink-0">{t.freq === 7 ? 'todo dia' : `${t.freq}x/sem`}</span></li>)}
            {(s.exams || []).length + (s.projects || []).length > 0 && <li className="text-zinc-500">+ {(s.exams || []).length} prova(s) e {(s.projects || []).length} meta(s)</li>}</ul>
        </button>
        <button onClick={() => goTab('cuidar')} className={card + ' p-4 text-left space-y-2 lift flex flex-col justify-start items-stretch'}>
          <p className="flex items-center gap-2 text-zinc-100 font-medium"><Ic n="House" className="w-4 h-4" style={{ color: AREA.casa.c }} />Casa</p>
          <p className="text-xs text-zinc-500">Rotina da casa. Não pesa no progresso.</p>
          <ul className="text-sm text-zinc-300 space-y-1">{casa.map((c) => <li key={c.id} className="flex justify-between gap-2"><span className="truncate">{c.title}</span><span className={quando(c) === 'hoje' ? 'shrink-0' : 'text-zinc-500 shrink-0'} style={quando(c) === 'hoje' ? { color: AREA.casa.c } : null}>{quando(c)}</span></li>)}</ul>
        </button>
        <button onClick={() => goTab('cuidar')} className={card + ' p-4 text-left space-y-2 lift flex flex-col justify-start items-stretch'}>
          <p className="flex items-center gap-2 text-zinc-100 font-medium"><Ic n="Heart" className="w-4 h-4" style={{ color: AREA.cuidado.c }} />Autocuidado</p>
          <p className="text-xs text-zinc-500">Não é produtividade: é a babá cuidando de você.</p>
          <ul className="text-sm text-zinc-300 space-y-1">
            {cuid.map((c) => <li key={c.id} className="flex justify-between gap-2"><span className="truncate">{c.title}</span><span className={quando(c) === 'hoje' ? 'shrink-0' : 'text-zinc-500 shrink-0'} style={quando(c) === 'hoje' ? { color: AREA.cuidado.c } : null}>{quando(c)}</span></li>)}
            <li className="flex justify-between gap-2"><span>Água</span><span className="text-zinc-500">{fmtL(gMl(s))}/dia</span></li>
            {s.careCfg.meds.map((m) => <li key={m.id} className="flex justify-between gap-2"><span className="truncate">{m.name}</span><span className="text-zinc-500">{m.time}</span></li>)}
          </ul>
        </button>
      </div>
    </section>
  );
}

function Cadastro({ s, up, act, sec: sec0, setSec, goTab }) {
  const sec = sec0 === 'ciclos' ? 'tarefas' : sec0;
  const [grupo, setGrupo] = useState('todas');
  const [open, setOpen] = useState(null);
  const [f, setF] = useState(null);
  const edit = (id, obj) => { if (open === id) { setOpen(null); setF(null); } else { setOpen(id); setF({ ...obj }); } };
  const close = () => { setOpen(null); setF(null); };
  const save = (key) => (val) => { const { durTouched, ...clean } = val; act.saveEntity(key, clean); close(); };
  const del = (key, id) => () => { act.deleteEntity(key, id); close(); };
  const meta = SECOES.find((x) => x.id === sec);
  const sg = s.sleepGoal;
  const novos = {
    tarefas: () => edit('new', { id: 'new', title: '', cat: grupo === 'casa' ? 'Casa' : grupo === 'pessoal' ? 'Pessoal' : 'Faculdade', prio: 'media', load: 'media', ...suggestDur('media', 'media'), minText: '', freq: 2, where: 'casa', due: null }),
    fixos: () => edit('new', { id: 'new', type: 'compromisso', title: '', days: [1], start: '19:00', end: '20:00' }),
    ciclos: () => edit('new', { id: 'new', title: '', every: 7, dur: 20, last: s.day }),
  };
  const tasks = s.tasks.filter((t) => grupo === 'todas' || grupoOf(t.cat) === grupo);
  const countG = (g) => s.tasks.filter((t) => grupoOf(t.cat) === g).length;
  const list = 'rounded-2xl border border-white/[0.07] bg-zinc-900/60 divide-y divide-white/[0.05] overflow-hidden';
  const pill = (on) => `h-9 px-3.5 rounded-full text-sm transition-colors ${on ? 'bg-zinc-100 text-zinc-900' : 'bg-white/[0.05] text-zinc-400 hover:text-zinc-200'}`;
  const newForm = (Form, key) => open === 'new' && <div className="bg-zinc-950/40"><p className="px-4 pt-4 pb-3 text-zinc-100 font-medium">{meta.novo}</p><Form f={f} setF={setF} onSave={save(key)} onCancel={close} /></div>;
  return (
    <div className="space-y-6 max-w-5xl">
      <RotinaOverview s={s} goTab={goTab} setSec={(x) => { setSec(x); close(); setTimeout(() => { const el = document.getElementById('cadastro'); el && el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30); }} />
      <div id="cadastro" className="pt-2 scroll-mt-6"><h2 className="text-xl font-semibold text-zinc-50 tracking-tight">Cadastro</h2><p className="text-sm text-zinc-500">O que entra na rotina. Tudo editável.</p></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {SECOES.map((x) => (
          <button key={x.id} onClick={() => { if (x.go) { goTab(x.go); return; } setSec(x.id); close(); }} aria-pressed={sec === x.id}
            className={`lift text-left rounded-2xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9f8fff] ${sec === x.id ? 'border-[#9f8fff]/50 bg-[#9f8fff]/[0.07]' : 'border-white/[0.07] bg-zinc-900/40 hover:bg-zinc-900'}`}>
            <span className="flex items-center justify-between"><Ic n={x.icon} className={`w-5 h-5 ${sec === x.id ? 'text-[#9f8fff]' : 'text-zinc-500'}`} />{x.n(s) != null && <span className="text-sm text-zinc-500 tabular-nums">{x.n(s)}</span>}</span>
            <span className="block mt-3 text-[15px] text-zinc-100 font-medium">{x.t}</span>
            <span className="block text-xs text-zinc-500 mt-0.5 leading-snug hint">{x.d}</span>
          </button>
        ))}
      </div>
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div><h2 className="text-xl font-semibold text-zinc-50">{meta.t}</h2><p className="text-sm text-zinc-500">{meta.d}</p></div>
        {meta.novo && open !== 'new' && <button className={btnP} onClick={novos[sec]}><Ic n="Plus" />{meta.novo}</button>}
      </div>
      {sec === 'tarefas' && <>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoria">
          {[['todas', 'Todas', s.tasks.length], ['estudos', 'Estudos', countG('estudos')], ['casa', 'Casa', countG('casa')], ['pessoal', 'Pessoal', countG('pessoal')]].map(([g, l, n]) =>
            <button key={g} aria-pressed={grupo === g} className={pill(grupo === g)} onClick={() => setGrupo(g)}>{l} <span className="opacity-60 tabular-nums">{n}</span></button>)}
        </div>
        <div className={list}>
          {newForm(TaskForm, 'tasks')}
          {tasks.map((t) => (
            <RRow key={t.id} accent={LOAD[t.load].c} title={t.title} open={open === t.id}
              meta={<span>{t.cat} · {freqLabel(t)} · {t.dur} min <span className="text-zinc-600">(mínimo {t.min})</span> · {ONDE[t.where].toLowerCase()}</span>}
              right={<span className="hidden md:flex gap-1.5 shrink-0"><span className={tag + ' bg-white/[0.05]'} style={{ color: PRIO[t.prio].c }}>{PRIO[t.prio].t}</span><span className={tag + ' bg-white/[0.05]'} style={{ color: LOAD[t.load].c }}>{LOAD[t.load].t}</span></span>}
              actions={<Actions name={t.title} open={open === t.id} onEdit={() => edit(t.id, t)} onDup={() => act.duplicate('tasks', t.id)} onDel={del('tasks', t.id)} />}>
              <TaskForm f={f} setF={setF} onSave={save('tasks')} onCancel={close} />
            </RRow>
          ))}
          {!tasks.length && open !== 'new' && <p className="px-4 py-6 text-sm text-zinc-500">Nada nesta categoria ainda.</p>}
        </div>
        <p className="text-xs text-zinc-500 flex flex-wrap gap-x-4 gap-y-1"><span>Barra à esquerda = carga mental:</span>{Object.entries(LOAD).map(([k, v]) => <span key={k} className="flex items-center gap-1.5"><i className="w-1 h-3 rounded-full" style={{ background: v.c }} />{v.t.toLowerCase()}</span>)}</p>
      </>}
      {sec === 'metas' && <>
        <div className="flex flex-wrap gap-2">
          <button className={btnG} onClick={() => edit('newExam', { id: 'new', title: '', date: s.day + 10, hours: 4 })}><Ic n="GraduationCap" />Nova prova ou entrega</button>
          <button className={btnG} onClick={() => edit('newProj', { id: 'new', title: '', totalMin: 120, blockMin: 30, doneMin: 0, due: null, load: 'media', prio: 'media' })}><Ic n="ListTree" />Nova meta em passos</button>
        </div>
        <div className={list}>
          {open === 'newExam' && <div className="bg-zinc-950/40"><p className="px-4 pt-4 pb-3 text-zinc-100 font-medium">Nova prova ou entrega</p><ExamForm f={f} setF={setF} onSave={save('exams')} onCancel={close} /></div>}
          {open === 'newProj' && <div className="bg-zinc-950/40"><p className="px-4 pt-4 pb-3 text-zinc-100 font-medium">Nova meta em passos</p><ProjectForm f={f} setF={setF} onSave={save('projects')} onCancel={close} /></div>}
          {(s.exams || []).length > 0 && <p className="px-4 pt-3 pb-1 text-xs uppercase tracking-wide text-zinc-500">Provas e entregas</p>}
          {(s.exams || []).map((e) => { const left = e.date - s.day; return (
            <RRow key={e.id} accent="#ff7f5e" title={e.title} open={open === e.id}
              meta={<span>{DIAS[weekdayOf(e.date)]} {fmtCurto(e.date)} · {left > 0 ? `faltam ${left} dias` : left === 0 ? 'é hoje' : 'já passou'} · {e.hours}h de estudo em revisões crescentes</span>}
              actions={<Actions name={e.title} open={open === e.id} onEdit={() => edit(e.id, e)} onDel={del('exams', e.id)} />}>
              <ExamForm f={f} setF={setF} onSave={save('exams')} onCancel={close} />
            </RRow>); })}
          {(s.projects || []).length > 0 && <p className="px-4 pt-3 pb-1 text-xs uppercase tracking-wide text-zinc-500">Metas em passos</p>}
          {(s.projects || []).map((pj) => (
            <RRow key={pj.id} accent={LOAD[pj.load].c} title={pj.title} open={open === pj.id}
              meta={<span className="flex items-center gap-3 flex-wrap"><span>{fmtH(pj.doneMin / 60)} de {fmtH(pj.totalMin / 60)} · passos de {pj.blockMin} min{pj.due != null ? ` · até ${fmtCurto(pj.due)}` : ''}</span><span className="w-24 h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><span className="block h-full rounded-full bg-[#2ee8c4]" style={{ width: `${(pj.doneMin / pj.totalMin) * 100}%` }} /></span></span>}
              actions={<Actions name={pj.title} open={open === pj.id} onEdit={() => edit(pj.id, pj)} onDel={del('projects', pj.id)} />}>
              <ProjectForm f={f} setF={setF} onSave={save('projects')} onCancel={close} />
            </RRow>))}
          {!(s.exams || []).length && !(s.projects || []).length && !String(open).startsWith('new') && <p className="px-4 py-6 text-sm text-zinc-500">Nenhuma prova ou meta ainda.</p>}
        </div>
      </>}
      {sec === 'fixos' && <label className={btnG + ' cursor-pointer w-fit'}><Ic n="Upload" />Importar aulas ou horários (.ics)<input type="file" accept=".ics,text/calendar" className="sr-only" onChange={(e) => { const fl = e.target.files[0]; if (fl) readIcsFile(fl).then(act.importIcs, (er) => act.toast(er.message)); e.target.value = ''; }} /></label>}
      {sec === 'fixos' && (
        <div className={list}>
          {newForm(FixedForm, 'fixed')}
          {['trabalho', 'trajeto', 'compromisso'].map((tp) => { const xs = s.fixed.filter((x) => x.type === tp); if (!xs.length) return null; return (
            <div key={tp}>
              <p className="px-4 pt-3 pb-1 text-xs uppercase tracking-wide text-zinc-500">{TIPOS[tp]}</p>
              {xs.map((x) => (
                <RRow key={x.id} accent={tp === 'trabalho' ? '#71717a' : tp === 'trajeto' ? '#9f8fff' : '#2ee8c4'} title={x.title} open={open === x.id}
                  meta={<span className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="tabular-nums">{x.start}–{x.end}</span>
                    <span className="flex gap-0.5">{SEMANA.map((d) => <span key={d} className={`w-5 text-center text-[11px] rounded ${x.days.includes(d) ? 'text-zinc-200 bg-white/[0.08]' : 'text-zinc-700'}`}>{DIAS[d][0]}</span>)}</span></span>}
                  actions={<Actions name={x.title} open={open === x.id} onEdit={() => edit(x.id, x)} onDup={() => act.duplicate('fixed', x.id)} onDel={del('fixed', x.id)} />}>
                  <FixedForm f={f} setF={setF} onSave={save('fixed')} onCancel={close} />
                </RRow>
              ))}
            </div>); })}
        </div>
      )}
      {sec === 'ciclos' && (
        <div className={list}>
          {newForm(CycleForm, 'cycles')}
          {s.cycles.map((c) => { const n = s.day - c.last, due = n >= c.every && n > 0; return (
            <RRow key={c.id} accent={AREA[cycleArea(c)].c} title={c.title} open={open === c.id}
              meta={<span className="flex items-center gap-3 flex-wrap"><span className="flex items-center gap-1" style={{ color: AREA[cycleArea(c)].c }}><Ic n={AREA[cycleArea(c)].icon} className="w-3 h-3" />{AREA[cycleArea(c)].t.toLowerCase()}</span><span>{n <= 0 ? 'feito hoje' : n === 1 ? 'há 1 dia' : `há ${n} dias`} · a cada {c.every} {c.every === 1 ? 'dia' : 'dias'} · {c.dur} min</span>
                <span className="w-24 h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${clamp((n / c.every) * 100, 4, 100)}%`, background: due ? '#9f8fff' : 'rgba(255,255,255,.25)' }} /></span>
                {due && <span className="text-[#9f8fff]">bom momento</span>}</span>}
              right={<button className="h-9 px-3 rounded-lg text-sm border border-white/10 text-zinc-200 hover:bg-white/5 disabled:opacity-40 shrink-0" disabled={n <= 0} onClick={() => act.cycleToday(c)}>{n <= 0 ? 'Feito' : 'Fiz hoje'}</button>}
              actions={<Actions name={c.title} open={open === c.id} onEdit={() => edit(c.id, c)} onDup={() => act.duplicate('cycles', c.id)} onDel={del('cycles', c.id)} />}>
              <CycleForm f={f} setF={setF} onSave={save('cycles')} onCancel={close} />
            </RRow>); })}
        </div>
      )}
      {sec === 'semestre' && <SemestreSection s={s} act={act} edit={edit} open={open} f={f} setF={setF} save={save} close={close} del={del} />}
      {sec === 'conforto' && <ConfortoSection s={s} act={act} />}
      {sec === 'conta' && <ContaSection s={s} act={act} />}
      {sec === 'sono' && (
        <div className="columns-1 lg:columns-2 gap-4 [&>*]:break-inside-avoid [&>*]:mb-4">
          <div className={card + ' p-5 space-y-3'}>
            <p className="text-zinc-100 font-medium">Meta de sono</p>
            <p className="text-sm text-zinc-500">O app compara a noite real com esta meta para calcular a energia do dia.</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl} htmlFor="gb">Dormir às</label><TimeField id="gb" label="Dormir às" value={sg.bed} onChange={(v) => act.setGoal({ bed: v })} /></div>
              <div><label className={lbl} htmlFor="gw">Acordar às</label><TimeField id="gw" label="Acordar às" value={sg.wake} onChange={(v) => act.setGoal({ wake: v })} /></div>
            </div>
            <p className="text-sm text-zinc-300">Meta: {fmtH(sleepHours(sg.bed, sg.wake))} por noite.</p>
            <SleepWarn bed={sg.bed} wake={sg.wake} onApply={(b) => act.setGoal({ bed: b })} />
            {s.history.length > 0 && <div className="pt-2 space-y-1"><p className="text-sm text-zinc-400">Últimos check-ins</p>
              {s.history.slice(-7).reverse().map((h) => <p key={h.day} className="text-sm text-zinc-500 flex gap-3"><span className="w-20">{DIAS[weekdayOf(h.day)]} {fmtCurto(h.day)}</span><span>{h.bed}–{h.wake}</span><span className="text-zinc-300">{fmtH(h.sleep)}</span><span>{h.trip} min de trajeto</span></p>)}</div>}
          </div>
          <div className={card + ' p-5 space-y-3'}>
            <p className="text-zinc-100 font-medium">Ritmo do dia</p>
            <div className="text-sm text-zinc-400 space-y-1.5"><p>Tempo de transição depois do trabalho e do trajeto</p><DurField label="Tempo de transição" value={s.transitionMin} onChange={(v) => act.setCfg({ transitionMin: v })} /></div>
            <p className="text-xs text-zinc-500">Nada é marcado nesse intervalo: dá para chegar, comer e respirar antes de estudar.</p>
          </div>
          <div className={card + ' p-5 space-y-3'}>
            <p className="text-zinc-100 font-medium">Água e remédios</p>
            <label className="block text-sm text-zinc-400">Meta de água por dia (litros)<input type="number" min="0" max="5" step="0.25" className={inp + ' mt-1.5'} value={gMl(s) / 1000} onChange={(e) => act.setCare({ waterMl: Math.round(clamp(Number(e.target.value) || 0, 0, 5) * 1000) })} /></label>
            {s.careCfg.meds.map((m) => <div key={m.id} className="grid grid-cols-[minmax(0,1fr)_110px_40px] gap-2 items-center">
              <input className={inp} value={m.name} onChange={(e) => act.setCare({ meds: s.careCfg.meds.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)) })} aria-label="Nome do remédio" />
              <TimeField id={`md-${m.id}`} label="Horário" value={m.time} onChange={(v) => act.setCare({ meds: s.careCfg.meds.map((x) => (x.id === m.id ? { ...x, time: v } : x)) })} />
              <button className="h-11 grid place-items-center rounded-lg text-zinc-500 hover:bg-white/5" aria-label="Remover remédio" onClick={() => act.setCare({ meds: s.careCfg.meds.filter((x) => x.id !== m.id) })}><Ic n="Trash2" className="w-4 h-4" /></button></div>)}
            <button className={btnL + ' text-[#9f8fff]'} onClick={() => act.setCare({ meds: [...s.careCfg.meds, { id: uid(), name: 'Remédio', time: '08:00', stock: 30, dose: 1 }] })}><Ic n="Plus" className="w-3.5 h-3.5" />Adicionar remédio</button>
            {s.careCfg.meds.length > 0 && <div className="space-y-2 pt-1"><p className="text-xs text-zinc-500">Estoque (comprimidos) e quantos por dia. Aviso quando faltar uma semana.</p>
              {s.careCfg.meds.map((m) => <div key={m.id} className="grid grid-cols-[minmax(0,1fr)_90px_90px] gap-2 items-center text-sm"><span className="text-zinc-300 truncate">{m.name}</span>
                <input type="number" min="0" className={inp + ' h-10'} value={m.stock ?? ''} placeholder="estoque" aria-label={`Estoque de ${m.name}`} onChange={(e) => act.setCare({ meds: s.careCfg.meds.map((x) => (x.id === m.id ? { ...x, stock: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) } : x)) })} />
                <input type="number" min="1" className={inp + ' h-10'} value={m.dose || 1} aria-label={`Por dia de ${m.name}`} onChange={(e) => act.setCare({ meds: s.careCfg.meds.map((x) => (x.id === m.id ? { ...x, dose: Math.max(1, Number(e.target.value) || 1) } : x)) })} /></div>)}</div>}
          </div>
          <div className={card + ' p-5 space-y-3'}>
            <p className="text-zinc-100 font-medium flex items-center gap-2"><Ic n="Utensils" className="w-4 h-4 text-[#ff6fb5]" />Refeições</p>
            <p className="text-sm text-zinc-500">A babá pergunta “já comeu?” se passar meia hora do horário. Conta como autocuidado, não como produtividade.</p>
            {(s.careCfg.meals || []).map((m) => <div key={m.id} className="grid grid-cols-[minmax(0,1fr)_110px_40px] gap-2 items-center">
              <input className={inp} value={m.name} aria-label="Nome da refeição" onChange={(e) => act.setCare({ meals: s.careCfg.meals.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)) })} />
              <TimeField id={`ml-${m.id}`} label="Horário" value={m.time} onChange={(v) => act.setCare({ meals: s.careCfg.meals.map((x) => (x.id === m.id ? { ...x, time: v } : x)) })} />
              <button className="h-11 grid place-items-center rounded-lg text-zinc-500 hover:bg-white/5" aria-label="Remover refeição" onClick={() => act.setCare({ meals: s.careCfg.meals.filter((x) => x.id !== m.id) })}><Ic n="Trash2" className="w-4 h-4" /></button></div>)}
            <button className={btnL + ' text-[#9f8fff]'} onClick={() => act.setCare({ meals: [...(s.careCfg.meals || []), { id: uid(), name: 'Lanche', time: '16:00' }] })}><Ic n="Plus" className="w-3.5 h-3.5" />Adicionar refeição</button>
          </div>
          <div className={card + ' p-5 space-y-3'}>
            <p className="text-zinc-100 font-medium flex items-center gap-2"><Ic n="Backpack" className="w-4 h-4 text-[#9f8fff]" />Checklist de saída</p>
            <p className="text-sm text-zinc-500">Aparece 45 min antes do primeiro trajeto do dia.</p>
            <div className="flex flex-wrap gap-1.5">{s.leaveCfg.items.map((x) => <span key={x} className="h-8 pl-3 pr-1 rounded-full bg-white/[0.06] text-sm text-zinc-200 flex items-center gap-1">{x}<button className="w-6 h-6 grid place-items-center rounded-full text-zinc-500 hover:bg-white/10" aria-label={`Remover ${x}`} onClick={() => act.setLeave(s.leaveCfg.items.filter((y) => y !== x))}><Ic n="X" className="w-3 h-3" /></button></span>)}</div>
            <LeaveAdd onAdd={(x) => act.setLeave([...s.leaveCfg.items, x])} />
          </div>
          <div className={card + ' p-5 space-y-3'}>
            <p className="text-zinc-100 font-medium flex items-center gap-2"><Ic n="Users" className="w-4 h-4 text-[#2ee8c4]" />Bateria social e sensorial</p>
            <p className="text-sm text-zinc-500">Quanto cada coisa gasta (de 100). Se o dia for terminar baixo, o Lume oferece esvaziar a noite.</p>
            <div className="grid grid-cols-2 gap-2">{[['trabalho', 'Trabalho/estágio'], ['compromisso', 'Compromisso fixo'], ['evento', 'Compromisso avulso'], ['trajeto', 'Cada trajeto']].map(([k, l]) => <label key={k} className="text-xs text-zinc-500">{l}<input type="number" min="0" max="100" className={inp + ' h-10 mt-1'} value={s.socialCfg[k]} onChange={(e) => act.setSocialCfg({ [k]: clamp(Number(e.target.value) || 0, 0, 100) })} /></label>)}</div>
          </div>
          <div className={card + ' p-5 space-y-3'}>
            <p className="text-zinc-100 font-medium">Lembretes</p>
            <p className="text-sm text-zinc-500">Aviso 10 min antes de cada bloco e na hora dos remédios. Com a conta conectada, os lembretes chegam mesmo com o app fechado.</p>
            <button className={btnG} onClick={act.askNotify}><Ic n="Bell" />{s.notify ? 'Notificações ativadas' : 'Ativar notificações'}</button>
          </div>
          <div className={card + ' p-5 space-y-3'}>
            <p className="text-zinc-100 font-medium">Teste e dados</p>
            <p className="text-sm text-zinc-500">Avance o calendário para ver a ofensiva, os ciclos e a grade mudando. Os dados ficam salvos só neste navegador.</p>
            <div className="flex flex-wrap gap-2"><button className={btnG} onClick={act.nextDay}><Ic n="SkipForward" />Avançar para amanhã</button><button className={btnG} onClick={act.reset}><Ic n="RotateCcw" />Restaurar exemplo</button>{hasSample(s) && <button className={btnG} onClick={act.cleanStart}><Ic n="Eraser" />Começar limpo (sem dados de exemplo)</button>}</div>
            <RestartOnb onRestart={act.restartOnb} />
            {hasSample(s) && <p className="text-xs text-zinc-500">O histórico de sono, trajeto e resultados de antes de hoje é exemplo. “Começar limpo” apaga só isso: sua rotina e cadastros ficam.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== ASSISTENTE (bichinho) =====================
 * askAssistant(message, state) -> Promise<{ text, cards }>
 *
 * Hoje responde com um motor local: lê palavras-chave, números (minutos,
 * frequência), dias da semana e o estado real `s` (grade, energia, ciclos).
 *
 * Para plugar uma IA real (Claude ou Gemini via Supabase Edge Function),
 * troque o corpo de askAssistant por algo assim e mantenha o mesmo formato:
 *
 *   const r = await fetch(`${SUPABASE_URL}/functions/v1/assistant`, {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON_KEY}` },
 *     body: JSON.stringify({ message, snapshot: snapshotFor(state) }),
 *   });
 *   return await r.json(); // { text: string, cards: Card[] }
 *
 * Card = { kind: 'addTask', draft } | { kind: 'actions', title, desc, actions: [{ label, op, payload }] }
 * Ops que o app executa (ver runOp no App): reajustar, survival, minAtual, addTask, fitNow, placeAt.
 * A chave da API fica só na Edge Function, nunca no front.
 */
const semAcento = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const DOWS = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
function parseDue(t, today) {
  if (/depois de amanha/.test(t)) return today + 2;
  if (/\bamanha\b/.test(t)) return today + 1;
  if (/\bhoje\b/.test(t)) return today;
  for (const k of Object.keys(DOWS)) if (new RegExp('\\b' + k).test(t)) { let d = today + 1; while (weekdayOf(d) !== DOWS[k]) d++; return d; }
  const m = t.match(/\bdia (\d{1,2})\b/);
  if (m) { const now = dateOf(today); let d = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), +m[1]) / DAYMS); if (d < today) d = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, +m[1]) / DAYMS); return d; }
  return null;
}
function parseFreq(t) {
  if (/todo dia|todos os dias|diariamente|diario/.test(t)) return 7;
  const m = t.match(/(\d)\s*(x|vezes)/); if (m) return clamp(+m[1], 1, 7);
  const w = { uma: 1, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6 };
  for (const k of Object.keys(w)) if (new RegExp(`\\b${k} vez`).test(t)) return w[k];
  if (/por semana|na semana|semanal|toda semana/.test(t)) return 1;
  return 0;
}
function parseMins(t) {
  const h = t.match(/(\d+(?:[.,]\d+)?)\s*(h|hora|horas)\b/); if (h) return Math.round(parseFloat(h[1].replace(',', '.')) * 60);
  const m = t.match(/(\d+)\s*(min|minutos|minuto|m)\b/); if (m) return +m[1];
  if (/meia hora/.test(t)) return 30;
  return null;
}
function parseTitle(raw) {
  let t = raw.trim().replace(/[.!?]+$/, '');
  t = t.split(/,|;| - | e (?:é|eh|e) (?=pesad|leve|urgent|important|rapid|dif)| que (?:é|eh) /i)[0];
  t = t.replace(/^(eu\s+)?(preciso|tenho que|tenho de|quero|queria|devo|vou|bora|lembrar de|lembra de|lembrete:?|adiciona[r]?|adicione|coloca[r]?|coloque|cria[r]?|crie|anota[r]?|anote)\s+(de\s+)?/i, '');
  t = t.replace(/\b\d+\s*(x|vezes)\s*((por|na|a)\s*semana)?/gi, '').replace(/\b(uma|duas|tr[eê]s|quatro|cinco|seis) vez(es)?\s*((por|na)\s*semana)?/gi, '');
  t = t.replace(/(quando der|se der|sem pressa|talvez|urgente|importante|sem falta)/gi, '');
  t = t.replace(/(todo dia|todos os dias|diariamente|por semana|na semana|toda semana|depois de amanh[ãa]|amanh[ãa]|hoje|at[ée] (a |o )?)/gi, '');
  t = t.replace(/\b(na|no|nessa|nesta|essa|esta|pr[óo]xima)?\s*(segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo)(-feira)?/gi, '');
  t = t.replace(/\bdia \d{1,2}\b/gi, '').replace(/\b\d+(?:[.,]\d+)?\s*(min|minutos|h|horas?)\b/gi, '').replace(/\bmeia hora\b/gi, '');
  t = t.replace(/\s{2,}/g, ' ').replace(/\s+(de|da|do|para|pra|a|o|e)$/i, '').trim();
  return t ? t[0].toUpperCase() + t.slice(1) : 'Nova tarefa';
}
function draftFromText(raw, s) {
  const t = semAcento(raw);
  const estudo = /estud|prova|calculo|fisica|materia|faculdade|exercici|trabalho da facul|tcc|programa|codigo|revis/.test(t);
  const admin = /pagar|boleto|conta de|marcar|agendar|ligar|email|e-mail|comprar|mandar|enviar|responder|renovar/.test(t);
  let load = /pesad|dificil|denso|cansativ|complex/.test(t) ? 'pesada' : /leve|rapid|simples|facil|bobo/.test(t) ? 'leve' : estudo ? 'pesada' : admin ? 'leve' : 'media';
  const pc = parseCmd(raw, s);
  const due = pc.day != null ? pc.day : parseDue(t, s.day), freq = pc.freq || parseFreq(t);
  let prio = /urgent|importante|prova|prazo|sem falta|nao posso esquecer/.test(t) ? 'alta' : /quando der|sem pressa|talvez|se der/.test(t) ? 'baixa' : due != null && due - s.day <= 1 ? 'alta' : 'media';
  const cat = /ingles|idioma|espanhol|vocabul/.test(t) ? 'Idioma' : /curso|capacita|eletr/.test(t) ? 'Capacitação' : estudo ? 'Faculdade' : /limpa|lavar|arrumar|louca|roupa|casa|faxina/.test(t) ? 'Casa' : /estagio|linkedin|curriculo|vaga|portfolio|github|trabalho/.test(t) ? 'Carreira' : 'Pessoal';
  const where = /celular|fone|podcast|onibus|metro|trajeto|audio/.test(t) ? 'transporte' : cat === 'Casa' || load === 'pesada' ? 'casa' : 'qualquer';
  const sug = suggestDur(prio, load), mins = pc.dur;
  const dur = mins || sug.dur, min = mins ? clamp(Math.round(mins / 4 / 5) * 5, 5, 15) : sug.min;
  const minText = estudo ? 'Revisar um resumo por 10 min' : admin ? 'Só abrir e deixar pronto' : 'Só começar, 5 minutos';
  return { title: pc.title || parseTitle(raw), cat, prio, load, dur: clamp(dur, 5, 600), min: Math.min(min, dur), minText, freq, where, due: freq ? null : due };
}
/* ===================== entendimento de comandos (local) =====================
 * parseCmd lê frases como "aula hoje de inglês das 13h até 14h", "dentista quinta às 15h30",
 * "toda terça e quinta aula de física 19h-20h40", "estudar cálculo 2h amanhã", "reunião às 3 da tarde por 40 min".
 * Normaliza mantendo o tamanho do texto, para recortar exatamente o que foi entendido e sobrar o título. */
const normKeep = (raw) => Array.from(raw).map((c) => c.normalize('NFD')[0].toLowerCase()).join('');
const EVENT_WORDS = /\b(aula|reuniao|consulta|dentista|medic[oa]|terapia|psicolog|exame|prova|entrevista|encontro|evento|call|palestra|aniversario|almoco|jantar|curso|treino|academia|missa|culto|show|cinema|festa|monitoria|plantao|apresentacao|seminario|corte de cabelo|manicure|banco)\b/;
const DOW_RX = '(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira)?s?';
const MES_N = { janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5, julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11 };
function parseCmd(raw, s) {
  const t = normKeep(raw), cut = [];
  const take = (m, i0 = m.index, len = m[0].length) => cut.push([i0, i0 + len]);
  const per = (h, rest) => { if (/(da tarde|da noite)/.test(rest || '') && h < 12) return h + 12; if (/da manha/.test(rest || '') && h === 12) return 0; return h; };
  const T = '(\\d{1,2})(?:\\s*(?:h|:)\\s*(\\d{2})?|\\s*horas?)?';
  const toT = (h, mm) => (+h) * 60 + (+(mm || 0));
  let start = null, end = null, dur = null, timeHint = false;
  // 1. intervalo de horário: das 13h até 14h · de 13:00 às 14:30 · 13h-14h · 19h às 20h40
  let m = t.match(new RegExp(`(?:\\b(?:das?|de)\\s+)?\\b${T}\\s*(?:ate as|ate|as|a|-|–)\\s*${T}(\\s*(?:da tarde|da noite|da manha))?`));
  if (m && (/[h:]|horas?/.test(m[0]) || /\bdas?\b/.test(m[0])) && +m[1] < 24 && +m[3] < 24 && !/\b\d+\s*(x|vezes)\b/.test(m[0])) {
    let h1 = +m[1], h2 = +m[3]; const tail = m[5] || '';
    h2 = per(h2, tail); if (tail && h1 < 12 && h2 >= 12 && h1 + 12 <= h2) h1 += 12;
    if (h2 * 60 + +(m[4] || 0) <= h1 * 60 + +(m[2] || 0) && h2 < 12) h2 += 12;
    start = toT(h1, m[2]); end = toT(h2, m[4]); timeHint = true; take(m);
  }
  // 2. horário único: às 15h · as 15:30 · às 3 da tarde · meio-dia · 15h30
  if (start == null) {
    m = t.match(/\b(?:ao |as |a partir d[oa]s? )?meio[- ]dia(?: e meia)?\b/);
    if (m) { start = 720 + (/e meia/.test(m[0]) ? 30 : 0); timeHint = true; take(m); }
  }
  if (start == null) {
    m = t.match(new RegExp(`\\b(?:as|a partir das|depois das|antes das|la pelas|pelas)\\s+${T}(\\s*(?:da tarde|da noite|da manha))?`));
    if (m && +m[1] < 24) { start = toT(per(+m[1], m[3]), m[2]); timeHint = true; take(m); }
  }
  if (start == null) {
    m = t.match(/\b(\d{1,2})(?:h(\d{2})|:(\d{2}))\b/) || (EVENT_WORDS.test(t) ? t.match(/\b(\d{1,2})h\b(?!\s*(?:de (?:estudo|duracao)|seguidas))/) : null);
    if (m && +m[1] < 24 && (EVENT_WORDS.test(t) || m[2] || m[3] || +m[1] > 4)) {
      const prev = t.slice(Math.max(0, m.index - 12), m.index);
      if (!/(por|durante|leva|levo|demora|uns|umas|de)\s*$/.test(prev)) { start = toT(+m[1], m[2] || m[3]); timeHint = true; take(m); }
    }
  }
  // 3. duração: por 40 min · 2h · 1h30 de · uma hora e meia · meia hora
  const masked = () => { let x = t; cut.forEach(([a, b]) => { x = x.slice(0, a) + ' '.repeat(b - a) + x.slice(b); }); return x; };
  let mt = masked();
  m = mt.match(/\b(?:por |durante |leva |demora |uns |umas |de )?(\d+(?:[.,]\d+)?)\s*(?:h|horas?)(?:\s*(?:e\s*)?(\d{1,2})\s*(?:min(?:utos)?)?)?\b/);
  if (m) { dur = Math.round(parseFloat(m[1].replace(',', '.')) * 60) + +(m[2] || 0); take(m); }
  mt = masked();
  if (dur == null) { m = mt.match(/\b(?:por |durante |leva |demora |uns |umas |de )?(\d+)\s*(?:min|minutos|minuto|m)\b/); if (m) { dur = +m[1]; take(m); } }
  mt = masked();
  if (dur == null) { m = mt.match(/\b(?:por |durante )?(uma hora e meia|hora e meia|uma hora|meia hora|duas horas|tres horas)\b/); if (m) { dur = { 'uma hora e meia': 90, 'hora e meia': 90, 'uma hora': 60, 'meia hora': 30, 'duas horas': 120, 'tres horas': 180 }[m[1]]; take(m); } }
  if (start != null && end == null && dur != null) end = start + dur;
  if (start != null && end != null) dur = end - start;
  // 4. recorrência e datas
  mt = masked();
  let days = null, day = null, freq = 0;
  m = mt.match(/\b(?:de segunda a sexta|dias uteis|durante a semana)\b/); if (m) { days = [1, 2, 3, 4, 5]; take(m); }
  mt = masked();
  m = mt.match(new RegExp(`\\b(?:toda|todas as|todo|todos os|sempre (?:na|no|as|aos))\\s+${DOW_RX}((?:\\s*(?:,|e)\\s*(?:a |as )?${DOW_RX})*)`));
  if (m) { days = Array.from(m[0].matchAll(new RegExp(DOW_RX, 'g'))).map((x) => DOWS[x[1]]); take(m); }
  mt = masked();
  m = mt.match(/\b(todo dia|todos os dias|diariamente)\b/); if (m) { freq = 7; take(m); }
  mt = masked();
  m = mt.match(/\b(\d)\s*(?:x|vezes)\s*(?:por|na|a)?\s*semana\b/) || mt.match(/\b(uma|duas|tres|quatro|cinco|seis) vez(?:es)?\s*(?:por|na)\s*semana\b/);
  if (m) { freq = clamp(+m[1] || { uma: 1, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6 }[m[1]], 1, 7); take(m); }
  mt = masked();
  m = mt.match(/\bdepois de amanha\b/); if (m) { day = s.day + 2; take(m); }
  if (day == null) { m = mt.match(/\b(?:hoje(?: a (?:tarde|noite))?|hj)\b/); if (m) { day = s.day; take(m); } }
  if (day == null) { m = mt.match(/\bamanha\b/); if (m) { day = s.day + 1; take(m); } }
  mt = masked();
  if (day == null) { m = mt.match(/\b(?:dia\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/); if (m) { const y = dateOf(s.day).getUTCFullYear(); let d = Math.floor(Date.UTC(m[3] ? (+m[3] < 100 ? 2000 + +m[3] : +m[3]) : y, +m[2] - 1, +m[1]) / DAYMS); if (!m[3] && d < s.day) d = Math.floor(Date.UTC(y + 1, +m[2] - 1, +m[1]) / DAYMS); day = d; take(m); } }
  mt = masked();
  if (day == null) { m = mt.match(/\b(?:no\s+)?dia\s+(\d{1,2})(?:\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro))?\b/) || mt.match(/\b(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/);
    if (m) { const now = dateOf(s.day); const mo = m[2] ? MES_N[m[2]] : now.getUTCMonth(); let d = Math.floor(Date.UTC(now.getUTCFullYear(), mo, +m[1]) / DAYMS); if (d < s.day) d = Math.floor(Date.UTC(now.getUTCFullYear() + (m[2] ? 1 : 0), mo + (m[2] ? 0 : 1), +m[1]) / DAYMS); day = d; take(m); } }
  mt = masked();
  if (day == null && !days) { m = mt.match(new RegExp(`\\b(?:(?:na|no|nessa|nesta|essa|esta|proxima|proximo|a)\\s+)?${DOW_RX}(?:\\s+que vem)?\\b`)); if (m) { const wd = DOWS[m[1]]; let d = s.day + (weekdayOf(s.day) === wd && start != null && start > nowRef(s) ? 0 : 1); while (weekdayOf(d) !== wd) d++; if (/proxim|que vem/.test(m[0]) && d - s.day < 7 && weekdayOf(s.day) >= wd) {} day = d; take(m); } }
  mt = masked();
  m = mt.match(/\b(toda semana|por semana|semanal(?:mente)?)\b/); if (m) { if (!freq && !days) { if (day != null && start != null) days = [weekdayOf(day)]; else freq = 1; } take(m); }
  // 5. título = o que sobrou
  let title = raw.split('');
  cut.forEach(([a, b]) => { for (let i = a; i < b; i++) title[i] = ' '; });
  title = title.join('').replace(/[.!?]+\s*$/, '');
  title = title.split(/,|;| - | e (?:é|eh|e) (?=pesad|leve|urgent|important|rapid|dif)| que (?:é|eh) /i)[0];
  title = title.replace(/^\s*(eu\s+)?(tenho|terei|vou ter|preciso(?: de)?|tenho que|tenho de|quero|queria|devo|vou|bora|lembrar de|lembra de|me lembra de|lembrete:?|adiciona[r]?|adicione|coloca[r]?|coloque|cria[r]?|crie|anota[r]?|anote|marca[r]?|marque|agenda[r]?|agende|bota[r]?|bote|p[õo]e)\s+(?:uma?\s+|que\s+|de\s+)?/i, '');
  title = title.replace(/\b(quando der|se der|sem pressa|talvez|urgente|importante|sem falta)\b/gi, '');
  title = title.replace(/\s{2,}/g, ' ').trim();
  for (let k = 0; k < 3; k++) title = title.replace(/^(?:de|da|do|no|na|em|pra|para|a|o|e|as|às|com|um|uma)\s+/i, '').replace(/\s+(?:de|da|do|no|na|em|pra|para|a|o|e|as|às|com|ate|até|das)$/i, '').trim();
  title = title.replace(/\s+(de|da|do)\s+(de|da|do)\s+/gi, ' $1 ');
  title = title ? title[0].toUpperCase() + title.slice(1) : '';
  const isEvent = start != null;
  return { title, start, end, dur, day, days, freq, isEvent, eventWord: EVENT_WORDS.test(t) };
}
function diasTxt(ds) {
  const d = [...ds].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  if (d.join() === '1,2,3,4,5') return 'de segunda a sexta';
  if (d.length === 7) return 'todos os dias';
  const n = d.map((x) => DIAS_LONGO[x]);
  return 'toda ' + (n.length > 1 ? n.slice(0, -1).join(', ') + ' e ' + n[n.length - 1] : n[0]);
}
function overlapsOn(s, day, a, b, ignoreId) {
  const fx = fixedOn(s, day).filter((f) => f.type !== 'trajeto' && f.s < b && f.e > a).map((f) => `${f.title} (${f.start}–${f.end})`);
  const its = s.plan.items.filter((it) => it.day === day && it.id !== ignoreId && it.status === 'pendente' && !it.inTrip && it.start < b && it.start + it.dur > a && refOf(s, it)).map((it) => `${itemTitle(s, it)} (${hhmm(it.start)})`);
  return { fx, its };
}
function EventCard({ s, draft, onApply, applied }) {
  const [f, setF] = useState(draft);
  const now = nowRef(s), today = !f.recurring && f.day === s.day;
  const ov = f.recurring ? { fx: [], its: [] } : overlapsOn(s, f.day, toMin(f.start), toMin(f.end));
  const bad = !f.title.trim() ? 'Dê um nome.' : toMin(f.end) <= toMin(f.start) ? 'O fim precisa ser depois do início.' : today && toMin(f.start) < now ? `Já passou de ${hhmm(now)} hoje: escolha outro horário ou outro dia.` : f.recurring && !f.days.length ? 'Escolha pelo menos um dia.' : null;
  if (applied) return <div className="rounded-xl border border-[#2ee8c4]/30 bg-[#2ee8c4]/[0.06] p-3 text-sm text-[#a8f7e8] flex items-center gap-2"><Ic n="Check" />{f.recurring ? `“${f.title}” virou horário fixo: ${f.days.map((d) => DIAS[d]).join(', ')} ${f.start}–${f.end}.` : `“${f.title}” marcado ${f.day === s.day ? 'hoje' : fmtDia(f.day).toLowerCase()} ${f.start}–${f.end}.`}</div>;
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950 p-3 space-y-2.5">
      <input className={inp + ' h-10 text-[15px]'} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} aria-label="Nome do compromisso" placeholder="Nome" />
      <Seg value={f.recurring ? 'fixo' : 'uma'} onChange={(v) => setF({ ...f, recurring: v === 'fixo', days: f.days.length ? f.days : [weekdayOf(f.day)] })} options={[['uma', 'Só uma vez'], ['fixo', 'Toda semana']]} label="Repetição" />
      {f.recurring ? <DayChips days={f.days} onChange={(d) => setF({ ...f, days: d })} />
        : <label className="text-xs text-zinc-500 block">Dia<input type="date" className={inp + ' h-10 mt-1'} min={isoOf(s.day)} value={isoOf(f.day)} onChange={(e) => e.target.value && setF({ ...f, day: Math.max(s.day, dayFromIso(e.target.value)) })} /></label>}
      <div className="grid grid-cols-2 gap-2">
        <div><span className="text-xs text-zinc-500">Começa</span><TimeField id="ev-s" label="Começa" value={f.start} min={today ? Math.ceil(now / 5) * 5 : null} onChange={(v) => { const d = toMin(f.end) - toMin(f.start); setF({ ...f, start: v, end: hhmm(Math.min(1439, toMin(v) + Math.max(15, d))) }); }} /></div>
        <div><span className="text-xs text-zinc-500">Termina</span><TimeField id="ev-e" label="Termina" value={f.end} min={toMin(f.start) + 5} onChange={(v) => setF({ ...f, end: v })} /></div>
      </div>
      {bad ? <p className="text-xs text-[#ffc24d]">{bad}</p>
        : ov.fx.length || ov.its.length ? <p className="text-xs text-[#ffc24d]">{[ov.fx.length ? `Bate com ${ov.fx.join(', ')}.` : '', ov.its.length ? `${ov.fx.length ? 'Também tem' : 'Tem'} ${ov.its.join(', ')} nesse horário: eu mudo de lugar.` : ''].filter(Boolean).join(' ')}</p>
        : <p className="text-xs text-zinc-500">{f.recurring ? `Entra em Horários fixos (${diasTxt(f.days)}) e a semana se reorganiza em volta.` : `Fica fixo nesse horário. O que estiver ali muda de lugar.`}</p>}
      <button className={btnP + ' w-full min-h-[40px]'} disabled={!!bad} onClick={() => onApply(f)}><Ic n="CalendarCheck" />{f.recurring ? 'Criar horário fixo' : ov.fx.length ? 'Marcar mesmo assim' : 'Marcar na agenda'}</button>
    </div>
  );
}

function placeNew(s, task) {
  const days = s.plan.days, ctx = makeCtx(s, days);
  s.plan.items.forEach((it) => { if (it.status !== 'backlog' && ctx[it.day]) occupy(ctx[it.day], it); });
  let avail = days.filter((d) => d >= s.day);
  if (ctx[s.day] && ctx[s.day].end - ctx[s.day].start < 60) avail = avail.filter((d) => d !== s.day);
  const out = [];
  if (task.freq > 0) {
    const n = task.freq >= 7 ? avail.length : Math.min(avail.length, task.freq);
    pickDays(n, avail, ctx, task).forEach((d) => { const it = placeTask(s, ctx, task, d); if (it) { out.push(it); occupy(ctx[d], it); } });
  } else {
    const lim = task.due != null ? avail.filter((d) => d <= task.due) : avail;
    const cand = (lim.length ? lim : avail).slice().sort((a, b) => (ctx[a].pts / ctx[a].cap) - (ctx[b].pts / ctx[b].cap) || (task.prio === 'alta' ? a - b : 0));
    for (const d of cand) { const it = placeTask(s, ctx, task, d, { why: task.due != null ? `Antes do prazo (${fmtCurto(task.due)}), no dia mais leve que sobra.` : 'Encaixada no dia mais leve da semana.' }); if (it) { out.push(it); break; } }
  }
  return out;
}
function currentItem(s) {
  const now = nowRef(s);
  const its = s.plan.items.filter((it) => it.day === s.day && it.status === 'pendente' && refOf(s, it)).sort((a, b) => a.start - b.start);
  return its.find((it) => it.start + it.dur >= now) || its[0] || null;
}
function snapshotFor(s) {
  const en = energyOf(s);
  return { hoje: isoOf(s.day), agora: hhmm(nowRef(s)), energia: en.total, modo: modeOf(s, en), dormiu: fmtH(en.h), trajetoExtraMin: en.extra,
    tarefas: s.tasks.map(({ id, title, prio, load, dur, min, freq, where }) => ({ id, title, prio, load, dur, min, freq, where })),
    ciclos: s.cycles.map((c) => ({ id: c.id, title: c.title, every: c.every, diasDesde: s.day - c.last })),
    gradeHoje: s.plan.items.filter((it) => it.day === s.day).map((it) => ({ id: it.id, titulo: itemTitle(s, it), inicio: hhmm(it.start), dur: it.dur, status: it.status })) };
}
const STOP = new Set('ja fiz terminei acabei conclui feito feita hoje amanha empurra empurrar adia adiar joga jogar passa passar move mover deixa deixar cancela cancelar desmarca desmarcar tira tirar nao vou tem para pra depois outro dia aula do da de dos das um uma meu minha o a os as no na com que isso essa esse lista'.split(' '));
function matchItem(s, t, pool) {
  const words = t.split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
  if (!words.length) return null;
  const sc = pool.map((x) => { const tt = semAcento(x.title); return { x, sc: words.filter((w) => tt.includes(w) || tt.split(/\W+/).some((y) => y.length > 3 && (y.startsWith(w) || w.startsWith(y)))).length }; }).filter((y) => y.sc > 0).sort((a, b) => b.sc - a.sc);
  return sc.length ? sc[0].x : null;
}
const CARE_IDEAS = [['Alongar o corpo', 1, 5, 'cuidado'], ['Cuidar da pele', 1, 10, 'cuidado'], ['Caminhar ao ar livre', 2, 20, 'cuidado'], ['Banho demorado e relaxante', 3, 25, 'cuidado'], ['Mandar mensagem para alguém querido', 7, 10, 'cuidado'], ['Trocar a roupa de cama', 14, 20, 'casa'], ['Cortar as unhas', 10, 10, 'cuidado'], ['Momento de hobby sem culpa', 3, 30, 'cuidado']];
function commandBrain(message, s) {
  const t = semAcento(message), now = nowRef(s);
  if (/(voltei d[ae] (viagem|ferias)|acabaram (as|minhas) ferias|sair do modo ferias|encerrar (a )?pausa|voltar (a|pra) rotina)/.test(t)) {
    const v = vacationOn(s, s.day);
    return v ? { text: `Que bom que voltou. Encerro **${v.label}** e distribuo a semana com calma, sem jogar tudo para hoje?`, cards: [{ kind: 'actions', title: v.label, actions: [{ label: 'Voltar à rotina agora', op: 'vacationEnd', payload: { id: v.id } }] }] } : { text: 'Você não está em pausa agora: a rotina já está valendo.', cards: [] };
  }
  if (/(vou viajar|viagem|modo ferias|entrar de ferias|tirar ferias|vou de ferias|pausar (a |minha )?rotina|estou de ferias)/.test(t) && !/voltei/.test(t)) {
    const pc = parseCmd(message, s), st = pc.day != null && pc.day >= s.day ? pc.day : s.day, lab = /viag|viaj/.test(t) ? 'Viagem' : 'Férias';
    const when = st === s.day ? 'a partir de hoje' : `a partir de ${fmtDia(st).toLowerCase()}`;
    return { text: `Posso pausar a rotina ${when}: trabalho, aulas, tarefas e casa param, compromissos com hora continuam e a ofensiva fica protegida. Até quando?`,
      cards: [{ kind: 'actions', title: `${lab} · ${when}`, actions: [{ label: 'Uns dias (3)', op: 'vacation', payload: { label: lab, start: st, end: st + 2 } }, { label: 'Uma semana', op: 'vacation', payload: { label: lab, start: st, end: st + 6 } }, { label: 'Sem data para voltar', op: 'vacation', payload: { label: lab, start: st, end: null } }] }] };
  }
  if (/autocuidado|me cuidar|cuidar de mim|cuidado pessoal|o que posso fazer por mim/.test(t) && !/^(ja fiz|fiz)/.test(t)) {
    const have = new Set(s.cycles.map((c) => semAcento(c.title)));
    const ideas = CARE_IDEAS.filter(([n]) => !have.has(semAcento(n))).slice(0, 5);
    return { text: `Algumas ideias de autocuidado que costumam ajudar${energyOf(s).total < 50 ? ', começando pelas mais leves' : ''}. Toque nas que fizerem sentido e eu coloco na sua semana, sem contar como produtividade. Dá também para montar as rotinas da manhã e da noite na aba Cuidar.`,
      cards: [{ kind: 'actions', multi: true, title: 'Escolha o que quiser', actions: ideas.map(([n, every, dur, area]) => ({ label: `${n} · a cada ${every === 1 ? 'dia' : every + ' dias'}`, op: 'addCycle', payload: { title: n, every, dur, area } })) }] };
  }
  const pend = (days) => s.plan.items.filter((it) => days(it.day) && it.status === 'pendente' && refOf(s, it)).map((it) => ({ title: itemTitle(s, it), it }));
  // água
  let m = t.match(/\bbebi\s+(.*)/);
  if (m && /copo|garrafa|litro|ml\b|agua|meio/.test(t)) {
    const q = m[1], num = (x) => ({ um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4 }[x] || parseFloat(String(x || '').replace(',', '.')));
    let ml = 250, k;
    if ((k = q.match(/([\d.,]+)\s*ml/))) ml = num(k[1]);
    else if (/meio litro/.test(q)) ml = 500;
    else if ((k = q.match(/([\d.,]+|um|uma|dois|duas)\s*litros?/))) ml = num(k[1]) * 1000;
    else if ((k = q.match(/(\d+|um|uma|dois|duas|tres|quatro)?\s*garrafas?/))) ml = (num(k[1]) || 1) * 500;
    else if ((k = q.match(/(\d+|um|uma|dois|duas|tres|quatro)?\s*copos?/))) ml = (num(k[1]) || 1) * 250;
    ml = Math.round(clamp(ml || 250, 50, 3000));
    return { text: `Boa! Somo **${ml} ml** de água.`, cards: [{ kind: 'actions', title: 'Água', actions: [{ label: `+ ${ml} ml`, op: 'waterAdd', payload: { ml } }] }] };
  }
  // refeição
  m = t.match(/\b(almocei|jantei|lanchei|tomei (?:o )?cafe|comi)\b/);
  if (m) {
    const meals = s.careCfg.meals || [], done = s.mealsDone[s.day] || {};
    const key = /almoc/.test(m[1]) ? /almo/ : /jant/.test(m[1]) ? /jant/ : /lanch/.test(m[1]) ? /lanch/ : /cafe/.test(m[1]) ? /cafe/ : null;
    const ml = key ? meals.find((x) => key.test(semAcento(x.name))) : meals.filter((x) => !done[x.id]).sort((a, b) => Math.abs(toMin(a.time) - now) - Math.abs(toMin(b.time) - now))[0];
    if (ml && !done[ml.id]) return { text: `Que bom que comeu. Marco o ${ml.name.toLowerCase()}?`, cards: [{ kind: 'actions', title: ml.name, actions: [{ label: `Marcar ${ml.name.toLowerCase()}`, op: 'mealDone', payload: { id: ml.id } }] }] };
    if (ml) return { text: `O ${ml.name.toLowerCase()} já está marcado. 👍`, cards: [] };
  }
  // remédio
  m = t.match(/\btomei (?:o |a |meu |minha )?(.+)/);
  if (m && !/cafe|banho/.test(m[1])) {
    const meds = s.careCfg.meds || [], taken = s.medsTaken[s.day] || {};
    if (!meds.length) return { text: 'Você ainda não cadastrou remédios. Dá para cadastrar em Minha Rotina → Sono e cuidados, com horário e estoque.', cards: [] };
    const md = meds.length === 1 ? meds[0] : matchItem(s, m[1], meds.map((x) => ({ ...x, title: x.name }))) || meds.find((x) => !taken[x.id]);
    if (md) return taken[md.id] ? { text: `${md.name} já está marcado hoje.`, cards: [] } : { text: `Anoto ${md.name} como tomado${md.stock != null ? ` (fica ${Math.max(0, md.stock - (md.dose || 1))} no estoque)` : ''}?`, cards: [{ kind: 'actions', title: md.name, actions: [{ label: 'Tomei', op: 'medTake', payload: { id: md.id } }] }] };
  }
  // já fiz
  if (/\b(ja fiz|fiz (o|a|os|as)|terminei|acabei|conclui|dei conta d)/.test(t)) {
    const hit = matchItem(s, t, pend((d) => d <= s.day && d >= s.day - 1)) || matchItem(s, t, pend((d) => d > s.day));
    if (hit) return { text: `Boa! Marco **${hit.title}** como feito${hit.it.day !== s.day ? ` (estava para ${DIAS_LONGO[weekdayOf(hit.it.day)]})` : ''}?`, cards: [{ kind: 'actions', title: hit.title, actions: [{ label: 'Marcar feito', op: 'doneItem', payload: { itemId: hit.it.id } }] }] };
    return { text: 'Não achei isso na sua grade de hoje. Me diz o nome do jeito que está na lista?', cards: [] };
  }
  // cancelar / não vou
  if (/\b(cancela|cancelou|cancelaram|desmarca|desmarcou|nao vou|nao vai ter|nao tem|nao teve|nao fui)\b/.test(t)) {
    const pc = parseCmd(message, s), day = pc.day != null ? pc.day : s.day;
    const fx = fixedAll(s, day).filter((f) => !f.skip);
    const f = matchItem(s, t, fx) || (/estagio|trabalho/.test(t) ? fx.find((x) => x.type === 'trabalho') : null);
    if (f) return { text: `Tiro **${f.title}** de ${day === s.day ? 'hoje' : fmtDia(day).toLowerCase()}${f.type === 'trabalho' ? ' (e os trajetos junto)' : ''} e replanejo o tempo que sobrou?`, cards: [{ kind: 'actions', title: `${f.title} · ${f.start}–${f.end}`, actions: [{ label: day < s.day || (day === s.day && now >= f.plan.s) ? 'Não fui' : 'Não vou', op: 'cancelFixed', payload: { day, id: f.id, trips: f.type === 'trabalho' } }] }] };
    const hit = matchItem(s, t, pend((d) => d === day));
    if (hit) return { text: `Tiro **${hit.title}** de ${day === s.day ? 'hoje' : fmtDia(day).toLowerCase()}?`, cards: [{ kind: 'actions', title: hit.title, actions: [{ label: 'Tirar do dia', op: 'removeItem', payload: { itemId: hit.it.id } }, { label: 'Jogar para outro dia', op: 'moveItem', payload: { itemId: hit.it.id, day: Math.min(day + 1, s.plan.days[s.plan.days.length - 1]) } }] }] };
  }
  // empurrar
  if (/\b(empurra|empurrar|adia|adiar|joga|jogar|passa|passar|move|mover|deixa|deixar|remarca|remarcar)\b/.test(t) && /(amanha|depois|outro dia|semana|segunda|terca|quarta|quinta|sexta|sabado|domingo|dia \d)/.test(t)) {
    const pc = parseCmd(message, s), last = s.plan.days[s.plan.days.length - 1];
    let day = pc.day != null ? pc.day : s.day + 1; if (day > last) day = last;
    const hit = matchItem(s, t, pend((d) => d >= s.day && d !== day));
    if (hit) return { text: `Levo **${hit.title}** para ${day === s.day + 1 ? 'amanhã' : DIAS_LONGO[weekdayOf(day)]}? O Lume acha um horário bom lá.`, cards: [{ kind: 'actions', title: hit.title, actions: [{ label: `Mover para ${day === s.day + 1 ? 'amanhã' : DIAS[weekdayOf(day)].toLowerCase()}`, op: 'moveItem', payload: { itemId: hit.it.id, day } }] }] };
    return { text: 'Não achei o que mover. Qual o nome da tarefa?', cards: [] };
  }
  return null;
}
function localBrain(message, s) {
  const cmd = commandBrain(message, s); if (cmd) return cmd;
  const t = semAcento(message), en = energyOf(s), mode = modeOf(s, en), now = nowRef(s);
  const cur = currentItem(s), curTask = cur && cur.kind === 'task' ? refOf(s, cur) : null;
  // 1. desabafo / cansaço
  if (/exaust|cansad|sem energia|esgotad|nao aguento|transito|atras(ei|o)|nao (to|estou|tô) conseguindo|nao consigo|focar|foco|travad|sobrecarreg|ansios|me ajuda|dormi mal|pessimo|mal hoje/.test(t)) {
    const transit = /transito|atras|lotad|onibus|metro/.test(t), foco = /foc|travad|nao consigo/.test(t);
    const text = transit ? 'Trânsito cansa mesmo. Vamos tirar peso do dia: eu reajusto o que falta e mando o pesado para outro dia.'
      : foco ? 'Travar é normal. Não precisa render agora: começar pequeno já conta.'
      : `Entendi. Hoje o objetivo é atravessar o dia, não render.${en.total < 45 ? ` Sua energia está em ${en.total}%.` : ''}`;
    const actions = [];
    if (foco && curTask && cur.ver === 'normal' && curTask.min < curTask.dur) actions.push({ label: `Trocar “${curTask.title}” pelo mínimo`, op: 'minAtual', payload: { itemId: cur.id } });
    if (s.today.checkedIn) actions.push({ label: 'Reajustar meu dia', op: 'reajustar' });
    if (!s.today.survival) actions.push({ label: 'Ativar Dia de Sobrevivência', op: 'survival' });
    if (!foco && curTask && cur.ver === 'normal' && curTask.min < curTask.dur) actions.push({ label: 'Trocar tarefa atual pelo mínimo', op: 'minAtual', payload: { itemId: cur.id } });
    if (!s.today.checkedIn) return { text: text + ' Faz o check-in na tela Agora que eu consigo reajustar com base no seu sono.', cards: actions.length ? [{ kind: 'actions', title: 'Posso fazer agora', actions }] : [] };
    return { text, cards: [{ kind: 'actions', title: 'Escolha um', actions }] };
  }
  // 2. melhor horário para algo existente
  if (/melhor (hora|horario|dia|momento)|quando (eu )?(posso|devo|consigo|faco)/.test(t)) {
    const words = t.split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !/melhor|horario|quando|posso|devo|fazer|semana|consigo/.test(w));
    const pool = [...s.cycles.map((c) => ({ kind: 'cycle', ref: c, txt: semAcento(c.title) })), ...s.tasks.map((x) => ({ kind: 'task', ref: x, txt: semAcento(x.title) }))];
    const hit = pool.map((p) => ({ ...p, sc: words.filter((w) => p.txt.includes(w)).length })).sort((a, b) => b.sc - a.sc)[0];
    if (hit && hit.sc > 0) {
      const ctx = makeCtx(s, s.plan.days); s.plan.items.forEach((it) => { if (it.status !== 'backlog' && ctx[it.day]) occupy(ctx[it.day], it); });
      const r = hit.ref, dur = r.dur, heavy = hit.kind === 'task' && r.load === 'pesada';
      const target = hit.kind === 'cycle' ? Math.max(s.day, r.last + r.every) : s.day;
      let best = null;
      s.plan.days.filter((d) => d >= s.day).forEach((d) => {
        const st = findSlot(s, ctx[d], dur, heavy ? 'foco' : 'leve'); if (st == null) return;
        const sc = (ctx[d].pts / ctx[d].cap) * 50 + Math.abs(d - target) * 12 + (hit.kind === 'cycle' ? ctx[d].big * 30 : 0);
        if (!best || sc < best.sc) best = { d, st, sc };
      });
      if (!best) return { text: `Não achei espaço livre para ${r.title.toLowerCase()} nesta semana. Quer tirar algo do caminho?`, cards: [] };
      const dia = best.d === s.day ? 'hoje' : DIAS_LONGO[weekdayOf(best.d)];
      const why = hit.kind === 'cycle' ? `já faz ${s.day - r.last} dias, e é um horário leve num dia com espaço` : heavy ? 'é um dos seus blocos de mais foco' : 'é um horário leve, sem roubar seu foco';
      return { text: `O melhor é **${dia} às ${hhmm(best.st)}**: ${why}.`, cards: [{ kind: 'actions', title: `${r.title} · ${dur} min`, actions: [{ label: `Encaixar ${dia} às ${hhmm(best.st)}`, op: 'placeAt', payload: { kind: hit.kind, ref: r.id, day: best.d, start: best.st, dur } }] }] };
    }
  }
  // 2b. compromisso com horário (uma vez ou toda semana)
  const pc = parseCmd(message, s);
  if (pc.isEvent && !/o que (eu )?(faco|fazer)|tenho \d+ ?(min|minutos) livres?/.test(t)) {
    const len = pc.dur || (pc.eventWord ? 60 : 30);
    const recurring = !!(pc.days && pc.days.length);
    let day = pc.day != null ? pc.day : s.day;
    if (!recurring && pc.day == null && pc.start <= now) day = s.day + 1;
    const draft = { title: pc.title || 'Compromisso', day, start: hhmm(pc.start), end: hhmm(Math.min(1439, pc.start + len)), recurring, days: recurring ? pc.days : [weekdayOf(day)] };
    const dia = recurring ? diasTxt(pc.days) : day === s.day ? 'hoje' : day === s.day + 1 ? 'amanhã' : fmtDia(day).toLowerCase();
    const ov = recurring ? { fx: [] } : overlapsOn(s, day, pc.start, pc.start + len);
    const past = !recurring && day === s.day && pc.start < now;
    const notes = [];
    if (!pc.dur) notes.push(`Não disse até que horas, então coloquei ${len} min`);
    if (pc.day == null && !recurring && day !== s.day) notes.push('como esse horário já passou hoje, coloquei amanhã');
    if (ov.fx.length) notes.push(`atenção: bate com ${ov.fx.join(', ')}`);
    return { text: `Entendi: **${draft.title}**, ${dia}, **${draft.start}–${draft.end}**${recurring ? ' (horário fixo)' : ''}.${notes.length ? ' ' + notes.join('; ').replace(/^./, (c) => c.toUpperCase()) + '.' : ''}${past ? ' Esse horário já passou: ajuste antes de marcar.' : ''} Confira e confirme.`, cards: [{ kind: 'event', draft }] };
  }
  // 3. o que fazer agora / tempo livre
  if (/o que (eu )?(faco|fazer|posso fazer)|tenho \d+ ?(min|minutos)|livre|agora/.test(t) && !/preciso|tenho que/.test(t)) {
    const fx = fixedOn(s, s.day), nextF = fx.find((f) => f.s > now);
    const mins = parseMins(t) || clamp(nextF ? nextF.s - now : 30, 10, 60);
    const lv = en.total < 45 ? 'baixa' : en.total < 65 ? 'media' : 'alta';
    const cands = [];
    s.plan.items.filter((it) => it.day === s.day && it.status === 'pendente' && refOf(s, it)).forEach((it) => {
      const r = refOf(s, it);
      const full = it.kind === 'task' ? r.dur : r.dur, small = it.kind === 'task' ? r.min : r.dur;
      const ver = full <= mins && !(lv === 'baixa' && r.load === 'pesada') ? 'normal' : small <= mins ? 'min' : null;
      if (!ver) return;
      const load = it.kind === 'task' ? r.load : 'leve';
      const sc = RANK[it.prio] * 10 + (lv === 'baixa' ? RANK[load] === 2 ? 0 : 15 : lv === 'alta' && load === 'pesada' ? -8 : 0) + (ver === 'min' ? 4 : 0);
      cands.push({ it, r, ver, sc, dur: ver === 'min' ? small : full });
    });
    s.cycles.filter((c) => c.last !== s.day && s.day - c.last >= c.every && c.dur <= mins && !s.plan.items.some((it) => it.kind === 'cycle' && it.ref === c.id && it.day === s.day))
      .forEach((c) => cands.push({ cycle: c, r: c, ver: 'normal', sc: 12, dur: c.dur }));
    cands.sort((a, b) => a.sc - b.sc);
    if (!cands.length) return { text: `Com ${mins} min e energia em ${en.total}%, o melhor é descansar de verdade. Água, alongar, respirar. Isso também conta.`, cards: [] };
    const c0 = cands[0], alt = cands[1];
    const reason = c0.ver === 'min' ? 'A versão completa não cabe agora, mas o mínimo cabe e já conta.' : lv === 'baixa' ? 'É leve e combina com a energia de agora.' : c0.cycle ? `Já faz ${s.day - c0.cycle.last} dias.` : c0.r.load === 'pesada' ? 'Você está com energia para algo que pede foco.' : 'Cabe certinho no tempo que você tem.';
    const op = (c) => (c.cycle ? { op: 'fitNow', payload: { cycleId: c.cycle.id } } : { op: 'fitNow', payload: { itemId: c.it.id, ver: c.ver } });
    const actions = [{ label: 'Encaixar agora', ...op(c0) }];
    if (alt) actions.push({ label: `Ou: ${alt.r.title}`, ...op(alt) });
    return { text: `Com ${mins} min e energia em ${en.total}%, eu faria: **${c0.r.title}**${c0.ver === 'min' ? ` (só o mínimo: ${c0.r.minText ? c0.r.minText.toLowerCase() : ''})` : ''}, ${c0.dur} min. ${reason}`, cards: [{ kind: 'actions', title: `${c0.r.title} · ${c0.dur} min`, actions }] };
  }
  // 4. criar tarefa
  if (/preciso|tenho que|tenho de|quero|lembr|adicion|coloca|cria|anota|estudar|pagar|marcar|ligar|comprar|entregar|fazer|ler |boleto|vezes|\dx/.test(t) || parseDue(t, s.day) != null) {
    const draft = draftFromText(message, s);
    const prev = placeNew(s, { ...draft, id: 'preview' })[0];
    const freqTxt = draft.freq ? (draft.freq === 7 ? ', todo dia' : `, ${draft.freq}x por semana`) : draft.due != null ? `, até ${draft.due === s.day ? 'hoje' : draft.due === s.day + 1 ? 'amanhã' : DIAS_LONGO[weekdayOf(draft.due)]}` : '';
    return { text: `Entendi: **${draft.title}**. Sugiro ${draft.dur} min (mínimo ${draft.min}), prioridade ${PRIO[draft.prio].t.toLowerCase()}, carga ${LOAD[draft.load].t.toLowerCase()}${freqTxt}.${prev ? ` Primeiro encaixe: ${prev.day === s.day ? 'hoje' : DIAS_LONGO[weekdayOf(prev.day)]} às ${hhmm(prev.start)}.` : ''} Ajuste se quiser e confirme.`, cards: [{ kind: 'addTask', draft }] };
  }
  // 5. ajuda
  return { text: `Oi. Energia em ${en.total}%, ${MODOS[mode].t.toLowerCase()}. Posso adicionar coisas na sua rotina (“estudar física 2x na semana, pesado”), sugerir o que fazer agora (“tenho 25 min livres”) ou aliviar o dia (“tô exausta”).`, cards: [] };
}
/* ===================== Lume com IA de verdade (Claude, opcional) =====================
 * Com uma chave da API da Anthropic salva só neste navegador, o Lume conversa de verdade e mexe no app
 * por ferramentas (criar, concluir, mover, tirar, registrar cuidados). Sem chave, usa o cérebro local.
 * Na versão publicada, a chamada deve passar por uma Edge Function (a chave fica no servidor). */
const AI_MODELS = [['claude-sonnet-5-5', 'Sonnet 5.5 (equilibrado)'], ['claude-haiku-5-5', 'Haiku 5.5 (rápido e barato)'], ['claude-opus-5-5', 'Opus 5.5 (mais capaz)']];
const AI_TOOLS = [
  { name: 'add_task', description: 'Cria uma tarefa que o app distribui na semana. Use para estudos, coisas a fazer, hábitos. Não use para compromissos com hora marcada.', input_schema: { type: 'object', properties: { title: { type: 'string' }, load: { type: 'string', enum: ['leve', 'media', 'pesada'], description: 'carga mental' }, times_per_week: { type: 'integer', minimum: 0, maximum: 7, description: '0 = avulsa (uma vez), 7 = todo dia' }, minutes: { type: 'integer', minimum: 5, maximum: 240 }, due_date: { type: 'string', description: 'YYYY-MM-DD, só para avulsas com prazo' }, self_care: { type: 'boolean', description: 'true se for autocuidado (não conta como produtividade)' }, minimum_version: { type: 'string', description: 'versão mínima para dia ruim' } }, required: ['title', 'load', 'times_per_week'] } },
  { name: 'add_event', description: 'Marca um compromisso com hora (aula, consulta, reunião). Uma vez numa data, ou toda semana em dias da semana.', input_schema: { type: 'object', properties: { title: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD (se for uma vez só)' }, weekdays: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 6 }, description: '0=domingo ... 6=sábado (se for toda semana)' }, start: { type: 'string', description: 'HH:MM' }, end: { type: 'string', description: 'HH:MM' } }, required: ['title', 'start', 'end'] } },
  { name: 'complete_item', description: 'Marca um item da grade como feito.', input_schema: { type: 'object', properties: { item_id: { type: 'string' } }, required: ['item_id'] } },
  { name: 'move_item', description: 'Move um item da grade para outro dia desta semana (o app escolhe o horário).', input_schema: { type: 'object', properties: { item_id: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['item_id', 'date'] } },
  { name: 'remove_item', description: 'Tira um item da grade de um dia.', input_schema: { type: 'object', properties: { item_id: { type: 'string' } }, required: ['item_id'] } },
  { name: 'skip_fixed_block', description: 'Registra que um bloco fixo (trabalho, aula, trajeto) não vai acontecer ou não aconteceu num dia. Trabalho leva os trajetos junto.', input_schema: { type: 'object', properties: { block_id: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['block_id', 'date'] } },
  { name: 'add_water', description: 'Soma água bebida hoje, em ml.', input_schema: { type: 'object', properties: { ml: { type: 'integer', minimum: 50, maximum: 3000 } }, required: ['ml'] } },
  { name: 'mark_meal', description: 'Marca uma refeição de hoje como feita.', input_schema: { type: 'object', properties: { meal_id: { type: 'string' } }, required: ['meal_id'] } },
  { name: 'take_med', description: 'Marca um remédio de hoje como tomado.', input_schema: { type: 'object', properties: { med_id: { type: 'string' } }, required: ['med_id'] } },
  { name: 'add_care_cycle', description: 'Cria algo de casa ou autocuidado que se repete a cada X dias (ex.: lavar o cabelo a cada 3 dias).', input_schema: { type: 'object', properties: { title: { type: 'string' }, every_days: { type: 'integer', minimum: 1, maximum: 60 }, minutes: { type: 'integer', minimum: 1, maximum: 180 }, area: { type: 'string', enum: ['casa', 'cuidado'] } }, required: ['title', 'every_days', 'minutes', 'area'] } },
  { name: 'add_routine_step', description: 'Acrescenta um passo à rotina da manhã ou da noite.', input_schema: { type: 'object', properties: { routine: { type: 'string', enum: ['manha', 'noite'] }, step: { type: 'string' }, minutes: { type: 'integer', minimum: 1, maximum: 60 }, essential: { type: 'boolean' } }, required: ['routine', 'step', 'minutes'] } },
  { name: 'lighten_today', description: 'Reajusta o dia de hoje: troca o pesado pelo mínimo e manda o resto para outros dias. Use quando a pessoa estiver cansada ou sobrecarregada.', input_schema: { type: 'object', properties: {} } },
  { name: 'set_survival_day', description: 'Liga ou desliga o Dia de Sobrevivência (só o essencial, protege a ofensiva).', input_schema: { type: 'object', properties: { on: { type: 'boolean' } }, required: ['on'] } },
  { name: 'set_vacation', description: 'Pausa a rotina por férias ou viagem (trabalho, aulas, tarefas e casa param; compromissos com hora continuam; a ofensiva fica protegida), ou encerra a pausa ativa.', input_schema: { type: 'object', properties: { action: { type: 'string', enum: ['start', 'end'] }, label: { type: 'string', description: 'ex.: Férias, Viagem' }, start_date: { type: 'string', description: 'YYYY-MM-DD; padrão hoje' }, end_date: { type: 'string', description: 'YYYY-MM-DD último dia; omita para sem data' }, keep_care: { type: 'boolean' }, keep_routines: { type: 'boolean' } }, required: ['action'] } },
  { name: 'log_mood', description: 'Registra humor (0 muito mal ... 4 muito bem) e/ou estado sensorial de hoje.', input_schema: { type: 'object', properties: { humor: { type: 'integer', minimum: 0, maximum: 4 }, sensorial: { type: 'string', enum: ['ok', 'cheio', 'sobrecarga'] } } } },
];
function aiSnapshot(s) {
  const en = energyOf(s), mode = modeOf(s, en), D = (d) => `${isoOf(d)} (${DIAS_LONGO[weekdayOf(d)]})`;
  const items = s.plan.items.filter((it) => it.day >= s.day && s.plan.days.includes(it.day) && it.status !== 'removido' && refOf(s, it)).sort((a, b) => a.day - b.day || a.start - b.start)
    .map((it) => `- [${it.id}] ${isoOf(it.day)} ${hhmm(it.start)} ${it.dur}min · ${itemTitle(s, it)} · ${it.status}${it.ver === 'min' ? ' (mínimo)' : ''}${areaOf(s, it) ? ' · autocuidado/casa' : ''}${it.locked ? ' · fixado' : ''}`);
  const fx = [0, 1, 2, 3, 4, 5, 6].map((k) => s.day + k).flatMap((d) => fixedAll(s, d).map((f) => `- [${f.id}] ${isoOf(d)} ${f.start}-${f.end} ${f.title} (${f.type})${f.skip ? ' · não acontece' : ''}`));
  return [
    `Hoje: ${D(s.day)}. Agora: ${hhmm(nowRef(s))}. Energia: ${en.total}% (${MODOS[mode].t}). Sono da noite: ${s.today.checkedIn ? fmtH(en.h) : 'sem check-in'}; meta ${fmtH(en.goal)} (deitar ${s.sleepGoal.bed}, acordar ${s.sleepGoal.wake}). Bateria social: ${socialOf(s).now}%.`,
    `Água hoje: ${wMl(s)} ml de ${gMl(s)} ml. Refeições: ${(s.careCfg.meals || []).map((m) => `[${m.id}] ${m.name} ${m.time}${(s.mealsDone[s.day] || {})[m.id] ? ' ✓' : ''}`).join(', ') || 'nenhuma'}. Remédios: ${(s.careCfg.meds || []).map((m) => `[${m.id}] ${m.name} ${m.time}${(s.medsTaken[s.day] || {})[m.id] ? ' ✓' : ''}`).join(', ') || 'nenhum'}.`,
    `Pausas de rotina (férias/viagem): ${(s.vacations || []).filter((v) => v.end == null || v.end >= s.day).map((v) => `[${v.id}] ${v.label} de ${isoOf(v.start)} ${v.end == null ? 'sem data para voltar' : 'até ' + isoOf(v.end)}${v.start <= s.day ? ' (ATIVA AGORA)' : ''}`).join('; ') || 'nenhuma'}.`,
    `Humor hoje: ${(s.moods || {})[s.day] ? JSON.stringify(s.moods[s.day]) : 'não registrado'}. Dia de Sobrevivência: ${s.today.survival ? 'ligado' : 'desligado'}.`,
    `Tarefas cadastradas: ${s.tasks.map((t) => `${t.title} (${t.load}, ${t.freq ? t.freq + 'x/sem' : 'avulsa'}, ${t.dur}min)`).join('; ') || 'nenhuma'}.`,
    `Casa e autocuidado: ${s.cycles.map((c) => `${c.title} a cada ${c.every}d, há ${s.day - c.last}d`).join('; ') || 'nada'}. Rotinas: manhã ${s.routines.manha.on ? 'ligada' : 'desligada'}, noite ${s.routines.noite.on ? 'ligada' : 'desligada'}.`,
    `Blocos fixos dos próximos 7 dias:\n${fx.join('\n') || '- nenhum'}`,
    `Grade da semana (de hoje em diante):\n${items.join('\n') || '- vazia'}`,
  ].join('\n');
}
const AI_SYSTEM = (s) => `Você é o Lume, o assistente do QuestDay, um planner para pessoas com TDAH e/ou autismo. Fale em português do Brasil, com calor e sem infantilizar. Seja breve: 1 a 4 frases, a menos que a pessoa peça mais. Nunca culpe; o mínimo conta. Ajude de verdade: pense junto, dê sugestões concretas e, quando a pessoa pedir ou concordar, use as ferramentas para mexer no app. Depois de usar ferramentas, diga em uma frase o que mudou. Se faltar uma informação essencial (ex.: horário de um compromisso), pergunte uma coisa só. Use os ids exatos entre colchetes ao mexer em itens. Não dê dose de remédio nem diagnóstico. Se a pessoa disser algo que indique risco à própria vida, pare de planejar, acolha e indique o CVV (ligue 188, 24h, ou cvv.org.br) e alguém de confiança.

Estado atual do app:
${aiSnapshot(s)}`;
async function claudeTurn(ai, s, history, message, exec) {
  const messages = [...history, { role: 'user', content: message }], did = [];
  for (let k = 0; k < 5; k++) {
    const body = { model: ai.model || AI_MODELS[0][0], max_tokens: 1024, system: AI_SYSTEM(s), tools: AI_TOOLS, messages };
    let j;
    if (ai.key) {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': ai.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify(body) });
      if (!r.ok) { let t = ''; try { t = (await r.json()).error.message; } catch (e) {} const err = new Error(t || `HTTP ${r.status}`); err.status = r.status; throw err; }
      j = await r.json();
    } else j = await Cloud.lume(body);
    messages.push({ role: 'assistant', content: j.content });
    const uses = (j.content || []).filter((c) => c.type === 'tool_use');
    const text = (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
    if (!uses.length || j.stop_reason !== 'tool_use') return { text: text || (did.length ? 'Pronto.' : '…'), did };
    messages.push({ role: 'user', content: uses.map((u) => { let out; try { out = exec(u.name, u.input || {}); } catch (e) { out = 'erro: ' + e.message; } did.push(out); return { type: 'tool_result', tool_use_id: u.id, content: String(out) }; }) });
  }
  return { text: 'Fiz o que deu por agora.', did };
}
function AiSettings({ s, act, onClose }) {
  const ai = s.ai || {}, [key, setKey] = useState(ai.key || ''), [model, setModel] = useState(ai.model || AI_MODELS[0][0]), [st, setSt] = useState('');
  const test = async () => {
    setSt('Testando…');
    try { const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key.trim(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model, max_tokens: 16, messages: [{ role: 'user', content: 'diga oi' }] }) });
      setSt(r.ok ? 'Funcionou. O Lume já pode usar a IA.' : r.status === 401 ? 'Chave inválida.' : `Erro ${r.status}.`); }
    catch (e) { setSt('Não consegui conectar daqui (a rede pode estar bloqueada nesta prévia). Abra o arquivo direto no navegador e tente de novo.'); }
  };
  return (
    <div className="mx-4 my-3 rounded-xl border border-[#9f8fff]/30 bg-zinc-950 p-4 space-y-3 rise">
      <div className="flex items-center justify-between"><p className="text-sm text-zinc-100 font-medium">Lume com IA de verdade</p><button className="w-8 h-8 grid place-items-center rounded-lg text-zinc-500 hover:bg-white/5" aria-label="Fechar ajustes" onClick={onClose}><Ic n="X" className="w-4 h-4" /></button></div>
      {Cloud.status.aiReady === true && <div className="rounded-lg bg-[#2ee8c4]/10 border border-[#2ee8c4]/20 p-3 space-y-2"><p className="text-xs text-[#7ff0d8]">O Lume já usa a IA pelo servidor da sua conta (Gemini). Não precisa colocar chave aqui.</p>
        <label className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" className="accent-[#2ee8c4]" checked={!(ai.off)} onChange={(e) => act.setAi({ off: !e.target.checked })} />Usar a IA do servidor (Gemini)</label></div>}
      <p className="text-xs text-zinc-400">Com uma chave da API da Anthropic, o Lume conversa de verdade e mexe no app por você: cria, move, conclui, registra água e humor, alivia o dia. Sem chave, ele usa o modo local.</p>
      <label className="block text-xs text-zinc-500">Chave da API<input type="password" autoComplete="off" className={inp + ' h-10 mt-1'} value={key} placeholder="sk-ant-…" onChange={(e) => setKey(e.target.value)} /></label>
      <label className="block text-xs text-zinc-500">Modelo<select className={inp + ' h-10 mt-1 px-2'} value={model} onChange={(e) => setModel(e.target.value)}>{AI_MODELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <p className="text-[11px] text-zinc-500">Opcional se você já entrou na conta. A chave fica salva só neste aparelho (nunca vai para a nuvem) e o uso é cobrado na sua conta da Anthropic.</p>
      <div className="flex flex-wrap gap-2">
        <button className={btnP + ' min-h-[38px] h-9 text-sm'} disabled={!key.trim()} onClick={() => { act.setAi({ key: key.trim(), model, on: true }); onClose(); }}>Salvar e ligar</button>
        <button className={btnG + ' min-h-[38px] h-9 text-sm'} disabled={!key.trim()} onClick={test}>Testar</button>
        {ai.key && <button className={btnL + ' text-xs'} onClick={() => { act.setAi({ key: '', on: false }); setKey(''); }}>Apagar chave</button>}
      </div>
      {st && <p className="text-xs text-zinc-300" role="status">{st}</p>}
    </div>
  );
}

async function askAssistant(message, state) {
  // Ponto único para trocar pelo modelo real (ver comentário acima).
  return localBrain(message, state);
}

// Lume: gatinha do app. Cores vêm de variáveis CSS (--pet-*) para seguir o tema claro/escuro.
// Animações (piscar, orelhas, rabinho, respiração) param sozinhas no modo baixo estímulo.
function Pet({ mood, size = 40 }) {
  const F = { fill: 'var(--pet-fill)' }, INK = 'var(--pet-ink)', LINE = '#9f8fff', PINK = '#ff8fc0';
  const sono = mood === 'sono', alerta = mood === 'alerta';
  const ear = (side) => {
    const m = (x) => (side === 'l' ? x : 48 - x), tilt = sono ? (side === 'l' ? -26 : 26) : mood === 'calmo' ? (side === 'l' ? -6 : 6) : 0;
    return <g transform={`rotate(${tilt} ${m(16)} ${sono ? 21 : 19})`}><g className={`pet-ear-${side}`}>
      <path d={`M${m(13.2)} 21 Q${m(11.6)} 14 ${m(13.4)} 9.4 Q${m(14)} 8.4 ${m(15)} 9 Q${m(18.8)} 11.6 ${m(21.6)} 15.8`} stroke={LINE} strokeWidth="1.5" style={F} strokeLinejoin="round" strokeLinecap="round" />
      <path d={`M${m(14.8)} 17.6 Q${m(14.2)} 13.8 ${m(15.1)} 11.8 Q${m(17.4)} 13.4 ${m(19)} 15.6 Z`} fill={PINK} opacity=".55" />
    </g></g>;
  };
  const eye = (x) => alerta
    ? <g><ellipse cx={x} cy="26.2" rx="2.5" ry="2.8" style={{ fill: 'var(--pet-eye)' }} /><circle cx={x + 0.3} cy="26.7" r="1.85" style={{ fill: 'var(--pet-pupil)' }} /><circle cx={x - 0.35} cy="25.9" r=".68" fill="#fff" /><circle cx={x + 0.95} cy="27.6" r=".32" fill="#fff" opacity=".85" /></g>
    : sono ? <path d={`M${x - 2.2} 26.6 q2.2 1.5 4.4 0`} stroke={INK} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity=".75" />
      : <path d={`M${x - 2.2} 27.2 q2.2 -2.4 4.4 0`} stroke={INK} strokeWidth="1.5" fill="none" strokeLinecap="round" />;
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" className="overflow-visible pet">
      <g className={sono ? 'pet-breathe-slow' : 'pet-breathe'} style={{ transformOrigin: '24px 40px' }}>
        <g className="pet-tail"><path d="M36.6 34.4 C41.8 34.8 44.8 31.4 43.6 26.6 C43.2 25 41.4 25.4 41.8 27.1 C42.5 30.3 40.4 32.1 37.2 31.6" stroke="#2ee8c4" strokeWidth="1.4" style={F} strokeLinejoin="round" strokeLinecap="round" /></g>
        {ear('l')}{ear('r')}
        <ellipse cx="24" cy="28.2" rx="14.6" ry="12" stroke={LINE} strokeWidth="1.6" style={F} />
        <g className={alerta ? 'pet-blink' : ''}>{eye(18.4)}{eye(29.6)}</g>
        {!sono && <><ellipse cx="15.4" cy="31.4" rx="2" ry="1.25" fill={PINK} opacity=".32" /><ellipse cx="32.6" cy="31.4" rx="2" ry="1.25" fill={PINK} opacity=".32" /></>}
        <path d="M23.2 29.9 h1.6 l-.8 .9 z" fill={PINK} stroke={PINK} strokeWidth=".4" strokeLinejoin="round" />
        <path d={sono ? 'M22.9 32.2 h2.2' : 'M22.1 31.3 q.95 1 1.9 0 q.95 1 1.9 0'} stroke={INK} strokeWidth="1.1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <g stroke={LINE} strokeWidth=".7" strokeLinecap="round" opacity=".55"><path d="M8.8 29.2 L13.6 29.9" /><path d="M9.2 32.4 L13.8 31.6" /><path d="M39.2 29.2 L34.4 29.9" /><path d="M38.8 32.4 L34.2 31.6" /></g>
        {LUME_LV >= 1 && <g><path d="M12 36.6 Q24 42.2 36 36.6 L35 39.6 Q24 44.6 13 39.6 Z" fill="#ff6fb5" /><path d="M30 39 l2.5 6 l3 -1 l-2 -6" fill="#ff6fb5" /><path d="M14 38.1 Q24 42.6 34 38.1" stroke="#ffb3d9" strokeWidth=".8" fill="none" /></g>}
      </g>
      {sono && <text x="37" y="12" fontSize="8" fill="#2ee8c4" className="pet-z" fontFamily="Inter, sans-serif">z</text>}
      {alerta && <circle cx="41" cy="9" r="1.6" fill="#2ee8c4" className="pet-z" />}
    </svg>
  );
}
const petMood = (s, en) => (s.today.survival || en.total < 40 ? 'sono' : en.total >= 70 ? 'alerta' : 'calmo');
const MOOD_TXT = { alerta: 'curioso e alerta', calmo: 'calmo', sono: 'descansando com você' };

function Rich({ text }) {
  return <>{text.split('**').map((p, i) => (i % 2 ? <b key={i} className="text-zinc-50 font-medium">{p}</b> : <span key={i}>{p}</span>))}</>;
}
function AddTaskCard({ s, draft, onApply, applied }) {
  const [f, setF] = useState(draft);
  const set = (p) => { const n = { ...f, ...p }; if (p.prio || p.load) { const g = suggestDur(n.prio, n.load); if (!f.durTouched) { n.dur = g.dur; n.min = g.min; } } setF(n); };
  const prev = placeNew(s, { ...f, id: 'preview' });
  if (applied) return <div className="rounded-xl border border-[#2ee8c4]/30 bg-[#2ee8c4]/[0.06] p-3 text-sm text-[#a8f7e8] flex items-center gap-2"><Ic n="Check" />“{f.title}” entrou na sua rotina{prev.length ? ` e na grade (${prev.length} ${prev.length === 1 ? 'bloco' : 'blocos'})` : ''}.</div>;
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950 p-3 space-y-2.5">
      <input className={inp + ' h-10 text-[15px]'} value={f.title} onChange={(e) => set({ title: e.target.value })} aria-label="Nome da tarefa" />
      <Seg value={f.prio} onChange={(v) => set({ prio: v })} options={[['alta', 'Alta'], ['media', 'Média'], ['baixa', 'Baixa']]} label="Prioridade" />
      <Seg value={f.load} onChange={(v) => set({ load: v })} options={[['pesada', 'Pesada'], ['media', 'Média'], ['leve', 'Leve']]} label="Carga mental" />
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs text-zinc-500">Duração<input type="number" min="5" step="5" className={inp + ' h-10 mt-1'} value={f.dur} onChange={(e) => setF({ ...f, dur: Number(e.target.value) || 5, durTouched: true })} /></label>
        <label className="text-xs text-zinc-500">Mínimo<input type="number" min="1" className={inp + ' h-10 mt-1'} value={f.min} onChange={(e) => setF({ ...f, min: Number(e.target.value) || 1, durTouched: true })} /></label>
        <label className="text-xs text-zinc-500">Frequência<select className={inp + ' h-10 mt-1 px-2'} value={f.freq} onChange={(e) => setF({ ...f, freq: Number(e.target.value), due: Number(e.target.value) ? null : f.due })}>
          <option value={0}>Avulsa</option>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}x/sem</option>)}<option value={7}>Todo dia</option></select></label>
      </div>
      {!f.freq && <label className="text-xs text-zinc-500 block">Prazo<input type="date" className={inp + ' h-10 mt-1'} value={f.due != null ? isoOf(f.due) : ''} onChange={(e) => setF({ ...f, due: e.target.value ? dayFromIso(e.target.value) : null })} /></label>}
      <p className="text-xs text-zinc-500">{prev.length ? <>Vai para: {prev.slice(0, 4).map((p) => `${DIAS[weekdayOf(p.day)]} ${hhmm(p.start)}${p.ver === 'min' ? ' (mín.)' : ''}`).join(' · ')}{prev.length > 4 ? '…' : ''}</> : 'Sem espaço livre nesta semana: fica cadastrada e entra na próxima distribuição.'}</p>
      <button className={btnP + ' w-full min-h-[40px]'} onClick={() => { const { durTouched, ...clean } = f; onApply(clean); }}><Ic n="Plus" />Adicionar na minha rotina</button>
    </div>
  );
}
const fitTa = (el) => { if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; };
function AssistantDrawer({ s, en, open, onClose, msgs, setMsgs, runOp, aiExec, act }) {
  const [text, setText] = useState('');
  const [cfg, setCfg] = useState(false), [drag, setDrag0] = useState(0), dst = useRef(null), dragR = useRef(0);
  const setDrag = (v) => { dragR.current = v; setDrag0(v); };
  const dragH = { onTouchStart: (e) => { dst.current = e.touches[0].clientY; }, onTouchMove: (e) => { if (dst.current == null) return; const d = e.touches[0].clientY - dst.current; setDrag(d > 0 ? d : 0); }, onTouchEnd: () => { if (dragR.current > 110) { haptic(); onClose(); } setDrag(0); dst.current = null; } };
  useCloud();
  const aiOn = !!(s.ai && s.ai.on && s.ai.key) || (Cloud.status.aiReady === true && !(s.ai && s.ai.off));
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null), inRef = useRef(null);
  const mood = petMood(s, en);
  useEffect(() => { if (open) { setTimeout(() => inRef.current && inRef.current.focus(), 50); } }, [open]);
  useEffect(() => { endRef.current && endRef.current.scrollIntoView({ block: 'end' }); }, [msgs, open]);
  useEffect(() => { if (!text) fitTa(inRef.current); }, [text]);
  useEffect(() => { if (!open) return; const k = (e) => { if (e.key === 'Escape') onClose(); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, [open]);
  const send = async (raw, quick) => {
    const m = (raw || '').trim(); if (!m || busy) return;
    setMsgs((x) => [...x, { id: uid(), role: 'user', text: m }]); setText(''); setBusy(true);
    let r;
    if (quick === 'add') r = { text: 'Me diz o que é, do seu jeito. Por exemplo: “pagar boleto amanhã” ou “estudar física 2x na semana, é pesado”.', cards: [] };
    else if (aiOn) {
      const hist = []; msgs.filter((x) => x.id !== 'hi' && x.text).slice(-12).forEach((x) => { const role = x.role === 'user' ? 'user' : 'assistant'; if (hist.length && hist[hist.length - 1].role === role) hist[hist.length - 1].content += '\n' + x.text; else hist.push({ role, content: x.text }); });
      while (hist.length && hist[0].role !== 'user') hist.shift(); if (hist.length && hist[hist.length - 1].role === 'user') hist.pop();
      try { const out = await claudeTurn(s.ai && s.ai.on && s.ai.key ? s.ai : { ...(s.ai || {}), key: '' }, s, hist, m, aiExec); r = { text: out.text, cards: out.did.length ? [{ kind: 'actions', title: 'O que eu fiz', applied: out.did.join(' · '), actions: [] }] : [], ai: true }; }
      catch (e) { const local = localBrain(m, s); r = { ...local, text: (e.status === 429 ? 'A IA atingiu o limite gratuito por agora, então respondi no modo local. ' : e.status === 401 ? 'A chave da IA não funcionou, então respondi no modo local. ' : 'Não consegui falar com a IA agora, respondi no modo local. ') + local.text }; }
    }
    else { try { r = await askAssistant(m, s); } catch (e) { r = { text: 'Não consegui pensar nisso agora. Tenta de novo?', cards: [] }; } }
    await new Promise((res) => setTimeout(res, 260));
    setMsgs((x) => [...x, { id: uid(), role: 'bot', text: r.text, cards: (r.cards || []).map((c) => ({ ...c, id: uid() })) }]); setBusy(false);
  };
  const applyOne = (msgId, cardId, i, a) => {
    runOp(a.op, a.payload);
    setMsgs((x) => x.map((m) => (m.id === msgId ? { ...m, cards: m.cards.map((c) => (c.id === cardId ? { ...c, done: [...(c.done || []), i] } : c)) } : m)));
  };
  const apply = (msgId, cardId, op, payload, label) => {
    runOp(op, payload);
    setMsgs((x) => x.map((m) => (m.id === msgId ? { ...m, cards: m.cards.map((c) => (c.id === cardId ? { ...c, applied: label || true } : c)) } : m)));
  };
  if (!open) return null;
  const chips = [['Adicionar algo rápido', 'add'], ['O que fazer agora?', null], ['Tô sem energia, me ajuda', null]];
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-stretch justify-end" role="dialog" aria-modal="true" aria-label="Assistente">
      <button className="absolute inset-0 bg-black/55 backdrop-blur-[2px] cursor-default" aria-label="Fechar assistente" onClick={onClose} style={{ opacity: Math.max(0.2, 1 - drag / 400) }} />
      <div className="relative w-full md:w-[420px] h-[92vh] md:h-full bg-[#0f1014] rounded-t-2xl md:rounded-none border-t md:border-t-0 md:border-l border-white/[0.08] flex flex-col sheet-up drawer-md"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined, transition: drag ? 'none' : 'transform .2s', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="md:hidden flex justify-center pt-2.5 pb-1" aria-hidden="true" {...dragH}><span className="w-10 h-1.5 rounded-full bg-white/20" /></div>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]" {...dragH}>
          <Pet mood={mood} size={40} />
          <div className="flex-1"><p className="text-zinc-50 font-medium flex items-center gap-2">Lume <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${aiOn ? 'bg-[#2ee8c4]/15 text-[#7ff0d8]' : 'bg-white/[0.06] text-zinc-400'}`}>{aiOn ? 'IA ligada' : 'modo local'}</span></p><p className="text-xs text-zinc-500">{MOOD_TXT[mood]} · energia {en.total}%</p></div>
          <button className="w-10 h-10 grid place-items-center rounded-lg text-zinc-400 hover:bg-white/5" aria-label="Ajustes do Lume" aria-expanded={cfg} onClick={() => setCfg(!cfg)}><Ic n="Settings" /></button>
          <button className="w-10 h-10 grid place-items-center rounded-lg text-zinc-400 hover:bg-white/5" aria-label="Fechar" onClick={onClose}><Ic n="X" /></button>
        </div>
        {cfg && <AiSettings s={s} act={act} onClose={() => setCfg(false)} />}
        {!aiOn && !cfg && <button className="mx-4 mt-3 rounded-xl border border-dashed border-[#9f8fff]/40 px-3 py-2 text-left text-xs text-zinc-400 hover:bg-white/[0.03]" onClick={() => setCfg(true)}><span className="text-[#cdc4ff]">Quer o Lume com IA de verdade?</span> Ele conversa e mexe no app por você. Toque para configurar.</button>}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" aria-live="polite">
          {msgs.map((m) => m.role === 'user' ? (
            <div key={m.id} className="flex justify-end"><p className="max-w-[85%] rounded-2xl rounded-br-md bg-[#9f8fff]/15 text-zinc-100 px-3.5 py-2 text-[15px] whitespace-pre-wrap break-words">{m.text}</p></div>
          ) : (
            <div key={m.id} className="space-y-2 max-w-[92%]">
              <p className="text-[15px] text-zinc-300 leading-relaxed whitespace-pre-wrap break-words"><Rich text={m.text} /></p>
              {(m.cards || []).map((c) => c.kind === 'addTask'
                ? <AddTaskCard key={c.id} s={s} draft={c.draft} applied={c.applied} onApply={(d) => apply(m.id, c.id, 'addTask', d)} />
                : c.kind === 'event' ? <EventCard key={c.id} s={s} draft={c.draft} applied={c.applied} onApply={(d) => apply(m.id, c.id, 'addEvent', d)} />
                : (
                  <div key={c.id} className="rounded-xl border border-white/10 bg-zinc-950 p-3 space-y-2">
                    {c.title && <p className="text-sm text-zinc-200">{c.title}</p>}
                    {c.multi ? <div className="flex flex-col gap-1.5">{c.actions.map((a, i) => { const on = (c.done || []).includes(i); return <button key={i} disabled={on} className={`min-h-[38px] px-3 rounded-lg text-sm text-left flex items-center gap-2 press ${on ? 'bg-[#2ee8c4]/10 text-[#7ff0d8]' : 'border border-white/10 text-zinc-200 hover:bg-white/[0.04]'}`} onClick={() => applyOne(m.id, c.id, i, a)}><Ic n={on ? 'Check' : 'Plus'} className="w-3.5 h-3.5 shrink-0" />{a.label}</button>; })}</div>
                    : c.applied ? <p className="text-sm text-[#2ee8c4] flex items-center gap-1.5"><Ic n="Check" className="w-3.5 h-3.5" />{typeof c.applied === 'string' ? c.applied : 'Feito'}</p>
                      : <div className="flex flex-wrap gap-2">{c.actions.map((a, i) => <button key={i} className={(i === 0 ? btnP : btnG) + ' min-h-[38px] text-sm'} onClick={() => apply(m.id, c.id, a.op, a.payload, a.label)}>{a.label}</button>)}</div>}
                  </div>
                ))}
            </div>
          ))}
          {busy && <p className="text-sm text-zinc-500 flex items-center gap-2"><span className="typing"><i /><i /><i /></span>pensando</p>}
          <div ref={endRef} />
        </div>
        <div className="border-t border-white/[0.06] p-3 space-y-2.5">
          <div className="flex gap-1.5 overflow-x-auto">{chips.map(([l, q]) => <button key={l} className="shrink-0 h-9 px-3 rounded-full text-sm bg-white/[0.05] text-zinc-300 hover:bg-white/[0.09] disabled:opacity-40" disabled={busy} onClick={() => send(l, q)}>{l}</button>)}</div>
          <div className="flex gap-2 items-end">
            <textarea ref={inRef} rows={1} className={inp + ' h-auto min-h-[44px] max-h-40 py-2.5 resize-none overflow-y-auto leading-snug'} placeholder="Escreva do seu jeito…" title="Enter envia · Shift+Enter ou Shift+Tab quebra a linha" value={text}
              onChange={(e) => { setText(e.target.value); fitTa(e.target); }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === 'Tab') && e.shiftKey) { e.preventDefault(); const el = e.target; let ok = false; try { ok = document.execCommand('insertText', false, '\n'); } catch (er) {} if (!ok) { el.setRangeText('\n', el.selectionStart, el.selectionEnd, 'end'); setText(el.value); } fitTa(el); return; }
                if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); send(text); }
              }} aria-label="Mensagem para o assistente" />
            <VoiceButton onText={(t) => send(t)} />
            <button className="w-11 h-11 shrink-0 rounded-xl btn-primary text-zinc-950 grid place-items-center disabled:opacity-40" aria-label="Enviar" disabled={!text.trim() || busy} onClick={() => send(text)}><Ic n="ArrowUp" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== APP ===================== */
const TABS = [
  { id: 'agora', label: 'Agora', icon: 'Sun' },
  { id: 'semana', label: 'Semana', sub: 'Plano da IA', icon: 'CalendarRange' },
  { id: 'cuidar', label: 'Cuidar', icon: 'Heart' },
  { id: 'cadastro', label: 'Minha Rotina', short: 'Rotina', icon: 'SlidersHorizontal' },
  { id: 'progresso', label: 'Progresso', icon: 'ChartColumn' },
];
function App({ initialTab, onRestart }) {
  const [s, setS] = useState(load);
  const [tab, setTab0] = useState(initialTab || 'agora');
  const [cadSec, setCadSec] = useState('tarefas');
  const setTab = (t, sec) => { if (sec) setCadSec(sec); setTab0(t); try { window.scrollTo({ top: 0 }); } catch (e) {} };
  const [toast, setToast] = useState(null);
  const [acctOpen, setAcctOpen] = useState(false), [fab, setFab] = useState(false), [swDir, setSwDir] = useState(0);
  // Puxar para atualizar (celular): sincroniza e recalcula o dia.
  const [pull, setPull0] = useState(0), [pulling, setPulling] = useState(false), pst = useRef(null), pullR = useRef(0);
  const setPull = (v) => { pullR.current = v; setPull0(v); };
  const refresh = async () => {
    setPulling(true); haptic(12);
    try { if (Cloud.user) { const d = await Cloud.newerRemote(); if (d && d.v === 4) setS(fromSaved(d)); else { await Cloud.pushNow(sRef.current); setS((x) => fromSaved(x)); } } else setS((x) => fromSaved(x)); } catch (e) {}
    await new Promise((r) => setTimeout(r, 500)); setPulling(false); setPull(0); notify('Tudo em dia.');
  };
  const tsw = useRef(null);
  // Deslizar para os lados troca de aba no celular (ignora carrosséis com rolagem lateral e painéis abertos).
  const hScroller = (el) => { for (let n = el; n && n.tagName !== 'MAIN'; n = n.parentElement) { const ox = getComputedStyle(n).overflowX; if ((ox === 'auto' || ox === 'scroll') && n.scrollWidth > n.clientWidth + 2) return true; } return false; };
  const ptr = {
    onTouchStart: (e) => { const t = e.touches[0], inMain = e.target.closest && e.target.closest('main'); tsw.current = inMain && window.innerWidth < 768 && !hScroller(e.target) ? { x: t.clientX, y: t.clientY } : null; pst.current = window.scrollY <= 0 && !pulling && inMain ? t.clientY : null; },
    onTouchMove: (e) => { if (pst.current == null) return; const d = e.touches[0].clientY - pst.current; if (d > 0 && window.scrollY <= 0) setPull(Math.min(110, d * 0.55)); else if (d < 0) { pst.current = null; setPull(0); } },
    onTouchEnd: (e) => {
      const o = tsw.current; tsw.current = null;
      if (o && pullR.current < 10) { const t = e.changedTouches[0], dx = t.clientX - o.x, dy = t.clientY - o.y;
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) { const i = TABS.findIndex((x) => x.id === tab), j = i + (dx < 0 ? 1 : -1); if (j >= 0 && j < TABS.length) { haptic(8); setSwDir(dx < 0 ? 1 : -1); setTab(TABS[j].id); } } }
      if (pst.current == null) return; pst.current = null; if (pullR.current >= 64) refresh(); else setPull(0);
    },
  };
  const [chatOpen, setChatOpen] = useState(false);
  const [focusIt, setFocusIt] = useState(null);
  const [weekly, setWeekly] = useState(false);
  const [comp, setComp] = useState(null);
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((t) => t + 1), 15000); return () => clearInterval(id); }, []);
  const [nst, setNst] = useState(() => nLoad(realToday())), [ntoast, setNtoast] = useState(null);
  useCloud();
  const [upd, setUpd] = useState(false);
  useEffect(() => Pwa.onUpdate(() => setUpd(true)), []);
  const [msgs, setMsgs] = useState(() => { const s0 = load(); const e0 = energyOf(s0); return [{ id: 'hi', role: 'bot', text: `Oi, eu sou o Lume. Energia em ${e0.total}% hoje. Posso **adicionar coisas na sua rotina**, sugerir **o que fazer agora** ou **aliviar o seu dia**. É só escrever do seu jeito.`, cards: [] }]; });
  const [tm, setTm] = useState(null);
  const up = (fn) => setS((x) => fn(x));
  const notify = (m) => setToast({ m, id: Date.now() });
  const en = energyOf(s);
  LUME_LV = lumeLevel(s).lv;
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} Cloud.markLocal(); Cloud.queuePush(s); }, [s]);
  useCloud();
  useEffect(() => { if (Cloud.user && Cloud.pushOn && s.day === realToday()) Cloud.setReminders(remindersFor(s)); }, [s.plan, s.medsTaken, s.mealsDone, s.careCfg, s.fixed, s.fixedLog, s.vacations, s.day, s.notif, s.sleepGoal, s.ui && s.ui.lowStim, Cloud.pushOn, Cloud.user && Cloud.user.id]);
  useEffect(() => { if (Cloud.user) Cloud.lumeCheck(); }, [Cloud.user && Cloud.user.id]);
  useEffect(() => {
    const vis = async () => { if (document.visibilityState === 'visible') { const d = await Cloud.newerRemote(); if (d && d.v === 4) { setS(fromSaved(d)); setToast({ m: 'Atualizei com o que você fez no outro aparelho.', id: Date.now() }); } } else Cloud.flush(); };
    const hide = () => Cloud.flush();
    document.addEventListener('visibilitychange', vis); window.addEventListener('pagehide', hide);
    if (location.hash === '#lume') { setChatOpen(true); history.replaceState(null, '', location.pathname); }
    return () => { document.removeEventListener('visibilitychange', vis); window.removeEventListener('pagehide', hide); };
  }, []);
  useEffect(() => { const r = document.documentElement, ui = s.ui || {}; r.classList.toggle('low-stim', !!ui.lowStim); r.classList.toggle('light', ui.theme === 'light'); r.classList.toggle('font-legivel', ui.font === 'legivel'); r.classList.toggle('text-grande', ui.size === 'grande'); }, [s.ui]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), toast.undo ? 6000 : 3000); return () => clearTimeout(id); }, [toast]);
  useEffect(() => { const ui = s.ui || {}, c = ui.theme === 'light' ? (ui.lowStim ? '#f4f1ea' : '#f7f7fa') : '#0b0c0f'; document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', c)); }, [s.ui && s.ui.theme, s.ui && s.ui.lowStim]);
  const running = !!(tm && tm.running);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTm((x) => { if (!x || !x.running) return x; const left = Math.max(0, Math.ceil((x.endAt - Date.now()) / 1000)); return { ...x, left, running: left > 0 }; }), 500);
    return () => clearInterval(id);
  }, [running]);
  const prev = useRef(null);
  useEffect(() => { if (tm && tm.left === 0 && prev.current !== 0) { chime('fim', s); notify('Tempo de início feito. Se quiser parar aqui, já valeu.'); } prev.current = tm ? tm.left : null; }, [tm]);

  const earn = (x) => x; // a loja de créditos foi removida; mantido como passagem para não espalhar mudanças
  const restreak = restreakG;
  const keep = (x) => restreak({ ...x, keptDays: { ...x.keptDays, [x.day]: 'feito' } });
  const valueOf = (x, it) => { if (it.kind === 'cycle') return 3; const t = refOf(x, it); if (!t) return 2; const b = t.load === 'pesada' ? 10 : t.load === 'media' ? 6 : 4; return it.ver === 'min' ? Math.max(2, Math.round(b / 2.5)) : b; };
  const setItems = (x, fn) => ({ ...x, plan: { ...x.plan, items: fn(x.plan.items) } });

  const act = {
    checkIn: () => {
      up((x) => {
        const h = sleepHours(x.today.bed, x.today.wake), e2 = energyOf(x);
        const history = [...x.history.filter((r) => r.day !== x.day), { day: x.day, bed: x.today.bed, wake: x.today.wake, sleep: Math.round(h * 100) / 100, trip: e2.real }].slice(-60);
        let n = { ...x, history, today: { ...x.today, checkedIn: true } };
        const m = modeOf(n, e2);
        if (e2.extra >= 15 || m === 'puxado' || m === 'recuperacao') n = reajustar(n);
        return n;
      });
      const e3 = energyOf(s), m3 = modeOf(s, e3);
      notify(e3.extra >= 15 ? `Salvo. O trajeto levou ${e3.extra} min a mais: aliviei o dia de hoje.` : m3 === 'puxado' || m3 === 'recuperacao' ? 'Salvo. Hoje está mais pesado: já reajustei o seu dia.' : s.today.checkedIn ? 'Check-in atualizado.' : 'Check-in feito.');
    },
    startTimer: (it, mins) => {
      setTm({ key: it.id, total: mins * 60, left: mins * 60, endAt: Date.now() + mins * 60000, running: true });
      act.markStart(it);
      up((x) => (x.today.started[it.id] ? x : earn({ ...x, today: { ...x.today, started: { ...x.today.started, [it.id]: true } } }, 2, 'Quebrou a inércia (timer)')));
    },
    done: (it) => {
      haptic(15);
      const v = valueOf(s, it);
      up((x) => {
        const cyc0 = it.kind === 'cycle' ? x.cycles.find((c) => c.id === it.ref) : null;
        let n = setItems(x, (items) => items.map((y) => (y.id === it.id ? { ...y, status: 'feito', prevLast: cyc0 ? cyc0.last : undefined } : y)));
        if (it.kind === 'cycle') n = { ...n, cycles: n.cycles.map((c) => (c.id === it.ref ? { ...c, last: x.day } : c)) };
        if (it.kind === 'task') { const t = refOf(x, it); if (t && !t.freq) n = { ...n, tasks: n.tasks.map((y) => (y.id === t.id ? { ...y, done: true } : y)) }; }
        if (it.kind === 'project') n = { ...n, projects: n.projects.map((pj) => (pj.id === it.ref ? { ...pj, doneMin: pj.doneMin + it.dur } : pj)) };
        if (it.kind !== 'cycle' && it.kind !== 'routine') n = { ...n, outcomes: [...(n.outcomes || []), { day: it.day, wd: weekdayOf(it.day), ref: it.ref, load: it.load, start: it.start, result: it.ver === 'min' ? 'min' : 'feito' }].slice(-300), plan: { ...n.plan, items: n.plan.items.map((y) => (y.id === it.id ? { ...y, recorded: true } : y)) } };
        if (it.load === 'pesada' && it.kind !== 'cycle') n = { ...n, today: { ...n.today, pause: true } };
        const sa = x.today.startedAt && x.today.startedAt[it.id];
        if (sa && it.kind === 'task') {
          const actual = Math.round((Date.now() - sa.ms) / 60000), t = refOf(x, it);
          if (actual >= 2 && t && !t.event) {
            const log = [...(n.durLog || []), { ref: t.id, planned: it.dur, actual, day: x.day }].slice(-200);
            n = { ...n, durLog: log };
            const mine = log.filter((l) => l.ref === t.id && !l.sample).slice(-5);
            if (mine.length >= 3 && it.ver !== 'min') { const avg = mine.reduce((a, l) => a + l.actual, 0) / mine.length, r = avg / t.dur;
              if (r > 1.2 || r < 0.8) { const nd = clamp(Math.round(avg / 5) * 5, 5, 300); n = { ...n, tasks: n.tasks.map((y) => (y.id === t.id ? { ...y, dur: nd } : y)), durNotes: [...(n.durNotes || []), { title: t.title, from: t.dur, to: nd, day: x.day }].slice(-20) }; } }
          }
        }
        n = keep(earn(n, v, `${itemTitle(x, it)}${it.ver === 'min' ? ' (mínimo)' : ''}`));
        if (x.today.stuck) n = badge(n, 'travada');
        if (it.ver === 'min') n = badge(n, 'minimo');
        if (Object.values(n.keptDays || {}).filter((k) => k === 'feito').length >= 7) n = badge(n, 'semana');
        return n;
      });
      if (tm && tm.key === it.id) setTm(null);
      notify(it.ver === 'min' ? 'Mínimo feito: conta como dia cumprido.' : 'Feito. Isso conta para a ofensiva.');
    },
    toggleDone: (it) => {
      if (it.status !== 'feito') { act.done(it); return; }
      up((x) => {
        let n = setItems(x, (items) => items.map((y) => (y.id === it.id ? { ...y, status: 'pendente' } : y)));
        if (it.kind === 'cycle') n = { ...n, cycles: n.cycles.map((c) => (c.id === it.ref ? { ...c, last: c.last === x.day ? (it.prevLast ?? x.day - c.every) : c.last } : c)) };
        if (it.kind === 'task') n = { ...n, tasks: n.tasks.map((t) => (t.id === it.ref ? { ...t, done: false } : t)) };
        if (it.kind === 'project') n = { ...n, projects: n.projects.map((pj) => (pj.id === it.ref ? { ...pj, doneMin: Math.max(0, pj.doneMin - it.dur) } : pj)) };
        const anyDone = n.plan.items.some((y) => y.status === 'feito' && y.day === x.day) || Object.keys(n.attended).length;
        if (!anyDone && n.keptDays[x.day] === 'feito') { const kd = { ...n.keptDays }; delete kd[x.day]; n = restreak({ ...n, keptDays: kd }); }
        return n;
      });
      notify('Voltou para pendente.');
    },
    duplicate: (key, id) => up((x) => { const o = x[key].find((y) => y.id === id); if (!o) return x; return adapt({ ...x, [key]: [...x[key], { ...o, id: uid(), title: `${o.title} (cópia)` }] }, `com a cópia de “${o.title}”`); }),
    travou: (it) => {
      const t = it.kind !== 'cycle' ? refOf(s, it) : null;
      up((x) => ({ ...x, today: { ...x.today, stuck: true }, outcomes: [...(x.outcomes || []), { day: x.day, wd: weekdayOf(x.day), ref: it.ref, load: it.load, start: it.start, result: 'travou' }].slice(-300) }));
      if (t && it.ver === 'normal' && t.min < t.dur) {
        up((x) => setItems(x, (items) => items.map((y) => (y.id === it.id ? { ...y, ver: 'min', dur: t.min, why: 'Trocado pela versão mínima: começar pequeno também conta.' } : y))));
        notify(`Tudo bem. Então só: ${t.minText.toLowerCase()}.`); return;
      }
      up((x) => {
        const ctx = makeCtx(x, x.plan.days);
        x.plan.items.forEach((y) => { if (y.id !== it.id && y.status !== 'backlog' && ctx[y.day]) occupy(ctx[y.day], y); });
        const moved = moveFuture(x, ctx, it, t, it.kind === 'cycle' ? refOf(x, it) : null, modeOf(x, energyOf(x)));
        return setItems(x, (items) => items.map((y) => (y.id === it.id ? { ...moved, why: moved.status === 'backlog' ? moved.why : `Travou ${DIAS_LONGO[weekdayOf(x.day)]}: veio para um dia mais tranquilo.` } : y)));
      });
      if (tm && tm.key === it.id) setTm(null);
      notify('Mandei para outro dia, sem culpa. Vamos para o próximo.');
    },
    reajustar: () => { up((x) => reajustar(x)); notify('Dia reajustado.'); },
    quickCheck: (k) => {
      up((x) => {
        const g = sleepHours(x.sleepGoal.bed, x.sleepGoal.wake), lose = k === 'bem' ? 0 : k === 'medio' ? 90 : 180;
        const bed = hhmm((toMin(x.sleepGoal.bed) + lose) % 1440);
        const x1 = { ...x, today: { ...x.today, bed, wake: x.sleepGoal.wake, quick: k } };
        const h = sleepHours(bed, x.sleepGoal.wake), e2 = energyOf(x1);
        const history = [...x.history.filter((r) => r.day !== x.day), { day: x.day, bed, wake: x.sleepGoal.wake, sleep: Math.round(h * 100) / 100, trip: e2.real, quick: true }].slice(-60);
        let n = { ...x1, history, today: { ...x1.today, checkedIn: true } };
        const m = modeOf(n, e2); if (m === 'puxado' || m === 'recuperacao') n = reajustar(n);
        return n;
      });
      notify(k === 'bem' ? 'Ótimo. Bora de dia normal.' : k === 'medio' ? 'Anotado. Vou com calma no que é pesado.' : 'Anotado. Já aliviei o seu dia.');
    },
    skipCheck: () => { up((x) => ({ ...x, today: { ...x.today, skipCheck: true } })); notify('Sem problema. Uso a sua meta de sono como estimativa.'); },
    pulse: (k, social) => {
      let res = null;
      up((x) => {
        const delta = { bem: 5, cansada: -15, esgotada: -30, sobrecarga: -20 }[k];
        const before = modeOf(x, energyOf(x));
        let n = { ...x, today: { ...x.today, calib: clamp(((x.today.calib) || 0) + delta - ((x.today.pulse && x.today.pulse.delta) || 0), -40, 20), pulse: { kind: k, at: nowRef(x), delta }, socialAdj: k === 'sobrecarga' && !social ? clamp(((x.today.socialAdj) || 0) - 25, -100, 100) : x.today.socialAdj, checkedIn: x.today.checkedIn || x.today.skipCheck } };
        const after = modeOf(n, energyOf(n));
        if (k !== 'bem' && (after === 'puxado' || after === 'recuperacao' || social || k === 'sobrecarga')) { n = reajustar(n); res = 'aliviado'; }
        else res = after !== before ? 'mudou' : 'ok';
        return n;
      });
      setTimeout(() => notify(res === 'aliviado' ? 'Entendido. Aliviei o resto do seu dia.' : k === 'bem' ? 'Que bom! Sigo com o plano.' : 'Anotado. Energia atualizada.'), 0);
    },
    welcomeSeen: () => up((x) => badge({ ...x, welcome: null }, 'voltei')),
    mood: (p) => {
      const was = ((s.moods || {})[s.day] || {}).sens;
      up((x) => { const moods = { ...(x.moods || {}), [x.day]: { ...((x.moods || {})[x.day] || {}), ...p } }; let n = { ...x, moods }; if (Object.keys(moods).length >= 3) n = badge(n, 'humor'); return n; });
      if (p.sens === 'sobrecarga' && was !== 'sobrecarga') act.pulse('sobrecarga'); else notify('Anotado.');
    },
    setRoutine: (rid, p) => up((x) => adapt({ ...x, routines: { ...x.routines, [rid]: { ...x.routines[rid], ...p } } }, `com a ${x.routines[rid].title.toLowerCase()} atualizada`)),
    routineFinish: (rid, min) => {
      up((x) => {
        let n = x; const it = x.plan.items.find((y) => y.day === x.day && y.kind === 'routine' && y.ref === rid && y.status === 'pendente');
        const r = x.routines[rid], dur = routineDur(r, min) || 5;
        if (it) n = keep(setItems(n, (items) => items.map((y) => (y.id === it.id ? { ...y, status: 'feito', ver: min ? 'min' : 'normal' } : y))));
        else if (!x.plan.items.some((y) => y.day === x.day && y.kind === 'routine' && y.ref === rid && y.status === 'feito')) n = keep(setItems(n, (items) => [...items, { id: uid(), kind: 'routine', ref: rid, day: x.day, start: Math.max(0, Math.min(1439 - dur, nowRef(x) - dur)), dur, ver: min ? 'min' : 'normal', prio: 'media', load: 'leve', status: 'feito', why: 'Feita fora do horário planejado, e conta igual.' }]));
        return badge(n, 'rotina');
      });
      notify(min ? 'Rotina no essencial feita. Isso conta.' : 'Rotina feita. Isso é cuidar de você.');
    },
    missionTick: (k) => up((x) => { const d = { ...((x.missions || {})[x.day] || {}) }; d[k] = !d[k]; return { ...x, missions: { ...(x.missions || {}), [x.day]: d } }; }),
    missionsFull: () => up((x) => { const d = (x.missions || {})[x.day] || {}; if (d.full) return x; return badge({ ...x, missions: { ...(x.missions || {}), [x.day]: { ...d, full: true } } }, 'missoes'); }),
    addVacation: (v) => { up((x) => protectVac(adapt({ ...x, vacations: [...(x.vacations || []), { id: uid(), keepCare: true, keepRoutines: false, ...v }] }, `com ${v.label.toLowerCase()} de ${fmtCurto(v.start)}${v.end != null ? ' a ' + fmtCurto(v.end) : ''}`))); notify(`${v.label}: rotina em pausa${v.end != null ? ' até ' + fmtCurto(v.end) : ''}. Ofensiva protegida.`); },
    endVacation: (id) => { up((x) => { const vs = (x.vacations || []).map((v) => (v.id === id ? (v.start >= x.day ? null : { ...v, end: x.day - 1 }) : v)).filter(Boolean); return adapt({ ...x, vacations: vs }, 'com a volta à rotina'); }); notify('Bem-vinda de volta. Distribuí a semana com calma, sem jogar tudo para hoje.'); },
    removeVacation: (id) => { up((x) => adapt({ ...x, vacations: (x.vacations || []).filter((v) => v.id !== id) }, 'sem essa pausa')); notify('Pausa removida.'); },
    windTick: (o) => up((x) => ({ ...x, today: { ...x.today, wind: o } })),
    badgeSeen: () => up((x) => ({ ...x, newBadge: null })),
    markStuck: () => up((x) => ({ ...x, today: { ...x.today, stuck: true } })),
    welcomeClean: () => {
      up((x) => badge(adapt({ ...x, welcome: null, plan: { ...x.plan, items: x.plan.items.map((it) => (it.day < x.day && it.status === 'pendente' ? { ...it, status: 'removido', archived: true } : it)) } }, 'do zero, a partir de hoje'), 'voltei'));
      notify('Pronto. O que passou foi arquivado. A semana começa de hoje.');
    },
    distribuir: () => { up((x) => adapt({ ...x, plan: { ...x.plan, items: x.plan.items.map((y) => { const r = y.kind === 'task' && x.tasks.find((t) => t.id === y.ref); return r && r.event ? y : { ...y, locked: false }; }) } }, 'do zero, a seu pedido (compromissos com hora ficaram onde estão)')); notify('Semana distribuída do zero.'); },
    survival: () => {
      up((x) => {
        const on = !x.today.survival;
        let n = { ...x, today: { ...x.today, survival: on } };
        if (on) n = badge(n, 'sobrevivencia');
        if (on) { n = reajustar(n); if (n.streak.keptDay < n.day) n = { ...n, streak: { ...n.streak, keptDay: n.day }, keptDays: { ...n.keptDays, [n.day]: n.keptDays[n.day] || 'protegido' } }; }
        return n;
      });
      notify(s.today.survival ? 'Modo sobrevivência desligado.' : 'Ofensiva protegida. Hoje é só o essencial.');
    },
    attend: (f) => { up((x) => keep(earn({ ...x, attended: { ...x.attended, [f.id]: true } }, 15, `Presença: ${f.title}`))); notify('Presença registrada.'); },
    toggleVer: (it) => up((x) => { const t = refOf(x, it); if (!t) return x; const ver = it.ver === 'min' ? 'normal' : 'min'; return setItems(x, (items) => items.map((y) => (y.id === it.id ? { ...y, ver, dur: ver === 'min' ? t.min : t.dur } : y))); }),
    moveTo: (it, day) => {
      up((x) => {
        const ctx = makeCtx(x, x.plan.days);
        x.plan.items.forEach((y) => { if (y.id !== it.id && ctx[y.day] && (y.locked || y.status === 'feito' || y.day < x.day)) occupy(ctx[y.day], y); });
        const t = it.kind !== 'cycle' ? refOf(x, it) : null;
        const st = findSlot(x, ctx[day], it.dur, t && t.load === 'pesada' ? 'foco' : 'leve') ?? findSlot(x, ctx[day], t ? t.min : it.dur, 'leve');
        if (st == null) { setTimeout(() => notify('Esse dia não tem espaço livre nem para o mínimo.'), 0); return x; }
        const dur = findSlot(x, ctx[day], it.dur, 'leve') != null ? it.dur : (t ? t.min : it.dur);
        const n = setItems(x, (items) => items.map((y) => (y.id === it.id ? { ...y, day, start: st, dur, ver: t && dur === t.min && dur < t.dur ? 'min' : y.ver, inTrip: null, locked: true, why: `Você colocou em ${DIAS_LONGO[weekdayOf(day)]}.` } : y)));
        return adapt(n, `porque você moveu ${itemTitle(x, it).toLowerCase()} para ${DIAS_LONGO[weekdayOf(day)]}`);
      });
      notify('Movido. Reorganizei o resto da semana.');
    },
    editItem: (it, patch) => {
      up((x) => adapt(setItems(x, (items) => items.map((y) => (y.id === it.id ? { ...y, ...patch, inTrip: null, locked: true, why: 'Ajustado por você.' } : y))), `em volta da mudança em ${itemTitle(x, it).toLowerCase()}`));
    },
    unlock: (it) => { up((x) => adapt(setItems(x, (items) => items.map((y) => (y.id === it.id ? { ...y, locked: false } : y))), `porque você liberou ${itemTitle(x, it).toLowerCase()}`)); notify('O Lume decide de novo esse bloco.'); },
    removeItem: (it) => { up((x) => adapt(setItems(x, (items) => (it.status === 'backlog' ? items.filter((y) => y.id !== it.id) : items.map((y) => (y.id === it.id ? { ...y, status: 'removido' } : y)))), `sem ${itemTitle(x, it).toLowerCase()} em ${DIAS_LONGO[weekdayOf(it.day)]}`)); notify('Tirado deste dia. Ajustei o resto.'); },
    addToDay: (day, kind, ref) => {
      up((x) => {
        const r = (kind === 'task' ? x.tasks : x.cycles).find((y) => y.id === ref); if (!r) return x;
        const ctx = makeCtx(x, x.plan.days);
        x.plan.items.forEach((y) => { if (ctx[y.day] && y.status !== 'removido' && (y.locked || y.status === 'feito' || y.day < x.day)) occupy(ctx[y.day], y); });
        const it0 = kind === 'task' ? placeTask(x, ctx, r, day, { why: `Você adicionou em ${DIAS_LONGO[weekdayOf(day)]}.` }) : (() => { const st = findSlot(x, ctx[day], r.dur, 'leve'); return st == null ? null : { id: uid(), kind: 'cycle', ref: r.id, day, start: st, dur: r.dur, ver: 'normal', prio: 'media', load: 'leve', status: 'pendente', why: `Você adicionou em ${DIAS_LONGO[weekdayOf(day)]}.` }; })();
        if (!it0) { setTimeout(() => notify('Não coube neste dia.'), 0); return x; }
        return adapt(setItems(x, (items) => [...items, { ...it0, locked: true }]), `porque você adicionou ${r.title.toLowerCase()} em ${DIAS_LONGO[weekdayOf(day)]}`);
      });
      notify('Adicionado. Reorganizei o resto.');
    },
    undoAdapt: () => { up((x) => (x.adaptNote && x.adaptNote.prev ? { ...x, plan: x.adaptNote.prev, adaptNote: null } : x)); notify('Desfeito.'); },
    dismissAdapt: () => up((x) => ({ ...x, adaptNote: null })),
    cycleToday: (c) => {
      up((x) => keep(earn({ ...setItems(x, (items) => items.map((y) => (y.kind === 'cycle' && y.ref === c.id && y.day === x.day ? { ...y, status: 'feito' } : y))), cycles: x.cycles.map((y) => (y.id === c.id ? { ...y, last: x.day } : y)) }, 3, c.title)));
      notify('Feito. Contador zerado.');
    },
    saveEntity: (key, val) => up((x) => {
      const list = x[key] || [];
      const nv = val.id === 'new' ? [...list, { ...val, id: uid() }] : list.map((y) => (y.id === val.id ? { ...val } : y));
      return adapt({ ...x, [key]: nv }, val.id === 'new' ? `com “${val.title}”` : `com a mudança em “${val.title}”`);
    }),
    deleteEntity: (key, id) => up((x) => { const o = x[key].find((y) => y.id === id); return adapt({ ...x, [key]: x[key].filter((y) => y.id !== id), plan: { ...x.plan, items: x.plan.items.filter((it) => it.ref !== id) } }, `sem “${o ? o.title : 'item'}”`); }),
    setGoal: (p) => up((x) => adapt({ ...x, sleepGoal: { ...x.sleepGoal, ...p } }, 'com a nova meta de sono')),
    addEvent: (ev) => {
      if (ev.recurring) {
        up((x) => adapt({ ...x, fixed: [...x.fixed, { id: uid(), type: 'compromisso', title: ev.title.trim(), days: [...ev.days].sort(), start: ev.start, end: ev.end }] }, `com “${ev.title.trim()}” nos horários fixos`));
        notify(`“${ev.title.trim()}” entrou nos horários fixos.`); return;
      }
      up((x) => {
        const a = toMin(ev.start), b = toMin(ev.end), dur = b - a, t = semAcento(ev.title);
        const task = { id: uid(), title: ev.title.trim(), cat: /ingles|idioma|espanhol/.test(t) ? 'Idioma' : /aula|prova|facul|curso|monitoria/.test(t) ? 'Faculdade' : /medic|dentista|consulta|terapia|exame/.test(t) ? 'Saúde' : 'Pessoal',
          prio: 'alta', load: /prova|entrevista|apresentacao/.test(t) ? 'pesada' : 'media', dur, min: dur, minText: 'Ir, mesmo sem render muito', freq: 0, where: 'qualquer', due: ev.day, event: { start: ev.start, end: ev.end } };
        const item = { id: uid(), kind: 'task', ref: task.id, day: ev.day, start: a, dur, ver: 'normal', prio: 'alta', load: task.load, status: 'pendente', locked: true, why: 'Compromisso com hora marcada: fica fixo aqui.' };
        const x2 = { ...x, tasks: [...x.tasks, task] };
        return adapt(setItems(x2, (items) => [...items, item]), `com “${task.title}” às ${ev.start}`);
      });
      notify(`“${ev.title.trim()}” marcado ${ev.day === s.day ? 'hoje' : fmtCurto(ev.day)} às ${ev.start}.`);
    },
    addTaskSmart: (task) => {
      up((x) => { const t = { ...task, id: uid() }; const x2 = { ...x, tasks: [...x.tasks, t] }; return { ...x2, plan: { ...x2.plan, items: [...x2.plan.items, ...placeNew(x2, t)] } }; });
      notify(`“${task.title}” entrou na sua rotina.`);
    },
    fitNow: (p) => {
      up((x) => {
        const st = Math.ceil(nowRef(x) / 5) * 5;
        if (p.itemId) return setItems(x, (items) => items.map((y) => { if (y.id !== p.itemId) return y; const r = refOf(x, y); const ver = p.ver || y.ver; return { ...y, day: x.day, start: st, inTrip: null, ver, dur: y.kind === 'task' && r ? (ver === 'min' ? r.min : r.dur) : y.dur, why: 'Você pediu para fazer agora: encaixado pelo Lume.' }; }));
        const c = x.cycles.find((y) => y.id === p.cycleId); if (!c) return x;
        return setItems(x, (items) => [...items, { id: uid(), kind: 'cycle', ref: c.id, day: x.day, start: st, dur: c.dur, ver: 'normal', prio: 'media', load: 'leve', status: 'pendente', why: 'Você pediu para fazer agora: encaixado pelo Lume.' }]);
      });
      notify('Encaixado agora. Está na tela Agora.'); setTab('agora');
    },
    placeAt: (p) => {
      up((x) => {
        const ex = x.plan.items.find((y) => y.kind === p.kind && y.ref === p.ref && y.status === 'pendente' && y.day >= x.day);
        const why = 'Horário sugerido pelo Lume.';
        if (ex) return adapt(setItems(x, (items) => items.map((y) => (y.id === ex.id ? { ...y, day: p.day, start: p.start, dur: p.dur, inTrip: null, locked: true, why } : y))), 'com o horário sugerido pelo Lume');
        const r = (p.kind === 'task' ? x.tasks : x.cycles).find((y) => y.id === p.ref);
        return adapt(setItems(x, (items) => [...items, { id: uid(), kind: p.kind, ref: p.ref, day: p.day, start: p.start, dur: p.dur, ver: 'normal', prio: p.kind === 'task' ? r.prio : 'media', load: p.kind === 'task' ? r.load : 'leve', status: 'pendente', locked: true, why }]), 'com o horário sugerido pelo Lume');
      });
      notify('Encaixado na sua semana.');
    },
    logFixed: (day, id, entry, o = {}) => {
      up((x) => {
        const lg = { ...(x.fixedLog || {}) }, dl = { ...(lg[day] || {}) }, fx = fixedPlan(x, day), f = fx.find((y) => y.id === id);
        if (!f) return x;
        if (entry) dl[id] = entry; else delete dl[id];
        const trips = fx.filter((t) => t.type === 'trajeto' && (t.of ? t.of === id : f.type === 'trabalho'));
        if ((f.type === 'trabalho' || f.type === 'compromisso') && o.trips) trips.forEach((t) => { if (entry && entry.st === 'nao') dl[t.id] = { st: 'nao' }; else if (dl[t.id] && dl[t.id].st === 'nao') delete dl[t.id]; });
        if (f.type === 'trabalho' && o.moveTrips && entry && entry.start) {
          const ida = trips.filter((t) => t.e <= f.s + 5).pop(), volta = trips.find((t) => t.s >= f.e - 5);
          const nw = day === x.day ? nowRef(x) : null;
          if (ida) { const du = ida.e - ida.s, e = toMin(entry.start) - (f.s - ida.e); const before = nw != null && nw < ida.s; const s0 = before ? Math.max(nw, e - du) : e - du; dl[ida.id] = { st: 'foi', start: hhmm(s0), end: hhmm(Math.max(e, s0 + 5)) }; }
          if (volta) { const du = volta.e - volta.s, st = toMin(entry.end) + (volta.s - f.e); dl[volta.id] = { st: 'foi', start: hhmm(st), end: hhmm(st + du), ...(entry.aindaLa ? { aindaLa: true } : {}) }; }
        }
        lg[day] = dl;
        const nx = { ...x, fixedLog: lg };
        return entry && entry.st === 'foi' && !entry.start && !o.trips ? nx : adapt(nx, `com ${f.title.toLowerCase()} de ${fmtCurto(day)} atualizado`);
      });
      notify(!entry ? 'Voltou ao horário previsto.' : entry.st === 'nao' ? 'Anotado. Usei o tempo livre para replanejar.' : entry.start ? 'Horário real anotado. Ajustei o resto.' : 'Confirmado.');
    },
    review: (k) => { up((x) => ({ ...x, reviews: { ...x.reviews, [x.day]: k } })); notify(k === 'dificil' ? 'Anotado. Amanhã eu começo mais leve.' : k === 'rendeu' ? 'Que bom! Anotado.' : 'Mínimo também conta. Anotado.'); },
    pauseDone: () => up((x) => badge({ ...x, today: { ...x.today, pause: false } }, 'pausa')),
    water: (ml) => (haptic(ml > 0 ? 10 : 0), up((x) => ({ ...x, waterMl: { ...(x.waterMl || {}), [x.day]: clamp(((x.waterMl || {})[x.day] || 0) + ml, 0, 8000) } }))),
    med: (id) => up((x) => { const t = { ...(x.medsTaken[x.day] || {}) }; t[id] = !t[id]; const meds = x.careCfg.meds.map((m) => (m.id === id && m.stock != null ? { ...m, stock: Math.max(0, m.stock + (t[id] ? -(m.dose || 1) : (m.dose || 1))) } : m)); return { ...x, medsTaken: { ...x.medsTaken, [x.day]: t }, careCfg: { ...x.careCfg, meds } }; }),
    markStart: (it) => up((x) => (x.today.startedAt && x.today.startedAt[it.id] ? x : { ...x, today: { ...x.today, startedAt: { ...(x.today.startedAt || {}), [it.id]: { ms: Date.now(), min: nowRef(x) } } } })),
    saveFirstStep: (id, txt) => { up((x) => ({ ...x, tasks: x.tasks.map((t) => (t.id === id ? { ...t, firstStep: txt.trim() } : t)) })); notify('Primeiro passo salvo para as próximas vezes.'); },
    hyperOk: (it) => up((x) => ({ ...x, today: { ...x.today, hyperOk: { ...(x.today.hyperOk || {}), [it.id]: Date.now() + 20 * 60000 } } })),
    hyperPause: (it) => { up((x) => badge({ ...x, today: { ...x.today, pause: true, hyperOk: { ...(x.today.hyperOk || {}), [it.id]: Date.now() + 25 * 60000 } } }, 'pausa')); notify('Pausa: água, comer algo, levantar. Eu te espero.'); },
    leaveTick: (k) => up((x) => { const d = { ...(x.leaveCheck[x.day] || {}) }; d[k] = !d[k]; return { ...x, leaveCheck: { ...x.leaveCheck, [x.day]: d } }; }),
    setLeave: (items) => up((x) => ({ ...x, leaveCfg: { ...x.leaveCfg, items } })),
    meal: (id) => up((x) => { const d = { ...(x.mealsDone[x.day] || {}) }; d[id] = !d[id]; return { ...x, mealsDone: { ...x.mealsDone, [x.day]: d } }; }),
    mealSnooze: (id) => up((x) => ({ ...x, today: { ...x.today, mealSnooze: { ...(x.today.mealSnooze || {}), [id]: nowRef(x) + 30 } } })),
    social: (d) => { up((x) => ({ ...x, today: { ...x.today, socialAdj: clamp(((x.today.socialAdj) || 0) + d, -100, 100) } })); notify(d < 0 ? 'Anotado. Vou pegar mais leve com você.' : 'Que bom que recarregou.'); },
    setSocialCfg: (p) => up((x) => ({ ...x, socialCfg: { ...x.socialCfg, ...p } })),
    emptyEvening: () => {
      let moved = 0;
      up((x) => {
        const ctx = makeCtx(x, x.plan.days); x.plan.items.forEach((it) => { if (it.status !== 'backlog' && ctx[it.day] && !(it.day === x.day && it.status === 'pendente' && it.start >= 1080)) occupy(ctx[it.day], it); });
        const mode = modeOf(x, energyOf(x));
        const items = x.plan.items.map((it) => {
          if (it.day !== x.day || it.status !== 'pendente' || it.start < 1080) return it;
          const task = it.kind !== 'cycle' ? refOf(x, it) : null, cy = it.kind === 'cycle' ? x.cycles.find((c) => c.id === it.ref) : null;
          if ((task && (task.event || it.prio === 'alta')) || (cy && cy.every <= 1)) return it;
          moved++; return moveFuture(x, ctx, it, task, cy, mode);
        });
        return { ...x, plan: { ...x.plan, items } };
      });
      notify('Noite esvaziada: ficou só o essencial.');
    },
    inboxAdd: (lines) => { up((x) => ({ ...x, inbox: [...x.inbox, ...lines.map((t) => ({ id: uid(), text: t, at: Date.now() }))] })); notify(lines.length > 1 ? `${lines.length} coisas na caixa. Organize quando der.` : 'Na caixa. Organize quando der.'); },
    inboxDrop: (id) => up((x) => { const n = { ...x, inbox: x.inbox.filter((i) => i.id !== id) }; return n.inbox.length === 0 ? badge(n, 'caixa') : n; }),
    inboxAccept: (id, sug) => { if (sug.kind === 'event') act.addEvent(sug.draft); else act.addTaskSmart(sug.draft); up((x) => { const n = { ...x, inbox: x.inbox.filter((i) => i.id !== id) }; return n.inbox.length === 0 ? badge(n, 'caixa') : n; }); },
    inboxAcceptAll: (pairs) => { pairs.forEach(([id, sug]) => act.inboxAccept(id, sug)); },
    newsSeen: () => up((x) => ({ ...x, dayNews: null })),
    compAck: () => setComp((c) => (c ? { ...c, acked: Math.floor((Date.now() - c.start) / (c.every * 60000)) } : c)),
    setDur: (id, d) => { up((x) => { const t = x.tasks.find((y) => y.id === id); return adapt({ ...x, tasks: x.tasks.map((y) => (y.id === id ? { ...y, dur: d } : y)), durNotes: [...(x.durNotes || []), { title: t.title, from: t.dur, to: d, day: x.day }] }, `com a nova duração de “${t.title}”`); }); notify('Duração ajustada.'); },
    setSem: (p) => up((x) => adapt({ ...x, semester: { ...x.semester, ...p } }, 'com as datas do semestre')),
    addHolidays: (y) => { up((x) => { const have = new Set(x.semester.holidays.map((h) => h.date)); const add = feriadosBR(y).filter((h) => !have.has(h.date)); return adapt({ ...x, semester: { ...x.semester, holidays: [...x.semester.holidays, ...add] } }, `com os feriados de ${y}`); }); notify(`Feriados nacionais de ${y} adicionados.`); },
    addHoliday: (h) => { up((x) => adapt({ ...x, semester: { ...x.semester, holidays: [...x.semester.holidays.filter((y) => y.date !== h.date), { ...h, id: uid() }] } }, `com ${h.label.toLowerCase()} em ${fmtCurto(h.date)}`)); notify(`${h.label} em ${fmtCurto(h.date)}: semana replanejada.`); },
    delHoliday: (id) => up((x) => adapt({ ...x, semester: { ...x.semester, holidays: x.semester.holidays.filter((h) => h.id !== id) } }, 'sem esse feriado')),
    setUi: (p) => up((x) => ({ ...x, ui: { ...x.ui, ...p } })),
    setAi: (p) => { up((x) => ({ ...x, ai: { ...(x.ai || {}), ...p } })); notify(p.on ? 'IA ligada. Pode conversar com o Lume.' : 'IA desligada.'); },
    importData: (d) => { setS(migrate(rollover(migrate(d)))); notify('Backup restaurado.'); },
    setCfg: (p) => up((x) => adapt({ ...x, ...p }, 'com o novo tempo de transição')),
    setCare: (p) => up((x) => ({ ...x, careCfg: { ...x.careCfg, ...p } })),
    setCycle: (p) => up((x) => ({ ...x, cycleCfg: { ...x.cycleCfg, ...p } })),
    exitDemo: () => { setAcctOpen(false); try { localStorage.removeItem(KEY); localStorage.removeItem('qd-local-at'); } catch (e) {} onRestart && onRestart(); },
    logout: async () => { setAcctOpen(false); await Cloud.logout(sRef.current); try { if ('serviceWorker' in navigator) { const reg = await navigator.serviceWorker.getRegistration(); if (reg) (await reg.getNotifications()).forEach((n) => n.close()); } } catch (e) {} try { sessionStorage.setItem('qd-msg', 'Você saiu da conta. Seus dados continuam salvos nela e foram apagados deste aparelho.'); } catch (e) {} onRestart && onRestart(); },
    deleteAccount: async () => { const r = await Cloud.deleteAccount(); setAcctOpen(false); try { sessionStorage.setItem('qd-msg', r && r.login_deleted ? 'Conta excluída. Todos os seus dados foram apagados.' : 'Dados do QuestDay apagados. O login continua existindo porque também é usado no Fluxo Previsto.'); } catch (e) {} onRestart && onRestart(); },
    openAccount: () => setAcctOpen(true),
    swipeDone: (it) => { if (it.status !== 'pendente') return; act.done(it); setToast({ m: `Feito: ${itemTitle(sRef.current, it)}`, id: Date.now(), undo: () => { const cur = sRef.current.plan.items.find((y) => y.id === it.id); if (cur && cur.status === 'feito') act.toggleDone(cur); } }); },
    resetAll: async () => {
      if (Cloud.user) await Cloud.resetData();
      try { localStorage.removeItem(KEY); localStorage.removeItem('qd-notif'); localStorage.removeItem('qd-local-at'); sessionStorage.setItem('qd-msg', Cloud.user ? 'Pronto, começando do zero. A versão anterior ficou guardada em Conta e aparelhos → Versões anteriores.' : 'Pronto, começando do zero.'); } catch (e) {}
      setAcctOpen(false); onRestart && onRestart();
    },
    toast: (m) => notify(m),
    loadRemote: (d, msg) => { if (!d || d.v !== 4) return; setTm(null); setS(fromSaved(d)); notify(msg || 'Trouxe seus dados da nuvem.'); },
    cloudLogin: async () => { const demo = !!sRef.current.demo; const r = await Cloud.reconcile(demo ? null : sRef.current); if (demo && !(r.use === 'remote' && r.data && r.data.v === 4)) { setAcctOpen(false); try { localStorage.removeItem(KEY); } catch (e) {} onRestart && onRestart(); return; } if (r.use === 'remote' && r.data && r.data.v === 4) { setTm(null); setS(fromSaved(r.data)); notify('Pronto: trouxe seus dados da nuvem.'); } else notify('Conta conectada. Seus dados agora ficam salvos na nuvem.'); },
    importDated: (evs, why) => {
      const x0 = sRef.current, have = new Set(x0.tasks.filter((t) => t.gcal).map((t) => t.gcal)), add = [];
      evs.forEach((e) => {
        if (have.has(e.id) || e.day < x0.day) return; have.add(e.id);
        const dur = Math.max(5, e.end - e.start), t = semAcento(e.title);
        const task = { id: uid(), gcal: e.id, title: e.title.trim(), cat: /aula|prova|facul|curso/.test(t) ? 'Faculdade' : /medic|dentista|consulta|terapia|exame/.test(t) ? 'Saúde' : 'Pessoal', prio: 'alta', load: /prova|entrevista|apresentacao/.test(t) ? 'pesada' : 'media', dur, min: dur, minText: 'Ir, mesmo sem render muito', freq: 0, where: 'qualquer', due: e.day, event: { start: hhmm(e.start), end: hhmm(e.end) } };
        add.push({ task, item: { id: uid(), kind: 'task', ref: task.id, day: e.day, start: e.start, dur, ver: 'normal', prio: 'alta', load: task.load, status: 'pendente', locked: true, why } });
      });
      if (add.length) up((x) => adapt(setItems({ ...x, tasks: [...x.tasks, ...add.map((z) => z.task)] }, (items) => [...items, ...add.map((z) => z.item)]), `com ${add.length} compromisso${add.length > 1 ? 's' : ''} importado${add.length > 1 ? 's' : ''}`));
      return add.length;
    },
    importIcsFile: (txt) => {
      const x0 = sRef.current, r = icsToQuestDay(txt, x0.day);
      const haveF = new Set(x0.fixed.filter((f) => f.ics).map((f) => f.ics)), weekly = r.weekly.filter((f) => !haveF.has(f.ics));
      if (weekly.length) up((x) => adapt({ ...x, fixed: [...x.fixed, ...weekly] }, `com ${weekly.length} horário${weekly.length > 1 ? 's' : ''} do calendário`));
      const once = act.importDated(r.once, 'Compromisso do seu calendário (.ics): fica fixo aqui.');
      return { weekly: weekly.length, once, dupes: r.weekly.length - weekly.length + (r.once.length - once), skipped: r.skipped, total: r.total };
    },
    importGcal: (evs) => act.importDated(evs.map((e) => ({ id: e.id, title: e.title, day: dayOfDate(e.start), start: minOfDate(e.start), end: e.end - e.start >= DAYMS || minOfDate(e.end) <= minOfDate(e.start) ? Math.min(1439, minOfDate(e.start) + 60) : minOfDate(e.end) })), 'Compromisso da sua Google Agenda: fica fixo aqui.'),
    setNotif: (p) => up((x) => ({ ...x, notif: { ...notifCfg(x), ...p } })),
    setNotify: (v) => up((x) => ({ ...x, notify: !!v })),
    testNotif: () => fireNotif({ id: `teste-${Date.now()}`, title: 'Teste do QuestDay', body: 'Assim chegam os seus avisos. Pode ficar tranquila.', kind: 'teste' }, true),
    notifAction: (id, action) => {
      const x = sRef.current, r = notifRef(x, id); setNtoast(null);
      if (action === 'snooze') { setNst((v) => { const n = { ...v, snooze: [...v.snooze.filter((z) => z.id !== id), { id: String(id).replace(/:s\d+$/, ''), until: Date.now() + 10 * 60000, k: (v.snooze.filter((z) => z.id === id).length || 0) + 1 }] }; nSave(n); return n; }); notify('Combinado: aviso de novo em 10 min.'); return; }
      if (!r) return;
      if (action === 'start' && r.type === 'item') { act.markStart(r.it); setTab('agora'); return; }
      if (action === 'done') {
        if (r.type === 'item' && r.it.status === 'pendente') act.done(r.it);
        else if (r.type === 'med' && r.day === x.day && !(x.medsTaken[x.day] || {})[r.id]) act.med(r.id);
        else if (r.type === 'meal' && r.day === x.day && !(x.mealsDone[x.day] || {})[r.id]) act.meal(r.id);
        else if (r.type === 'water') act.water(250);
      }
    },
    askNotify: async () => {
      if (typeof Notification === 'undefined') { notify('Este navegador não mostra notificações. Os avisos aparecem dentro do app.'); return; }
      const r = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
      up((x) => ({ ...x, notify: r === 'granted' }));
      notify(r === 'granted' ? 'Notificações ativadas.' : r === 'denied' ? 'Estão bloqueadas no navegador. Libere no cadeado ao lado do endereço.' : 'Tudo bem, os avisos aparecem dentro do app.');
    },
    importIcs: (txt) => { const r = act.importIcsFile(txt); const n = r.weekly + r.once; notify(n ? `Importei ${r.weekly ? `${r.weekly} horário${r.weekly > 1 ? 's' : ''} semana${r.weekly > 1 ? 'is' : 'l'}` : ''}${r.weekly && r.once ? ' e ' : ''}${r.once ? `${r.once} compromisso${r.once > 1 ? 's' : ''} com data` : ''}.` : r.total ? 'Nada novo nesse arquivo: os eventos já estavam aqui, já passaram ou são de dia inteiro.' : 'Não achei eventos nesse arquivo.'); },
    nextDay: () => { setTm(null); up((x) => rollover({ ...x, offset: (x.offset || 0) + 1 })); notify('Novo dia. Comece pelo check-in.'); setTab('agora'); },
    reset: () => { setTm(null); setS(freshSeed()); notify('Dados de exemplo restaurados.'); },
    restartOnb: () => onRestart && onRestart(),
    cleanStart: () => { setS((x) => cleanSample(x)); notify('Pronto: sem dados de exemplo. O Lume aprende só com você a partir de agora.'); },
  };
  // Dispara um aviso: histórico do dia, toast com ações no app e, se permitido e o app não estiver na tela, notificação do aparelho.
  const fireNotif = async (n, force) => {
    const x = sRef.current, c = notifCfg(x), low = !!(x.ui && x.ui.lowStim), t = new Date();
    const entry = { id: n.id, title: n.title, body: n.body || '', time: `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`, read: false, kind: n.kind };
    setNst((v) => { const nn = { ...v, fired: v.fired.includes(n.id) ? v.fired : [...v.fired, n.id], hist: [...v.hist, entry].slice(-40) }; nSave(nn); return nn; });
    setNtoast({ ...entry, key: Date.now() });
    if (c.sound && !low) chime('aviso', x);
    const can = typeof Notification !== 'undefined' && Notification.permission === 'granted' && x.notify;
    if (can && (force || document.visibilityState !== 'visible')) {
      const ref = notifRef(x, n.id), acts = ref && (ref.type === 'item' || ref.type === 'med' || ref.type === 'meal' || ref.type === 'water') ? [{ action: 'done', title: 'Feito' }, { action: 'snooze', title: 'Adiar 10 min' }] : [];
      const opts = { body: low ? '' : n.body || '', tag: String(n.id).replace(/:s\d+$/, ''), renotify: false, silent: low || !c.sound, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', data: { id: n.id }, actions: acts };
      try { const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : null; if (reg && reg.active) await reg.showNotification(n.title, opts); else new Notification(n.title, { body: opts.body, tag: opts.tag, icon: opts.icon, silent: opts.silent }); } catch (e) {}
    }
  };
  useEffect(() => {
    const tick = () => {
      const x = sRef.current, now = nowRef(x);
      let v = nLoad(x.day); if (v.day !== nst.day) setNst(v);
      notifPlan(x, x.day, { water: true }).forEach((n) => { if (n.at <= now && now - n.at < 3 && !v.fired.includes(n.id)) { v = { ...v, fired: [...v.fired, n.id] }; nSave(v); fireNotif(n); } });
      const due = v.snooze.filter((z) => z.until <= Date.now());
      if (due.length) { v = { ...v, snooze: v.snooze.filter((z) => z.until > Date.now()) }; nSave(v); setNst(v); due.forEach((z) => { const base = notifPlan(x, x.day, { water: true }).find((n) => n.id === z.id) || { id: z.id, title: 'Lembrete adiado', body: '', kind: 'bloco' }; const r = notifRef(x, z.id); if (r && r.type === 'item' && r.it.status !== 'pendente') return; fireNotif({ ...base, id: `${z.id}:s${z.k}`, title: base.title.replace(/^Em \d+ min: /, 'Agora: ') }); }); }
    };
    tick(); const id = setInterval(tick, 20000); return () => clearInterval(id);
  }, [s.day]);
  useEffect(() => { if (!ntoast) return; const id = setTimeout(() => setNtoast(null), 12000); return () => clearTimeout(id); }, [ntoast]);
  // Cliques em "Feito" / "Adiar" vindos da notificação do aparelho (com o app aberto ou abrindo pelo aviso).
  useEffect(() => {
    const onMsg = (e) => { const d = e.data || {}; if (d.type === 'qd-notif') act.notifAction(d.id, d.action); };
    if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', onMsg);
    try { const q = new URLSearchParams(location.search); if (q.get('na') && q.get('nid')) { const a = q.get('na'), id = q.get('nid'); history.replaceState(null, '', location.pathname); setTimeout(() => act.notifAction(id, a), 600); } } catch (e) {}
    return () => { if ('serviceWorker' in navigator) navigator.serviceWorker.removeEventListener('message', onMsg); };
  }, []);
  const sRef = useRef(s); sRef.current = s;
  const aiExec = (name, a) => {
    const x = sRef.current, item = (id) => x.plan.items.find((y) => y.id === id), dayOf = (iso) => { const d = dayFromIso(iso); if (isNaN(d)) throw new Error('data inválida'); return d; };
    switch (name) {
      case 'add_task': { const sd = suggestDur('media', a.load || 'media'); const dur = a.minutes || sd.dur; act.addTaskSmart({ title: a.title, cat: a.self_care ? 'Autocuidado' : 'Pessoal', prio: 'media', load: a.load || 'media', dur, min: Math.min(dur, sd.min), minText: a.minimum_version || 'Só começar, 5 minutos', freq: clamp(a.times_per_week || 0, 0, 7), where: 'casa', due: a.due_date && !a.times_per_week ? dayOf(a.due_date) : null }); return `tarefa criada: ${a.title}`; }
      case 'add_event': { if (a.weekdays && a.weekdays.length) act.addEvent({ title: a.title, recurring: true, days: a.weekdays, start: a.start, end: a.end }); else act.addEvent({ title: a.title, recurring: false, day: a.date ? dayOf(a.date) : x.day, start: a.start, end: a.end, days: [] }); return `compromisso marcado: ${a.title} ${a.start}-${a.end}`; }
      case 'complete_item': { const it = item(a.item_id); if (!it) return 'item não encontrado'; act.done(it); return `feito: ${itemTitle(x, it)}`; }
      case 'move_item': { const it = item(a.item_id); if (!it) return 'item não encontrado'; act.moveTo(it, dayOf(a.date)); return `movido: ${itemTitle(x, it)} para ${a.date}`; }
      case 'remove_item': { const it = item(a.item_id); if (!it) return 'item não encontrado'; act.removeItem(it); return `tirado do dia: ${itemTitle(x, it)}`; }
      case 'skip_fixed_block': { const d = dayOf(a.date), f = fixedPlan(x, d).find((y) => y.id === a.block_id); if (!f) return 'bloco não encontrado nesse dia'; act.logFixed(d, f.id, { st: 'nao' }, { trips: f.type === 'trabalho' }); return `${f.title} de ${a.date} marcado como não acontece`; }
      case 'add_water': act.water(clamp(a.ml || 250, 50, 3000)); return `água +${a.ml} ml`;
      case 'mark_meal': { if (!(x.mealsDone[x.day] || {})[a.meal_id]) act.meal(a.meal_id); return 'refeição marcada'; }
      case 'take_med': { if (!(x.medsTaken[x.day] || {})[a.med_id]) act.med(a.med_id); return 'remédio marcado'; }
      case 'add_care_cycle': act.saveEntity('cycles', { id: 'new', title: a.title, every: a.every_days, dur: a.minutes, last: x.day - 1, area: a.area }); return `${a.area === 'casa' ? 'casa' : 'autocuidado'} criado: ${a.title}`;
      case 'add_routine_step': { const r = x.routines[a.routine]; act.setRoutine(a.routine, { steps: [...r.steps, { id: uid(), t: a.step, min: a.minutes || 3, ess: !!a.essential }] }); return `passo na ${r.title.toLowerCase()}: ${a.step}`; }
      case 'lighten_today': act.reajustar(); return 'dia aliviado';
      case 'set_survival_day': if (!!a.on !== !!x.today.survival) act.survival(); return a.on ? 'Dia de Sobrevivência ligado' : 'Dia de Sobrevivência desligado';
      case 'set_vacation': { if (a.action === 'end') { const v = vacationOn(x, x.day); if (!v) return 'nenhuma pausa ativa'; act.endVacation(v.id); return 'pausa encerrada, de volta à rotina'; } const st = a.start_date ? dayOf(a.start_date) : x.day; act.addVacation({ label: a.label || 'Férias', start: Math.max(x.day, st), end: a.end_date ? dayOf(a.end_date) : null, keepCare: a.keep_care !== false, keepRoutines: !!a.keep_routines }); return `rotina pausada: ${a.label || 'Férias'}`; }
      case 'log_mood': act.mood({ ...(a.humor != null ? { humor: a.humor } : {}), ...(a.sensorial ? { sens: a.sensorial } : {}) }); return 'humor registrado';
      default: return 'ferramenta desconhecida';
    }
  };
  const runOp = (op, p = {}) => {
    if (op === 'reajustar') act.reajustar();
    else if (op === 'survival') { if (!s.today.survival) act.survival(); }
    else if (op === 'minAtual') { const it = s.plan.items.find((y) => y.id === p.itemId); if (it) act.travou(it); }
    else if (op === 'addTask') act.addTaskSmart(p);
    else if (op === 'fitNow') { act.fitNow(p); setChatOpen(false); }
    else if (op === 'placeAt') act.placeAt(p);
    else if (op === 'addEvent') act.addEvent(p);
    else if (op === 'vacation') act.addVacation({ keepCare: true, keepRoutines: false, ...p });
    else if (op === 'vacationEnd') act.endVacation(p.id);
    else if (op === 'addCycle') act.saveEntity('cycles', { id: 'new', title: p.title, every: p.every, dur: p.dur, last: s.day - 1, area: p.area });
    else if (op === 'waterAdd') act.water(p.ml || (p.n || 1) * 250);
    else if (op === 'mealDone') { if (!(s.mealsDone[s.day] || {})[p.id]) act.meal(p.id); }
    else if (op === 'medTake') { if (!(s.medsTaken[s.day] || {})[p.id]) act.med(p.id); }
    else if (op === 'doneItem') { const it = s.plan.items.find((y) => y.id === p.itemId); if (it) act.done(it); }
    else if (op === 'removeItem') { const it = s.plan.items.find((y) => y.id === p.itemId); if (it) act.removeItem(it); }
    else if (op === 'moveItem') { const it = s.plan.items.find((y) => y.id === p.itemId); if (it) act.moveTo(it, p.day); }
    else if (op === 'cancelFixed') act.logFixed(p.day, p.id, { st: 'nao' }, { trips: p.trips });
  };
  const mood = petMood(s, en);
  const timer = { state: tm, toggle: () => setTm((x) => (!x ? x : x.running ? { ...x, running: false, left: Math.max(0, Math.ceil((x.endAt - Date.now()) / 1000)) } : x.left > 0 ? { ...x, running: true, endAt: Date.now() + x.left * 1000 } : x)), stop: () => setTm(null) };

  return (
    <div className="min-h-screen bg-[#0b0c0f] text-zinc-100">
      <nav aria-label="Seções" data-tour="menu" className="fixed bottom-0 inset-x-0 z-30 border-t border-white/[0.07] bg-[#0b0c0f]/95 backdrop-blur md:inset-x-auto md:left-0 md:top-0 md:bottom-0 md:w-56 md:border-t-0 md:border-r md:pt-8" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <p className="hidden md:block px-6 pb-6 text-zinc-50 font-semibold tracking-tight">QuestDay <span className="text-zinc-500 font-normal">planner</span></p>
        <ul className="grid grid-cols-5 md:grid-cols-1 md:gap-1 md:px-3">
          {TABS.map((t) => (
            <li key={t.id}><button onClick={() => { setSwDir(0); setTab(t.id); }} aria-current={tab === t.id ? 'page' : undefined}
              className={`w-full flex flex-col md:flex-row items-center gap-1 md:gap-3 py-2.5 md:px-3 md:rounded-xl text-[11px] md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9f8fff] ${tab === t.id ? 'text-zinc-50 md:bg-white/[0.06]' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <Ic n={t.icon} className="w-5 h-5" /><span className="text-center leading-tight"><span className="md:hidden">{t.short || t.label}</span><span className="hidden md:inline">{t.label}</span>{t.sub && <span className="hidden md:inline text-zinc-500"> · {t.sub}</span>}</span></button></li>
          ))}
        </ul>
        <div className="hidden md:block absolute bottom-0 inset-x-0 p-3 border-t border-white/[0.07]">
          <InstallButton variant="side" className="mb-1" />
          {s.demo && !Cloud.user && <div className="mb-2 rounded-xl border border-[#ffc24d]/25 bg-[#ffc24d]/[0.06] p-3 space-y-2"><p className="text-xs text-[#ffd98a] flex items-center gap-1.5"><Ic n="Sparkles" className="w-3.5 h-3.5" />Modo demonstração</p><button className="w-full text-left text-xs text-zinc-200 underline underline-offset-4 hover:text-white" onClick={act.exitDemo}>Sair da demonstração / Criar conta</button></div>}
          <button onClick={() => setAcctOpen(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9f8fff]">
            <span className="w-7 h-7 rounded-full grid place-items-center bg-white/[0.06] text-zinc-300 text-xs font-medium shrink-0">{Cloud.user && Cloud.user.email ? Cloud.user.email[0].toUpperCase() : <Ic n="Users" className="w-3.5 h-3.5" />}</span>
            <span className="min-w-0 text-left"><span className="block text-zinc-200 truncate">Conta</span><span className="block text-[11px] text-zinc-500 truncate">{Cloud.user ? Cloud.user.email || 'conectada' : s.demo ? 'demonstração' : 'só neste aparelho'}</span></span></button>
        </div>
      </nav>
      {tab === 'agora' && s.onboarded && !s.tourDone && !acctOpen && <Tour onEnd={() => up((x) => ({ ...x, tourDone: true }))} />}
      {acctOpen && <AccountModal s={s} act={act} onClose={() => setAcctOpen(false)} goSettings={() => { setAcctOpen(false); setTab('cadastro', 'conta'); }} />}
      {(pull > 0 || pulling) && <div className="md:hidden fixed top-0 inset-x-0 z-30 flex justify-center pointer-events-none" style={{ paddingTop: 'env(safe-area-inset-top)', transform: `translateY(${pulling ? 56 : pull}px)`, transition: pull && !pulling ? 'none' : 'transform .2s' }} aria-live="polite">
        <div className={`-mt-12 flex items-center gap-2 rounded-full bg-zinc-900 border border-white/10 shadow-xl px-3 py-1.5 text-xs text-zinc-300 ${pulling ? 'pet-float' : ''}`}><Pet mood="alerta" size={24} />{pulling ? 'Atualizando…' : pull >= 64 ? 'Solte para atualizar' : 'Puxe para atualizar'}</div></div>}
      <main {...ptr} className="md:pl-56 pb-28 md:pb-12" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom))' }}>
        {s.demo && !Cloud.user && <div className="md:hidden sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-2 bg-[#2a2210]/95 backdrop-blur border-b border-[#ffc24d]/20 text-xs"><span className="text-[#ffd98a] flex items-center gap-1.5"><Ic n="Sparkles" className="w-3.5 h-3.5" />Modo demonstração</span><button className="text-zinc-100 underline underline-offset-4" onClick={act.exitDemo}>Sair / Criar conta</button></div>}
        <div className={`${tab === 'semana' ? 'max-w-[1680px]' : 'max-w-[1320px]'} mx-auto px-4 sm:px-6 lg:px-8 pt-5 md:pt-8 space-y-5`}>
          <TopBar s={s} en={en} setTab={setTab} act={act} bell={<Bell hist={nst.hist} onOpen={() => setNst((v) => { const n = { ...v, hist: v.hist.map((h) => ({ ...h, read: true })) }; nSave(n); return n; })} />} />
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">{tab === 'semana' ? 'Semana · plano da IA' : TABS.find((t) => t.id === tab).label}</h1>
          <div key={tab} className={`${swDir > 0 ? 'tab-in-r' : swDir < 0 ? 'tab-in-l' : 'view-in'} space-y-5`}>
          {tab === 'agora' && <Agora s={s} up={up} act={act} en={en} timer={timer} setTab={setTab} openFocus={(it) => { act.markStart(it); setFocusIt(it); }} openComp={(it) => { act.markStart(it); setComp({ itemId: it.id, start: Date.now(), every: 15, acked: 0 }); }} openWeekly={() => { setTab('semana'); setWeekly(true); }} />}
          {tab === 'semana' && <Semana s={s} act={act} en={en} weekly={weekly} setWeekly={setWeekly} />}
          {tab === 'cuidar' && <Cuidar s={s} act={act} setTab={setTab} />}
          {tab === 'progresso' && <Progresso s={s} act={act} />}
          {tab === 'cadastro' && <Cadastro s={s} up={up} act={act} sec={cadSec} setSec={setCadSec} goTab={setTab} />}
          </div>
          
          <p className="text-xs text-zinc-600 pt-2">{Cloud.user ? `Tudo é editável em Minha Rotina e fica salvo na sua conta (${Cloud.user.email || "nuvem"}).` : "Tudo é editável em Minha Rotina e fica salvo só neste aparelho. Entre na conta em Conta e aparelhos para salvar na nuvem."}</p>
        </div>
      </main>
      {!chatOpen && <button onClick={() => { haptic(); setFab(true); }} aria-label="Ação rápida: adicionar" className="md:hidden fixed z-40 right-[22px] bottom-[152px] w-12 h-12 rounded-full btn-primary text-zinc-950 grid place-items-center shadow-xl shadow-black/50 press" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}><Ic n="Plus" className="w-5 h-5" /></button>}
      {fab && <Sheet onClose={() => setFab(false)} label="Ação rápida"><div className="p-5 pt-2 space-y-2">
        <p className="text-zinc-50 font-medium pb-1">O que você quer fazer?</p>
        {fab === 'task' ? <AddToDay s={s} d={s.day} act={act} /> : <>
          <button className={btnG + ' w-full justify-start'} onClick={() => setFab('task')}><Ic n="ListChecks" />Nova tarefa para hoje</button>
          <button className={btnG + ' w-full justify-start'} onClick={() => { setFab(false); setTab('semana'); act.setUi({ semanaView: 'cal' }); }}><Ic n="CalendarDays" />Marcar compromisso no calendário</button>
          <button className={btnG + ' w-full justify-start'} onClick={() => { act.water(250); setFab(false); notify('+250 ml de água.'); }}><Ic n="GlassWater" />+250 ml de água</button>
          <button className={btnG + ' w-full justify-start'} onClick={() => { setFab(false); setChatOpen(true); }}><Ic n="Sparkles" />Falar com o Lume</button></>}
      </div></Sheet>}
      {!chatOpen && (
        <button onClick={() => setChatOpen(true)} aria-label={`Abrir o assistente Lume (${MOOD_TXT[mood]})`} title="Falar com o Lume"
          className="fixed z-40 right-4 bottom-[84px] md:bottom-6 md:right-6 w-14 h-14 rounded-2xl bg-zinc-900/95 border border-[#9f8fff]/30 shadow-xl shadow-black/50 grid place-items-center hover:border-[#9f8fff]/60 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9f8fff] transition-colors">
          <Pet mood={mood} size={42} />
        </button>
      )}
      <Celebrate s={s} act={act} />
      {comp && !focusIt && <Companion s={s} comp={comp} act={act} onEnd={() => setComp(null)} />}
      {focusIt && s.plan.items.find((y) => y.id === focusIt.id) && <FocusMode s={s} it={s.plan.items.find((y) => y.id === focusIt.id)} act={act} onClose={() => setFocusIt(null)} />}
      <AssistantDrawer s={s} en={en} open={chatOpen} onClose={() => setChatOpen(false)} msgs={msgs} setMsgs={setMsgs} runOp={runOp} aiExec={aiExec} act={act} />
      <div aria-live="polite" className="fixed z-40 left-1/2 -translate-x-1/2 bottom-24 md:bottom-8 md:ml-28 w-[min(92vw,440px)] flex justify-center pointer-events-none">
        {toast && <div key={toast.id} className={`toast px-4 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-zinc-100 shadow-xl flex items-center gap-3 ${toast.undo ? 'pointer-events-auto' : ''}`}>{toast.m}{toast.undo && <button className="text-[#cdc4ff] font-medium underline underline-offset-4 min-h-[36px]" onClick={() => { toast.undo(); setToast(null); }}>Desfazer</button>}</div>}
      </div>
      {(ntoast || upd) && <div className="fixed z-[45] left-1/2 -translate-x-1/2 top-3 md:ml-28 w-[min(94vw,460px)] space-y-2" style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}>
        {upd && <div className="toast flex items-center gap-3 px-4 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-sm text-zinc-100 shadow-xl" role="status"><Ic n="Sparkles" className="w-4 h-4 text-[#9f8fff]" /><span className="flex-1">Nova versão disponível</span><button className="text-[#cdc4ff] font-medium underline underline-offset-4" onClick={() => Pwa.applyUpdate()}>Atualizar</button></div>}
        {ntoast && <div key={ntoast.key} className="toast rounded-xl bg-zinc-800 border border-white/10 shadow-xl p-3 space-y-2" role="alert">
          <div className="flex items-start gap-2.5"><Pet mood="alerta" size={26} /><div className="flex-1 min-w-0"><p className="text-sm text-zinc-50 font-medium">{ntoast.title}</p>{ntoast.body && !(s.ui && s.ui.lowStim) && <p className="text-xs text-zinc-400">{ntoast.body}</p>}</div>
            <button className="w-7 h-7 grid place-items-center rounded-md text-zinc-500 hover:bg-white/5" aria-label="Fechar aviso" onClick={() => setNtoast(null)}><Ic n="X" className="w-3.5 h-3.5" /></button></div>
          {(() => { const r = notifRef(s, ntoast.id); if (!r || r.type === 'sleep' || r.type === 'fx') return null; return <div className="flex flex-wrap gap-1.5 pl-9">
            {r.type === 'item' && r.it.status === 'pendente' && <button className="h-8 px-3 rounded-lg text-xs btn-primary text-zinc-950 font-medium press" onClick={() => act.notifAction(ntoast.id, 'start')}>Começar agora</button>}
            <button className="h-8 px-3 rounded-lg text-xs bg-white/[0.07] text-zinc-200 hover:bg-white/[0.12] press" onClick={() => act.notifAction(ntoast.id, 'snooze')}>Adiar 10 min</button>
            <button className="h-8 px-3 rounded-lg text-xs bg-[#2ee8c4]/15 text-[#7ff0d8] hover:bg-[#2ee8c4]/25 press" onClick={() => act.notifAction(ntoast.id, 'done')}>{r.type === 'water' ? '+250 ml' : 'Feito'}</button></div>; })()}
        </div>}
      </div>}
    </div>
  );
}

/* ===================== ONBOARDING (primeira vez) ===================== */
const OB_TASKS = [
  { title: 'Revisar a matéria', load: 'pesada', freq: 3, cat: 'Faculdade', where: 'casa', minText: 'Reler as anotações por 10 min' },
  { title: 'Estudar idioma', load: 'leve', freq: 7, cat: 'Idioma', where: 'transporte', minText: '5 palavras' },
  { title: 'Projeto pessoal', load: 'media', freq: 2, cat: 'Pessoal', where: 'casa', minText: 'Abrir o projeto e fazer 1 coisinha' },
  { title: 'Treino / exercício', load: 'media', freq: 3, cat: 'Pessoal', where: 'qualquer', minText: '10 min de alongamento' },
  { title: 'Leitura', load: 'leve', freq: 3, cat: 'Pessoal', where: 'transporte', minText: 'Ler 2 páginas' },
];
const OB_CYCLES = [
  { id: 'cama', title: 'Arrumar a cama', every: 1, dur: 5, area: 'casa' },
  { id: 'quarto', title: 'Limpar o quarto', every: 7, dur: 30, area: 'casa' },
  { id: 'roupa', title: 'Lavar roupa', every: 7, dur: 40, area: 'casa' },
  { id: 'cabelo', title: 'Lavar o cabelo', every: 3, dur: 40, area: 'cuidado' },
  { id: 'pet', title: 'Banho no pet', every: 15, dur: 40, area: 'casa' },
  { id: 'pele', title: 'Cuidar da pele', every: 1, dur: 10, area: 'cuidado' },
];
function obDefaults() {
  return {
    bed: '23:00', wake: '06:00',
    work: { on: false, title: 'Trabalho', days: [1, 2, 3, 4, 5], start: '08:00', end: '14:00', trip: true, ida: 50, volta: 50 },
    aula: { on: false, title: 'Faculdade', days: [1, 3], start: '19:00', end: '22:00', trip: true, ida: 40, volta: 40 },
    outros: [],
    peak: 'manha', intensity: 'ritmo', transitionMin: 15,
    tasks: [],
    care: { water: true, meals: true, meds: false, med: { name: '', time: '08:00' }, leave: true, cycles: ['cama', 'cabelo'], cycleOn: false },
    ui: { theme: 'dark', lowStim: false, font: 'padrao', size: 'normal', sound: true },
  };
}
function mealsFor(a) {
  const wake = toMin(a.wake), bed = nightMin(a.bed);
  const wEnd = a.work.on ? toMin(a.work.end) : null;
  const almoco = wEnd != null && wEnd >= 690 && wEnd <= 930 ? wEnd + 25 : 750;
  return [{ id: 'cafe', name: 'Café da manhã', time: hhmm(wake + 30) }, { id: 'almoco', name: 'Almoço', time: hhmm(almoco) }, { id: 'lanche', name: 'Lanche', time: hhmm(Math.max(almoco + 150, 990)) }, { id: 'jantar', name: 'Jantar', time: hhmm(Math.min(bed - 150, 1230)) }];
}
function addTrips(fixed, id, o, tIda, tVolta) {
  const ida = Math.max(5, o.ida || 20), volta = Math.max(5, o.volta || 20);
  fixed.push({ id: id + 'i', of: id, type: 'trajeto', title: tIda, days: o.days, start: hhmm(toMin(o.start) - 5 - ida), end: hhmm(toMin(o.start) - 5) });
  fixed.push({ id: id + 'v', of: id, type: 'trajeto', title: tVolta, days: o.days, start: hhmm(toMin(o.end) + 5), end: hhmm(toMin(o.end) + 5 + volta) });
}
function buildFromOnboarding(a) {
  const today = realToday(), fixed = [];
  if (a.work.on) {
    fixed.push({ id: 'w', type: 'trabalho', title: a.work.title || 'Trabalho', days: a.work.days, start: a.work.start, end: a.work.end });
    if (a.work.trip) addTrips(fixed, 'w', a.work, 'Trajeto de ida', 'Trajeto de volta');
  }
  if (a.aula.on) { const t = a.aula.title || 'Faculdade'; fixed.push({ id: 'a', type: 'compromisso', title: t, days: a.aula.days, start: a.aula.start, end: a.aula.end }); if (a.aula.trip) addTrips(fixed, 'a', a.aula, `Ida · ${t}`, `Volta · ${t}`); }
  a.outros.filter((o) => o.title.trim() && o.days.length).forEach((o, i) => { const t = o.title.trim(); fixed.push({ id: 'o' + i, type: 'compromisso', title: t, days: o.days, start: o.start, end: o.end }); if (o.trip) addTrips(fixed, 'o' + i, o, `Ida · ${t}`, `Volta · ${t}`); });
  const tasks = a.tasks.map((t, i) => { const sd = suggestDur('media', t.load); return { id: 't' + i + uid(), title: t.title, cat: t.cat || 'Pessoal', prio: 'media', load: t.load, dur: sd.dur, min: sd.min, minText: t.minText || 'Só começar, 5 minutos', freq: t.freq, where: t.where || 'casa' }; });
  const cycles = OB_CYCLES.filter((c) => a.care.cycles.includes(c.id)).map((c) => ({ ...c, last: today - (c.every === 1 ? 1 : Math.ceil(c.every / 2)) }));
  const meds = a.care.meds && a.care.med.name.trim() ? [{ id: uid(), name: a.care.med.name.trim(), time: a.care.med.time, stock: null, dose: 1 }] : [];
  const y = dateOf(today).getUTCFullYear();
  const s0 = {
    v: 4, day: today, offset: 0, simNow: null, sleepGoal: { bed: a.bed, wake: a.wake }, fixedLog: {}, fixed, tasks, cycles, log: [],
    streak: { count: 0, best: 0, keptDay: today - 1 }, keptDays: {}, history: [], attended: {}, adjustNote: null, dirty: false,
    exams: [], projects: [], outcomes: [], reviews: {}, sampleReviewDays: [], durLog: [], durNotes: [], transitionMin: a.transitionMin,
    careCfg: { waterMl: a.care.water ? 2000 : 0, meds, meals: a.care.meals ? mealsFor(a) : [] }, water: {}, medsTaken: {},
    cycleCfg: { on: !!a.care.cycleOn, start: today - 1, length: 28, period: 5 }, notify: false,
    leaveCfg: { items: a.care.leave && ((a.work.on && a.work.trip) || (a.aula.on && a.aula.trip) || a.outros.some((o) => o.trip)) ? ['Chave', 'Carteira', 'Carregador', 'Garrafa de água', 'Fone'] : [] },
    semester: { start: today, end: today + 120, holidays: [...feriadosBR(y), ...feriadosBR(y + 1)].filter((h) => h.date >= today && h.date <= today + 120) },
    prefs: { peak: a.peak, intensity: a.intensity }, ui: { ...a.ui }, onboarded: true, vacations: [], routines: ROUTINES0, moods: {}, badges: {}, missions: {},
    plan: { days: [], items: [], unplaced: [], at: null },
  };
  s0.today = { ...freshToday(s0), skipCheck: true, askPulse: true };
  return migrate({ ...s0, plan: distribute(s0) });
}
function Onboarding({ onDone, onExample, onCloud }) {
  useCloud();
  const [cmsg, setCmsg] = useState(() => { try { const m = sessionStorage.getItem('qd-msg'); sessionStorage.removeItem('qd-msg'); return m; } catch (e) { return null; } });
  const [step, setStep] = useState(() => (canCloud() && Cloud.user ? 1 : 0)), [a, setA] = useState(obDefaults), [built, setBuilt] = useState(null), [free, setFree] = useState('');
  const set = (p) => setA((x) => ({ ...x, ...p }));
  const setIn = (k, p) => setA((x) => ({ ...x, [k]: { ...x[k], ...p } }));
  useEffect(() => { const r = document.documentElement; r.classList.toggle('low-stim', a.ui.lowStim); r.classList.toggle('light', a.ui.theme === 'light'); r.classList.toggle('font-legivel', a.ui.font === 'legivel'); }, [a.ui]);
  const tripPick = (o, upd, remote, k = '') => <>
    <Seg value={o.trip ? 'sim' : 'nao'} onChange={(v) => upd({ trip: v === 'sim', ida: o.ida || 20, volta: o.volta || 20 })} options={[['sim', 'Tem trajeto'], ['nao', remote]]} label="Trajeto" />
    {o.trip && <div className="grid grid-cols-2 gap-2 max-w-sm"><div><span className="text-xs text-zinc-500">Ida</span><DurField label="Tempo de ida" className="h-11 mt-1" min={5} value={o.ida || 20} onChange={(v) => upd({ ida: v })} /></div><div><span className="text-xs text-zinc-500">Volta</span><DurField label="Tempo de volta" className="h-11 mt-1" min={5} value={o.volta || 20} onChange={(v) => upd({ volta: v })} /></div></div>}
  </>;
  const N = 6, next = () => { if (step === N) { setBuilt(buildFromOnboarding(a)); setStep(7); } else setStep(step + 1); };
  const back = () => setStep(Math.max(0, step - 1));
  const chip = (on, onClick, label, extra = '') => <button type="button" aria-pressed={on} onClick={onClick} className={`min-h-[44px] px-4 rounded-xl border text-sm press ${on ? 'border-[#9f8fff] bg-[#9f8fff]/15 text-zinc-50' : 'border-white/10 text-zinc-300 hover:bg-white/[0.05]'} ${extra}`}>{label}</button>;
  const toggleRow = (on, fn, title, desc, children) => (
    <div className={`rounded-2xl border p-4 space-y-3 transition-colors ${on ? 'border-[#9f8fff]/45 bg-[#9f8fff]/[0.06]' : 'border-white/[0.08] bg-zinc-900/50'}`}>
      <button type="button" className="w-full flex items-center gap-3 text-left" onClick={fn} aria-pressed={on}>
        <span className={`w-6 h-6 rounded-lg border grid place-items-center shrink-0 ${on ? 'bg-[#9f8fff] border-[#9f8fff] text-zinc-950' : 'border-zinc-600'}`}>{on && <Ic n="Check" className="w-3.5 h-3.5" />}</span>
        <span className="flex-1"><span className="block text-zinc-100 font-medium">{title}</span>{desc && <span className="block text-xs text-zinc-500">{desc}</span>}</span></button>
      {on && children && <div className="pl-9 space-y-3 rise">{children}</div>}
    </div>
  );
  const Q = ({ t, d }) => <div className="space-y-1.5"><h2 className="text-2xl sm:text-3xl font-semibold text-zinc-50 tracking-tight leading-tight">{t}</h2>{d && <p className="text-zinc-400">{d}</p>}</div>;
  const timePair = (obj, k, l1 = 'Começa', l2 = 'Termina') => <div className="grid grid-cols-2 gap-2 max-w-sm"><div><span className="text-xs text-zinc-500">{l1}</span><TimeField id={`${k}-s`} label={l1} value={obj.start} onChange={(v) => setIn(k, { start: v })} /></div><div><span className="text-xs text-zinc-500">{l2}</span><TimeField id={`${k}-e`} label={l2} value={obj.end} onChange={(v) => setIn(k, { end: v })} /></div></div>;
  const addTask = (t) => setA((x) => (x.tasks.length >= 4 || x.tasks.some((y) => y.title === t.title) ? x : { ...x, tasks: [...x.tasks, { ...t }] }));
  const today = realToday();

  let body = null;
  const afterLogin = async () => {
    setCmsg('Buscando seus dados…');
    const r = await Cloud.reconcile(null);
    if (r.use === 'remote' && r.data && r.data.v === 4) onCloud(r.data); else { setCmsg(null); setStep(1); }
  };
  if (step === 0) body = (
    <div className="text-center py-8 sm:py-12">
      <div className="mx-auto w-fit pet-float"><Pet mood="alerta" size={104} /></div>
      <div className="mt-6 space-y-3"><p className="text-sm text-[#9f8fff]">Oi, eu sou o Lume.</p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-zinc-50 tracking-tight leading-tight max-w-xl mx-auto">Um planner que monta sua semana sozinho e te diz uma coisa de cada vez, no ritmo da sua energia.</h1></div>
      <div className="mt-12 sm:mt-14 max-w-sm mx-auto text-left rounded-2xl border border-white/10 bg-zinc-900/70 p-5 sm:p-6 space-y-4 rise">
        {!canCloud() ? <><p className="text-sm text-zinc-400">Aberto direto do arquivo, o QuestDay funciona só neste aparelho, sem conta.</p><button className={btnP + ' w-full'} onClick={next}><Ic n="Sparkles" />Montar minha rotina (2 min)</button></>
          : Cloud.user ? <><p className="text-sm text-zinc-300">Conectada como <b className="text-zinc-100 font-medium">{Cloud.user.email || 'sua conta'}</b>.</p><button className={btnP + ' w-full'} onClick={() => setStep(1)}><Ic n="Sparkles" />Montar minha rotina (2 min)</button></>
          : <><p className="text-zinc-100 font-medium">Crie sua conta para começar</p><AccountPanel s={null} initial="criar" onLoggedIn={afterLogin} /></>}
        {cmsg && <p className="text-sm text-zinc-300" role="status">{cmsg}</p>}
      </div>
      <div className="mt-12 sm:mt-14"><button className="text-sm text-zinc-500 hover:text-zinc-300 underline underline-offset-4" onClick={onExample}>Quero só explorar com uma rotina de exemplo</button>
        <p className="mt-2 text-xs text-zinc-600">Modo demonstração: nada é salvo na nuvem.</p>
        <div className="mt-8 flex justify-center"><InstallButton variant="pill" className="text-sm" /></div></div>
    </div>);
  if (step === 1) body = (
    <div className="space-y-6"><Q t="Em um dia normal, que horas você tenta dormir e acordar?" d="Eu uso isso para saber onde o seu dia começa e termina, e para calcular a energia." />
      <div className="flex flex-wrap gap-2">{[['Acordo cedo', '22:00', '05:30'], ['Padrão', '23:00', '06:30'], ['Durmo tarde', '01:00', '09:00']].map(([l, b, w]) => chip(a.bed === b && a.wake === w, () => set({ bed: b, wake: w }), l))}</div>
      <div className="grid grid-cols-2 gap-3 max-w-sm"><div><span className="text-xs text-zinc-500">Dormir</span><TimeField id="ob-bed" label="Dormir" value={a.bed} onChange={(v) => set({ bed: v })} /></div><div><span className="text-xs text-zinc-500">Acordar</span><TimeField id="ob-wake" label="Acordar" value={a.wake} onChange={(v) => set({ wake: v })} /></div></div>
      <p className="text-sm text-zinc-500">Meta de sono: {fmtH(sleepHours(a.bed, a.wake))} por noite.</p>
      <div className="max-w-lg"><SleepWarn bed={a.bed} wake={a.wake} onApply={(b) => set({ bed: b })} /></div>
    </div>);
  if (step === 2) body = (
    <div className="space-y-5"><Q t="O que tem hora marcada na sua semana?" d="Só o que não se mexe. Ative o que existe e preencha o básico." />
      {toggleRow(a.work.on, () => setIn('work', { on: !a.work.on }), 'Trabalho / estágio', 'Dias, horário e trajeto', <>
        <label className="block max-w-sm"><span className="text-xs text-zinc-500">Nome</span><input type="text" autoComplete="off" maxLength={60} className={inp + ' h-10 mt-1'} value={a.work.title} placeholder="Ex.: Estágio, Trabalho, Freela" onChange={(e) => setIn('work', { title: e.target.value })} aria-label="Nome do trabalho" /></label>
        <DayChips days={a.work.days} onChange={(d) => setIn('work', { days: d })} />{timePair(a.work, 'work')}
        {tripPick(a.work, (p) => setIn('work', p), 'É remoto')}
      </>)}
      {toggleRow(a.aula.on, () => setIn('aula', { on: !a.aula.on }), 'Aulas / faculdade', 'Dias, horário e trajeto (ou importe o .ics depois)', <><label className="block max-w-sm"><span className="text-xs text-zinc-500">Nome</span><input type="text" autoComplete="off" maxLength={60} className={inp + ' h-10 mt-1'} value={a.aula.title} placeholder="Ex.: Faculdade, Curso técnico, Pós" onChange={(e) => setIn('aula', { title: e.target.value })} aria-label="Nome das aulas" /></label><DayChips days={a.aula.days} onChange={(d) => setIn('aula', { days: d })} />{timePair(a.aula, 'aula')}{tripPick(a.aula, (p) => setIn('aula', p), 'É online')}</>)}
      {a.outros.map((o, i) => <div key={i} className="rounded-2xl border border-[#9f8fff]/45 bg-[#9f8fff]/[0.06] p-4 space-y-3 rise">
        <div className="flex gap-2"><input className={inp + ' h-10'} placeholder="Ex.: terapia, academia, curso" value={o.title} onChange={(e) => set({ outros: a.outros.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} aria-label="Nome do compromisso" /><button className="w-10 h-10 grid place-items-center rounded-lg text-zinc-500 hover:bg-white/5" aria-label="Remover" onClick={() => set({ outros: a.outros.filter((_, j) => j !== i) })}><Ic n="X" /></button></div>
        <DayChips days={o.days} onChange={(d) => set({ outros: a.outros.map((x, j) => (j === i ? { ...x, days: d } : x)) })} />
        <div className="grid grid-cols-2 gap-2 max-w-sm"><TimeField id={`o${i}s`} label="Começa" value={o.start} onChange={(v) => set({ outros: a.outros.map((x, j) => (j === i ? { ...x, start: v } : x)) })} /><TimeField id={`o${i}e`} label="Termina" value={o.end} onChange={(v) => set({ outros: a.outros.map((x, j) => (j === i ? { ...x, end: v } : x)) })} /></div>
        {tripPick(o, (p) => set({ outros: a.outros.map((x, j) => (j === i ? { ...x, ...p } : x)) }), 'É remoto / online', `o${i}`)}
      </div>)}
      <button className={btnG} onClick={() => set({ outros: [...a.outros, { title: '', days: [2], start: '18:00', end: '19:00', trip: false, ida: 20, volta: 20 }] })}><Ic n="Plus" />Outro fixo (academia, terapia, curso)</button>
    </div>);
  if (step === 3) body = (
    <div className="space-y-7"><Q t="Como a sua cabeça funciona?" d="Três toques. Dá para mudar depois." />
      <div className="space-y-2"><p className="text-zinc-200">Quando você costuma render melhor?</p><div className="flex flex-wrap gap-2">{[['manha', 'Manhã'], ['tarde', 'Tarde'], ['noite', 'Noite'], ['varia', 'Varia muito']].map(([k, l]) => chip(a.peak === k, () => set({ peak: k }), l))}</div></div>
      <div className="space-y-2"><p className="text-zinc-200">Qual ritmo combina mais com você hoje?</p><div className="flex flex-wrap gap-2">{[['suave', 'Suave'], ['ritmo', 'Ritmo'], ['intenso', 'Intenso']].map(([k, l]) => chip(a.intensity === k, () => set({ intensity: k }), l))}</div>
        <p className="text-xs text-zinc-500">{a.intensity === 'suave' ? 'Dias mais leves, com folga, e no máximo 1 tarefa pesada por dia.' : a.intensity === 'intenso' ? 'Encaixo mais coisas por dia, mas sigo aliviando quando a energia cair.' : 'Equilíbrio: 1 tarefa pesada em dia de trabalho, até 2 nos outros.'}</p></div>
      <div className="space-y-2"><p className="text-zinc-200">Depois do trabalho ou do trajeto, de quanto respiro você precisa?</p><div className="flex flex-wrap gap-2">{[[0, '0 min'], [15, '15 min'], [30, '30 min'], [60, '1h']].map(([k, l]) => chip(a.transitionMin === k, () => set({ transitionMin: k }), l))}</div></div>
    </div>);
  if (step === 4) body = (
    <div className="space-y-5"><Q t="O que você quer dar conta nesta semana?" d="Escolha ou escreva de 2 a 4 coisas. O resto você adiciona depois." />
      <div className="flex flex-wrap gap-2">{OB_TASKS.map((t) => chip(a.tasks.some((y) => y.title === t.title), () => (a.tasks.some((y) => y.title === t.title) ? set({ tasks: a.tasks.filter((y) => y.title !== t.title) }) : addTask(t)), t.title))}</div>
      <div className="flex gap-2 max-w-lg"><input className={inp} value={free} placeholder="Ou escreva: “estudar cálculo”, “correr”…" onChange={(e) => setFree(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && free.trim()) { const d = draftFromText(free, { day: today, plan: { days: [], items: [] }, tasks: [], cycles: [], sleepGoal: { bed: a.bed, wake: a.wake } }); addTask({ title: d.title, load: d.load, freq: d.freq || 2, cat: d.cat, where: d.where, minText: d.minText }); setFree(''); } }} aria-label="Escrever uma tarefa" />
        <button className={btnG} disabled={!free.trim() || a.tasks.length >= 4} onClick={() => { const d = draftFromText(free, { day: today, plan: { days: [], items: [] }, tasks: [], cycles: [], sleepGoal: { bed: a.bed, wake: a.wake } }); addTask({ title: d.title, load: d.load, freq: d.freq || 2, cat: d.cat, where: d.where, minText: d.minText }); setFree(''); }}><Ic n="Plus" /></button></div>
      {a.tasks.length >= 4 && <p className="text-xs text-[#ffc24d]">Quatro está ótimo para começar. Depois você adiciona mais.</p>}
      <div className="space-y-2.5">{a.tasks.map((t, i) => <div key={t.title} className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-4 space-y-3 rise">
        <div className="flex gap-2 items-center"><input className={inp + ' h-10'} value={t.title} onChange={(e) => set({ tasks: a.tasks.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} aria-label="Nome" /><button className="w-10 h-10 grid place-items-center rounded-lg text-zinc-500 hover:bg-white/5 shrink-0" aria-label={`Remover ${t.title}`} onClick={() => set({ tasks: a.tasks.filter((_, j) => j !== i) })}><Ic n="X" /></button></div>
        <div className="grid sm:grid-cols-2 gap-2"><Seg value={t.load} onChange={(v) => set({ tasks: a.tasks.map((x, j) => (j === i ? { ...x, load: v } : x)) })} options={[['leve', 'Leve'], ['media', 'Média'], ['pesada', 'Pesada']]} label="Peso" />
          <Seg value={String(t.freq)} onChange={(v) => set({ tasks: a.tasks.map((x, j) => (j === i ? { ...x, freq: Number(v) } : x)) })} options={[['1', '1x'], ['2', '2x'], ['3', '3x'], ['7', 'Todo dia']]} label="Vezes por semana" /></div>
        <p className="text-xs text-zinc-500">Vou sugerir {suggestDur('media', t.load).dur} min, com um mínimo de {suggestDur('media', t.load).min} min para dias difíceis.</p>
      </div>)}</div>
    </div>);
  if (step === 5) body = (
    <div className="space-y-4"><Q t="O que você costuma esquecer quando o dia aperta?" d="Nada disso conta como produtividade. É a babá cuidando de você." />
      {toggleRow(a.care.water, () => setIn('care', { water: !a.care.water }), 'Água', 'Meta de 2 L por dia')}
      {toggleRow(a.care.meals, () => setIn('care', { meals: !a.care.meals }), 'Refeições', `Horários sugeridos: ${mealsFor(a).map((m) => `${m.name.split(' ')[0].toLowerCase()} ${m.time}`).join(', ')}`)}
      {toggleRow(a.care.meds, () => setIn('care', { meds: !a.care.meds }), 'Remédios', 'Um lembrete na hora certa', <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-2 max-w-md"><input className={inp + ' h-10'} placeholder="Nome do remédio" value={a.care.med.name} onChange={(e) => setIn('care', { med: { ...a.care.med, name: e.target.value } })} aria-label="Nome do remédio" /><TimeField id="ob-med" label="Horário" value={a.care.med.time} onChange={(v) => setIn('care', { med: { ...a.care.med, time: v } })} /></div>)}
      {a.work.on && a.work.trip && toggleRow(a.care.leave, () => setIn('care', { leave: !a.care.leave }), 'Checklist antes de sair', 'Chave, carteira, carregador… 45 min antes do trajeto')}
      <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/50 p-4 space-y-3"><p className="text-zinc-100 font-medium">Casa e autocuidado</p>
        <div className="flex flex-wrap gap-2">{OB_CYCLES.map((c) => chip(a.care.cycles.includes(c.id), () => setIn('care', { cycles: a.care.cycles.includes(c.id) ? a.care.cycles.filter((x) => x !== c.id) : [...a.care.cycles, c.id] }), <span className="flex items-center gap-1.5"><Ic n={AREA[c.area].icon} className="w-3.5 h-3.5" style={{ color: AREA[c.area].c }} />{c.title}</span>))}</div></div>
    </div>);
  if (step === 6) body = (
    <div className="space-y-6"><Q t="Como fica mais confortável para os seus olhos?" d="Muda na hora. Dá para trocar depois em Conforto." />
      <div className="space-y-4 max-w-md">
        <div><p className="text-sm text-zinc-300 mb-1.5">Tema</p><Seg value={a.ui.theme} onChange={(v) => setIn('ui', { theme: v })} options={[['dark', 'Escuro'], ['light', 'Claro']]} label="Tema" /></div>
        <div><p className="text-sm text-zinc-300 mb-1.5">Estímulo</p><Seg value={a.ui.lowStim ? 'baixo' : 'normal'} onChange={(v) => setIn('ui', { lowStim: v === 'baixo' })} options={[['normal', 'Normal'], ['baixo', 'Baixo estímulo']]} label="Estímulo" /></div>
        <div><p className="text-sm text-zinc-300 mb-1.5">Fonte</p><Seg value={a.ui.font} onChange={(v) => setIn('ui', { font: v })} options={[['padrao', 'Padrão'], ['legivel', 'Mais legível']]} label="Fonte" /></div>
      </div>
      <div className={card + ' p-5 space-y-3 agora-glow max-w-md'}><p className="text-sm text-[#9f8fff] flex items-center gap-2"><i className="live-dot" />Agora · prévia</p><p className="text-2xl font-semibold text-zinc-50">Estudar idioma</p><p className="text-zinc-400 hint">15 min, no trajeto, com celular e fone.</p><button className={btnP}><Ic n="Check" />Feito</button></div>
    </div>);
  if (step === 7 && built) {
    const its = built.plan.items.filter((it) => it.status === 'pendente' && it.day >= built.day);
    const nToday = its.filter((it) => it.day === built.day).sort((x, y) => x.start - y.start);
    const intTxt = { suave: 'deixei os dias em modo Suave, com folga', ritmo: 'deixei os dias em Ritmo, equilibrados', intenso: 'deixei os dias em modo Intenso, mais cheios' }[a.intensity];
    const pkTxt = { manha: 'o que pede foco vai para as manhãs', tarde: 'o que pede foco vai para as tardes', noite: 'o que pede foco vai para as noites', varia: 'o foco fica onde houver mais espaço' }[a.peak];
    body = (
      <div className="space-y-6 text-center py-4">
        <div className="mx-auto w-fit pet-float"><Pet mood="calmo" size={96} /></div>
        <div className="space-y-2"><h2 className="text-3xl font-semibold text-zinc-50 tracking-tight">Pronto.</h2>
          <p className="text-lg text-zinc-300 max-w-xl mx-auto">Organizei <b className="text-zinc-50">{its.length} blocos</b> até domingo{built.fixed.length ? `, em volta de ${built.fixed.filter((f) => f.type !== 'trajeto').length} horário(s) fixo(s)` : ''}. {intTxt[0].toUpperCase() + intTxt.slice(1)}, {pkTxt}{a.work.on ? ', e coloquei no máximo ' + (a.intensity === 'intenso' ? '2 tarefas pesadas' : '1 tarefa pesada') + ' nos dias de trabalho' : ''}.</p></div>
        {nToday.length > 0 && <div className={card + ' p-4 text-left max-w-md mx-auto space-y-1.5'}><p className="text-xs text-zinc-500">Hoje</p>{nToday.slice(0, 4).map((it, i) => <p key={it.id} className="flex gap-3 text-sm rise" style={{ animationDelay: `${i * 80}ms` }}><span className="text-zinc-500 tabular-nums w-12">{hhmm(it.start)}</span><span className="text-zinc-200">{itemTitle(built, it)}</span></p>)}</div>}
        <button className={btnP + ' text-base px-6 min-h-[52px]'} onClick={() => onDone(built)}><Ic n="ArrowRight" />Ver o que fazer agora</button>
      </div>);
  }
  return (
    <div className="ob-root min-h-screen bg-[#0b0c0f] text-zinc-100 flex flex-col">
      {step > 0 && step < 7 && <header className="max-w-2xl w-full mx-auto px-5 pt-6 space-y-3">
        <div className="flex items-center gap-3"><button className="w-10 h-10 grid place-items-center rounded-lg text-zinc-400 hover:bg-white/5" aria-label="Voltar" onClick={back}><Ic n="ArrowLeft" /></button>
          <div className="flex-1 h-1.5 rounded-full bg-white/[0.07] overflow-hidden" role="progressbar" aria-valuemin={1} aria-valuemax={N} aria-valuenow={step} aria-label={`Passo ${step} de ${N}`}><div className="h-full rounded-full bar-anim" style={{ width: `${(step / N) * 100}%`, background: 'linear-gradient(90deg,#9f8fff,#2ee8c4)' }} /></div>
          <span className="text-xs text-zinc-500 tabular-nums w-10 text-right">{step}/{N}</span></div>
      </header>}
      <main key={step} className="flex-1 max-w-2xl w-full mx-auto px-5 py-8 view-in">{body}</main>
      {step > 0 && step < 7 && <footer className="sticky bottom-0 bg-[#0b0c0f]/95 backdrop-blur border-t border-white/[0.06]"><div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
        <button className="text-sm text-zinc-500 hover:text-zinc-300 px-2" onClick={() => { if (step === 4) set({ tasks: [] }); next(); }}>Pular</button>
        <span className="flex-1" />
        {step === 4 && a.tasks.length < 2 && <span className="text-xs text-zinc-500 hidden sm:inline">Escolha pelo menos 2, ou pule</span>}
        <button className={btnP + ' min-w-[160px]'} disabled={step === 4 && a.tasks.length === 1} onClick={next}>{step === N ? 'Montar minha semana' : 'Continuar'}<Ic n="ArrowRight" /></button>
      </div></footer>}
    </div>
  );
}
function Root() {
  const [phase, setPhase] = useState(() => { Cloud.handleRedirect(); return canCloud() && Cloud.user ? 'sync' : 'ready'; });
  const [ready, setReady] = useState(() => { try { return !!localStorage.getItem(KEY); } catch (e) { return true; } });
  const finish = (st) => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} setReady(true); };
  useEffect(() => {
    Pwa.register();
    if (phase !== 'sync') return;
    let done = false; const t = setTimeout(() => { if (!done) { done = true; setPhase('ready'); } }, 7000);
    let local = null; try { local = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    Cloud.reconcile(local && local.v === 4 ? local : null).then((r) => { if (done) return; done = true; clearTimeout(t); if (r.use === 'remote' && r.data && r.data.v === 4) finish(r.data); setPhase('ready'); });
  }, []);
  if (phase === 'sync') return <div className="min-h-screen grid place-items-center"><div className="text-center space-y-3"><div className="mx-auto w-fit pet-float"><Pet mood="calmo" size={72} /></div><p className="text-sm text-zinc-400">Buscando seus dados…</p></div></div>;
  if (!ready) return <Onboarding onDone={finish} onExample={() => finish({ ...freshSeed(), demo: true })} onCloud={(d) => finish(d)} />;
  return <App onRestart={() => { try { localStorage.removeItem(KEY); } catch (e) {} setReady(false); }} />;
}

if (typeof document !== 'undefined' && document.getElementById('root')) ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
