// Kirish sahifasi va Room ochish ustasi
import React, { useState, useEffect, useRef } from "react";
/* AUTO-IMPORTS */
import { ArrowLeft, ArrowRight, Bot, Building2, Calculator, Check, CircleCheck, Copy, KeyRound, LayoutDashboard, Play, RefreshCw, ScanFace, Sparkles, Trash2, Video } from "lucide-react";
import { DEFAULT_SETTINGS, GRADS, buildSampleData, genCode, readBackupFile, todayISO, uid } from "../core.js";
import { Avatar, Btn, FaceScanner, Field, Glass, inputCls, useStore } from "../ui.jsx";
/* END-IMPORTS */

/* ============================ ONBOARDING ============================ */
export function Landing({ onNew, onDemo, onCode, hasRoom, onRestore }) {
  const [code, setCode] = useState(""); const [err, setErr] = useState("");
  const fileRef = useRef(null);
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-5xl w-full grid lg:grid-cols-2 gap-8 items-center">
        <div className="fade-in">
          <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full glass text-cyan-200 mb-5"><Sparkles size={14} /> O‘zbek tilida ishlaydigan AI ofis</div>
          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-tight">WORKROOM <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-300">AI</span></h1>
          <p className="text-lg text-slate-300 mt-3">Biznesingiz uchun avtonom raqamli ofis</p>
          <div className="grid grid-cols-2 gap-3 mt-8">
            {[[ScanFace, "Ichki Face ID davomat"], [Video, "Video majlis + Meeting AI"], [Calculator, "Adolatli KPI va maosh"], [Bot, "AI Mentor va Assistant"]].map(([I, t]) => (
              <div key={t} className="glass rounded-xl p-3 flex items-center gap-2.5 text-sm text-slate-200"><I size={18} className="text-cyan-300" />{t}</div>
            ))}
          </div>
        </div>
        <Glass className="p-6 md:p-8 slide-up">
          <h2 className="text-xl font-semibold text-white mb-1">Boshlash</h2>
          <p className="text-sm text-slate-400 mb-6">Yangi Room oching yoki tayyor demo ofisga kiring.</p>
          <Btn className="w-full py-3.5" icon={Building2} onClick={onNew}>Yangi Room ochish</Btn>
          <Btn variant="ghost" className="w-full py-3.5 mt-3" icon={Play} onClick={onDemo}>Demo Room’ga kirish (#UZ2026)</Btn>
          <div className="flex items-center gap-3 my-6 text-xs text-slate-500"><div className="h-px flex-1 bg-white/10" />yoki kod bilan<div className="h-px flex-1 bg-white/10" /></div>
          <div className="flex gap-2">
            <input className={inputCls} placeholder="#UZ2026" value={code} onChange={(e) => { setCode(e.target.value); setErr(""); }} />
            <Btn variant="ghost" icon={KeyRound} onClick={() => { const r = onCode(code.trim()); if (!r) setErr("Bunday kodli Room topilmadi"); }}>Kirish</Btn>
          </div>
          {err && <p className="text-xs text-rose-300 mt-2">{err}</p>}
          {hasRoom && <p className="text-xs text-slate-500 mt-3">Saqlangan Room mavjud — kodini kiriting.</p>}
          <button onClick={() => fileRef.current?.click()} className="mt-4 text-xs text-cyan-300 hover:underline flex items-center gap-1.5"><RefreshCw size={12} />Zaxira faylidan tiklash (.json)</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; readBackupFile(f).then(onRestore).catch(() => setErr("Zaxira fayli noto‘g‘ri yoki buzilgan")); }} />
        </Glass>
      </div>
    </div>
  );
}

export function Wizard({ onDone, onBack }) {
  const { toast } = useStore();
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState(""); const [admin, setAdmin] = useState(""); const [workStart, setWorkStart] = useState("09:00");
  const [code, setCode] = useState(genCode(""));
  const [team, setTeam] = useState([]); const [sample, setSample] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", salary: "8000000" });
  const [last, setLast] = useState(null);

  useEffect(() => { setCode(genCode(company)); }, [company]);

  const addFace = ({ descriptor, photo, kind, demo }) => {
    const emp = { id: uid("e"), name: form.name.trim(), role: form.role.trim() || "Xodim", salary: +form.salary || 0, color: team.length % GRADS.length, status: "active", photo, descriptor, faceKind: descriptor ? kind : null };
    setTeam((t) => [...t, emp]); setLast(emp);
    setForm({ name: "", role: "", salary: "8000000" });
    toast(descriptor ? `${emp.name} yuzi Room bazasiga qo‘shildi` : `${emp.name} qo‘shildi${demo ? " (demo yuz)" : ""}`);
  };

  const finish = () => {
    let base = { employees: team, attendance: [], tasks: [], notifications: [] };
    if (sample) {
      const s = buildSampleData();
      base = { employees: [...s.employees, ...team.map((e, i) => ({ ...e, color: (i + 5) % GRADS.length }))], attendance: s.attendance, tasks: s.tasks, notifications: s.notifications };
    }
    onDone({ room: { name: company.trim(), code, admin: admin.trim() || "Rahbar", createdAt: todayISO() }, settings: { ...DEFAULT_SETTINGS, workStart }, meetings: [], ...base });
  };

  const steps = ["Kompaniya", "Jamoa yuzlari", "Tayyor"];
  return (
    <div className="min-h-screen p-4 md:p-8 flex justify-center">
      <div className="w-full max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="text-sm text-slate-400 hover:text-white flex items-center gap-1.5"><ArrowLeft size={16} />Orqaga</button>
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={"w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold " + (step > i + 1 ? "bg-emerald-500 text-white" : step === i + 1 ? "bg-gradient-to-r from-violet-500 to-cyan-500 text-white" : "bg-white/10 text-slate-400")}>{step > i + 1 ? <Check size={14} /> : i + 1}</div>
                <span className={"text-xs hidden sm:block " + (step === i + 1 ? "text-white" : "text-slate-500")}>{s}</span>
                {i < 2 && <div className="w-6 h-px bg-white/15" />}
              </div>
            ))}
          </div>
        </div>

        {step === 1 && (
          <Glass className="p-6 md:p-8 max-w-xl mx-auto slide-up">
            <h2 className="text-2xl font-semibold text-white">Yangi Room yaratish</h2>
            <p className="text-sm text-slate-400 mt-1 mb-6">Kompaniyangiz uchun raqamli ofis ochamiz.</p>
            <div className="space-y-4">
              <Field label="Kompaniya nomi"><input className={inputCls} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Masalan: Uzbek Textile MChJ" /></Field>
              <Field label="Rahbar (admin) ismi"><input className={inputCls} value={admin} onChange={(e) => setAdmin(e.target.value)} placeholder="Masalan: Bekzod Umarov" /></Field>
              <Field label="Ish boshlanish vaqti"><input type="time" className={inputCls} value={workStart} onChange={(e) => setWorkStart(e.target.value)} /></Field>
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 flex items-center justify-between">
                <div><div className="text-xs text-slate-400">Avtomatik kirish kodi</div><div className="text-2xl font-mono font-bold text-cyan-200 tracking-wider">{code}</div></div>
                <Btn variant="ghost" icon={RefreshCw} onClick={() => setCode(genCode(company))}>Yangilash</Btn>
              </div>
            </div>
            <Btn className="w-full mt-6 py-3" icon={ArrowRight} disabled={!company.trim()} onClick={() => setStep(2)}>Davom etish</Btn>
          </Glass>
        )}

        {step === 2 && (
          <div className="grid lg:grid-cols-5 gap-5 slide-up">
            <Glass className="p-5 lg:col-span-3">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2"><ScanFace size={20} className="text-cyan-300" />Jamoa yuzlarini skanerlash</h2>
              <p className="text-sm text-slate-400 mb-4">Har bir xodim ma’lumotini kiriting va yuzini kameraga skanerlang.</p>
              <div className="grid sm:grid-cols-3 gap-3 mb-4">
                <Field label="Ism familiya"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dilnoza Yusupova" /></Field>
                <Field label="Lavozim"><input className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Buxgalter" /></Field>
                <Field label="Oylik (so‘m)"><input type="number" className={inputCls} value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></Field>
              </div>
              <FaceScanner onCapture={addFace} scanLabel="Yuzni skanerlash va qo‘shish" disabled={!form.name.trim()} disabledHint="Avval xodim ismini kiriting" />
              <button onClick={() => { if (!form.name.trim()) { toast("Avval xodim ismini kiriting", "warn"); return; } addFace({ descriptor: null, photo: null, kind: null, demo: false }); }} className="mt-2 text-xs text-slate-400 hover:text-white underline-offset-2 hover:underline">Yuzsiz qo‘shish (yuzni keyinroq Jamoa bo‘limida skanerlash mumkin)</button>
            </Glass>
            <Glass className="p-5 lg:col-span-2 flex flex-col">
              <h3 className="font-semibold text-white mb-1">Room bazasi</h3>
              <p className="text-xs text-slate-400 mb-4">{team.length} ta yuz ro‘yxatga olindi</p>
              {last && <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 p-3 mb-3 flex items-center gap-3 fade-in"><Avatar emp={last} size={44} /><div className="text-sm"><div className="text-white font-medium">{last.name}</div><div className="text-emerald-300 text-xs flex items-center gap-1"><CircleCheck size={12} />Yuz shabloni saqlandi</div></div></div>}
              <div className="space-y-2 flex-1 overflow-auto max-h-72">
                {team.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
                    <Avatar emp={e} size={36} />
                    <div className="flex-1 min-w-0"><div className="text-sm text-white truncate">{e.name}</div><div className="text-xs text-slate-400">{e.role} · {e.descriptor ? "Face ID ✓" : "yuzsiz"}</div></div>
                    <button onClick={() => setTeam(team.filter((x) => x.id !== e.id))} className="text-slate-500 hover:text-rose-400"><Trash2 size={16} /></button>
                  </div>
                ))}
                {!team.length && <div className="text-sm text-slate-500 text-center py-8">Hozircha xodim yo‘q</div>}
              </div>
              <label className="flex items-center gap-2.5 mt-4 p-3 rounded-xl bg-violet-500/10 border border-violet-400/20 cursor-pointer">
                <input type="checkbox" checked={sample} onChange={(e) => setSample(e.target.checked)} className="accent-violet-500 w-4 h-4" />
                <span className="text-sm text-slate-200">Namuna jamoani ham qo‘shish <span className="text-slate-400">(Malika, Nigora, Jasur, Aziz, Sardor + tarix)</span></span>
              </label>
              <div className="flex gap-2 mt-4">
                <Btn variant="ghost" icon={ArrowLeft} onClick={() => setStep(1)}>Orqaga</Btn>
                <Btn className="flex-1" icon={ArrowRight} disabled={!team.length && !sample} onClick={() => setStep(3)}>Davom etish</Btn>
              </div>
            </Glass>
          </div>
        )}

        {step === 3 && (
          <Glass className="p-8 max-w-xl mx-auto text-center slide-up">
            <div className="w-16 h-16 rounded-2xl mx-auto bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white mb-4"><Check size={32} /></div>
            <h2 className="text-2xl font-semibold text-white">“{company}” Room tayyor!</h2>
            <p className="text-sm text-slate-400 mt-2">Xodimlar shu kod orqali Room’ga ulanadi.</p>
            <div className="my-6 inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-3xl font-mono font-bold text-cyan-200 tracking-widest">{code}</span>
              <button className="text-slate-400 hover:text-white" onClick={() => { navigator.clipboard?.writeText(code).then(() => toast("Kod nusxalandi")).catch(() => toast("Nusxalab bo‘lmadi — kodni qo‘lda yozib oling", "warn")); }}><Copy size={18} /></button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm mb-6">
              <div className="glass rounded-xl p-3"><div className="text-2xl font-semibold text-white">{team.length + (sample ? 5 : 0)}</div><div className="text-slate-400 text-xs">Xodim</div></div>
              <div className="glass rounded-xl p-3"><div className="text-2xl font-semibold text-white">{team.filter((e) => e.descriptor).length}</div><div className="text-slate-400 text-xs">Kamera yuzi</div></div>
              <div className="glass rounded-xl p-3"><div className="text-2xl font-semibold text-white">{workStart}</div><div className="text-slate-400 text-xs">Ish boshlanishi</div></div>
            </div>
            <Btn className="w-full py-3" icon={LayoutDashboard} onClick={finish}>Ofisga kirish</Btn>
          </Glass>
        )}
      </div>
    </div>
  );
}

