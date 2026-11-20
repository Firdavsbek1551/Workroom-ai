// Bugun: rahbar ochganda ko‘radigan yagona sahifa
import React, { useState, useMemo } from "react";
/* AUTO-IMPORTS */
import { Check, CircleCheck, Clock, HeartPulse, ListChecks, ScanFace, Sparkles, TrendingUp, UserCheck, UserPlus, Users, Video, X } from "lucide-react";
import { computePayroll, fmtDate, fmtLong, greeting, todayISO, todayStatus } from "../core.js";
import { Avatar, Btn, DOT, Empty, Glass, Modal, Pill, Prio, SectionHead, useStore } from "../ui.jsx";
import { QuickAdd, TaskEditor, TaskRow, groupTasks } from "./Tasks.jsx";
/* END-IMPORTS */

function AiInbox() {
  const { db, update, toast, empById } = useStore();
  const [edit, setEdit] = useState(null);
  const today = todayISO();
  const dismiss = (id) => update((d) => { d.notifications = d.notifications.filter((x) => x.id !== id); });
  const reassign = (n, toId, taskIds) => {
    const from = empById(n.fromId), to = empById(toId);
    update((d) => { d.tasks.forEach((t) => { if (taskIds.includes(t.id)) t.assigneeId = toId; }); d.notifications = d.notifications.filter((x) => x.id !== n.id); });
    toast(`${taskIds.length} ta vazifa ${from?.name.split(" ")[0]}dan ${to?.name.split(" ")[0]}ga o‘tkazildi`); setEdit(null);
  };
  const cards = db.notifications.map((n) => {
    if (n.kind === "reassign") {
      const from = empById(n.fromId), to = empById(n.toId);
      const tasks = db.tasks.filter((t) => n.taskIds.includes(t.id) && t.status !== "done");
      if (!from || !to || !tasks.length) return null;
      return (
        <div key={n.id} className="rounded-xl p-4 bg-white/[0.04] border border-white/10 slide-up">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-200 shrink-0"><HeartPulse size={17} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-white"><b>{from.name.split(" ")[0]}</b> bugun {from.status === "vacation" ? "ta’tilda" : "kasal"}. Uning {tasks.length} ta vazifasini <b>{to.name.split(" ")[0]}</b>ga o‘tkazaymi?</p>
              <p className="text-xs text-slate-400 mt-1 truncate">{tasks.map((t) => t.title).join(" · ")}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Btn variant="success" icon={Check} onClick={() => reassign(n, n.toId, tasks.map((t) => t.id))}>Tasdiqlash</Btn>
                <Btn variant="ghost" onClick={() => setEdit({ n, toId: n.toId, taskIds: tasks.map((t) => t.id), tasks })}>O‘zgartirish</Btn>
                <button onClick={() => dismiss(n.id)} className="text-sm text-slate-400 hover:text-white px-2">Rad etish</button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    if (n.kind === "late") {
      const e = empById(n.empId); if (!e) return null;
      return (
        <div key={n.id} className="rounded-xl p-4 bg-amber-500/[0.07] border border-amber-400/25 flex gap-3 slide-up">
          <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-200 shrink-0"><Clock size={17} /></div>
          <div className="flex-1">
            <p className="text-white"><b>{e.name.split(" ")[0]}</b> {n.at} da keldi — {n.late} daqiqa kechikish. Jarima avtomatik yozildi.</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Btn variant="ghost" icon={Check} onClick={() => dismiss(n.id)}>Tushunarli</Btn>
              <button className="text-sm text-slate-400 hover:text-white px-2" onClick={() => { update((d) => { d.attendance.forEach((a) => { if (a.empId === n.empId && a.date === today) a.late = 0; }); d.notifications = d.notifications.filter((x) => x.id !== n.id); }); toast("Uzrli deb belgilandi — jarima bekor qilindi"); }}>Uzrli deb belgilash</button>
            </div>
          </div>
        </div>
      );
    }
    if (n.kind === "info") return (
      <div key={n.id} className="rounded-xl p-4 bg-cyan-500/[0.07] border border-cyan-400/25 flex gap-3 items-start">
        <Sparkles size={17} className="text-cyan-300 mt-0.5 shrink-0" /><p className="flex-1 text-slate-100 text-sm">{n.text}</p>
        <button onClick={() => dismiss(n.id)} aria-label="Yopish" className="text-slate-400 hover:text-white"><X size={16} /></button>
      </div>
    );
    return null;
  }).filter(Boolean);

  return (
    <>
      {cards.length > 0 ? <div className="space-y-3">{cards}</div> : <div className="rounded-xl border border-dashed border-white/10 px-4 py-5 text-sm text-slate-400 flex items-center gap-2"><CircleCheck size={18} className="text-emerald-400" />Tasdiqlash kerak bo‘lgan narsa yo‘q.</div>}
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Kimga o‘tkazamiz?">
        {edit && (
          <div className="space-y-4">
            <div className="space-y-2">
              {db.employees.filter((e) => e.id !== edit.n.fromId && e.status === "active").map((e) => (
                <button key={e.id} onClick={() => setEdit({ ...edit, toId: e.id })} className={"w-full flex items-center gap-3 p-3 rounded-xl border text-left " + (edit.toId === e.id ? "border-violet-400/60 bg-violet-500/10" : "border-white/10 hover:bg-white/5")}>
                  <Avatar emp={e} size={32} /><span className="flex-1"><span className="block text-sm text-white">{e.name}</span><span className="block text-xs text-slate-400">{e.role} · {db.tasks.filter((t) => t.assigneeId === e.id && t.status !== "done").length} ta ochiq vazifa</span></span>
                  {edit.toId === e.id && <Check size={18} className="text-violet-300" />}
                </button>
              ))}
            </div>
            <div><span className="text-xs text-slate-400 mb-1.5 block">Vazifalar</span>
              {edit.tasks.map((t) => (
                <label key={t.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/5 mb-2 cursor-pointer">
                  <input type="checkbox" className="accent-violet-500 w-4 h-4" checked={edit.taskIds.includes(t.id)} onChange={(e) => setEdit({ ...edit, taskIds: e.target.checked ? [...edit.taskIds, t.id] : edit.taskIds.filter((x) => x !== t.id) })} />
                  <span className="text-sm text-white flex-1">{t.title}</span><Prio p={t.priority} />
                </label>
              ))}
            </div>
            <Btn className="w-full" icon={Check} disabled={!edit.taskIds.length} onClick={() => reassign(edit.n, edit.toId, edit.taskIds)}>O‘tkazish</Btn>
          </div>
        )}
      </Modal>
    </>
  );
}

export function TodayPage({ go, openPerson, openKiosk }) {
  const { db } = useStore();
  const [openTask, setOpenTask] = useState(null);
  const today = todayISO();
  const statuses = db.employees.map((e) => ({ e, st: todayStatus(db, e) }));
  const inOffice = statuses.filter((x) => x.st.key === "in" || x.st.key === "late").length;
  const late = db.attendance.filter((a) => a.date === today && a.late > 0);
  const g = groupTasks(db.tasks);
  const focus = [...g.overdue, ...g.today];
  const lastMeeting = db.meetings[0];
  const avgKpi = useMemo(() => { const p = computePayroll(db); return p.length ? Math.round(p.reduce((s, x) => s + x.kpi, 0) / p.length) : 0; }, [db]);
  const order = { late: 0, in: 1, left: 2, absent: 3, sick: 4, vacation: 5 };

  return (
    <div className="fade-in">
      <div className="mb-5">
        <p className="text-sm text-slate-400">{fmtLong()}</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-white">{greeting()}, {db.room.admin.split(" ")[0]}!</h1>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <button onClick={openKiosk} className="glass rounded-2xl p-4 text-left hover:bg-white/[0.07] transition">
          <div className="text-xs text-slate-400 flex items-center gap-1.5"><UserCheck size={14} className="text-emerald-300" />Ofisda</div>
          <div className="text-2xl md:text-3xl font-bold text-white mt-1">{inOffice}<span className="text-base text-slate-500 font-medium">/{db.employees.length}</span></div>
        </button>
        <button onClick={() => go("vazifalar")} className="glass rounded-2xl p-4 text-left hover:bg-white/[0.07] transition">
          <div className="text-xs text-slate-400 flex items-center gap-1.5"><ListChecks size={14} className="text-violet-300" />Bugungi ish</div>
          <div className="text-2xl md:text-3xl font-bold text-white mt-1">{focus.length}</div>{g.overdue.length > 0 && <div className="text-[11px] text-rose-300">{g.overdue.length} tasi muddati o‘tgan</div>}
        </button>
        <button onClick={() => go("maosh")} className="glass rounded-2xl p-4 text-left hover:bg-white/[0.07] transition">
          <div className="text-xs text-slate-400 flex items-center gap-1.5"><TrendingUp size={14} className="text-cyan-300" />O‘rtacha KPI</div>
          <div className="text-2xl md:text-3xl font-bold text-white mt-1">{avgKpi}<span className="text-base text-slate-500 font-medium">%</span></div>
        </button>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <section>
            <SectionHead icon={Sparkles} title={`AI tavsiyalar${db.notifications.length ? ` (${db.notifications.length})` : ""}`} />
            <AiInbox />
          </section>
          <section>
            <SectionHead icon={ListChecks} title="Bugun bajarilishi kerak" right={<button onClick={() => go("vazifalar")} className="text-xs text-cyan-300 hover:underline">Barcha vazifalar</button>} />
            <QuickAdd compact />
            <Glass className="p-2 mt-3">
              {focus.slice(0, 8).map((t) => <TaskRow key={t.id} t={t} onOpen={setOpenTask} />)}
              {focus.length > 8 && <button onClick={() => go("vazifalar")} className="w-full text-xs text-slate-400 hover:text-white py-2">Yana {focus.length - 8} ta…</button>}
              {!focus.length && <Empty text="Bugunga vazifa qolmadi." />}
            </Glass>
          </section>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <section>
            <SectionHead icon={Users} title="Jamoa bugun" right={<button onClick={openKiosk} className="text-xs text-cyan-300 hover:underline flex items-center gap-1"><ScanFace size={13} />Davomat kiosk</button>} />
            <Glass className="p-2">
              {statuses.sort((a, b) => order[a.st.key] - order[b.st.key]).map(({ e, st }) => (
                <button key={e.id} onClick={() => openPerson(e.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 text-left">
                  <div className="relative"><Avatar emp={e} size={34} /><span className={"absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0b0e24] " + DOT[st.color]} /></div>
                  <span className="flex-1 min-w-0"><span className="block text-sm text-white truncate">{e.name}</span><span className="block text-xs text-slate-500 truncate">{e.role}</span></span>
                  <Pill tone={st.color}>{st.label}</Pill>
                </button>
              ))}
              {!db.employees.length && <Empty icon={Users} text="Jamoada hali hech kim yo‘q." action={<Btn icon={UserPlus} onClick={() => go("jamoa")}>Xodim qo‘shish</Btn>} />}
            </Glass>
            {late.length > 0 && <p className="text-xs text-amber-300 mt-2 px-1">Bugun {late.length} kishi jami {late.reduce((s, a) => s + a.late, 0)} daqiqa kechikdi.</p>}
          </section>
          <section>
            <SectionHead icon={Video} title="Majlis" />
            {lastMeeting ? (
              <Glass className="p-4">
                <div className="text-sm text-white font-medium">{lastMeeting.title}</div>
                <div className="text-xs text-slate-400 mt-0.5">{fmtDate(lastMeeting.date)}, {lastMeeting.time} · {lastMeeting.analysis?.items.length || 0} ta vazifa {lastMeeting.analysis?.assigned ? "biriktirildi" : "kutmoqda"}</div>
                <p className="text-xs text-slate-300 mt-2 line-clamp-3">{lastMeeting.analysis?.summary}</p>
                <div className="flex gap-2 mt-3"><Btn icon={Video} onClick={() => go("majlis")}>Yangi majlis</Btn></div>
              </Glass>
            ) : (
              <Glass className="p-4 text-sm text-slate-300">
                Majlisni shu yerda o‘tkazing: AI o‘zbekcha nutqni yozib boradi, oxirida vazifalarni avtomatik taqsimlaydi.
                <div className="mt-3"><Btn icon={Video} onClick={() => go("majlis")}>Majlis boshlash</Btn></div>
              </Glass>
            )}
          </section>
        </div>
      </div>
      {openTask && <TaskEditor key={openTask.id} task={openTask} onClose={() => setOpenTask(null)} />}
    </div>
  );
}
