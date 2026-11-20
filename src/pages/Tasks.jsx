// Vazifalar: tezkor qo‘shish (tabiiy til), guruhlangan ro‘yxat, tahrirlash
import React, { useState, useMemo } from "react";
/* AUTO-IMPORTS */
import { Brain, Check, ChevronRight, Plus, Trash2 } from "lucide-react";
import { addDays, fmtDate, parseQuickTask, todayISO, uid } from "../core.js";
import { Avatar, Btn, Empty, Field, Glass, Modal, PRIO, Segmented, inputCls, useStore } from "../ui.jsx";
/* END-IMPORTS */

const PRIO_DOT = { "Yuqori": "bg-rose-400", "O‘rta": "bg-amber-400", "Past": "bg-emerald-400" };

// Bitta qatorda vazifa yozish: "Nigora ertaga 10 ta post tayyorlasin, shoshilinch"
export function QuickAdd({ defaultAssignee, compact }) {
  const { db, update, toast } = useStore();
  const [text, setText] = useState("");
  const [over, setOver] = useState({});
  const parsed = useMemo(() => (text.trim() ? parseQuickTask(text, db.employees) : null), [text, db.employees]);
  const draft = parsed ? { ...parsed, assigneeId: over.assigneeId ?? parsed.assigneeId ?? defaultAssignee ?? null, deadline: over.deadline ?? parsed.deadline, priority: over.priority ?? parsed.priority } : null;

  const add = (e) => {
    e?.preventDefault();
    if (!draft?.title) return;
    if (!draft.assigneeId) { toast("Mas’ul xodimni tanlang yoki ismini yozing", "warn"); return; }
    update((d) => { d.tasks.push({ id: uid("t"), title: draft.title, assigneeId: draft.assigneeId, deadline: draft.deadline, priority: draft.priority, status: "todo", source: "manual" }); });
    toast(`Vazifa qo‘shildi: ${db.employees.find((x) => x.id === draft.assigneeId)?.name.split(" ")[0]} · ${fmtDate(draft.deadline)}`);
    setText(""); setOver({});
  };

  return (
    <form onSubmit={add} className={"rounded-2xl border border-white/10 bg-white/[0.04] focus-within:border-violet-400/50 transition " + (compact ? "p-2" : "p-3")}>
      <div className="flex items-center gap-2">
        <Plus size={18} className="text-violet-300 shrink-0 ml-1" />
        <input value={text} onChange={(e) => { setText(e.target.value); if (!e.target.value) setOver({}); }} className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none py-2" placeholder="Vazifa yozing: “Nigora ertaga 10 ta post tayyorlasin”" aria-label="Yangi vazifa" />
        <Btn type="submit" className="!px-3 !py-2" disabled={!draft?.title}>Qo‘shish</Btn>
      </div>
      {draft && (
        <div className="flex flex-wrap items-center gap-2 mt-2 pl-7 text-xs fade-in">
          <span className="text-slate-500">AI aniqladi:</span>
          <select value={draft.assigneeId || ""} onChange={(e) => setOver({ ...over, assigneeId: e.target.value })} className={"rounded-lg px-2 py-1 border bg-slate-900 " + (draft.assigneeId ? "border-white/10 text-white" : "border-amber-400/50 text-amber-300")}>
            <option value="">Mas’ul tanlang…</option>
            {db.employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <input type="date" value={draft.deadline} onChange={(e) => setOver({ ...over, deadline: e.target.value })} className="rounded-lg px-2 py-1 border border-white/10 bg-slate-900 text-white" />
          <select value={draft.priority} onChange={(e) => setOver({ ...over, priority: e.target.value })} className="rounded-lg px-2 py-1 border border-white/10 bg-slate-900 text-white">
            {["Yuqori", "O‘rta", "Past"].map((p) => <option key={p}>{p}</option>)}
          </select>
          <span className="text-slate-400 truncate max-w-[280px]">“{draft.title}”</span>
        </div>
      )}
    </form>
  );
}

export function TaskRow({ t, onOpen, showPerson = true }) {
  const { db, update, toast, empById } = useStore();
  const e = empById(t.assigneeId); const today = todayISO();
  const done = t.status === "done"; const overdue = !done && t.deadline < today;
  const toggle = (ev) => {
    ev.stopPropagation();
    update((d) => { const x = d.tasks.find((y) => y.id === t.id); x.status = done ? "todo" : "done"; if (!done) x.doneAt = todayISO(); });
    if (!done) toast("Bajarildi ✓ — KPI yangilandi");
  };
  return (
    <div onClick={() => onOpen?.(t)} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 cursor-pointer transition">
      <button onClick={toggle} aria-label={done ? "Bajarilmagan deb belgilash" : "Bajarildi deb belgilash"} className={"w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition " + (done ? "bg-emerald-500 border-emerald-500" : "border-slate-500 hover:border-emerald-400")}>{done && <Check size={12} className="text-white" />}</button>
      <div className="flex-1 min-w-0">
        <div className={"text-sm truncate " + (done ? "text-slate-500 line-through" : "text-white")}>{t.title}</div>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
          <span className={"w-1.5 h-1.5 rounded-full " + PRIO_DOT[t.priority]} title={t.priority + " ustuvorlik"} />
          <span className={overdue ? "text-rose-300" : ""}>{t.deadline === today ? "Bugun" : t.deadline === addDays(1) ? "Ertaga" : fmtDate(t.deadline)}</span>
          {t.status === "progress" && <span className="text-amber-300">· jarayonda</span>}
          {t.source === "meeting" && <span className="text-violet-300 flex items-center gap-1">· <Brain size={10} />majlisdan</span>}
        </div>
      </div>
      {showPerson && e && <div className="flex items-center gap-1.5 shrink-0"><Avatar emp={e} size={22} /><span className="text-xs text-slate-300 hidden sm:block">{e.name.split(" ")[0]}</span></div>}
    </div>
  );
}

export function TaskEditor({ task, onClose }) {
  const { db, update, toast } = useStore();
  const [m, setM] = useState(task);
  if (!task) return null;
  const save = () => { update((d) => { Object.assign(d.tasks.find((t) => t.id === m.id), m); }); toast("Saqlandi"); onClose(); };
  return (
    <Modal open={!!task} onClose={onClose} title="Vazifa">
      <div className="space-y-4">
        <Field label="Nomi"><input className={inputCls} value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mas’ul"><select className={inputCls} value={m.assigneeId} onChange={(e) => setM({ ...m, assigneeId: e.target.value })}>{db.employees.map((e) => <option key={e.id} value={e.id} className="bg-slate-900">{e.name}</option>)}</select></Field>
          <Field label="Muddat"><input type="date" className={inputCls} value={m.deadline} onChange={(e) => setM({ ...m, deadline: e.target.value })} /></Field>
        </div>
        <Field label="Ustuvorlik"><div className="flex gap-2">{["Yuqori", "O‘rta", "Past"].map((p) => <button key={p} onClick={() => setM({ ...m, priority: p })} className={"flex-1 py-2 rounded-xl text-sm border " + (m.priority === p ? PRIO[p] : "border-white/10 text-slate-400")}>{p}</button>)}</div></Field>
        <Field label="Holat"><Segmented value={m.status} onChange={(v) => setM({ ...m, status: v })} options={[["todo", "Kutilmoqda"], ["progress", "Jarayonda"], ["done", "Bajarildi"]]} /></Field>
        <div className="flex gap-2 pt-1">
          <Btn variant="danger" icon={Trash2} onClick={() => { update((d) => { d.tasks = d.tasks.filter((t) => t.id !== m.id); }); toast("Vazifa o‘chirildi"); onClose(); }}>O‘chirish</Btn>
          <Btn className="flex-1" icon={Check} onClick={save} disabled={!m.title.trim()}>Saqlash</Btn>
        </div>
      </div>
    </Modal>
  );
}

export function groupTasks(tasks) {
  const today = todayISO(), tmr = addDays(1), week = addDays(7);
  const g = { overdue: [], today: [], tomorrow: [], week: [], later: [], done: [] };
  tasks.forEach((t) => {
    if (t.status === "done") g.done.push(t);
    else if (t.deadline < today) g.overdue.push(t);
    else if (t.deadline === today) g.today.push(t);
    else if (t.deadline === tmr) g.tomorrow.push(t);
    else if (t.deadline <= week) g.week.push(t);
    else g.later.push(t);
  });
  const prio = { "Yuqori": 0, "O‘rta": 1, "Past": 2 };
  Object.values(g).forEach((a) => a.sort((x, y) => x.deadline.localeCompare(y.deadline) || prio[x.priority] - prio[y.priority]));
  return g;
}

export function TasksPage() {
  const { db } = useStore();
  const [who, setWho] = useState("all");
  const [showDone, setShowDone] = useState(false);
  const [open, setOpen] = useState(null);
  const list = db.tasks.filter((t) => who === "all" || t.assigneeId === who);
  const g = groupTasks(list);
  const groups = [["overdue", "Muddati o‘tgan", "text-rose-300"], ["today", "Bugun", "text-white"], ["tomorrow", "Ertaga", "text-white"], ["week", "Shu hafta", "text-white"], ["later", "Keyinroq", "text-slate-300"]];
  const openCount = list.filter((t) => t.status !== "done").length;

  return (
    <div className="fade-in max-w-3xl mx-auto">
      <div className="mb-4"><h1 className="text-2xl font-semibold text-white">Vazifalar</h1><p className="text-sm text-slate-400">{openCount} ta ochiq vazifa · majlislardan kelganlari ham shu yerda</p></div>
      <QuickAdd defaultAssignee={who !== "all" ? who : undefined} />
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-4 -mx-1 px-1">
        <button onClick={() => setWho("all")} className={"shrink-0 px-3 py-1.5 rounded-full text-sm border " + (who === "all" ? "bg-white/15 border-white/20 text-white" : "border-white/10 text-slate-400 hover:text-white")}>Hammasi</button>
        {db.employees.map((e) => (
          <button key={e.id} onClick={() => setWho(e.id)} className={"shrink-0 flex items-center gap-2 pl-1 pr-3 py-1 rounded-full text-sm border " + (who === e.id ? "bg-white/15 border-white/20 text-white" : "border-white/10 text-slate-400 hover:text-white")}>
            <Avatar emp={e} size={22} />{e.name.split(" ")[0]}<span className="text-[11px] text-slate-500">{db.tasks.filter((t) => t.assigneeId === e.id && t.status !== "done").length}</span>
          </button>
        ))}
      </div>
      <Glass className="p-2 md:p-3">
        {groups.map(([k, label, cls]) => g[k].length > 0 && (
          <div key={k} className="mb-2">
            <div className={"px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide flex items-center gap-2 " + cls}>{label}<span className="text-slate-500 font-normal">{g[k].length}</span></div>
            {g[k].map((t) => <TaskRow key={t.id} t={t} onOpen={setOpen} showPerson={who === "all"} />)}
          </div>
        ))}
        {!openCount && <Empty text="Ochiq vazifa yo‘q. Yuqoridagi qatorga yozib qo‘shing yoki majlis o‘tkazing." />}
        {g.done.length > 0 && (
          <div className="border-t border-white/5 mt-2 pt-2">
            <button onClick={() => setShowDone(!showDone)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-white"><ChevronRight size={14} className={"transition " + (showDone ? "rotate-90" : "")} />Bajarilgan ({g.done.length})</button>
            {showDone && g.done.map((t) => <TaskRow key={t.id} t={t} onOpen={setOpen} showPerson={who === "all"} />)}
          </div>
        )}
      </Glass>
      {open && <TaskEditor key={open.id} task={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
