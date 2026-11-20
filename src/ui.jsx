// WORKROOM AI — umumiy UI komponentlari
import React, { useState, useEffect, useRef, createContext, useContext } from "react";
/* AUTO-IMPORTS */
import { AlertTriangle, Bell, Camera, CameraOff, CircleCheck, Fingerprint, Loader2, ScanFace, Shield, Sparkles, X } from "lucide-react";
import { GRADS, captureFace, detOpts, loadFaceApi, useFaceApiState } from "./core.js";
/* END-IMPORTS */

/* ============================ STORE ============================ */
export const Store = createContext(null);
export const useStore = () => useContext(Store);

/* ============================ UI ATOMLARI ============================ */
export const Glass = ({ className = "", children, ...p }) => <div className={"glass rounded-2xl " + className} {...p}>{children}</div>;

export function Avatar({ emp, size = 40, ring }) {
  if (!emp) return null;
  const initials = emp.name.split(" ").map((x) => x[0]).slice(0, 2).join("");
  const st = { width: size, height: size, fontSize: size * 0.36 };
  return (
    <div className={"relative shrink-0 " + (ring ? "ring-2 ring-offset-2 ring-offset-slate-950 rounded-full " + ring : "")} style={{ width: size, height: size }}>
      {emp.photo ? <img src={emp.photo} className="rounded-full object-cover w-full h-full" alt={emp.name} />
        : <div className={"rounded-full bg-gradient-to-br flex items-center justify-center font-semibold text-white " + GRADS[(emp.color || 0) % GRADS.length]} style={st}>{initials}</div>}
    </div>
  );
}

export function Btn({ variant = "primary", className = "", icon: I, children, ...p }) {
  const v = {
    primary: "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/25 hover:brightness-110",
    ghost: "bg-white/5 hover:bg-white/10 text-slate-100 border border-white/10",
    danger: "bg-rose-500/90 hover:bg-rose-500 text-white",
    success: "bg-emerald-500/90 hover:bg-emerald-500 text-white",
  }[variant];
  return <button className={"inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed " + v + " " + className} {...p}>{I && <I size={16} />}{children}</button>;
}

export const PRIO = { "Yuqori": "bg-rose-500/15 text-rose-300 border-rose-500/30", "O‘rta": "bg-amber-500/15 text-amber-300 border-amber-500/30", "Past": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
export const Prio = ({ p }) => <span className={"text-[11px] px-2 py-0.5 rounded-full border " + (PRIO[p] || PRIO["O‘rta"])}>{p}</span>;

export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm fade-in" onMouseDown={onClose}>
      <div className={"glass-strong rounded-2xl w-full max-h-[90vh] overflow-auto " + (wide ? "max-w-3xl" : "max-w-lg")} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export const Field = ({ label, children }) => <label className="block"><span className="text-xs text-slate-400 mb-1.5 block">{label}</span>{children}</label>;
export const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400/60 focus:bg-white/10 transition";

export function Toasts({ list }) {
  return (
    <div className="fixed bottom-4 right-4 z-[60] space-y-2 w-[340px] max-w-[calc(100vw-2rem)]">
      {list.map((t) => (
        <div key={t.id} className="glass-strong rounded-xl px-4 py-3 flex gap-3 items-start slide-up">
          <div className={"mt-0.5 " + (t.type === "error" ? "text-rose-400" : t.type === "warn" ? "text-amber-300" : "text-emerald-400")}>
            {t.type === "error" ? <AlertTriangle size={18} /> : t.type === "warn" ? <Bell size={18} /> : <CircleCheck size={18} />}
          </div>
          <div className="text-sm text-slate-100">{t.text}</div>
        </div>
      ))}
    </div>
  );
}

export function SectionTitle({ icon: I, title, sub, right }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-500/30 border border-white/10 flex items-center justify-center text-cyan-200"><I size={22} /></div>
        <div><h1 className="text-xl md:text-2xl font-semibold text-white">{title}</h1>{sub && <p className="text-sm text-slate-400">{sub}</p>}</div>
      </div>
      {right}
    </div>
  );
}


export function Ring({ value, size = 44, stroke = 5 }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(100, value));
  return (
    <svg width={size} height={size} className="-rotate-90">
      <defs><linearGradient id="ringg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8b5cf6" /><stop offset="1" stopColor="#22d3ee" /></linearGradient></defs>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.1)" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke="url(#ringg)" strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: "stroke-dashoffset .6s" }} />
    </svg>
  );
}
export function Spark({ values, color = "#a78bfa", w = 64, h = 26 }) {
  const max = Math.max(1, ...values), min = Math.min(0, ...values), st = w / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => `${(i * st).toFixed(1)},${(h - 3 - ((v - min) / (max - min || 1)) * (h - 6)).toFixed(1)}`).join(" ");
  return <svg width={w} height={h}><polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}


/* ============================ FACE SCANNER ============================ */
export function FaceScanner({ onCapture, scanLabel = "Skanerlash", disabled, disabledHint, extra, height = "aspect-[4/3]" }) {
  const { toast } = useStore();
  const videoRef = useRef(null); const streamRef = useRef(null);
  const [cam, setCam] = useState("off"); const [err, setErr] = useState("");
  const [scan, setScan] = useState(null); // {progress, demo}
  const [faceSeen, setFaceSeen] = useState(false);
  const model = useFaceApiState();

  const stop = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  useEffect(() => stop, []);

  // Jonli "yuz aniqlandi" indikatori
  useEffect(() => {
    if (cam !== "on" || model !== "ready") { setFaceSeen(false); return; }
    let alive = true, busy = false;
    const iv = setInterval(async () => {
      const v = videoRef.current; if (!v || busy || v.readyState < 2) return; busy = true;
      try { const fa = window.faceapi; const r = await fa.detectSingleFace(v, detOpts(fa)); if (alive) setFaceSeen(!!r); } catch { }
      busy = false;
    }, 700);
    return () => { alive = false; clearInterval(iv); };
  }, [cam, model]);

  const start = async () => {
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
      setErr(e?.message === "insecure" ? "Kamera faqat HTTPS orqali ochilgan saytda ishlaydi." : e?.message === "unsupported" ? "Bu brauzer kamerani qo‘llab-quvvatlamaydi." : "Kameraga ruxsat berilmadi yoki kamera topilmadi. Demo skanerlashdan foydalaning.");
    }
  };

  const run = (demo) => {
    if (disabled) { toast(disabledHint || "Avval maydonlarni to‘ldiring", "warn"); return; }
    if (scan) return;
    setScan({ progress: 0, demo });
    const capP = !demo && videoRef.current ? captureFace(videoRef.current) : Promise.resolve(null);
    let p = 0;
    const iv = setInterval(() => {
      p += 4; setScan({ progress: Math.min(100, p), demo });
      if (p >= 100) {
        clearInterval(iv);
        capP.then((data) => {
          setScan(null);
          if (data?.error === "noface") { toast("Yuz topilmadi — kameraga to‘g‘ri qarang va yorug‘roq joyda qayta urinib ko‘ring", "error"); return; }
          onCapture({ descriptor: data?.descriptor || null, photo: data?.photo || null, kind: data?.kind || null, demo });
        });
      }
    }, 60);
  };

  const modelLabel = { idle: null, loading: "AI model yuklanmoqda…", ready: faceSeen ? "Yuz aniqlandi ✓" : "Yuzni ramkaga qarating", failed: "Prototip algoritmi" }[model];

  return (
    <div>
      <div className={"relative w-full rounded-2xl overflow-hidden bg-slate-900/80 border " + (faceSeen ? "border-emerald-400/60" : "border-white/10") + " " + height}>
        {cam === "on" ? <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover -scale-x-100" />
          : <DemoFace active={!!scan} />}
        <div className="absolute inset-0 pointer-events-none">
          <div className={"absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[48%] aspect-[3/4] rounded-[45%] border-2 border-dashed " + (faceSeen ? "border-emerald-300/70" : "border-cyan-300/40")} />
          {["top-4 left-4 border-t-2 border-l-2", "top-4 right-4 border-t-2 border-r-2", "bottom-4 left-4 border-b-2 border-l-2", "bottom-4 right-4 border-b-2 border-r-2"].map((c) => (
            <div key={c} className={"absolute w-10 h-10 rounded-sm " + c + (scan ? " border-cyan-300" : faceSeen ? " border-emerald-300" : " border-white/50")} />
          ))}
          {scan && <div className="laser" />}
          {scan && <div className="absolute inset-0 bg-cyan-400/5" />}
        </div>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[11px] px-2.5 py-1 rounded-full glass flex items-center gap-1.5 text-slate-200 whitespace-nowrap">
          <span className={"w-1.5 h-1.5 rounded-full " + (cam === "on" ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
          {cam === "on" ? "Jonli kamera" : "Demo rejim"}{cam === "on" && modelLabel ? " · " + modelLabel : ""}
        </div>
        {scan && (
          <div className="absolute bottom-3 left-3 right-3 glass rounded-xl px-3 py-2">
            <div className="flex justify-between text-xs text-cyan-100 mb-1.5"><span className="flex items-center gap-1.5"><Fingerprint size={14} />{scan.progress < 40 ? "Yuz aniqlanmoqda…" : scan.progress < 80 ? "Biometrik nuqtalar o‘qilmoqda…" : "Shablon tuzilmoqda…"}</span><span>{scan.progress}%</span></div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-all" style={{ width: scan.progress + "%" }} /></div>
          </div>
        )}
      </div>
      {err && <p className="text-xs text-amber-300 mt-2 flex gap-1.5"><AlertTriangle size={14} className="shrink-0 mt-0.5" />{err}</p>}
      {extra}
      <div className="flex flex-wrap gap-2 mt-3">
        {cam !== "on" ? <Btn variant="ghost" icon={cam === "starting" ? Loader2 : Camera} onClick={start} disabled={cam === "starting"}>{cam === "starting" ? "Ulanmoqda…" : "Kamerani yoqish"}</Btn>
          : <Btn icon={ScanFace} onClick={() => run(false)} disabled={!!scan}>{scanLabel}</Btn>}
        <Btn variant={cam === "on" ? "ghost" : "primary"} icon={Sparkles} onClick={() => run(true)} disabled={!!scan}>Demo skanerlash</Btn>
        {cam === "on" && <Btn variant="ghost" icon={CameraOff} onClick={() => { stop(); setCam("off"); }}>O‘chirish</Btn>}
      </div>
      <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5"><Shield size={12} />Yuz shabloni faqat shu brauzerda saqlanadi va serverga yuborilmaydi. Skanerlashdan oldin xodimning roziligini oling.</p>
    </div>
  );
}

export function DemoFace({ active }) {
  const pts = [[100, 88], [140, 88], [120, 112], [104, 140], [136, 140], [120, 146], [86, 100], [154, 100], [120, 70], [95, 125], [145, 125], [120, 165]];
  return (
    <svg viewBox="0 0 240 180" className="absolute inset-0 w-full h-full">
      <defs><radialGradient id="fg" cx="50%" cy="45%" r="55%"><stop offset="0%" stopColor="#334155" /><stop offset="100%" stopColor="#0f172a" /></radialGradient></defs>
      <rect width="240" height="180" fill="url(#fg)" />
      <ellipse cx="120" cy="108" rx="40" ry="52" fill="#1e293b" stroke="#475569" />
      <path d="M70 180 Q120 140 170 180" fill="#1e293b" stroke="#475569" />
      {active && pts.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="1.8" fill="#67e8f9" className="pulse-dot" style={{ animationDelay: i * 0.08 + "s" }} />
          {i > 0 && <line x1={pts[i - 1][0]} y1={pts[i - 1][1]} x2={x} y2={y} stroke="#67e8f9" strokeOpacity=".35" strokeWidth=".6" />}
        </g>
      ))}
      {!active && <text x="120" y="25" textAnchor="middle" fill="#94a3b8" fontSize="8">Yuzni ramka ichiga joylashtiring</text>}
    </svg>
  );
}


/* ============================ QO‘SHIMCHA ATOMLAR ============================ */
const TONE = {
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30", amber: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  rose: "bg-rose-500/15 text-rose-300 border-rose-400/30", cyan: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
  violet: "bg-violet-500/15 text-violet-300 border-violet-400/30", slate: "bg-white/5 text-slate-400 border-white/10",
};
export const DOT = { emerald: "bg-emerald-400", amber: "bg-amber-400", rose: "bg-rose-400", cyan: "bg-cyan-400", violet: "bg-violet-400", slate: "bg-slate-500" };
export const Pill = ({ tone = "slate", children, className = "" }) => <span className={"inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap " + TONE[tone] + " " + className}>{children}</span>;

// O‘ng tomondan chiqadigan panel (telefonda — pastdan)
export function Sheet({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm fade-in" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="glass-strong absolute bottom-0 inset-x-0 max-h-[92vh] rounded-t-3xl md:rounded-none md:inset-y-0 md:right-0 md:left-auto md:w-[460px] md:max-h-none flex flex-col sheet-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-semibold text-white text-lg">{title}</h3>
          <button onClick={onClose} aria-label="Yopish" className="p-2 rounded-lg hover:bg-white/10 text-slate-300"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-auto p-5">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-white/10">{footer}</div>}
      </div>
    </div>
  );
}

export const SectionHead = ({ title, right, icon: I }) => (
  <div className="flex items-center justify-between mb-3">
    <h2 className="font-semibold text-white flex items-center gap-2">{I && <I size={18} className="text-cyan-300" />}{title}</h2>{right}
  </div>
);

export const Empty = ({ icon: I = CircleCheck, text, action }) => (
  <div className="text-center py-8 px-4"><I className="mx-auto mb-2 text-slate-500" size={28} /><p className="text-sm text-slate-400">{text}</p>{action && <div className="mt-3">{action}</div>}</div>
);

export function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-white/5 border border-white/10 gap-1">
      {options.map(([v, l]) => <button key={v} onClick={() => onChange(v)} className={"px-3 py-1.5 rounded-lg text-sm transition " + (value === v ? "bg-white/15 text-white" : "text-slate-400 hover:text-white")}>{l}</button>)}
    </div>
  );
}
