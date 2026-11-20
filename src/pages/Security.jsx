// Xavfsizlik: rahbar PIN-kodi, qulf ekrani, sozlamalar
import React, { useState, useEffect, useRef } from "react";
/* AUTO-IMPORTS */
import { Check, KeyRound, Loader2, Lock, ScanFace, Trash2 } from "lucide-react";
import { hashPin, norm, pinFail, pinLockout, pinOk, secSettings, validPin, verifyPin } from "../core.js";
import { Btn, Glass, Modal, inputCls, useStore } from "../ui.jsx";
/* END-IMPORTS */

// PIN kiritish maydoni + tekshirish (xato urinishlarda kutish bilan)
export function PinForm({ onSuccess, submitLabel = "Ochish", autoFocus = true }) {
  const { db } = useStore();
  const [pin, setPin] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(pinLockout());
  useEffect(() => { if (!wait) return; const i = setInterval(() => setWait(pinLockout()), 1000); return () => clearInterval(i); }, [wait]);
  const submit = async (e) => {
    e.preventDefault(); if (busy || wait || !pin) return;
    setBusy(true);
    const ok = await verifyPin(db, pin);
    setBusy(false);
    if (ok) { pinOk(); setPin(""); setErr(""); onSuccess(); return; }
    const f = pinFail(); setPin(""); setWait(pinLockout());
    setErr(f.count >= 5 ? "Juda ko‘p xato urinish." : `PIN noto‘g‘ri. Yana ${5 - f.count} ta urinish qoldi.`);
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <input type="password" inputMode="numeric" autoComplete="off" maxLength={8} autoFocus={autoFocus} value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setErr(""); }} disabled={!!wait} className={inputCls + " text-center text-2xl tracking-[0.5em] font-mono"} placeholder="••••" aria-label="PIN-kod" />
      {wait > 0 ? <p className="text-xs text-amber-300 text-center">Qayta urinish: {Math.ceil(wait / 1000)} soniyadan keyin</p> : err && <p className="text-xs text-rose-300 text-center">{err}</p>}
      <Btn className="w-full" icon={busy ? Loader2 : KeyRound} disabled={busy || !!wait || pin.length < 4}>{submitLabel}</Btn>
    </form>
  );
}

export function LockScreen({ onUnlock, openKiosk }) {
  const { db, reset } = useStore();
  const [forgot, setForgot] = useState(false); const [confirm, setConfirm] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Glass className="w-full max-w-sm p-7 slide-up">
        <div className="w-14 h-14 rounded-2xl mx-auto bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center"><Lock size={26} className="text-white" /></div>
        <h1 className="text-xl font-semibold text-white text-center mt-4">{db.room.name}</h1>
        <p className="text-sm text-slate-400 text-center mb-6">Davom etish uchun rahbar PIN-kodini kiriting</p>
        <PinForm onSuccess={onUnlock} />
        <div className="mt-6 pt-5 border-t border-white/10 space-y-2">
          <Btn variant="ghost" className="w-full" icon={ScanFace} onClick={openKiosk}>Davomat kioskini ochish</Btn>
          <button onClick={() => setForgot(true)} className="w-full text-xs text-slate-500 hover:text-slate-300 py-1">PIN-kodni unutdingizmi?</button>
        </div>
      </Glass>
      <Modal open={forgot} onClose={() => { setForgot(false); setConfirm(""); }} title="PIN-kodni unutdingizmi?">
        <p className="text-sm text-slate-300">Xavfsizlik uchun PIN-kodni tiklab bo‘lmaydi. Bu qurilmadagi barcha ma’lumotni (xodimlar, davomat, maosh) o‘chirib, qaytadan boshlashingiz mumkin. Zaxira faylingiz bo‘lsa, keyin uni tiklaysiz — u eski PIN bilan birga tiklanadi.</p>
        <p className="text-xs text-slate-400 mt-4 mb-2">Tasdiqlash uchun <b className="text-rose-300">O‘CHIRISH</b> deb yozing:</p>
        <input className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Tasdiqlash so‘zi" />
        <Btn variant="danger" className="w-full mt-3" icon={Trash2} disabled={norm(confirm).replace(/'/g, "") !== "ochirish"} onClick={() => { pinOk(); reset("new"); }}>Hammasini o‘chirish</Btn>
      </Modal>
    </div>
  );
}

export function SecuritySection() {
  const { db, update, toast, unlock } = useStore();
  const s = secSettings(db); const has = !!s.pinHash;
  const [mode, setMode] = useState(null); // set | change | remove
  const [step, setStep] = useState("verify");
  const [p1, setP1] = useState(""); const [p2, setP2] = useState(""); const [busy, setBusy] = useState(false);
  const setSec = (patch) => update((d) => { d.settings.security = { ...secSettings(d), ...patch }; });
  const open = (m) => { setMode(m); setStep(has ? "verify" : "new"); setP1(""); setP2(""); };
  const saveNew = async (e) => {
    e.preventDefault();
    if (!validPin(p1)) { toast("PIN 4–8 ta raqamdan iborat bo‘lsin", "warn"); return; }
    if (p1 !== p2) { toast("PIN-kodlar mos kelmadi", "warn"); return; }
    if (/^(\d)\1+$/.test(p1) || "0123456789".includes(p1) || "9876543210".includes(p1)) { toast("Juda oddiy PIN (1111, 1234…). Boshqasini tanlang", "warn"); return; }
    setBusy(true); const h = await hashPin(p1); setBusy(false);
    unlock(); setSec(h); setMode(null); toast(has ? "PIN-kod o‘zgartirildi" : "PIN-kod o‘rnatildi — endi sayt qulflanadi");
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
        <Lock size={18} className={has ? "text-emerald-400" : "text-amber-300"} />
        <div className="flex-1"><div className="text-sm text-white">{has ? "Rahbar PIN-kodi o‘rnatilgan" : "PIN-kod o‘rnatilmagan"}</div><div className="text-[11px] text-slate-400">{has ? "Maosh, xodimlar va sozlamalar PIN bilan himoyalangan" : "Qurilmaga yaqin kelgan har kim maosh va sozlamalarni ko‘ra oladi"}</div></div>
        {has ? <div className="flex gap-1"><Btn variant="ghost" className="!px-3 !py-1.5" onClick={() => open("change")}>O‘zgartirish</Btn><Btn variant="ghost" className="!px-3 !py-1.5 !text-rose-300" onClick={() => open("remove")}>O‘chirish</Btn></div> : <Btn className="!px-3 !py-1.5" icon={KeyRound} onClick={() => open("set")}>O‘rnatish</Btn>}
      </div>
      {has && (
        <div className="flex items-center justify-between py-1">
          <span className="text-sm text-slate-300">Avtomatik qulflash</span>
          <select value={s.autoLockMin} onChange={(e) => setSec({ autoLockMin: +e.target.value })} className="bg-slate-900 border border-white/10 rounded-lg text-xs text-white px-2 py-1.5" aria-label="Avtomatik qulflash">
            {[5, 10, 30, 60].map((m) => <option key={m} value={m}>{m} daqiqa harakatsizlikdan keyin</option>)}
          </select>
        </div>
      )}
      <label className="flex items-start gap-3 py-2 cursor-pointer">
        <input type="checkbox" className="accent-violet-500 w-4 h-4 mt-0.5" checked={s.liveness} onChange={(e) => setSec({ liveness: e.target.checked })} />
        <span><span className="block text-sm text-white">Tiriklik tekshiruvi (kiosk)</span><span className="block text-xs text-slate-400">Tanilgandan keyin xodim boshini buradi — rasm yoki ekran bilan aldashni qiyinlashtiradi</span></span>
      </label>

      <Modal open={!!mode} onClose={() => setMode(null)} title={mode === "remove" ? "PIN-kodni o‘chirish" : has ? "PIN-kodni o‘zgartirish" : "PIN-kod o‘rnatish"}>
        {step === "verify" ? (
          <><p className="text-sm text-slate-300 mb-3">Avval joriy PIN-kodni kiriting.</p>
            <PinForm submitLabel="Davom etish" onSuccess={() => { if (mode === "remove") { setSec({ pinHash: null, pinSalt: null }); setMode(null); toast("PIN-kod o‘chirildi", "warn"); } else setStep("new"); }} /></>
        ) : (
          <form onSubmit={saveNew} className="space-y-3">
            <p className="text-sm text-slate-300">4–8 ta raqam. Uni unutmang — tiklab bo‘lmaydi.</p>
            <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} autoFocus value={p1} onChange={(e) => setP1(e.target.value.replace(/\D/g, ""))} className={inputCls + " text-center text-xl tracking-[0.4em] font-mono"} placeholder="Yangi PIN" aria-label="Yangi PIN" />
            <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={8} value={p2} onChange={(e) => setP2(e.target.value.replace(/\D/g, ""))} className={inputCls + " text-center text-xl tracking-[0.4em] font-mono"} placeholder="Takrorlang" aria-label="PIN takrori" />
            <Btn className="w-full" icon={busy ? Loader2 : Check} disabled={busy || p1.length < 4 || p2.length < 4}>Saqlash</Btn>
          </form>
        )}
      </Modal>
    </div>
  );
}
