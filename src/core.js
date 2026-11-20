// WORKROOM AI — biznes mantiq (UI'siz)
import { useState, useEffect } from "react";

/* ============================ YORDAMCHI FUNKSIYALAR ============================ */
export const LS_KEY = "workroom_ai_v1";
export const pad = (n) => String(n).padStart(2, "0");
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/* ---- Kompaniya soati: server vaqti + kompaniya vaqt zonasi (qurilma soatini o‘zgartirib davomatni aldab bo‘lmaydi) ---- */
let clockOffset = 0, clockSynced = false, companyTZ = "Asia/Tashkent";
const tzFmt = new Map();
export const setCompanyTZ = (tz) => { companyTZ = tz || "Asia/Tashkent"; };
export const clockState = () => ({ synced: clockSynced, offsetSec: Math.round(clockOffset / 1000) });
export function companyNow() {
  const t = Date.now() + clockOffset;
  if (!tzFmt.has(companyTZ)) {
    let f = null;
    try { f = new Intl.DateTimeFormat("en-US", { timeZone: companyTZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }); } catch { }
    tzFmt.set(companyTZ, f);
  }
  const f = tzFmt.get(companyTZ);
  if (!f) return new Date(t);
  const p = Object.fromEntries(f.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  return new Date(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
}
export async function syncClock() {
  try {
    const t0 = Date.now();
    const r = await fetch("/api/time", { cache: "no-store" });
    if (!r.ok) return false;
    const j = await r.json(); const t1 = Date.now();
    if (typeof j.now !== "number") return false;
    clockOffset = j.now + (t1 - t0) / 2 - t1; clockSynced = true;
    return true;
  } catch { return false; }
}
export const todayISO = () => iso(companyNow());
export const addDays = (n, from = companyNow()) => { const d = new Date(from); d.setDate(d.getDate() + n); return iso(d); };
export const hm = (d = companyNow()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const toMin = (s) => { if (!s) return 0; const [h, m] = s.split(":").map(Number); return h * 60 + m; };
export const fromMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const uid = (p = "id") => p + "_" + Math.random().toString(36).slice(2, 9);
export const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
export const WEEKDAYS = ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"];
export const fmtDate = (s) => { if (!s) return "—"; const [y, m, d] = s.split("-").map(Number); return `${d}-${MONTHS[m - 1]}`; };
export const fmtLong = (d = companyNow()) => `${d.getDate()}-${MONTHS[d.getMonth()]}, ${WEEKDAYS[d.getDay()]}`;
export const money = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so‘m";
export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
export const norm = (s) => (s || "").toLowerCase().replace(/[‘’ʻʼ`]/g, "'");

export function mulberry32(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function pastWorkdays() {
  const now = companyNow(); const out = [];
  for (let d = 1; d < now.getDate(); d++) {
    const x = new Date(now.getFullYear(), now.getMonth(), d);
    if (x.getDay() !== 0 && x.getDay() !== 6) out.push(iso(x));
  }
  return out;
}
export const GRADS = [
  "from-fuchsia-500 to-violet-600", "from-cyan-400 to-blue-600", "from-amber-400 to-orange-600",
  "from-emerald-400 to-teal-600", "from-rose-400 to-pink-600", "from-indigo-400 to-purple-600", "from-lime-400 to-green-600",
];

/* ============================ NAMUNA MA'LUMOTLAR ============================ */
export const SAMPLE_EMPLOYEES = [
  { id: "e1", name: "Malika Karimova", role: "Marketing menejeri", salary: 9000000, color: 0, profile: { late: 0.15, lateMax: 8, absent: 1 } },
  { id: "e2", name: "Nigora Rahimova", role: "SMM mutaxassisi", salary: 7500000, color: 1, profile: { late: 0.05, lateMax: 5, absent: 0 } },
  { id: "e3", name: "Jasur Toshmatov", role: "Backend dasturchi", salary: 12000000, color: 2, profile: { late: 0.25, lateMax: 12, absent: 0 } },
  { id: "e4", name: "Aziz Qodirov", role: "Sotuv menejeri", salary: 8000000, color: 3, profile: { late: 0.3, lateMax: 15, absent: 0 } },
  { id: "e5", name: "Sardor Aliyev", role: "Grafik dizayner", salary: 8500000, color: 4, profile: { late: 0.55, lateMax: 28, absent: 1 } },
];

export function buildSampleData() {
  const rnd = mulberry32(2026);
  const employees = SAMPLE_EMPLOYEES.map(({ profile, ...e }) => ({ ...e, status: e.id === "e1" ? "sick" : "active", photo: null, descriptor: null }));
  const attendance = [];
  const days = pastWorkdays();
  SAMPLE_EMPLOYEES.forEach((e) => {
    const absentIdx = new Set();
    for (let i = 0; i < e.profile.absent && days.length > 3; i++) absentIdx.add(Math.floor(rnd() * days.length));
    days.forEach((d, i) => {
      if (absentIdx.has(i)) return;
      const isLate = rnd() < e.profile.late;
      const late = isLate ? 1 + Math.floor(rnd() * e.profile.lateMax) : 0;
      const inMin = isLate ? 540 + late : 540 - Math.floor(rnd() * 18);
      const outMin = 1080 + Math.floor(rnd() * 35);
      attendance.push({ id: uid("a"), empId: e.id, date: d, in: fromMin(inMin), out: fromMin(outMin), late, method: "face" });
    });
  });
  const t = todayISO();
  attendance.push({ id: uid("a"), empId: "e3", date: t, in: "08:52", out: null, late: 0, method: "face" });
  attendance.push({ id: uid("a"), empId: "e4", date: t, in: "09:14", out: null, late: 14, method: "face" });

  const tasks = [
    { id: "t1", title: "Yangi yil aksiyasi uchun reklama matnlari", assigneeId: "e1", deadline: addDays(1), priority: "Yuqori", status: "progress", source: "manual" },
    { id: "t2", title: "Dekabr oyi Instagram kontent-rejasi", assigneeId: "e1", deadline: addDays(3), priority: "O‘rta", status: "todo", source: "manual" },
    { id: "t3", title: "Mijozlar bazasini CRM'ga ko‘chirish", assigneeId: "e1", deadline: addDays(-4), priority: "O‘rta", status: "done", source: "meeting" },
    { id: "t4", title: "Telegram kanal uchun 7 kunlik postlar", assigneeId: "e2", deadline: addDays(-2), priority: "O‘rta", status: "done", source: "manual" },
    { id: "t5", title: "Reels uchun ssenariylar (5 ta)", assigneeId: "e2", deadline: addDays(2), priority: "O‘rta", status: "progress", source: "meeting" },
    { id: "t6", title: "To‘lov tizimi API'ni yangilash", assigneeId: "e3", deadline: addDays(-6), priority: "Yuqori", status: "done", source: "meeting" },
    { id: "t7", title: "Sayt tezligini optimallashtirish", assigneeId: "e3", deadline: addDays(-3), priority: "O‘rta", status: "done", source: "manual" },
    { id: "t8", title: "Admin panel uchun hisobotlar moduli", assigneeId: "e3", deadline: addDays(5), priority: "O‘rta", status: "todo", source: "manual" },
    { id: "t9", title: "Korporativ mijozlar bilan 10 ta uchrashuv", assigneeId: "e4", deadline: addDays(-1), priority: "Yuqori", status: "done", source: "meeting" },
    { id: "t10", title: "Noyabr savdo hisobotini tayyorlash", assigneeId: "e4", deadline: addDays(-2), priority: "O‘rta", status: "progress", source: "manual" },
    { id: "t11", title: "Brendbuk yangilanishi", assigneeId: "e5", deadline: addDays(-5), priority: "Past", status: "progress", source: "manual" },
    { id: "t12", title: "Yangi qadoq dizayni (3 variant)", assigneeId: "e5", deadline: addDays(-1), priority: "Yuqori", status: "done", source: "meeting" },
  ];
  const notifications = [
    { id: "n1", kind: "reassign", fromId: "e1", toId: "e2", taskIds: ["t1", "t2"], at: hm() },
    { id: "n2", kind: "late", empId: "e4", late: 14, at: "09:14" },
  ];
  return { employees, attendance, tasks, notifications };
}

export function genCode(company) {
  const letters = (company || "").toUpperCase().replace(/[^A-Z]/g, "");
  const pre = (letters.slice(0, 2) || "WR").padEnd(2, "X");
  return "#" + pre + Math.floor(1000 + Math.random() * 9000);
}

export const DEFAULT_SETTINGS = { workStart: "09:00", penaltyPerMin: 2000, grace: 0 };

export function demoDb() {
  const s = buildSampleData();
  return {
    room: { name: "Eco Market MChJ", code: "#UZ2026", admin: "Rahbar", createdAt: todayISO() },
    settings: { ...DEFAULT_SETTINGS }, meetings: [], ...s,
  };
}

/* ============================ YUZ DESKRIPTORI (prototip) ============================ */
export function frameData(video) {
  const vw = video.videoWidth, vh = video.videoHeight; if (!vw) return null;
  const side = Math.min(vw, vh) * 0.62, sx = (vw - side) / 2, sy = (vh - side) / 2 - side * 0.05;
  const c = document.createElement("canvas"); c.width = 24; c.height = 24;
  const g = c.getContext("2d"); g.drawImage(video, sx, sy, side, side, 0, 0, 24, 24);
  const px = g.getImageData(0, 0, 24, 24).data; const v = [];
  for (let i = 0; i < px.length; i += 4) v.push(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
  const mean = v.reduce((a, b) => a + b, 0) / v.length; let nrm = 0;
  for (let i = 0; i < v.length; i++) { v[i] -= mean; nrm += v[i] * v[i]; }
  nrm = Math.sqrt(nrm) || 1; const desc = v.map((x) => +(x / nrm).toFixed(4));
  const p = document.createElement("canvas"); p.width = 160; p.height = 160;
  const pg = p.getContext("2d"); pg.translate(160, 0); pg.scale(-1, 1); pg.drawImage(video, sx, sy, side, side, 0, 0, 160, 160);
  return { descriptor: desc, photo: p.toDataURL("image/jpeg", 0.7) };
}
export const similarity = (a, b) => { if (!a || !b || a.length !== b.length) return -1; let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

/* ============================ KPI VA MAOSH ============================ */
export function computePayroll(db) {
  const today = todayISO(); const month = today.slice(0, 7);
  const past = pastWorkdays(); const isWeekend = [0, 6].includes(companyNow().getDay());
  return db.employees.map((e) => {
    const recs = db.attendance.filter((a) => a.empId === e.id && a.date.slice(0, 7) === month);
    const presentDays = new Set(recs.map((r) => r.date));
    const presentToday = presentDays.has(today);
    const workDays = past.length + (presentToday || (!isWeekend && e.status === "active" && false) ? 1 : 0);
    const present = presentDays.size;
    const lateMin = recs.reduce((s, r) => s + (r.late || 0), 0);
    const lateDays = recs.filter((r) => r.late > 0).length;
    const tasks = db.tasks.filter((t) => t.assigneeId === e.id);
    const done = tasks.filter((t) => t.status === "done").length;
    const overdue = tasks.filter((t) => t.status !== "done" && t.deadline < today).length;
    const att = workDays ? Math.min(100, (present / workDays) * 100) : 100;
    const punct = Math.max(0, 100 - lateMin * 0.8);
    // Adolat: muddati hali kelmagan vazifalar KPI'ni pasaytirmaydi — faqat bajarilgan yoki muddati o‘tganlar hisoblanadi.
    const considered = tasks.filter((t) => t.status === "done" || t.deadline < today).length;
    const taskScore = considered ? (done / considered) * 100 : 80;
    const kpi = Math.round(att * 0.35 + punct * 0.2 + taskScore * 0.45);
    const bonusPct = kpi >= 90 ? 0.2 : kpi >= 80 ? 0.12 : kpi >= 70 ? 0.05 : 0;
    const bonus = e.salary * bonusPct;
    const penalty = Math.min(e.salary * 0.15, lateMin * (db.settings.penaltyPerMin || 0));
    return { emp: e, present, workDays, lateMin, lateDays, tasks: tasks.length, done, overdue, att, punct, taskScore, kpi, bonusPct, bonus, penalty, final: e.salary + bonus - penalty };
  });
}

/* ============================ MAJLIS TAHLILI (lokal) ============================ */
export const TASK_RE = /(tayyorla|qil|yubor|yoz|ishla|tekshir|chiqar|yangila|o'tkaz|topshir|hisobla|tuz|taqdim|ishga tushir|bajar|tahlil|sozla|jo'nat)/;
export const DAY_RE = /\b(dushanba|seshanba|chorshanba|payshanba|juma|shanba|yakshanba)/;
export function parseDeadline(t) {
  const now = companyNow();
  if (/\bertaga/.test(t)) return addDays(1);
  if (/\bindinga/.test(t)) return addDays(2);
  if (/\bbugun/.test(t)) return addDays(0);
  const m = t.match(/(\d{1,2})[- ]?(yanvar|fevral|mart|aprel|may|iyun|iyul|avgust|sentabr|oktabr|noyabr|dekabr)/);
  if (m) { const mi = MONTHS.indexOf(m[2]); let y = now.getFullYear(); if (mi < now.getMonth()) y++; return iso(new Date(y, mi, +m[1])); }
  const d = t.match(DAY_RE);
  if (d) { const wd = WEEKDAYS.indexOf(d[1]); const diff = (wd - now.getDay() + 7) % 7; return addDays(diff); }
  if (/hafta oxiri|shu hafta/.test(t)) { let diff = (5 - now.getDay() + 7) % 7 || 7; return addDays(diff); }
  if (/keyingi hafta/.test(t)) return addDays(7);
  return addDays(5);
}
export function parsePriority(t) {
  if (/(shoshilinch|zudlik|kritik|birinchi navbat|muhim)/.test(t)) return "Yuqori";
  if (/(vaqt bo'lsa|keyinroq|shoshilmasdan|imkon bo'lsa)/.test(t)) return "Past";
  return "O‘rta";
}
export function cleanTitle(s, name) {
  let x = s.trim();
  if (name) x = x.replace(new RegExp("^" + name + "[a-z'‘’]*[,:]?\\s*", "i"), "");
  x = x.replace(/^(men|ok|xo'p|xo‘p|demak|yaxshi)[,\s]+/i, "");
  x = x.replace(/\b(dushanba|seshanba|chorshanba|payshanba|juma|shanba|yakshanba)(\s*kun(igacha|gacha|i)?|gacha)?/gi, "");
  x = x.replace(/\b(ertaga|indinga|bugun|keyingi haftada?|hafta oxirigacha|vaqt bo['‘’]lsa,?)/gi, "");
  x = x.replace(/\d{1,2}[- ]?(yanvar|fevral|mart|aprel|may|iyun|iyul|avgust|sentabr|oktabr|noyabr|dekabr)(gacha)?/gi, "");
  x = x.replace(/\s{2,}/g, " ").replace(/\s+([,.])/g, "$1").replace(/^[,\s]+|[,\s.]+$/g, "");
  return cap(x).slice(0, 90);
}
export function localAnalyze(lines, employees) {
  const items = []; const decisions = []; const speakers = new Set();
  lines.forEach((ln) => {
    speakers.add(ln.speaker);
    const whole = norm(ln.text);
    ln.text.split(/(?<=[.!?])\s+/).forEach((s) => { if (/(qaror|tasdiqlandi|kelishib olindi)/.test(norm(s))) decisions.push(s.replace(/^qaror\s*:\s*/i, "")); });
    const sentences = ln.text.split(/(?<=[.!?])\s+/);
    for (const s of sentences) {
      const ns = norm(s);
      if (!TASK_RE.test(ns)) continue;
      let emp = employees.find((e) => new RegExp("\\b" + norm(e.name.split(" ")[0]) + "\\b").test(ns.split(/\s+/).slice(0, 2).join(" ")) || ns.startsWith(norm(e.name.split(" ")[0])));
      let first = emp ? emp.name.split(" ")[0] : null;
      if (!emp && /^men\b/.test(ns)) { emp = employees.find((e) => e.name === ln.speakerName || e.id === ln.speakerId); first = null; }
      if (!emp) continue;
      items.push({ id: uid("ai"), title: cleanTitle(s, first), assigneeId: emp.id, deadline: parseDeadline(whole), priority: parsePriority(whole) });
      break;
    }
  });
  const agenda = lines.find((l) => /mavzu/.test(norm(l.text)));
  const names = [...new Set(items.map((i) => employees.find((e) => e.id === i.assigneeId)?.name.split(" ")[0]))].join(", ");
  const summary = `Majlisda ${speakers.size} nafar ishtirokchi qatnashdi. ${agenda ? "Asosiy mavzu: " + agenda.text.replace(/^.*mavzusi?\s*[—:-]?\s*/i, "") + " " : ""}Muhokama davomida ${items.length} ta aniq vazifa belgilandi${names ? " — mas’ullar: " + names : ""}. ${decisions.length ? "Qabul qilingan asosiy qaror: " + cap(decisions[decisions.length - 1]) : "Yakuniy qarorlar keyingi majlisda tasdiqlanadi."}`;
  return { summary, decisions, items, engine: "Lokal AI" };
}

export const DEMO_MEETING = [
  { who: "admin", text: "Assalomu alaykum, jamoa. Bugungi majlis mavzusi — yangi yil aksiyasi va dekabr savdo rejasi." },
  { who: "e3", text: "Saytdagi to‘lov tizimi tayyor, faqat Click integratsiyasini tekshirish qoldi." },
  { who: "admin", text: "Jasur, Click integratsiyasini juma kunigacha to‘liq tekshirib, ishga tushiring. Bu shoshilinch." },
  { who: "e2", text: "Malika kasal bo‘lgani uchun Instagram sahifasini vaqtincha men yuritaman." },
  { who: "admin", text: "Kelishdik. Nigora, aksiya uchun 10 ta post va 5 ta Reels rejasini ertaga tayyorlang." },
  { who: "e5", text: "Aksiya bannerlari uchun yangi dizayn konsepsiyasi kerak bo‘ladi." },
  { who: "admin", text: "Sardor, banner va qadoq dizaynini chorshanba kuni taqdim qiling. Bu muhim." },
  { who: "e4", text: "O‘tgan oy savdo 18 foizga oshdi, lekin korporativ mijozlar hali kam." },
  { who: "admin", text: "Aziz, 20 ta korporativ mijozga tijorat taklifini dushanbagacha yuboring." },
  { who: "e4", text: "Tushunarli, mijozlar ro‘yxati menda bor." },
  { who: "e3", text: "Men aksiya sahifasi uchun promo-kod tizimini ham yozib beraman, vaqt bo‘lsa keyingi haftada." },
  { who: "admin", text: "Yaxshi. Qaror: aksiya 15-dekabrdan boshlanadi. Hammaga rahmat!" },
];

/* ============================ AI MENTOR BILIM BAZASI ============================ */
export const MENTOR_KB = [
  { k: /(ish vaqt|soat nech|qachon kel|jadval)/, a: (db) => `Ish vaqti dushanbadan jumagacha, soat ${db.settings.workStart} dan 18:00 gacha. Tushlik 13:00–14:00. Ishga kelish va ketish Face ID orqali qayd etiladi — kirishda kameraga 2 soniya qarab turing.` },
  { k: /(kechik|jarima)/, a: (db) => `${db.settings.workStart} dan keyin kelish kechikish hisoblanadi. Har bir daqiqa uchun ${money(db.settings.penaltyPerMin)} jarima yoziladi (oyiga oylikning 15% idan oshmaydi). Kechikishlar KPI'ning "Intizom" qismiga ham ta’sir qiladi.` },
  { k: /(kpi|bonus|baho)/, a: () => `KPI uch qismdan iborat: Davomat (35%), Intizom/kechikishlar (20%) va bajarilgan vazifalar (45%, muddati hali kelmagan vazifalar hisobga olinmaydi). KPI 90%+ bo‘lsa — 20% bonus, 80%+ — 12%, 70%+ — 5%. Hammasi AI Buxgalter bo‘limida avtomatik hisoblanadi.` },
  { k: /(ta'til|tatil|dam ol|otpusk)/, a: () => `Ta’tilga chiqish uchun kamida 14 kun oldin rahbarga yozma ariza berasiz. Yillik ta’til — 21 ish kuni. Ta’til davomida vazifalaringizni AI Assistant avtomatik ravishda hamkasbingizga o‘tkazishni taklif qiladi.` },
  { k: /(kasal|betob)/, a: () => `Kasal bo‘lsangiz, ertalab 09:00 gacha rahbarga xabar bering. Tizim sizni "Kasal" holatiga o‘tkazadi va AI Assistant shoshilinch vazifalaringizni boshqa xodimga o‘tkazishni taklif qiladi.` },
  { k: /(majlis|uchrashuv|meeting)/, a: () => `Majlislar "Majlislar" bo‘limida o‘tadi. Meeting AI o‘zbekcha nutqni yozib boradi, oxirida xulosa va vazifalar ro‘yxatini tuzadi. Sizga biriktirilgan vazifalar avtomatik doskaga tushadi.` },
  { k: /(kiyim|dress)/, a: () => `Kiyinish uslubi — "biznes-kezhual". Mijozlar bilan uchrashuv kunlari klassik uslub tavsiya etiladi.` },
  { k: /(maosh|oylik|ish haqi)/, a: () => `Oylik har oyning 5-sanasida kartaga o‘tkaziladi. Yakuniy summa = asosiy oylik + KPI bonusi − kechikish jarimalari. Batafsil hisobni AI Buxgalter bo‘limida ko‘rish mumkin.` },
];

/* ============================ ZAXIRA (eksport / import) ============================ */
export function downloadBackup(db) {
  const blob = new Blob([JSON.stringify({ app: "workroom-ai", version: 1, exportedAt: new Date().toISOString(), data: db }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `workroom-zaxira-${todayISO()}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function parseBackup(text) {
  const raw = JSON.parse(text); const d = raw && raw.app === "workroom-ai" ? raw.data : raw;
  const ok = d && d.room && typeof d.room.code === "string" && typeof d.room.name === "string" && ["employees", "attendance", "tasks"].every((k) => Array.isArray(d[k]));
  if (!ok) throw new Error("format");
  return { meetings: [], notifications: [], ...d, settings: { ...DEFAULT_SETTINGS, ...(d.settings || {}) } };
}
export function readBackupFile(file) {
  return new Promise((res, rej) => {
    if (!file) return rej(new Error("nofile"));
    if (file.size > 20 * 1024 * 1024) return rej(new Error("size"));
    const r = new FileReader(); r.onload = () => { try { res(parseBackup(String(r.result))); } catch (e) { rej(e); } }; r.onerror = () => rej(new Error("read")); r.readAsText(file);
  });
}


/* ============================ FACE ID MODELI (face-api) ============================ */
// Saytda: /vendor/face-api.js + /models (TinyFaceDetector + 68 landmark tiny + FaceRecognitionNet, 128-o‘lchamli deskriptor).
// Yuklanmasa (masalan, Claude artifact ichida) — prototip algoritmiga qaytadi.
export let faceApiPromise = null; let faceApiState = "idle"; // idle | loading | ready | failed
export const faceApiListeners = new Set();
export const setFaceApiState = (s) => { faceApiState = s; faceApiListeners.forEach((f) => f(s)); };
export function loadFaceApi() {
  if (faceApiPromise) return faceApiPromise;
  setFaceApiState("loading");
  faceApiPromise = new Promise((res, rej) => {
    if (window.faceapi) return res(window.faceapi);
    const sc = document.createElement("script"); sc.src = "/vendor/face-api.js"; sc.async = true;
    sc.onload = () => (window.faceapi ? res(window.faceapi) : rej(new Error("no faceapi")));
    sc.onerror = () => rej(new Error("load failed"));
    document.head.appendChild(sc);
  }).then(async (fa) => {
    try { await fa.tf.setBackend("webgl"); } catch { }
    await fa.tf.ready();
    await Promise.all([
      fa.nets.tinyFaceDetector.loadFromUri("/models"),
      fa.nets.faceLandmark68TinyNet.loadFromUri("/models"),
      fa.nets.faceRecognitionNet.loadFromUri("/models"),
    ]);
    setFaceApiState("ready"); return fa;
  });
  faceApiPromise.catch(() => setFaceApiState("failed"));
  return faceApiPromise;
}
export function useFaceApiState() {
  const [s, setS] = useState(faceApiState);
  useEffect(() => { faceApiListeners.add(setS); return () => faceApiListeners.delete(setS); }, []);
  return s;
}
export const detOpts = (fa) => new fa.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
export function cropPhoto(video, box) {
  const vw = video.videoWidth, vh = video.videoHeight;
  const side = Math.min(Math.max(box.width, box.height) * 1.6, vw, vh);
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const sx = Math.max(0, Math.min(vw - side, cx - side / 2)), sy = Math.max(0, Math.min(vh - side, cy - side / 2));
  const c = document.createElement("canvas"); c.width = 160; c.height = 160;
  const g = c.getContext("2d"); g.translate(160, 0); g.scale(-1, 1); g.drawImage(video, sx, sy, side, side, 0, 0, 160, 160);
  return c.toDataURL("image/jpeg", 0.75);
}
// Natija: {descriptor, photo, kind} | {error}
export async function captureFace(video) {
  if (faceApiState !== "failed") {
    try {
      const fa = await loadFaceApi();
      const r = await fa.detectSingleFace(video, detOpts(fa)).withFaceLandmarks(true).withFaceDescriptor();
      if (!r) return { error: "noface" };
      return { descriptor: Array.from(r.descriptor, (x) => +x.toFixed(5)), photo: cropPhoto(video, r.detection.box), kind: "faceapi" };
    } catch { /* prototipga qaytamiz */ }
  }
  const d = frameData(video);
  return d ? { ...d, kind: "legacy" } : { error: "noface" };
}
// Eng yaqin xodimni topish. faceapi: evklid masofa (<0.5 = o‘sha odam); legacy: korrelyatsiya (>0.6)
export function matchFace(sample, employees) {
  let best = null, score = -1, dist = 9;
  employees.filter((e) => e.descriptor && (e.faceKind || "legacy") === sample.kind).forEach((e) => {
    if (sample.kind === "faceapi") {
      let s = 0; for (let i = 0; i < 128; i++) { const d = sample.descriptor[i] - e.descriptor[i]; s += d * d; }
      const dd = Math.sqrt(s); if (dd < dist) { dist = dd; best = e; }
    } else { const sim = similarity(sample.descriptor, e.descriptor); if (sim > score) { score = sim; best = e; } }
  });
  if (sample.kind === "faceapi") return { emp: dist < 0.5 ? best : null, sim: Math.max(0, 1 - dist), candidates: !!best };
  return { emp: score >= 0.6 ? best : null, sim: Math.max(0, score), candidates: !!best };
}


/* ============================ TEZKOR VAZIFA (tabiiy til) ============================ */
// "Nigora ertaga 10 ta post tayyorlasin, shoshilinch" -> {title, assigneeId, deadline, priority}
const DATE_HINT = /(ertaga|indinga|bugun|dushanba|seshanba|chorshanba|payshanba|juma|shanba|yakshanba|hafta|\d{1,2}[- ]?(yanvar|fevral|mart|aprel|may|iyun|iyul|avgust|sentabr|oktabr|noyabr|dekabr))/;
export function parseQuickTask(text, employees) {
  const t = norm(text);
  let emp = null, first = null;
  for (const e of employees) {
    const f = norm(e.name.split(" ")[0]);
    if (new RegExp("(^|[\\s@,])" + f + "(ga|ning|jon)?\\b").test(t)) { emp = e; first = e.name.split(" ")[0]; break; }
  }
  let title = text.replace(/@\S+/g, " ");
  if (first) title = title.replace(new RegExp("(^|\\s)" + first + "(ga|ning|jon)?[,:]?(?=\\s|$)", "i"), " ");
  title = title.replace(/[,—-]?\s*\b(shoshilinch|zudlik bilan|muhim|kritik|vaqt bo['‘’]lsa|keyinroq)\b/gi, " ");
  title = cleanTitle(title, null);
  return {
    title: title || cap(text.trim()),
    assigneeId: emp?.id || null,
    deadline: DATE_HINT.test(t) ? parseDeadline(t) : addDays(3),
    priority: parsePriority(t),
  };
}

/* ============================ DAVOMAT ============================ */
// Avval reja tuziladi (vaqtlar bir marta hisoblanadi), keyin draft'ga qo‘llanadi.
export function planAttendance(db, empId, method) {
  const today = todayISO(); const ws = toMin(db.settings.workStart);
  const existing = db.attendance.find((a) => a.empId === empId && a.date === today);
  if (existing && !existing.out) {
    const out = method === "demo" ? fromMin(Math.max(toMin(hm()), 1080 + Math.floor(Math.random() * 20))) : hm();
    return { type: "out", time: out, recId: existing.id };
  }
  if (existing && existing.out) return { type: "done", time: existing.out };
  const inMin = method === "demo" ? ws - 15 + Math.floor(Math.random() * 40) : toMin(hm());
  const late = Math.max(0, inMin - ws - (db.settings.grace || 0));
  return { type: "in", time: fromMin(inMin), late, rec: { id: uid("a"), empId, date: today, in: fromMin(inMin), out: null, late, method } };
}
export function applyAttendance(d, plan, empId) {
  if (plan.type === "out") { const r = d.attendance.find((a) => a.id === plan.recId); if (r) r.out = plan.time; }
  if (plan.type === "in") {
    d.attendance.push(plan.rec);
    const e = d.employees.find((x) => x.id === empId); if (e && e.status === "sick") e.status = "active";
    if (plan.late >= 10) d.notifications.unshift({ id: uid("n"), kind: "late", empId, late: plan.late, at: plan.rec.in });
  }
}
export function todayStatus(db, emp) {
  const r = db.attendance.find((a) => a.empId === emp.id && a.date === todayISO());
  if (r) return r.out ? { key: "left", label: "Ketdi " + r.out, color: "cyan", rec: r } : r.late ? { key: "late", label: `Keldi ${r.in} · +${r.late} daq`, color: "amber", rec: r } : { key: "in", label: "Keldi " + r.in, color: "emerald", rec: r };
  if (emp.status === "sick") return { key: "sick", label: "Kasal", color: "rose" };
  if (emp.status === "vacation") return { key: "vacation", label: "Ta’tilda", color: "cyan" };
  return { key: "absent", label: "Hali kelmagan", color: "slate" };
}
// Xodim holatini o‘zgartirish + kerak bo‘lsa vazifalarni qayta taqsimlash taklifi
export function applyStatus(d, empId, status) {
  const x = d.employees.find((y) => y.id === empId); if (!x) return; x.status = status;
  d.notifications = d.notifications.filter((n) => !(n.kind === "reassign" && n.fromId === empId));
  if (status === "active") return;
  const open = d.tasks.filter((t) => t.assigneeId === empId && t.status !== "done");
  const cands = d.employees.filter((y) => y.id !== empId && y.status === "active");
  if (!open.length || !cands.length) return;
  const load = (id) => d.tasks.filter((t) => t.assigneeId === id && t.status !== "done").length;
  const best = cands.sort((a, b) => load(a.id) - load(b.id))[0];
  d.notifications.unshift({ id: uid("n"), kind: "reassign", fromId: empId, toId: best.id, taskIds: open.map((t) => t.id), at: hm() });
}
export function monthDays() {
  const now = companyNow(); const out = [];
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  for (let d = 1; d <= last; d++) { const x = new Date(now.getFullYear(), now.getMonth(), d); out.push({ iso: iso(x), day: d, dow: x.getDay(), weekend: x.getDay() === 0 || x.getDay() === 6 }); }
  return out;
}
export const greeting = (d = companyNow()) => (d.getHours() < 12 ? "Xayrli tong" : d.getHours() < 18 ? "Xayrli kun" : "Xayrli kech");

/* ============================ TELEGRAM XABARLARI ============================ */
export const TG_DEFAULTS = { token: null, chatTitle: "", linkCode: null, notifyEach: true, summary: true, summaryAfter: 30, lastSummary: null };
export const tgSettings = (db) => ({ ...TG_DEFAULTS, ...(db.settings.telegram || {}) });
export const newLinkCode = () => Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join("");
export async function tgApi(body) {
  try {
    const r = await apiPost("/api/telegram", body);
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, ...j } : { ok: false, ...j };
  } catch { return { ok: false, error: "Serverga ulanib bo‘lmadi" }; }
}
export function tgNotify(db, payload) {
  const t = tgSettings(db); if (!t.token) return Promise.resolve({ ok: false });
  return tgApi({ action: "notify", token: t.token, company: db.room.name, ...payload });
}
export function buildSummary(db) {
  const today = todayISO();
  const recs = db.attendance.filter((a) => a.date === today);
  const first = (e) => e.name;
  const absent = [], sick = [], lateList = [];
  db.employees.forEach((e) => {
    const r = recs.find((a) => a.empId === e.id);
    if (r) { if (r.late) lateList.push(`${first(e)} (+${r.late} daq)`); }
    else if (e.status === "sick" || e.status === "vacation") sick.push(first(e));
    else absent.push(first(e));
  });
  return { kind: "summary", time: hm(), present: new Set(recs.map((r) => r.empId)).size, total: db.employees.length, absent, sick, lateList };
}
// Ertalabki hisobot vaqti keldimi? (ish kuni, ish boshlanishi + N daqiqadan keyingi 3 soat ichida, bugun hali yuborilmagan)
export function summaryDue(db, now = companyNow()) {
  const t = tgSettings(db);
  if (!t.token || !t.summary || [0, 6].includes(now.getDay())) return false;
  const at = toMin(db.settings.workStart) + Number(t.summaryAfter || 30), m = now.getHours() * 60 + now.getMinutes();
  return m >= at && m < at + 180 && t.lastSummary !== todayISO();
}

/* ============================ XAVFSIZLIK: PIN ============================ */
// PIN hech qachon ochiq saqlanmaydi: PBKDF2-SHA256 (150 000 iteratsiya) + tasodifiy tuz.
export const SEC_DEFAULTS = { pinSalt: null, pinHash: null, autoLockMin: 10, liveness: true };
export const secSettings = (db) => ({ ...SEC_DEFAULTS, ...(db?.settings?.security || {}) });
export const hasPin = (db) => !!secSettings(db).pinHash;
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const unhex = (h) => new Uint8Array(h.match(/../g).map((x) => parseInt(x, 16)));
export async function hashPin(pin, saltHex) {
  const salt = saltHex ? unhex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(String(pin)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 150000 }, key, 256);
  return { pinSalt: hex(salt), pinHash: hex(bits) };
}
export async function verifyPin(db, pin) {
  const s = secSettings(db); if (!s.pinHash) return true;
  const { pinHash } = await hashPin(pin, s.pinSalt);
  let d = 0; for (let i = 0; i < pinHash.length; i++) d |= pinHash.charCodeAt(i) ^ s.pinHash.charCodeAt(i);
  return d === 0 && pinHash.length === s.pinHash.length;
}
export const validPin = (pin) => /^\d{4,8}$/.test(String(pin));
// Xato urinishlar: 5 tadan keyin kutish (30s, 60s, 120s, ... 15 daqiqagacha)
const FAIL_KEY = "workroom_pin_fail";
export function pinLockout() {
  try { const f = JSON.parse(localStorage.getItem(FAIL_KEY)) || {}; return Math.max(0, (f.until || 0) - Date.now()); } catch { return 0; }
}
export function pinFail() {
  let f = {}; try { f = JSON.parse(localStorage.getItem(FAIL_KEY)) || {}; } catch { }
  f.count = (f.count || 0) + 1;
  if (f.count >= 5) f.until = Date.now() + Math.min(15 * 60, 30 * 2 ** (f.count - 5)) * 1000;
  try { localStorage.setItem(FAIL_KEY, JSON.stringify(f)); } catch { }
  return f;
}
export function pinOk() { try { localStorage.removeItem(FAIL_KEY); } catch { } }

/* ============================ SERVER SO‘ROVLARI ============================ */
// Server POST so‘rovlar uchun sessiya cookie va maxsus sarlavha talab qiladi.
// Server qayta ishga tushsa (cookie eskirsa), sahifani qayta so‘rab cookie yangilanadi va so‘rov takrorlanadi.
export async function apiPost(url, body) {
  const go = () => fetch(url, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "X-Workroom": "1" }, body: JSON.stringify(body) });
  let r = await go();
  if (r.status === 401) {
    const j = await r.clone().json().catch(() => ({}));
    if (j.reauth) { await fetch("/", { credentials: "same-origin", cache: "no-store" }).catch(() => {}); r = await go(); }
  }
  return r;
}

/* ============================ TIRIKLIK (liveness) ============================ */
// Bosh burilishi: burun uchining yuz chetlariga nisbatan siljishi (68 nuqtali landmark: 0 va 16 — yuz cheti, 30 — burun uchi)
export function yawFromLandmarks(pts) {
  if (!pts || pts.length < 31) return null;
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const l = d(pts[30], pts[0]), r = d(pts[30], pts[16]);
  return l + r ? (l - r) / (l + r) : null;
}
export const LIVENESS = { range: 0.22, timeoutMs: 8000 };
