// Sozlamalar ichidagi Telegram bot bo‘limi: ulash, xabar turlari, sinov
import React, { useState, useEffect, useRef } from "react";
/* AUTO-IMPORTS */
import { CircleCheck, ClipboardList, Loader2, RefreshCw, Send, Users } from "lucide-react";
import { buildSummary, fromMin, newLinkCode, tgApi, tgNotify, tgSettings, toMin } from "../core.js";
import { Btn, useStore } from "../ui.jsx";
/* END-IMPORTS */

function Switch({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start gap-3 py-2 cursor-pointer">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={"mt-0.5 w-10 h-6 rounded-full relative shrink-0 transition " + (checked ? "bg-emerald-500" : "bg-white/15")}>
        <span className={"absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all " + (checked ? "left-[18px]" : "left-0.5")} />
      </button>
      <span><span className="block text-sm text-white">{label}</span>{hint && <span className="block text-xs text-slate-400">{hint}</span>}</span>
    </label>
  );
}

export function TelegramSection() {
  const { db, update, toast } = useStore();
  const t = tgSettings(db);
  const [srv, setSrv] = useState(null); // null = yuklanmoqda
  const [polling, setPolling] = useState(false);
  const [busy, setBusy] = useState("");
  const tries = useRef(0);
  const set = (patch) => update((d) => { d.settings.telegram = { ...tgSettings(d), ...patch }; });

  useEffect(() => {
    fetch("/api/telegram").then((r) => (r.ok ? r.json() : { enabled: false })).then(setSrv).catch(() => setSrv({ enabled: false, offline: true }));
  }, []);
  useEffect(() => { if (!t.linkCode && !t.token) set({ linkCode: newLinkCode() }); }, [t.linkCode, t.token]);

  const check = async (silent) => {
    const r = await tgApi({ action: "link", code: t.linkCode, company: db.room.name });
    if (r.ok && r.linked) {
      set({ token: r.token, chatTitle: r.chatTitle, linkCode: null, lastSummary: null });
      setPolling(false); toast(`Telegram ulandi: ${r.chatTitle}`);
      return true;
    }
    if (!silent) toast(r.ok ? "Hali ulanmadi — Telegram'da “Start” bosilganini tekshiring" : r.error || "Xato", "warn");
    return false;
  };
  // Havola bosilgandan keyin 2 daqiqa davomida o‘zi tekshirib turadi
  useEffect(() => {
    if (!polling) return;
    tries.current = 0;
    const i = setInterval(async () => { if (++tries.current > 30) { setPolling(false); return; } await check(true); }, 4000);
    return () => clearInterval(i);
  }, [polling]);

  if (srv === null) return <p className="text-sm text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Tekshirilmoqda…</p>;

  if (!srv.enabled) return (
    <div className="rounded-xl border border-amber-400/25 bg-amber-500/[0.07] p-4 text-sm text-slate-200 space-y-2">
      <p className="text-amber-200 font-medium">{srv.offline ? "Bot faqat joylangan saytda ishlaydi." : srv.error || "Bot serverda hali sozlanmagan."}</p>
      {!srv.offline && <ol className="list-decimal pl-5 space-y-1 text-slate-300 text-xs">
        <li>Telegram'da <b>@BotFather</b> → <code>/newbot</code> → botga nom bering va tokenni nusxalang.</li>
        <li>Render → saytingiz → <b>Environment</b> → <code>TELEGRAM_BOT_TOKEN</code> = token.</li>
        <li>Saqlang — Render saytni qayta ishga tushiradi. Keyin shu oynani qayta oching.</li>
      </ol>}
    </div>
  );

  if (!t.token) {
    const code = t.linkCode || "";
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-300">Bot: <b className="text-white">@{srv.username}</b>. Xabarlar qayerga kelsin?</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <a href={`https://t.me/${srv.username}?startgroup=${code}`} target="_blank" rel="noopener noreferrer" onClick={() => setPolling(true)} className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-3 text-sm text-white flex items-center gap-2"><Users size={16} className="text-cyan-300" />Guruhga qo‘shish<span className="text-[11px] text-slate-400 ml-auto">tavsiya</span></a>
          <a href={`https://t.me/${srv.username}?start=${code}`} target="_blank" rel="noopener noreferrer" onClick={() => setPolling(true)} className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-3 text-sm text-white flex items-center gap-2"><Send size={16} className="text-cyan-300" />Shaxsiy chatga</a>
        </div>
        <p className="text-xs text-slate-400">Havola ochilmasa, botni guruhga qo‘shib, guruhga shuni yozing: <code className="text-cyan-200 select-all">/ulash {code}</code></p>
        <div className="flex items-center gap-2">
          <Btn variant="ghost" icon={busy === "check" ? Loader2 : RefreshCw} disabled={!!busy} onClick={async () => { setBusy("check"); await check(false); setBusy(""); }}>Tekshirish</Btn>
          {polling && <span className="text-xs text-slate-400 flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" />Telegram'da tasdiqlash kutilmoqda…</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-400/25 p-3">
        <CircleCheck size={18} className="text-emerald-400" />
        <div className="flex-1 min-w-0"><div className="text-sm text-white truncate">{t.chatTitle}</div><div className="text-[11px] text-slate-400">@{srv.username} orqali ulangan</div></div>
        <button onClick={() => { set({ token: null, chatTitle: "", linkCode: newLinkCode() }); toast("Telegram uzildi"); }} className="text-xs text-slate-400 hover:text-rose-300">Uzish</button>
      </div>
      <Switch checked={t.notifyEach} onChange={(v) => set({ notifyEach: v })} label="Har kelish va ketishda xabar" hint="Kiosk xodimni tanishi bilan yuboriladi" />
      <Switch checked={t.summary} onChange={(v) => set({ summary: v })} label="Ertalabki hisobot: kim kelmadi" hint={`Ish kunlari ${fromMin(toMin(db.settings.workStart) + Number(t.summaryAfter))} da`} />
      {t.summary && (
        <div className="pl-[52px]"><select value={t.summaryAfter} onChange={(e) => set({ summaryAfter: +e.target.value })} className="bg-slate-900 border border-white/10 rounded-lg text-xs text-white px-2 py-1.5" aria-label="Hisobot vaqti">
          {[15, 30, 60, 90].map((m) => <option key={m} value={m}>Ish boshlangandan {m} daqiqa keyin</option>)}
        </select></div>
      )}
      <div className="flex flex-wrap gap-2 pt-2">
        <Btn variant="ghost" icon={busy === "test" ? Loader2 : Send} disabled={!!busy} onClick={async () => { setBusy("test"); const r = await tgNotify(db, { kind: "test" }); setBusy(""); toast(r.ok ? "Sinov xabari yuborildi" : r.error || "Yuborib bo‘lmadi", r.ok ? "ok" : "error"); }}>Sinov xabari</Btn>
        <Btn variant="ghost" icon={busy === "sum" ? Loader2 : ClipboardList} disabled={!!busy} onClick={async () => { setBusy("sum"); const r = await tgNotify(db, buildSummary(db)); setBusy(""); toast(r.ok ? "Hisobot yuborildi" : r.error || "Yuborib bo‘lmadi", r.ok ? "ok" : "error"); }}>Hisobotni hozir yuborish</Btn>
      </div>
      <p className="text-[11px] text-slate-500 pt-1">Xabarlar davomat qayd etilgan qurilmadan (kiosk) yuboriladi — ertalabki hisobot uchun kiosk ochiq turishi kerak.</p>
    </div>
  );
}
