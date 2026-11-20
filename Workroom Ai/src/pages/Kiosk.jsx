// Davomat kioski: kirish eshigidagi planshet uchun. Xodim kameraga qaraydi — tugmasiz, avtomatik qayd etiladi.
import React, { useState, useEffect, useRef } from "react";
/* AUTO-IMPORTS */
import { Camera, LogOut, ScanFace, Shield, Sparkles, Zap } from "lucide-react";
import { applyAttendance, captureFace, fmtLong, hm, loadFaceApi, matchFace, norm, planAttendance, tgNotify, tgSettings, todayISO, useFaceApiState } from "../core.js";
import { Avatar, Btn, DemoFace, Glass, Modal, Pill, inputCls, useStore } from "../ui.jsx";
/* END-IMPORTS */

export function KioskPage({ onExit }) {
  const { db, update, empById } = useStore();
  const videoRef = useRef(null); const streamRef = useRef(null);
  const [cam, setCam] = useState("starting"); const [err, setErr] = useState("");
  const model = useFaceApiState();
  const [now, setNow] = useState(new Date());
  const [welcome, setWelcome] = useState(null);
  const [hint, setHint] = useState("");
  const [demoPick, setDemoPick] = useState("auto");
  const [exitAsk, setExitAsk] = useState(false); const [code, setCode] = useState(""); const [codeErr, setCodeErr] = useState(false);
  const dbRef = useRef(db); dbRef.current = db;
  const cooldown = useRef({}); const busy = useRef(false); const unknown = useRef(0); const welcomeRef = useRef(null);
  welcomeRef.current = welcome;

  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);

  const startCam = async () => {
    setCam("starting"); setErr("");
    loadFaceApi().catch(() => {});
    try {
      if (!window.isSecureContext) throw new Error("insecure");
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false });
      streamRef.current = s; setCam("on");
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => {}); } }, 30);
    } catch (e) {
      setCam("error");
      setErr(e?.message === "insecure" ? "Kamera faqat HTTPS orqali ochilgan saytda ishlaydi." : "Kameraga ruxsat berilmadi yoki kamera topilmadi.");
    }
  };
  useEffect(() => { startCam(); return () => streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  const register = (emp, method, sim) => {
    const plan = planAttendance(dbRef.current, emp.id, method);
    if (plan.type !== "done") {
      update((d) => applyAttendance(d, plan, emp.id));
      if (tgSettings(dbRef.current).notifyEach) tgNotify(dbRef.current, { kind: plan.type, name: emp.name, time: plan.time, late: plan.late || 0 });
    }
    cooldown.current[emp.id] = Date.now(); unknown.current = 0; setHint("");
    setWelcome({ emp, plan, sim });
    setTimeout(() => setWelcome(null), 3800);
  };

  const scanOnce = async () => {
    const v = videoRef.current; if (!v || busy.current || welcomeRef.current || v.readyState < 2) return;
    busy.current = true;
    try {
      const s = await captureFace(v);
      if (s.error) { unknown.current = 0; setHint(""); return; }
      const m = matchFace(s, dbRef.current.employees);
      if (!m.candidates) { setHint("Bazada yuzi skanerlangan xodim yo‘q — Jamoa bo‘limida yuzlarni qo‘shing"); return; }
      if (m.emp) {
        if (Date.now() - (cooldown.current[m.emp.id] || 0) < 60000) { setHint(`${m.emp.name.split(" ")[0]}, siz hozirgina qayd etildingiz ✓`); return; }
        register(m.emp, "face", m.sim);
      } else if (++unknown.current >= 3) setHint("Yuz tanilmadi. Administratorga murojaat qiling.");
    } finally { busy.current = false; }
  };

  // Avtomatik rejim: model tayyor bo‘lsa, har ~1 soniyada tekshiradi
  useEffect(() => {
    if (cam !== "on" || model !== "ready") return;
    const i = setInterval(scanOnce, 1000);
    return () => clearInterval(i);
  }, [cam, model]);

  const demo = () => {
    const d = dbRef.current; const today = todayISO();
    let emp = demoPick !== "auto" ? empById(demoPick) : null;
    if (!emp) {
      const notIn = d.employees.filter((e) => !d.attendance.find((a) => a.empId === e.id && a.date === today));
      const notOut = d.employees.filter((e) => d.attendance.find((a) => a.empId === e.id && a.date === today && !a.out));
      const pool = notIn.length ? notIn : notOut;
      if (!pool.length) { setHint("Bugun hamma kelib-ketgan"); return; }
      emp = pool[Math.floor(Math.random() * pool.length)];
    }
    register(emp, "demo", 0.95);
  };

  const today = todayISO();
  const events = db.attendance.filter((a) => a.date === today).flatMap((a) => [{ id: a.id + "i", empId: a.empId, t: a.in, type: "in", late: a.late }, ...(a.out ? [{ id: a.id + "o", empId: a.empId, t: a.out, type: "out" }] : [])]).sort((x, y) => y.t.localeCompare(x.t));
  const inOffice = db.attendance.filter((a) => a.date === today && !a.out).length;
  const status = cam !== "on" ? null : model === "ready" ? "Kameraga qarang — avtomatik qayd etiladi" : model === "loading" || model === "idle" ? "AI model yuklanmoqda…" : "Prototip rejim: “Skanerlash” tugmasini bosing";
  const tryExit = (e) => { e.preventDefault(); if (norm(code.replace("#", "")).toUpperCase() === db.room.code.replace("#", "").toUpperCase()) onExit(); else setCodeErr(true); };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6">
      <header className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center"><Zap size={20} className="text-white" /></div>
        <div><div className="font-semibold text-white leading-tight">{db.room.name}</div><div className="text-xs text-slate-400">Davomat kioski</div></div>
        <div className="ml-auto text-right"><div className="text-3xl md:text-4xl font-semibold text-white font-mono tabular-nums">{hm(now)}<span className="text-lg text-slate-500">:{String(now.getSeconds()).padStart(2, "0")}</span></div><div className="text-xs text-slate-400">{fmtLong(now)}</div></div>
        <button onClick={() => { setExitAsk(true); setCode(""); setCodeErr(false); }} className="ml-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300" aria-label="Kioskdan chiqish"><LogOut size={18} /></button>
      </header>

      <div className="flex-1 grid lg:grid-cols-[1fr_340px] gap-5 mt-5">
        <div className="flex flex-col">
          <div className={"relative flex-1 min-h-[300px] rounded-3xl overflow-hidden bg-slate-900/80 border-2 transition " + (welcome ? "border-emerald-400" : "border-white/10")}>
            {cam === "on" ? <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover -scale-x-100" /> : <DemoFace active={false} />}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center"><div className="h-[62%] aspect-[3/4] rounded-[45%] border-2 border-dashed border-cyan-300/40" /></div>
            {cam === "on" && model === "ready" && !welcome && <div className="laser" />}
            {welcome && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 fade-in">
                <Avatar emp={welcome.emp} size={120} ring={welcome.plan.type === "in" && welcome.plan.late ? "ring-amber-400" : "ring-emerald-400"} />
                <div className="text-3xl md:text-4xl font-bold text-white mt-5">{welcome.plan.type === "in" ? "Xush kelibsiz" : welcome.plan.type === "out" ? "Xayr" : "Salom"}, {welcome.emp.name.split(" ")[0]}!</div>
                <div className={"text-lg mt-2 " + (welcome.plan.type === "in" && welcome.plan.late ? "text-amber-300" : "text-emerald-300")}>
                  {welcome.plan.type === "in" ? (welcome.plan.late ? `Kelish ${welcome.plan.time} · ${welcome.plan.late} daqiqa kechikdingiz` : `Kelish ${welcome.plan.time} · o‘z vaqtida ✓`) : welcome.plan.type === "out" ? `Ketish ${welcome.plan.time} · yaxshi dam oling!` : `Bugun ${welcome.plan.time} da ketgansiz`}
                </div>
              </div>
            )}
          </div>
          <div className="mt-3 min-h-[24px] text-center text-sm">
            {err ? <span className="text-amber-300">{err}</span> : hint ? <span className="text-amber-300">{hint}</span> : <span className="text-slate-300">{status}</span>}
          </div>
          <div className="flex flex-wrap justify-center items-center gap-2 mt-3">
            {cam !== "on" && <Btn variant="ghost" icon={Camera} onClick={startCam}>Kamerani qayta yoqish</Btn>}
            {cam === "on" && model === "failed" && <Btn icon={ScanFace} onClick={scanOnce}>Skanerlash</Btn>}
            <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 pl-3">
              <span className="text-xs text-slate-400">Demo:</span>
              <select value={demoPick} onChange={(e) => setDemoPick(e.target.value)} className="bg-transparent text-sm text-white py-2 focus:outline-none" aria-label="Demo xodim">
                <option value="auto" className="bg-slate-900">navbatdagi xodim</option>
                {db.employees.map((e) => <option key={e.id} value={e.id} className="bg-slate-900">{e.name}</option>)}
              </select>
              <Btn className="!rounded-l-none" icon={Sparkles} onClick={demo}>Demo skanerlash</Btn>
            </div>
          </div>
        </div>

        <Glass className="p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3"><h2 className="font-semibold text-white">Bugun</h2><Pill tone="emerald">Ofisda {inOffice}/{db.employees.length}</Pill></div>
          <div className="space-y-1 overflow-auto flex-1 max-h-[60vh]">
            {events.map((ev) => { const e = empById(ev.empId); if (!e) return null; return (
              <div key={ev.id} className="flex items-center gap-3 px-2 py-2 rounded-lg slide-up">
                <span className="text-xs font-mono text-slate-400 w-11">{ev.t}</span>
                <Avatar emp={e} size={28} />
                <span className="flex-1 text-sm text-white truncate">{e.name}</span>
                {ev.type === "in" ? <Pill tone={ev.late ? "amber" : "emerald"}>{ev.late ? `keldi +${ev.late}` : "keldi"}</Pill> : <Pill tone="cyan">ketdi</Pill>}
              </div>
            ); })}
            {!events.length && <p className="text-sm text-slate-500 text-center py-8">Bugun hali hech kim kelmagan</p>}
          </div>
          <p className="text-[11px] text-slate-500 mt-3 flex gap-1.5"><Shield size={12} className="shrink-0 mt-0.5" />Yuz shablonlari faqat shu qurilmada saqlanadi.</p>
        </Glass>
      </div>

      <Modal open={exitAsk} onClose={() => setExitAsk(false)} title="Kioskdan chiqish">
        <form onSubmit={tryExit} className="space-y-3">
          <p className="text-sm text-slate-300">Xodimlar tasodifan chiqib ketmasligi uchun Room kodini kiriting.</p>
          <input autoFocus className={inputCls + " font-mono tracking-widest text-center text-lg"} placeholder="#UZ2026" value={code} onChange={(e) => { setCode(e.target.value); setCodeErr(false); }} aria-label="Room kodi" />
          {codeErr && <p className="text-xs text-rose-300">Kod noto‘g‘ri.</p>}
          <Btn className="w-full" icon={LogOut}>Chiqish</Btn>
        </form>
      </Modal>
    </div>
  );
}
