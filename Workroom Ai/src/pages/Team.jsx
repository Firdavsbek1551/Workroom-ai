// Jamoa: xodimlar kartalari va bitta xodimning hamma ma’lumoti (davomat, vazifalar, KPI, maosh)
import React, { useState, useMemo } from "react";
/* AUTO-IMPORTS */
import { CalendarDays, Check, ListChecks, Pencil, ScanFace, Trash2, UserPlus, Users, Wallet } from "lucide-react";
import { GRADS, MONTHS, applyStatus, cap, computePayroll, fmtDate, iso, money, monthDays, norm, todayISO, todayStatus, uid } from "../core.js";
import { Avatar, Btn, DOT, Empty, FaceScanner, Field, Modal, Pill, Ring, Segmented, Sheet, inputCls, useStore } from "../ui.jsx";
import { QuickAdd, TaskEditor, TaskRow } from "./Tasks.jsx";
/* END-IMPORTS */

export function MonthCalendar({ empId }) {
  const { db } = useStore();
  const today = todayISO();
  const days = monthDays();
  const offset = (days[0].dow + 6) % 7; // dushanbadan boshlanadi
  const cell = (d) => {
    if (d.weekend) return "bg-transparent text-slate-600";
    if (d.iso > today) return "bg-white/[0.03] text-slate-500";
    const r = db.attendance.find((a) => a.empId === empId && a.date === d.iso);
    if (!r) return d.iso === today ? "bg-white/5 text-slate-300 ring-1 ring-white/20" : "bg-rose-500/20 text-rose-200";
    return r.late ? "bg-amber-500/25 text-amber-100" : "bg-emerald-500/25 text-emerald-100";
  };
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-[10px] text-slate-500 mb-1 text-center">{["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"].map((x) => <span key={x}>{x}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, i) => <span key={"o" + i} />)}
        {days.map((d) => {
          const r = db.attendance.find((a) => a.empId === empId && a.date === d.iso);
          return <span key={d.iso} title={r ? `${fmtDate(d.iso)}: ${r.in}${r.out ? "–" + r.out : ""}${r.late ? `, ${r.late} daq kechikish` : ""}` : fmtDate(d.iso)} className={"aspect-square rounded-md flex items-center justify-center text-[11px] " + cell(d)}>{d.day}</span>;
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-slate-400">
        <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-sm bg-emerald-500/60" />o‘z vaqtida</span>
        <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-sm bg-amber-500/60" />kechikkan</span>
        <span className="flex items-center gap-1"><i className="w-2 h-2 rounded-sm bg-rose-500/50" />kelmagan</span>
      </div>
    </div>
  );
}

export function PersonSheet({ empId, onClose }) {
  const { db, update, toast, empById } = useStore();
  const e = empById(empId);
  const pay = useMemo(() => computePayroll(db).find((p) => p.emp.id === empId), [db, empId]);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(null);
  const [rescan, setRescan] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [openTask, setOpenTask] = useState(null);
  if (!e) return null;
  const st = todayStatus(db, e);
  const tasks = db.tasks.filter((t) => t.assigneeId === e.id);
  const openTasks = tasks.filter((t) => t.status !== "done");

  const setStatus = (s) => {
    update((d) => applyStatus(d, e.id, s));
    toast(s === "active" ? `${e.name.split(" ")[0]} faol` : `${e.name.split(" ")[0]} — ${s === "sick" ? "kasal" : "ta’tilda"}. ${openTasks.length ? "AI vazifalarni qayta taqsimlashni taklif qildi (Bugun sahifasida)" : ""}`, s === "active" ? "ok" : "warn");
  };

  return (
    <Sheet open onClose={onClose} title="Xodim">
      <div className="flex items-center gap-4">
        <Avatar emp={e} size={64} />
        <div className="flex-1 min-w-0">
          {edit ? (
            <div className="space-y-2">
              <input className={inputCls + " !py-1.5"} value={form.name} onChange={(x) => setForm({ ...form, name: x.target.value })} aria-label="Ism" />
              <input className={inputCls + " !py-1.5"} value={form.role} onChange={(x) => setForm({ ...form, role: x.target.value })} aria-label="Lavozim" />
              <input type="number" className={inputCls + " !py-1.5"} value={form.salary} onChange={(x) => setForm({ ...form, salary: x.target.value })} aria-label="Oylik" />
              <div className="flex gap-2"><Btn className="!py-1.5" icon={Check} disabled={!form.name.trim()} onClick={() => { update((d) => { const x = d.employees.find((y) => y.id === e.id); x.name = form.name.trim(); x.role = form.role.trim() || "Xodim"; x.salary = Math.max(0, +form.salary || 0); }); setEdit(false); toast("Saqlandi"); }}>Saqlash</Btn><Btn variant="ghost" className="!py-1.5" onClick={() => setEdit(false)}>Bekor</Btn></div>
            </div>
          ) : (
            <>
              <div className="text-lg font-semibold text-white truncate">{e.name}</div>
              <div className="text-sm text-slate-400">{e.role} · {money(e.salary)}</div>
              <button onClick={() => { setForm({ name: e.name, role: e.role, salary: String(e.salary) }); setEdit(true); }} className="text-xs text-cyan-300 hover:underline mt-1 flex items-center gap-1"><Pencil size={11} />Tahrirlash</button>
            </>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Segmented value={e.status} onChange={(v) => v !== e.status && setStatus(v)} options={[["active", "Faol"], ["sick", "Kasal"], ["vacation", "Ta’tilda"]]} />
        <Pill tone={st.color}>{st.label}</Pill>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-5">
        <div className="rounded-xl bg-white/5 p-3 text-center"><div className="text-xl font-semibold text-white">{pay.kpi}%</div><div className="text-[11px] text-slate-400">KPI</div></div>
        <div className="rounded-xl bg-white/5 p-3 text-center"><div className="text-xl font-semibold text-white">{pay.present}/{pay.workDays}</div><div className="text-[11px] text-slate-400">Kelgan kun</div></div>
        <div className="rounded-xl bg-white/5 p-3 text-center"><div className={"text-xl font-semibold " + (pay.lateMin ? "text-amber-300" : "text-white")}>{pay.lateMin}</div><div className="text-[11px] text-slate-400">Kechikish, daq</div></div>
      </div>

      <h4 className="text-sm font-semibold text-white mt-6 mb-2 flex items-center gap-2"><CalendarDays size={15} className="text-cyan-300" />{cap(MONTHS[new Date().getMonth()])} davomati</h4>
      <MonthCalendar empId={e.id} />

      <h4 className="text-sm font-semibold text-white mt-6 mb-1 flex items-center gap-2"><ListChecks size={15} className="text-violet-300" />Vazifalari <span className="text-slate-500 font-normal">{openTasks.length} ochiq</span></h4>
      <div className="-mx-3">{openTasks.map((t) => <TaskRow key={t.id} t={t} onOpen={setOpenTask} showPerson={false} />)}</div>
      {!openTasks.length && <p className="text-xs text-slate-500 py-2">Ochiq vazifa yo‘q.</p>}
      <div className="mt-2"><QuickAdd defaultAssignee={e.id} compact /></div>

      <h4 className="text-sm font-semibold text-white mt-6 mb-2 flex items-center gap-2"><Wallet size={15} className="text-emerald-300" />Shu oy maoshi (taxminiy)</h4>
      <div className="rounded-xl bg-white/5 p-4 text-sm space-y-1.5">
        <div className="flex justify-between text-slate-300"><span>Asosiy oylik</span><span>{money(e.salary)}</span></div>
        <div className="flex justify-between text-emerald-300"><span>KPI bonusi ({Math.round(pay.bonusPct * 100)}%)</span><span>+{money(pay.bonus)}</span></div>
        <div className="flex justify-between text-rose-300"><span>Kechikish jarimasi</span><span>−{money(pay.penalty)}</span></div>
        <div className="flex justify-between text-white font-semibold border-t border-white/10 pt-2 mt-2"><span>Yakuniy</span><span>{money(pay.final)}</span></div>
        <p className="text-[11px] text-slate-500 pt-1">KPI = davomat {Math.round(pay.att)}% × 35% + intizom {Math.round(pay.punct)}% × 20% + vazifalar {Math.round(pay.taskScore)}% × 45%</p>
      </div>

      <div className="flex flex-wrap gap-2 mt-6">
        <Btn variant="ghost" icon={ScanFace} onClick={() => setRescan(true)}>{e.descriptor ? "Yuzni qayta skanerlash" : "Yuzni skanerlash"}</Btn>
        <Btn variant="ghost" className="!text-rose-300" icon={Trash2} onClick={() => setConfirmDel(true)}>O‘chirish</Btn>
      </div>
      {!e.descriptor && <p className="text-[11px] text-amber-300 mt-2">Yuz skanerlanmagan — davomat kioski bu xodimni taniy olmaydi.</p>}

      <Modal open={rescan} onClose={() => setRescan(false)} title={`${e.name} — yuzni skanerlash`}>
        <FaceScanner scanLabel="Saqlash" onCapture={({ descriptor, photo, kind, demo }) => {
          if (demo) { toast("Demo skanerlash: haqiqiy shablon uchun kamerani yoqing", "warn"); setRescan(false); return; }
          update((d) => { const x = d.employees.find((y) => y.id === e.id); x.descriptor = descriptor; x.photo = photo; x.faceKind = kind; });
          toast("Yuz shabloni saqlandi"); setRescan(false);
        }} />
      </Modal>
      <Modal open={confirmDel} onClose={() => setConfirmDel(false)} title="Xodimni o‘chirish">
        <p className="text-sm text-slate-300 mb-5">{e.name} va unga biriktirilgan {tasks.length} ta vazifa o‘chiriladi. Davomat tarixi saqlanmaydi.</p>
        <div className="flex gap-2 justify-end"><Btn variant="ghost" onClick={() => setConfirmDel(false)}>Bekor qilish</Btn><Btn variant="danger" icon={Trash2} onClick={() => { update((d) => { d.employees = d.employees.filter((x) => x.id !== e.id); d.tasks = d.tasks.filter((t) => t.assigneeId !== e.id); d.attendance = d.attendance.filter((a) => a.empId !== e.id); d.notifications = d.notifications.filter((n) => n.fromId !== e.id && n.toId !== e.id && n.empId !== e.id); }); toast(`${e.name} o‘chirildi`); onClose(); }}>O‘chirish</Btn></div>
      </Modal>
      {openTask && <TaskEditor key={openTask.id} task={openTask} onClose={() => setOpenTask(null)} />}
    </Sheet>
  );
}

export function AddEmployee({ open, onClose }) {
  const { update, toast, db } = useStore();
  const [form, setForm] = useState({ name: "", role: "", salary: "8000000" });
  const add = ({ descriptor = null, photo = null, kind = null, demo = false } = {}) => {
    if (!form.name.trim()) { toast("Avval ismni kiriting", "warn"); return; }
    update((d) => { d.employees.push({ id: uid("e"), name: form.name.trim(), role: form.role.trim() || "Xodim", salary: Math.max(0, +form.salary || 0), color: d.employees.length % GRADS.length, status: "active", photo, descriptor, faceKind: descriptor ? kind : null }); });
    toast(`${form.name.trim()} jamoaga qo‘shildi${descriptor ? " · Face ID ✓" : ""}`);
    setForm({ name: "", role: "", salary: "8000000" }); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Yangi xodim" wide>
      <div className="grid md:grid-cols-5 gap-5">
        <div className="md:col-span-2 space-y-3">
          <Field label="Ism familiya"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Dilnoza Yusupova" autoFocus /></Field>
          <Field label="Lavozim"><input className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Buxgalter" /></Field>
          <Field label="Oylik (so‘m)"><input type="number" className={inputCls} value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} /></Field>
          <ol className="text-xs text-slate-400 space-y-1 list-decimal pl-4 pt-1"><li>Ma’lumotlarni kiriting</li><li>Kamerani yoqing va xodim kameraga qarasin</li><li>“Skanerlash va qo‘shish”ni bosing</li></ol>
          <button onClick={() => add()} className="text-xs text-slate-400 hover:text-white hover:underline">Yuzsiz qo‘shish (keyin skanerlash mumkin)</button>
        </div>
        <div className="md:col-span-3">
          <FaceScanner disabled={!form.name.trim()} disabledHint="Avval ismni kiriting" scanLabel="Skanerlash va qo‘shish" onCapture={(r) => add(r)} />
        </div>
      </div>
    </Modal>
  );
}

export function TeamPage({ openPerson }) {
  const { db } = useStore();
  const [q, setQ] = useState(""); const [adding, setAdding] = useState(false);
  const pay = useMemo(() => computePayroll(db), [db]);
  const list = db.employees.filter((e) => norm(e.name + " " + e.role).includes(norm(q)));
  return (
    <div className="fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div><h1 className="text-2xl font-semibold text-white">Jamoa</h1><p className="text-sm text-slate-400">{db.employees.length} xodim · kartani bosing — davomat, vazifalar, KPI va maosh bir joyda</p></div>
        <div className="flex gap-2 w-full sm:w-auto">
          <input className={inputCls + " sm:w-56"} placeholder="Qidirish…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Xodim qidirish" />
          <Btn icon={UserPlus} onClick={() => setAdding(true)} className="shrink-0">Qo‘shish</Btn>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((e) => {
          const st = todayStatus(db, e); const p = pay.find((x) => x.emp.id === e.id);
          const open = db.tasks.filter((t) => t.assigneeId === e.id && t.status !== "done").length;
          return (
            <button key={e.id} onClick={() => openPerson(e.id)} className="glass rounded-2xl p-4 text-left hover:bg-white/[0.07] transition group">
              <div className="flex items-center gap-3">
                <div className="relative"><Avatar emp={e} size={52} /><span className={"absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#0b0e24] " + DOT[st.color]} /></div>
                <div className="flex-1 min-w-0"><div className="text-white font-medium truncate">{e.name}</div><div className="text-xs text-slate-400 truncate">{e.role}</div></div>
                <div className="relative"><Ring value={p.kpi} size={44} stroke={4} /><span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-white">{p.kpi}</span></div>
              </div>
              <div className="flex items-center justify-between mt-4 text-xs">
                <Pill tone={st.color}>{st.label}</Pill>
                <span className="text-slate-400">{open} ochiq vazifa{!e.descriptor && <span className="text-amber-300"> · yuzsiz</span>}</span>
              </div>
            </button>
          );
        })}
      </div>
      {!list.length && <Empty icon={Users} text="Hech kim topilmadi." />}
      <AddEmployee open={adding} onClose={() => setAdding(false)} />
    </div>
  );
}
