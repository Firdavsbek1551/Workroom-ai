// Maosh: oylik hisobot (KPI, bonus, jarima, yakuniy summa)
import React, { useState, useMemo } from "react";
/* AUTO-IMPORTS */
import { ChevronDown, ChevronRight, Copy, Info } from "lucide-react";
import { MONTHS, computePayroll, money } from "../core.js";
import { Avatar, Btn, Field, Glass, Pill, inputCls, useStore } from "../ui.jsx";
/* END-IMPORTS */

export function PayrollPage({ openPerson }) {
  const { db, update, toast } = useStore();
  const pay = useMemo(() => [...computePayroll(db)].sort((a, b) => b.kpi - a.kpi), [db]);
  const [rules, setRules] = useState(false);
  const total = pay.reduce((s, p) => s + p.final, 0);
  const copy = () => {
    const rows = [["Xodim", "Lavozim", "Kelgan kun", "Kechikish (daq)", "Vazifa", "KPI %", "Asosiy oylik", "Bonus", "Jarima", "Yakuniy"]];
    pay.forEach((p) => rows.push([p.emp.name, p.emp.role, `${p.present}/${p.workDays}`, p.lateMin, `${p.done}/${p.tasks}`, p.kpi, p.emp.salary, Math.round(p.bonus), Math.round(p.penalty), Math.round(p.final)]));
    navigator.clipboard?.writeText(rows.map((r) => r.join(";")).join("\n")).then(() => toast("Jadval nusxalandi — Excel’ga joylashtiring")).catch(() => toast("Nusxalab bo‘lmadi", "error"));
  };
  return (
    <div className="fade-in max-w-5xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div><h1 className="text-2xl font-semibold text-white">Maosh · {MONTHS[new Date().getMonth()]}</h1><p className="text-sm text-slate-400">Face ID davomati va bajarilgan vazifalardan avtomatik hisoblanadi</p></div>
        <Btn variant="ghost" icon={Copy} onClick={copy}>Excel uchun nusxalash</Btn>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <Glass className="p-4"><div className="text-xs text-slate-400">Jami to‘lov</div><div className="text-2xl font-semibold text-white mt-1">{money(total)}</div></Glass>
        <Glass className="p-4"><div className="text-xs text-slate-400">Bonuslar</div><div className="text-2xl font-semibold text-emerald-300 mt-1">+{money(pay.reduce((s, p) => s + p.bonus, 0))}</div></Glass>
        <Glass className="p-4"><div className="text-xs text-slate-400">Jarimalar</div><div className="text-2xl font-semibold text-rose-300 mt-1">−{money(pay.reduce((s, p) => s + p.penalty, 0))}</div></Glass>
      </div>

      <Glass className="overflow-hidden">
        <div className="hidden md:grid grid-cols-[1.6fr_.7fr_.7fr_.6fr_1fr_1fr_1.1fr_20px] gap-3 px-5 py-3 text-xs text-slate-400 border-b border-white/10">
          <span>Xodim</span><span>Kelgan</span><span>Kechikish</span><span>KPI</span><span className="text-right">Bonus</span><span className="text-right">Jarima</span><span className="text-right">Yakuniy</span><span />
        </div>
        {pay.map((p) => (
          <button key={p.emp.id} onClick={() => openPerson(p.emp.id)} className="w-full text-left grid grid-cols-[1fr_auto] md:grid-cols-[1.6fr_.7fr_.7fr_.6fr_1fr_1fr_1.1fr_20px] gap-3 items-center px-5 py-3.5 border-b border-white/5 hover:bg-white/5 transition">
            <span className="flex items-center gap-3 min-w-0"><Avatar emp={p.emp} size={34} /><span className="min-w-0"><span className="block text-white truncate">{p.emp.name}</span><span className="block text-xs text-slate-500 truncate">{p.emp.role}</span></span></span>
            <span className="hidden md:block text-sm text-slate-200">{p.present}/{p.workDays}</span>
            <span className={"hidden md:block text-sm " + (p.lateMin ? "text-amber-300" : "text-slate-400")}>{p.lateMin} daq</span>
            <span className="hidden md:block"><Pill tone={p.kpi >= 85 ? "emerald" : p.kpi >= 70 ? "amber" : "rose"}>{p.kpi}%</Pill></span>
            <span className="hidden md:block text-right text-sm text-emerald-300 whitespace-nowrap">+{money(p.bonus)}</span>
            <span className="hidden md:block text-right text-sm text-rose-300 whitespace-nowrap">−{money(p.penalty)}</span>
            <span className="text-right whitespace-nowrap"><span className="block font-semibold text-white">{money(p.final)}</span><span className="md:hidden text-[11px] text-slate-400">KPI {p.kpi}%</span></span>
            <ChevronRight size={16} className="hidden md:block text-slate-500" />
          </button>
        ))}
      </Glass>

      <Glass className="p-5 mt-5">
        <button onClick={() => setRules(!rules)} className="w-full flex items-center justify-between text-left"><span className="font-semibold text-white flex items-center gap-2"><Info size={16} className="text-cyan-300" />Qanday hisoblanadi?</span><ChevronDown size={18} className={"text-slate-400 transition " + (rules ? "rotate-180" : "")} /></button>
        {rules && (
          <div className="mt-4 grid md:grid-cols-2 gap-5 fade-in">
            <ul className="text-sm text-slate-300 space-y-2">
              <li><b className="text-white">KPI</b> = davomat × 35% + intizom × 20% + vazifalar × 45%</li>
              <li><b className="text-white">Bonus:</b> KPI ≥ 90% → 20%, ≥ 80% → 12%, ≥ 70% → 5%</li>
              <li><b className="text-white">Jarima:</b> har bir daqiqa kechikish uchun, oylikning 15% idan oshmaydi</li>
              <li>Muddati hali kelmagan vazifalar KPI’ni pasaytirmaydi</li>
            </ul>
            <div className="grid grid-cols-2 gap-3">
              <Field label="1 daqiqa jarimasi (so‘m)"><input type="number" className={inputCls} value={db.settings.penaltyPerMin} onChange={(e) => update((d) => { d.settings.penaltyPerMin = Math.max(0, +e.target.value); })} /></Field>
              <Field label="Ish boshlanishi"><input type="time" className={inputCls} value={db.settings.workStart} onChange={(e) => update((d) => { d.settings.workStart = e.target.value; })} /></Field>
            </div>
          </div>
        )}
      </Glass>
    </div>
  );
}
