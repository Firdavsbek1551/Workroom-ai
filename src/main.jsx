// WORKROOM AI — ilova qobig‘i: navigatsiya, AI yordamchi, sozlamalar
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
/* AUTO-IMPORTS */
import { Bot, Building2, Check, Clock, Copy, Download, Home, ListChecks, Lock, LogOut, RefreshCw, ScanFace, Send, Server, Settings, Shield, Upload, Users, Video, Wallet, X, Zap } from "lucide-react";
import { LS_KEY, MENTOR_KB, apiPost, buildSummary, clockState, computePayroll, demoDb, downloadBackup, fmtDate, genCode, hasPin, norm, readBackupFile, secSettings, setCompanyTZ, summaryDue, syncClock, tgNotify, tgSettings, todayISO, todayStatus, uid } from "./core.js";
import { Btn, Field, Modal, Sheet, Store, Toasts, inputCls, useStore } from "./ui.jsx";
import { MeetingPage } from "./pages/Meeting.jsx";
import { TasksPage } from "./pages/Tasks.jsx";
import { TodayPage } from "./pages/Today.jsx";
import { LockScreen, SecuritySection } from "./pages/Security.jsx";
import { PayrollPage } from "./pages/Payroll.jsx";
import { TelegramSection } from "./pages/Telegram.jsx";
import { KioskPage } from "./pages/Kiosk.jsx";
import { PersonSheet, TeamPage } from "./pages/Team.jsx";
import { Landing, Wizard } from "./pages/Onboarding.jsx";
/* END-IMPORTS */

const TABS = [
  ["bugun", "Bugun", Home], ["vazifalar", "Vazifalar", ListChecks], ["majlis", "Majlis", Video],
  ["jamoa", "Jamoa", Users], ["maosh", "Maosh", Wallet],
];
const ROUTES = [...TABS.map((t) => t[0]), "kiosk"];

/* ============================ AI YORDAMCHI (suzuvchi chat) ============================ */
function officeFacts(db) {
  const st = db.employees.map((e) => `${e.name}: ${todayStatus(db, e).label}`);
  const pay = computePayroll(db).sort((a, b) => b.kpi - a.kpi).map((p) => `${p.emp.name} KPI ${p.kpi}%`);
  return [`Bugungi holat: ${st.join("; ")}`, `KPI reytingi: ${pay.join(", ")}`];
}

function Assistant({ open, setOpen }) {
  const { db, ai } = useStore();
  const [me, setMe] = useState("admin");
  const [msgs, setMsgs] = useState([{ id: "w", from: "ai", text: "Salom! Men WORKROOM AI yordamchisiman. Ofis holati, ichki qoidalar, KPI yoki vazifalar haqida so‘rang." }]);
  const [q, setQ] = useState(""); const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs, busy, open]);

  const localAnswer = (text) => {
    const t = norm(text); const emp = db.employees.find((e) => e.id === me);
    const first = (e) => e.name.split(" ")[0];
    if (/kim.*(kelmadi|yo'q|kelmagan)/.test(t)) {
      const xs = db.employees.filter((e) => ["absent", "sick", "vacation"].includes(todayStatus(db, e).key));
      return xs.length ? "Bugun ofisda yo‘q: " + xs.map((e) => `${first(e)} (${todayStatus(db, e).label.toLowerCase()})`).join(", ") + "." : "Bugun hamma ofisda!";
    }
    if (/kim.*kechik|kechikkan/.test(t)) {
      const xs = db.attendance.filter((a) => a.date === todayISO() && a.late > 0);
      return xs.length ? "Bugun kechikkanlar: " + xs.map((a) => `${first(db.employees.find((e) => e.id === a.empId) || { name: "?" })} — ${a.late} daq (${a.in})`).join(", ") + "." : "Bugun hech kim kechikmadi.";
    }
    if (/(reyting|eng yaxshi|kim yaxshi)/.test(t)) {
      const p = computePayroll(db).sort((a, b) => b.kpi - a.kpi).slice(0, 3);
      return "KPI bo‘yicha eng yaxshilar: " + p.map((x, i) => `${i + 1}. ${x.emp.name} — ${x.kpi}%`).join(", ") + ".";
    }
    if (/(muddati o'tgan|kechikkan vazifa)/.test(t)) {
      const xs = db.tasks.filter((x) => x.status !== "done" && x.deadline < todayISO());
      return xs.length ? `Muddati o‘tgan ${xs.length} ta vazifa:\n` + xs.map((x) => `• ${x.title} — ${first(db.employees.find((e) => e.id === x.assigneeId) || { name: "?" })}, ${fmtDate(x.deadline)}`).join("\n") : "Muddati o‘tgan vazifa yo‘q.";
    }
    if (/(vazifa|nima qil|topshiriq)/.test(t)) {
      if (!emp) {
        const open = db.tasks.filter((x) => x.status !== "done");
        return `Jamoada ${open.length} ta ochiq vazifa bor. ` + db.employees.map((e) => `${first(e)}: ${open.filter((x) => x.assigneeId === e.id).length}`).join(", ") + ". Batafsil — “Vazifalar” bo‘limida.";
      }
      const ts = db.tasks.filter((x) => x.assigneeId === emp.id && x.status !== "done");
      return ts.length ? `${first(emp)}, sizda ${ts.length} ta faol vazifa bor:\n` + ts.map((x, i) => `${i + 1}. ${x.title} — ${fmtDate(x.deadline)} (${x.priority})`).join("\n") : `${first(emp)}, hozircha faol vazifangiz yo‘q.`;
    }
    if (/(kpi|natija).*(men|mening)|mening kpi/.test(t) && emp) {
      const p = computePayroll(db).find((x) => x.emp.id === emp.id);
      return `Joriy KPI: ${p.kpi}%. Davomat ${Math.round(p.att)}%, intizom ${Math.round(p.punct)}%, vazifalar ${Math.round(p.taskScore)}%.`;
    }
    const hit = MENTOR_KB.find((x) => x.k.test(t));
    return hit ? hit.a(db) : "Bu savol bo‘yicha aniq ma’lumot topmadim. Masalan so‘rang: “Bugun kim kelmadi?”, “Kim kechikdi?”, “KPI qanday hisoblanadi?”, “Mening vazifalarim”.";
  };

  const ask = async (text) => {
    if (!text.trim() || busy) return;
    setMsgs((m) => [...m, { id: uid("q"), from: "me", text }]); setQ(""); setBusy(true);
    const emp = db.employees.find((e) => e.id === me);
    const rules = [...MENTOR_KB.map((x) => x.a(db)), ...(me === "admin" ? officeFacts(db) : [])];
    const tasks = (emp ? db.tasks.filter((x) => x.assigneeId === emp.id) : db.tasks).filter((x) => x.status !== "done").map((x) => `${x.title} (mas’ul ${db.employees.find((e) => e.id === x.assigneeId)?.name}, muddat ${x.deadline}, ${x.priority})`);
    let ans = null;
    if (ai.sample) {
      try {
        const r = await ai.sample(`Sen "${db.room.name}" kompaniyasining AI yordamchisisan. Faqat o‘zbek tilida (lotin), qisqa va aniq javob ber (2-5 gap).\nMa’lumotlar:\n${rules.map((x) => "- " + x).join("\n")}\n\nSuhbatdosh: ${emp ? `${emp.name} (${emp.role})` : `rahbar ${db.room.admin}`}. Ochiq vazifalar:\n${tasks.map((x) => "- " + x).join("\n") || "yo‘q"}\n\nSavol: ${text}`, { modelTier: "quick" });
        ans = r?.text?.trim();
      } catch { }
    }
    if (!ans && ai.server) {
      try {
        const r = await apiPost("/api/ai", { task: "mentor", question: text, company: db.room.name, employee: emp ? `${emp.name} (${emp.role})` : `rahbar ${db.room.admin}`, rules, tasks });
        if (r.ok) ans = (await r.json()).text?.trim();
      } catch { }
    }
    if (!ans) { await new Promise((r) => setTimeout(r, 450)); ans = localAnswer(text); }
    setMsgs((m) => [...m, { id: uid("a"), from: "ai", text: ans }]); setBusy(false);
  };

  const quick = me === "admin" ? ["Bugun kim kelmadi?", "Kim kechikdi?", "Muddati o‘tgan vazifalar", "KPI reytingi"] : ["Mening vazifalarim", "Ish vaqti qanday?", "Kechiksam jarima qancha?", "Ta’tilga qanday chiqaman?"];

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} aria-label="AI yordamchini ochish" className="fixed z-30 right-4 bottom-20 md:bottom-6 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 shadow-xl shadow-violet-500/30 flex items-center justify-center text-white hover:scale-105 transition">
          <Bot size={26} />
        </button>
      )}
      {open && (
        <div className="fixed z-50 inset-0 md:inset-auto md:right-6 md:bottom-6 md:w-[400px] md:h-[600px] glass-strong md:rounded-2xl flex flex-col sheet-in">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center"><Bot size={18} className="text-white" /></div>
            <div className="flex-1"><div className="text-sm font-semibold text-white">AI yordamchi</div><div className="text-[11px] text-slate-400">{ai.sample ? "Claude AI" : ai.server ? "Gemini AI" : "Lokal AI"}</div></div>
            <select value={me} onChange={(e) => setMe(e.target.value)} className="bg-slate-900 border border-white/10 rounded-lg text-xs text-white px-2 py-1.5 max-w-[130px]" aria-label="Kim so‘rayapti">
              <option value="admin">Rahbar</option>
              {db.employees.map((e) => <option key={e.id} value={e.id}>{e.name.split(" ")[0]} (xodim)</option>)}
            </select>
            <button onClick={() => setOpen(false)} aria-label="Yopish" className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300"><X size={18} /></button>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {msgs.map((m) => (
              <div key={m.id} className={"flex " + (m.from === "me" ? "justify-end" : "")}>
                <div className={"max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line slide-up " + (m.from === "me" ? "bg-violet-500/80 text-white rounded-br-sm" : "bg-white/5 border border-white/10 text-slate-100 rounded-bl-sm")}>{m.text}</div>
              </div>
            ))}
            {busy && <div className="flex gap-1 px-3 py-3 w-16 rounded-2xl bg-white/5 border border-white/10">{[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 bg-slate-300 rounded-full typing" style={{ animationDelay: i * 0.15 + "s" }} />)}</div>}
            <div ref={endRef} />
          </div>
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">{quick.map((x) => <button key={x} onClick={() => ask(x)} className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10">{x}</button>)}</div>
          <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex gap-2 p-3 border-t border-white/10">
            <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Savol yozing…" aria-label="Savol" />
            <button disabled={busy || !q.trim()} className="px-3 rounded-xl bg-violet-500 text-white disabled:opacity-40" aria-label="Yuborish"><Send size={16} /></button>
          </form>
        </div>
      )}
    </>
  );
}

/* ============================ SOZLAMALAR ============================ */
function SettingsSheet({ open, onClose, onExit }) {
  const { db, update, toast, reset, replaceDb } = useStore();
  const [confirm, setConfirm] = useState(null); const [pending, setPending] = useState(null);
  const fileRef = useRef(null);
  if (!open) return null;
  return (
    <Sheet open onClose={onClose} title="Sozlamalar">
      <h4 className="text-xs uppercase tracking-wide text-slate-400 mb-3">Kompaniya</h4>
      <div className="space-y-3">
        <Field label="Kompaniya nomi"><input className={inputCls} value={db.room.name} onChange={(e) => update((d) => { d.room.name = e.target.value; })} /></Field>
        <Field label="Rahbar ismi"><input className={inputCls} value={db.room.admin} onChange={(e) => update((d) => { d.room.admin = e.target.value; })} /></Field>
        <div className="flex items-center justify-between rounded-xl bg-white/5 p-3">
          <div><div className="text-xs text-slate-400">Room kirish kodi</div><div className="font-mono text-lg text-cyan-200">{db.room.code}</div></div>
          <div className="flex gap-1">
            <button className="p-2 rounded-lg hover:bg-white/10 text-slate-300" aria-label="Kodni nusxalash" onClick={() => navigator.clipboard?.writeText(db.room.code).then(() => toast("Kod nusxalandi")).catch(() => toast("Nusxalab bo‘lmadi", "error"))}><Copy size={16} /></button>
            <button className="p-2 rounded-lg hover:bg-white/10 text-slate-300" aria-label="Yangi kod" onClick={() => { update((d) => { d.room.code = genCode(d.room.name); }); toast("Yangi kod yaratildi"); }}><RefreshCw size={16} /></button>
          </div>
        </div>
      </div>
      <h4 className="text-xs uppercase tracking-wide text-slate-400 mt-6 mb-3">Ish tartibi</h4>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ish boshlanishi"><input type="time" className={inputCls} value={db.settings.workStart} onChange={(e) => update((d) => { d.settings.workStart = e.target.value; })} /></Field>
        <Field label="Kechikishga ruxsat (daq)"><input type="number" className={inputCls} value={db.settings.grace} onChange={(e) => update((d) => { d.settings.grace = Math.max(0, +e.target.value); })} /></Field>
        <Field label="1 daqiqa jarimasi (so‘m)"><input type="number" className={inputCls} value={db.settings.penaltyPerMin} onChange={(e) => update((d) => { d.settings.penaltyPerMin = Math.max(0, +e.target.value); })} /></Field>
      </div>
      <h4 className="text-xs uppercase tracking-wide text-slate-400 mt-6 mb-3 flex items-center gap-2"><Shield size={13} />Xavfsizlik</h4>
      <SecuritySection />
      <h4 className="text-xs uppercase tracking-wide text-slate-400 mt-6 mb-3 flex items-center gap-2"><Clock size={13} />Vaqt</h4>
      <div className="flex items-center gap-3">
        <select value={db.settings.timeZone || "Asia/Tashkent"} onChange={(e) => update((d) => { d.settings.timeZone = e.target.value; })} className={inputCls + " !w-auto"} aria-label="Vaqt zonasi">
          {[["Asia/Tashkent", "Toshkent (UTC+5)"], ["Asia/Almaty", "Almati (UTC+5)"], ["Asia/Dushanbe", "Dushanbe (UTC+5)"], ["Asia/Bishkek", "Bishkek (UTC+6)"], ["Europe/Moscow", "Moskva (UTC+3)"], ["Asia/Dubai", "Dubay (UTC+4)"], ["Europe/Istanbul", "Istanbul (UTC+3)"], ["Europe/London", "London"]].map(([v, l]) => <option key={v} value={v} className="bg-slate-900">{l}</option>)}
        </select>
        <span className={"text-xs " + (clockState().synced ? "text-emerald-300" : "text-amber-300")}>{clockState().synced ? "Server vaqti bilan sinxron ✓" : "Server vaqti olinmadi — qurilma soati ishlatilmoqda"}</span>
      </div>
      <h4 className="text-xs uppercase tracking-wide text-slate-400 mt-6 mb-3 flex items-center gap-2"><Send size={13} />Telegram bot</h4>
      <TelegramSection />
      <h4 className="text-xs uppercase tracking-wide text-slate-400 mt-6 mb-2">Zaxira nusxa</h4>
      <p className="text-xs text-slate-400 mb-3">Ma’lumotlar shu brauzerda saqlanadi. Boshqa qurilmaga ko‘chirish uchun zaxira faylidan foydalaning.</p>
      <div className="flex flex-wrap gap-2">
        <Btn icon={Download} onClick={() => { try { downloadBackup(db); toast("Zaxira fayli yuklab olindi"); } catch { toast("Yuklab bo‘lmadi — “JSON nusxalash”dan foydalaning", "error"); } }}>Yuklab olish</Btn>
        <Btn variant="ghost" icon={Upload} onClick={() => fileRef.current?.click()}>Tiklash</Btn>
        <Btn variant="ghost" icon={Copy} onClick={() => navigator.clipboard?.writeText(JSON.stringify({ app: "workroom-ai", version: 1, data: db })).then(() => toast("JSON nusxalandi")).catch(() => toast("Nusxalab bo‘lmadi", "error"))}>JSON nusxalash</Btn>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; readBackupFile(f).then(setPending).catch(() => toast("Zaxira fayli noto‘g‘ri yoki buzilgan", "error")); }} />
      </div>
      <h4 className="text-xs uppercase tracking-wide text-slate-400 mt-6 mb-3">Boshqa</h4>
      <div className="flex flex-wrap gap-2">
        <Btn variant="ghost" icon={RefreshCw} onClick={() => setConfirm("demo")}>Demo ma’lumotlar</Btn>
        <Btn variant="ghost" icon={Building2} onClick={() => setConfirm("new")}>Yangi Room</Btn>
        <Btn variant="ghost" icon={LogOut} onClick={onExit}>Chiqish</Btn>
      </div>
      <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Tasdiqlang">
        <p className="text-sm text-slate-300 mb-5">{confirm === "demo" ? "Joriy ma’lumotlar o‘chirilib, demo Room (#UZ2026) yuklanadi." : "Joriy Room o‘chiriladi va yangi Room ochiladi."} Avval zaxira nusxa olishni unutmang.</p>
        <div className="flex gap-2 justify-end"><Btn variant="ghost" onClick={() => setConfirm(null)}>Bekor qilish</Btn><Btn variant="danger" icon={Check} onClick={() => { reset(confirm); setConfirm(null); onClose(); }}>Tasdiqlash</Btn></div>
      </Modal>
      <Modal open={!!pending} onClose={() => setPending(null)} title="Zaxiradan tiklash">
        {pending && <><p className="text-sm text-slate-300 mb-5">“{pending.room.name}” — {pending.employees.length} xodim, {pending.tasks.length} vazifa. Joriy ma’lumotlar almashtiriladi.</p>
          <div className="flex gap-2 justify-end"><Btn variant="ghost" onClick={() => setPending(null)}>Bekor qilish</Btn><Btn icon={Check} onClick={() => { replaceDb(pending); setPending(null); onClose(); }}>Tiklash</Btn></div></>}
      </Modal>
    </Sheet>
  );
}

/* ============================ QOBIQ ============================ */
function Shell({ onExit }) {
  const { db, unlocked, unlock, lock } = useStore();
  const initial = () => { const h = location.hash.slice(1); return ROUTES.includes(h) ? h : "bugun"; };
  const [page, setPage] = useState(initial);
  const [person, setPerson] = useState(null);
  const [settings, setSettings] = useState(false);
  const [assistant, setAssistant] = useState(false);
  useEffect(() => { try { history.replaceState(null, "", "#" + page); } catch { } }, [page]);
  useEffect(() => { const f = () => { const h = location.hash.slice(1); if (ROUTES.includes(h)) setPage(h); }; window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  const go = (p) => { setPage(p); window.scrollTo(0, 0); };
  const pending = db.notifications.length;

  if (page === "kiosk") return <KioskPage onExit={() => { unlock(); go("bugun"); }} />;
  if (hasPin(db) && !unlocked) return <LockScreen onUnlock={unlock} openKiosk={() => go("kiosk")} />;

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <header className="sticky top-0 z-30 glass rounded-none border-x-0 border-t-0">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-3">
          <button onClick={() => go("bugun")} className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center shrink-0"><Zap size={18} className="text-white" /></div>
            <div className="text-left min-w-0 hidden sm:block"><div className="font-bold text-white leading-none">WORKROOM AI</div><div className="text-[11px] text-slate-400 mt-1 truncate max-w-[160px]">{db.room.name}</div></div>
          </button>
          <nav className="hidden md:flex items-center gap-1 mx-auto bg-white/5 border border-white/10 rounded-2xl p-1">
            {TABS.map(([k, l, I]) => (
              <button key={k} onClick={() => go(k)} className={"relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition " + (page === k ? "bg-white/15 text-white" : "text-slate-400 hover:text-white")}>
                <I size={16} />{l}{k === "bugun" && pending > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 absolute top-1.5 right-2" />}
              </button>
            ))}
          </nav>
          <div className="ml-auto md:ml-0 flex items-center gap-2">
            <Btn className="!px-3" icon={ScanFace} onClick={() => go("kiosk")}><span className="hidden lg:inline">Davomat kiosk</span><span className="lg:hidden">Kiosk</span></Btn>
            {hasPin(db) && <button onClick={lock} aria-label="Qulflash" title="Qulflash" className="p-2.5 rounded-xl hover:bg-white/10 text-slate-300"><Lock size={20} /></button>}
            <button onClick={() => setSettings(true)} aria-label="Sozlamalar" className="p-2.5 rounded-xl hover:bg-white/10 text-slate-300"><Settings size={20} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-6">
        {page === "bugun" && <TodayPage go={go} openPerson={setPerson} openKiosk={() => go("kiosk")} />}
        {page === "vazifalar" && <TasksPage />}
        {page === "majlis" && <MeetingPage go={go} />}
        {page === "jamoa" && <TeamPage openPerson={setPerson} />}
        {page === "maosh" && <PayrollPage openPerson={setPerson} />}
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 glass-strong rounded-none border-x-0 border-b-0 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(([k, l, I]) => (
          <button key={k} onClick={() => go(k)} className={"relative flex flex-col items-center gap-1 py-2.5 text-[11px] " + (page === k ? "text-white" : "text-slate-500")}>
            <I size={21} className={page === k ? "text-cyan-300" : ""} />{l}
            {k === "bugun" && pending > 0 && <span className="absolute top-1.5 left-1/2 ml-2 w-2 h-2 rounded-full bg-rose-500" />}
          </button>
        ))}
      </nav>

      <Assistant open={assistant} setOpen={setAssistant} />
      {person && <PersonSheet key={person} empId={person} onClose={() => setPerson(null)} />}
      <SettingsSheet open={settings} onClose={() => setSettings(false)} onExit={onExit} />
    </div>
  );
}

/* ============================ ILOVA ============================ */
function App() {
  const [db, setDb] = useState(() => { try { const v = JSON.parse(localStorage.getItem(LS_KEY)); if (v && v.room) return v; } catch { } return null; });
  const [view, setView] = useState(() => (db ? "app" : "landing"));
  const [toasts, setToasts] = useState([]);
  const [ai, setAi] = useState({ sample: null, dictation: null, server: false });
  const UNLOCK_KEY = "workroom_unlock_until";
  const [unlocked, setUnlocked] = useState(() => { try { return Number(sessionStorage.getItem(UNLOCK_KEY)) > Date.now(); } catch { return false; } });
  const lastAct = useRef(Date.now());
  const unlock = useCallback(() => { lastAct.current = Date.now(); setUnlocked(true); }, []);
  const lock = useCallback(() => { setUnlocked(false); try { sessionStorage.removeItem(UNLOCK_KEY); } catch { } }, []);
  // Harakatsizlikdan keyin avtomatik qulflash
  useEffect(() => {
    const act = () => { lastAct.current = Date.now(); };
    ["pointerdown", "keydown", "scroll"].forEach((e) => window.addEventListener(e, act, { passive: true }));
    const i = setInterval(() => {
      const d = dbRef.current; if (!d || !hasPin(d)) return;
      const ms = secSettings(d).autoLockMin * 60000;
      if (location.hash === "#kiosk") return;
      if (Date.now() - lastAct.current > ms) { setUnlocked(false); try { sessionStorage.removeItem(UNLOCK_KEY); } catch { } }
      else { try { sessionStorage.setItem(UNLOCK_KEY, String(lastAct.current + ms)); } catch { } }
    }, 5000);
    return () => { clearInterval(i); ["pointerdown", "keydown", "scroll"].forEach((e) => window.removeEventListener(e, act)); };
  }, []);
  // Server vaqti va kompaniya vaqt zonasi
  useEffect(() => { setCompanyTZ(db?.settings?.timeZone || "Asia/Tashkent"); }, [db?.settings?.timeZone]);
  const [, setClockTick] = useState(0);
  useEffect(() => {
    if (!/^https?:$/.test(location.protocol)) return;
    const s = () => syncClock().then(() => setClockTick((x) => x + 1));
    s(); const i = setInterval(s, 10 * 60000); return () => clearInterval(i);
  }, []);

  useEffect(() => { try { if (db) localStorage.setItem(LS_KEY, JSON.stringify(db)); else localStorage.removeItem(LS_KEY); } catch { } }, [db]);
  useEffect(() => {
    if (!/^https?:$/.test(location.protocol)) return;
    fetch("/api/ai", { headers: { Accept: "application/json" } }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j?.enabled) setAi((a) => ({ ...a, server: true })); }).catch(() => {});
  }, []);
  useEffect(() => {
    let alive = true, tries = 0;
    const tick = () => {
      if (window.claude && typeof window.claude.use === "function") {
        window.claude.use("sample").then((s) => alive && s && setAi((a) => ({ ...a, sample: s }))).catch(() => {});
        window.claude.use("dictation").then((d) => alive && d && setAi((a) => ({ ...a, dictation: d }))).catch(() => {});
      } else if (tries++ < 20) setTimeout(tick, 500);
    };
    tick(); return () => { alive = false; };
  }, []);

  // Ertalabki "kim kelmadi" hisoboti (shu qurilma ochiq bo‘lsa)
  const dbRef = useRef(db); dbRef.current = db;
  useEffect(() => {
    const tick = () => {
      const d = dbRef.current;
      if (!d || !summaryDue(d)) return;
      setDb((p) => ({ ...p, settings: { ...p.settings, telegram: { ...tgSettings(p), lastSummary: todayISO() } } }));
      tgNotify(d, buildSummary(d));
    };
    const i = setInterval(tick, 30000); const first = setTimeout(tick, 3000);
    return () => { clearInterval(i); clearTimeout(first); };
  }, []);

  const toast = useCallback((text, type = "ok") => { const id = uid("t"); setToasts((t) => [...t.slice(-3), { id, text, type }]); setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800); }, []);
  const update = useCallback((fn) => setDb((p) => { const d = JSON.parse(JSON.stringify(p)); fn(d); return d; }), []);
  const empById = useCallback((id) => db?.employees.find((e) => e.id === id), [db]);
  const replaceDb = (d) => { setDb(d); setView("app"); if (hasPin(d)) lock(); toast(`“${d.room.name}” zaxiradan tiklandi`); };
  const reset = (kind) => { if (kind === "demo") { setDb(demoDb()); setView("app"); toast("Demo Room yuklandi"); } else { setDb(null); setView("wizard"); } };

  const ctx = { db, update, toast, ai, empById, reset, replaceDb, unlocked: unlocked || !hasPin(db), unlock, lock };
  let body;
  if (view === "wizard") body = <Wizard onBack={() => setView("landing")} onDone={(d) => { setDb(d); setView("app"); try { history.replaceState(null, "", "#bugun"); } catch { } toast(`“${d.room.name}” ochildi · kod ${d.room.code}`); }} />;
  else if (view === "app" && db) body = <Shell onExit={() => setView("landing")} />;
  else body = <Landing hasRoom={!!db} onRestore={replaceDb} onNew={() => setView("wizard")} onDemo={() => { if (db && db.room.code !== "#UZ2026") { setView("app"); toast("Bu qurilmada saqlangan Room bor. Demo uchun: Sozlamalar → Demo ma’lumotlar", "warn"); return; } if (!db) setDb(demoDb()); setView("app"); }} onCode={(c) => {
    const code = (c.startsWith("#") ? c : "#" + c).toUpperCase();
    if (db && db.room.code.toUpperCase() === code) { setView("app"); return true; }
    if (code === "#UZ2026") { setDb(demoDb()); setView("app"); return true; }
    return false;
  }} />;

  return (
    <Store.Provider value={ctx}>
      <div className="bg-blobs" aria-hidden><div className="blob b1" /><div className="blob b2" /><div className="blob b3" /></div>
      <div className="relative z-10">{body}</div>
      <Toasts list={toasts} />
    </Store.Provider>
  );
}

createRoot(document.getElementById("root")).render(<App />);
