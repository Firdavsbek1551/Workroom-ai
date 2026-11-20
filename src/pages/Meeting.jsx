// Majlis: lobbi, video xona, jonli transkript, Meeting AI tahlili
import React, { useState, useEffect, useRef } from "react";
/* AUTO-IMPORTS */
import { Brain, Camera, CameraOff, Check, Chrome, CircleCheck, ListChecks, Loader2, MessageSquare, Mic, MicOff, MonitorOff, MonitorUp, PhoneOff, Play, Plus, Send, Sparkles, Square, Trash2, UserCheck, Video, Wand2 } from "lucide-react";
import { DEMO_MEETING, WEEKDAYS, addDays, apiPost, cap, companyNow, fmtDate, hm, localAnalyze, todayISO, uid } from "../core.js";
import { Avatar, Btn, Field, Glass, Modal, Prio, inputCls, useStore } from "../ui.jsx";
/* END-IMPORTS */

/* ============================ MAJLISLAR ============================ */
export function MeetingPage({ go }) {
  const { db, update, toast, ai, empById } = useStore();
  const participants = db.employees.filter((e) => e.status === "active");
  const [inCall, setInCall] = useState(false);
  const [title, setTitle] = useState("Haftalik reja majlisi");
  const [mic, setMic] = useState(true); const [cam, setCam] = useState(false); const [share, setShare] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [chat, setChat] = useState([]); const [msg, setMsg] = useState("");
  const [lines, setLines] = useState([]); const [partial, setPartial] = useState("");
  const [listening, setListening] = useState(false); const [demoOn, setDemoOn] = useState(false);
  const [speaker, setSpeaker] = useState(null);
  const [analysis, setAnalysis] = useState(null); const [busy, setBusy] = useState(false);
  const [viewMeeting, setViewMeeting] = useState(null);
  const videoRef = useRef(null); const camStream = useRef(null); const shareStream = useRef(null); const shareRef = useRef(null);
  const recRef = useRef(null); const demoRef = useRef(null); const tRef = useRef(null);
  const meetingId = useRef(uid("m"));

  const adminSpeaker = { id: "admin", name: db.room.admin + " (Rahbar)" };
  const pushLine = (spk, text) => setLines((l) => [...l, { id: uid("l"), speakerId: spk.id, speaker: spk.name.split(" (")[0], speakerName: spk.name, text, t: hm() }]);

  useEffect(() => { tRef.current?.scrollTo({ top: 1e6, behavior: "smooth" }); }, [lines, partial]);
  useEffect(() => () => { stopAll(); }, []);

  // dictation (Claude) handlers
  const dictHandlers = useRef(false);
  useEffect(() => {
    if (!ai.dictation || dictHandlers.current) return; dictHandlers.current = true;
    ai.dictation.onPartial(({ text }) => setPartial(text));
    ai.dictation.onFinal(({ text }) => { setPartial(""); if (text?.trim()) pushLine(adminSpeaker, text.trim()); });
    ai.dictation.onState(({ state }) => { if (state === "idle") { setListening(false); setSpeaker(null); } });
  }, [ai.dictation]);

  const startCam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      camStream.current = s; setCam(true); setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play().catch(() => {}); } }, 30);
    } catch { setCam(false); toast("Kameraga ruxsat berilmadi — avatar ko‘rsatiladi", "warn"); }
  };
  const toggleCam = () => { if (cam) { camStream.current?.getTracks().forEach((t) => t.stop()); camStream.current = null; setCam(false); } else startCam(); };
  const toggleShare = async () => {
    if (share) { shareStream.current?.getTracks().forEach((t) => t.stop()); shareStream.current = null; setShare(false); return; }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true }); shareStream.current = s; setShare("real");
      s.getVideoTracks()[0].onended = () => setShare(false);
      setTimeout(() => { if (shareRef.current) { shareRef.current.srcObject = s; shareRef.current.play().catch(() => {}); } }, 30);
    } catch { setShare("sim"); toast("Ekran ulashish bu oynada cheklangan — taqdimot simulyatsiyasi ko‘rsatilmoqda", "warn"); }
  };

  const stopListening = () => {
    if (ai.dictation && listening) ai.dictation.stop().catch(() => {});
    if (recRef.current) { try { recRef.current.onend = null; recRef.current.stop(); } catch { } recRef.current = null; }
    setListening(false); setPartial(""); setSpeaker(null);
  };
  const startListening = () => {
    if (demoOn) stopDemo();
    if (ai.dictation) {
      ai.dictation.start().then(() => { setListening(true); setSpeaker("admin"); toast("Meeting AI tinglamoqda — o‘zbekcha gapiring"); })
        .catch((e) => toast(e?.code === "not_granted" ? "Mikrofonga ruxsat berilmadi. Demo majlisdan foydalaning." : "Mikrofonni yoqib bo‘lmadi. Demo majlisdan foydalaning.", "error"));
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast("Brauzeringiz nutqni tanishni qo‘llab-quvvatlamaydi (Chrome tavsiya etiladi). Demo majlisni ishga tushiring.", "error"); return; }
    const r = new SR(); r.lang = "uz-UZ"; r.continuous = true; r.interimResults = true;
    r.onresult = (ev) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        if (res.isFinal) pushLine(adminSpeaker, res[0].transcript.trim()); else interim += res[0].transcript;
      }
      setPartial(interim);
    };
    r.onerror = (e) => { toast(e.error === "not-allowed" ? "Mikrofonga ruxsat yo‘q. “Demo o‘zbekcha majlis”dan foydalaning." : "Nutqni tanishda xato: " + e.error, "error"); stopListening(); };
    r.onend = () => { if (recRef.current === r) { try { r.start(); } catch { } } };
    try { r.start(); recRef.current = r; setListening(true); setSpeaker("admin"); toast("Meeting AI tinglamoqda (uz-UZ)"); } catch { toast("Mikrofonni ishga tushirib bo‘lmadi", "error"); }
  };

  const stopDemo = () => { clearTimeout(demoRef.current); demoRef.current = null; setDemoOn(false); setSpeaker(null); setPartial(""); };
  const runDemo = () => {
    if (listening) stopListening();
    setDemoOn(true); setAnalysis(null);
    let i = 0;
    const step = () => {
      if (i >= DEMO_MEETING.length) { setDemoOn(false); setSpeaker(null); setPartial(""); toast("Demo majlis yakunlandi — endi “Tahlil qilish”ni bosing"); return; }
      const ln = DEMO_MEETING[i];
      const spk = ln.who === "admin" ? adminSpeaker : empById(ln.who) || { id: ln.who, name: "Ishtirokchi" };
      setSpeaker(spk.id);
      const words = ln.text.split(" "); let w = 0;
      const typer = () => {
        w++; setPartial(words.slice(0, w).join(" "));
        if (w < words.length) demoRef.current = setTimeout(typer, 70);
        else { setPartial(""); pushLine(spk, ln.text); i++; demoRef.current = setTimeout(step, 650); }
      };
      typer();
    };
    step();
  };

  const stopAll = () => { stopListening(); stopDemo(); camStream.current?.getTracks().forEach((t) => t.stop()); shareStream.current?.getTracks().forEach((t) => t.stop()); };

  const analyze = async (endMeeting) => {
    if (!lines.length) { toast("Transkript bo‘sh — avval AI tinglashni yoki demo majlisni ishga tushiring", "warn"); return; }
    stopListening(); stopDemo(); setBusy(true);
    let res = null; let v = null; let engine = "Gemini AI";
    if (ai.sample) {
      try {
        const people = db.employees.map((e) => `${e.id}: ${e.name} (${e.role})`).join("\n");
        const prompt = `Sen o‘zbek tilidagi ish majlislarini tahlil qiluvchi AI yordamchisan. Bugun ${todayISO()} (${WEEKDAYS[companyNow().getDay()]}).\nXodimlar (id: ism):\n${people}\n\nMajlis transkripti:\n${lines.map((l) => `${l.speaker}: ${l.text}`).join("\n")}\n\nFaqat JSON qaytar: {"summary": "3-4 gapli o‘zbekcha xulosa", "decisions": ["qaror", ...], "items": [{"title": "qisqa vazifa nomi", "assigneeId": "xodim id si", "deadline": "YYYY-MM-DD", "priority": "Yuqori" | "O‘rta" | "Past"}]}. assigneeId faqat yuqoridagi id lardan bo‘lsin. Muddat aytilmagan bo‘lsa, 5 kun keyingi sanani qo‘y.`;
        v = await ai.sample.json(prompt, { modelTier: "default" }); engine = "Claude AI";
      } catch (e) { /* server yoki lokal tahlilga o‘tamiz */ }
    }
    if (!v && ai.server) {
      try {
        const r = await apiPost("/api/ai", { task: "meeting", today: todayISO(), weekday: WEEKDAYS[companyNow().getDay()], employees: db.employees.map((e) => ({ id: e.id, name: e.name, role: e.role })), lines: lines.map((l) => ({ speaker: l.speaker, text: l.text })) });
        if (r.ok) v = (await r.json()).result;
      } catch { }
    }
    if (v && typeof v.summary === "string" && Array.isArray(v.items)) {
      res = { summary: v.summary, decisions: Array.isArray(v.decisions) ? v.decisions : [], items: v.items.filter((x) => x && x.title).map((x) => ({ id: uid("ai"), title: String(x.title), assigneeId: empById(x.assigneeId) ? x.assigneeId : db.employees[0]?.id, deadline: /^\d{4}-\d{2}-\d{2}$/.test(x.deadline) ? x.deadline : addDays(5), priority: ["Yuqori", "O‘rta", "Past"].includes(x.priority) ? x.priority : "O‘rta" })), engine };
    }
    if (!res) { await new Promise((r) => setTimeout(r, 1200)); res = localAnalyze(lines, db.employees); }
    const full = { ...res, assigned: false };
    setAnalysis(full); setBusy(false);
    const m = { id: meetingId.current, title, date: todayISO(), time: hm(), lines, analysis: full, participants: participants.length + 1 };
    update((d) => { const i = d.meetings.findIndex((x) => x.id === m.id); if (i >= 0) d.meetings[i] = m; else d.meetings.unshift(m); });
    if (endMeeting) { stopAll(); setInCall(false); setCam(false); setShare(false); }
    toast(`Tahlil tayyor: ${res.items.length} ta vazifa aniqlandi (${res.engine})`);
  };

  const assignAll = () => {
    if (!analysis?.items.length) return;
    const newTasks = analysis.items.map((it) => ({ id: uid("t"), title: it.title, assigneeId: it.assigneeId, deadline: it.deadline, priority: it.priority, status: "todo", source: "meeting", meetingId: meetingId.current }));
    const done = { ...analysis, assigned: true };
    update((d) => {
      d.tasks.push(...newTasks);
      const m = d.meetings.find((x) => x.id === meetingId.current); if (m) m.analysis = done;
      d.notifications.unshift({ id: uid("n"), kind: "info", text: `Meeting AI “${title}” majlisidan ${newTasks.length} ta vazifani xodimlarga biriktirdi. Ular KPI hisobiga qo‘shildi.` });
    });
    setAnalysis(done);
    toast(`${newTasks.length} ta vazifa doskaga va KPI tizimiga qo‘shildi`);
  };
  const editItem = (id, patch) => setAnalysis((a) => ({ ...a, items: a.items.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));

  const newMeeting = () => { meetingId.current = uid("m"); setLines([]); setAnalysis(null); setChat([]); setInCall(true); setMic(true); };

  const sendChat = (e) => {
    e.preventDefault(); if (!msg.trim()) return;
    setChat((c) => [...c, { id: uid("c"), who: "Siz", text: msg.trim(), t: hm() }]); setMsg("");
    const p = participants[Math.floor(Math.random() * participants.length)];
    if (p) setTimeout(() => setChat((c) => [...c, { id: uid("c"), who: p.name.split(" ")[0], text: ["Qabul qildim 👍", "Tushunarli, bajaraman.", "Yaxshi fikr!", "Rozi man."][Math.floor(Math.random() * 4)], t: hm() }]), 1300);
  };

  const tiles = [{ id: "admin", self: true, emp: { name: db.room.admin, color: 5 } }, ...participants.map((e) => ({ id: e.id, emp: e }))];

  if (!inCall) {
    return (
      <div className="fade-in">
        <div className="mb-5"><h1 className="text-2xl font-semibold text-white">Majlis</h1><p className="text-sm text-slate-400">Video majlis o‘tkazing — AI o‘zbekcha nutqni yozib boradi va vazifalarni o‘zi taqsimlaydi</p></div>
        <div className="grid lg:grid-cols-3 gap-5">
          <Glass className="p-6 lg:col-span-2">
            <div className="flex items-center gap-3 mb-4"><div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center"><Video className="text-white" /></div><div><h2 className="text-lg font-semibold text-white">Yangi majlis boshlash</h2><p className="text-sm text-slate-400">{participants.length + 1} ishtirokchi taklif qilinadi</p></div></div>
            <Field label="Majlis mavzusi"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <div className="flex -space-x-2 my-4">{participants.map((e) => <Avatar key={e.id} emp={e} size={36} />)}</div>
            <div className="flex flex-wrap gap-2">
              <Btn icon={Play} onClick={newMeeting}>Majlisni boshlash</Btn>
              <Btn variant="ghost" icon={Sparkles} onClick={() => { newMeeting(); setTimeout(runDemo, 400); }}>Demo o‘zbekcha majlisni ishga tushirish</Btn>
            </div>
            {analysis && <div className="mt-5"><AnalysisPanel analysis={analysis} editItem={editItem} assignAll={assignAll} go={go} setAnalysis={setAnalysis} /></div>}
          </Glass>
          <Glass className="p-5">
            <h3 className="font-semibold text-white mb-3">Majlislar tarixi</h3>
            <div className="space-y-2">
              {db.meetings.map((m) => (
                <button key={m.id} onClick={() => setViewMeeting(m)} className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5">
                  <div className="text-sm text-white">{m.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{fmtDate(m.date)}, {m.time} · {m.analysis?.items.length || 0} vazifa · {m.analysis?.assigned ? "biriktirilgan" : "kutilmoqda"}</div>
                </button>
              ))}
              {!db.meetings.length && <p className="text-sm text-slate-500 py-6 text-center">Hali majlis o‘tkazilmagan</p>}
            </div>
          </Glass>
        </div>
        <Modal open={!!viewMeeting} onClose={() => setViewMeeting(null)} title={viewMeeting?.title} wide>
          {viewMeeting && (
            <div className="space-y-4">
              <div className="rounded-xl bg-white/5 p-4"><div className="text-xs text-slate-400 mb-1">Xulosa ({viewMeeting.analysis?.engine})</div><p className="text-sm text-slate-100">{viewMeeting.analysis?.summary}</p></div>
              <div><div className="text-xs text-slate-400 mb-2">Vazifalar</div>{viewMeeting.analysis?.items.map((it) => <div key={it.id} className="flex items-center gap-2 text-sm py-1.5 border-b border-white/5"><span className="flex-1 text-white">{it.title}</span><span className="text-slate-400">{empById(it.assigneeId)?.name.split(" ")[0]}</span><span className="text-slate-400">{fmtDate(it.deadline)}</span><Prio p={it.priority} /></div>)}</div>
              <div><div className="text-xs text-slate-400 mb-2">Transkript</div><div className="max-h-60 overflow-auto space-y-1.5">{viewMeeting.lines.map((l) => <div key={l.id} className="text-sm"><span className="text-cyan-300">{l.speaker}:</span> <span className="text-slate-200">{l.text}</span></div>)}</div></div>
            </div>
          )}
        </Modal>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-[#060816] overflow-auto p-4 md:p-6 fade-in">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" /><h1 className="text-lg font-semibold text-white">{title}</h1></div>
        <span className="text-xs text-slate-400">{tiles.length} ishtirokchi</span>
        {(listening || demoOn) && <span className="text-xs px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-200 border border-violet-400/30 flex items-center gap-1.5"><Brain size={13} />Meeting AI yozib olmoqda</span>}
      </div>
      <div className="grid xl:grid-cols-[1fr_360px] gap-4">
        <div>
          {share && (
            <div className="glass rounded-2xl mb-3 overflow-hidden aspect-video relative">
              {share === "real" ? <video ref={shareRef} muted playsInline className="w-full h-full object-contain bg-black" /> : (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900 p-8 flex flex-col justify-center">
                  <div className="text-xs text-cyan-300 mb-2">Aksiya_rejasi_dekabr.pptx · 3/12</div>
                  <div className="text-2xl md:text-4xl font-bold text-white">Yangi yil aksiyasi 2026</div>
                  <div className="grid grid-cols-3 gap-3 mt-6 max-w-lg">{[["+18%", "Savdo o‘sishi"], ["15-dek", "Start"], ["20", "Korp. mijoz"]].map(([a, b]) => <div key={b} className="glass rounded-xl p-3"><div className="text-xl text-white font-semibold">{a}</div><div className="text-xs text-slate-400">{b}</div></div>)}</div>
                </div>
              )}
              <div className="absolute top-3 left-3 text-xs glass rounded-lg px-2 py-1 text-white flex items-center gap-1.5"><MonitorUp size={13} />Siz ekran ulashyapsiz</div>
            </div>
          )}
          <div className={"grid gap-3 " + (tiles.length > 4 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2")}>
            {tiles.map((t) => {
              const speaking = speaker === t.id;
              return (
                <div key={t.id} className={"relative aspect-video rounded-2xl overflow-hidden bg-slate-900/70 border transition " + (speaking ? "border-emerald-400 shadow-lg shadow-emerald-500/20" : "border-white/10")}>
                  {t.self && cam ? <video ref={videoRef} muted playsInline className="w-full h-full object-cover -scale-x-100" /> : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800/60 to-slate-900"><Avatar emp={t.emp} size={64} /></div>
                  )}
                  <div className="absolute bottom-2 left-2 text-xs glass rounded-lg px-2 py-1 text-white flex items-center gap-1.5">
                    {t.self ? (mic ? <Mic size={12} /> : <MicOff size={12} className="text-rose-400" />) : <Mic size={12} />}
                    {t.self ? "Siz (Rahbar)" : t.emp.name.split(" ")[0]}
                  </div>
                  {speaking && <div className="absolute top-2 right-2 flex gap-0.5 items-end h-4">{[0, 1, 2].map((i) => <span key={i} className="w-1 bg-emerald-400 rounded-full eq" style={{ animationDelay: i * 0.15 + "s" }} />)}</div>}
                </div>
              );
            })}
          </div>
          <div className="glass rounded-2xl mt-3 p-3 flex flex-wrap items-center justify-center gap-2">
            <button onClick={() => setMic(!mic)} className={"p-3 rounded-xl " + (mic ? "bg-white/10 text-white" : "bg-rose-500/80 text-white")} title="Mikrofon">{mic ? <Mic size={20} /> : <MicOff size={20} />}</button>
            <button onClick={toggleCam} className={"p-3 rounded-xl " + (cam ? "bg-white/10 text-white" : "bg-rose-500/80 text-white")} title="Kamera">{cam ? <Camera size={20} /> : <CameraOff size={20} />}</button>
            <button onClick={toggleShare} className={"p-3 rounded-xl " + (share ? "bg-cyan-500/80 text-white" : "bg-white/10 text-white")} title="Ekran ulashish">{share ? <MonitorOff size={20} /> : <MonitorUp size={20} />}</button>
            <button onClick={() => setChatOpen(!chatOpen)} className={"p-3 rounded-xl " + (chatOpen ? "bg-violet-500/60 text-white" : "bg-white/10 text-white")} title="Chat"><MessageSquare size={20} /></button>
            <div className="w-px h-8 bg-white/10 mx-1" />
            <Btn variant={listening ? "danger" : "primary"} icon={listening ? Square : Brain} onClick={listening ? stopListening : startListening} disabled={!mic && !listening}>{listening ? "Tinglashni to‘xtatish" : "AI Tinglashni boshlash"}</Btn>
            <Btn variant="ghost" icon={demoOn ? Square : Sparkles} onClick={demoOn ? stopDemo : runDemo}>{demoOn ? "Demoni to‘xtatish" : "Demo o‘zbekcha majlis"}</Btn>
            <Btn variant="ghost" icon={busy ? Loader2 : Wand2} onClick={() => analyze(false)} disabled={busy}>Tahlil qilish</Btn>
            <Btn variant="danger" icon={PhoneOff} onClick={() => { if (lines.length) analyze(true); else { stopAll(); setInCall(false); setCam(false); setShare(false); } }}>Yakunlash</Btn>
          </div>
        </div>

        <div className="space-y-4">
          <Glass className="p-4 flex flex-col h-[340px]">
            <div className="flex items-center justify-between mb-2"><h3 className="text-sm font-semibold text-white flex items-center gap-2"><Brain size={16} className="text-violet-300" />Jonli transkript</h3><span className="text-[10px] text-slate-400">uz-UZ</span></div>
            <div ref={tRef} className="flex-1 overflow-auto space-y-2 pr-1">
              {lines.map((l) => <div key={l.id} className="text-sm slide-up"><span className="text-[10px] text-slate-500 mr-1">{l.t}</span><span className="text-cyan-300 font-medium">{l.speaker}:</span> <span className="text-slate-100">{l.text}</span></div>)}
              {partial && <div className="text-sm text-slate-400 italic">{partial}<span className="caret">▍</span></div>}
              {!lines.length && !partial && <div className="text-xs text-slate-500 text-center pt-10">“AI Tinglashni boshlash” yoki “Demo o‘zbekcha majlis”ni bosing</div>}
            </div>
          </Glass>
          {chatOpen && (
            <Glass className="p-4 flex flex-col h-[260px]">
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2"><MessageSquare size={16} className="text-cyan-300" />Majlis chati</h3>
              <div className="flex-1 overflow-auto space-y-1.5">{chat.map((c) => <div key={c.id} className="text-sm"><span className={c.who === "Siz" ? "text-violet-300" : "text-cyan-300"}>{c.who}:</span> <span className="text-slate-200">{c.text}</span></div>)}{!chat.length && <p className="text-xs text-slate-500">Xabarlar yo‘q</p>}</div>
              <form onSubmit={sendChat} className="flex gap-2 mt-2"><input className={inputCls + " !py-2"} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Xabar yozing…" /><button className="px-3 rounded-xl bg-violet-500 text-white"><Send size={16} /></button></form>
            </Glass>
          )}
        </div>
      </div>
      {(busy || analysis) && <Glass className="p-5 mt-4">{busy ? <div className="flex items-center gap-3 text-slate-200 py-6 justify-center"><Loader2 className="animate-spin text-violet-300" />Meeting AI majlisni tahlil qilmoqda…</div> : <AnalysisPanel analysis={analysis} editItem={editItem} assignAll={assignAll} go={go} setAnalysis={setAnalysis} />}</Glass>}
    </div>
  );
}

export function AnalysisPanel({ analysis, editItem, assignAll, go, setAnalysis }) {
  const { db } = useStore();
  return (
    <div className="slide-up">
      <div className="flex flex-wrap items-center gap-2 mb-3"><Sparkles size={18} className="text-violet-300" /><h3 className="font-semibold text-white">Meeting AI tahlili</h3><span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300">{analysis.engine}</span></div>
      <div className="rounded-xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-white/10 p-4 mb-4">
        <div className="text-xs text-slate-400 mb-1">Qisqa xulosa (Summary)</div>
        <p className="text-sm text-slate-100 leading-relaxed">{analysis.summary}</p>
        {analysis.decisions?.length > 0 && <div className="mt-3"><div className="text-xs text-slate-400 mb-1">Qarorlar</div>{analysis.decisions.map((d, i) => <div key={i} className="text-sm text-emerald-200 flex gap-1.5"><Check size={14} className="mt-0.5 shrink-0" />{cap(d)}</div>)}</div>}
      </div>
      <div className="text-xs text-slate-400 mb-2">Vazifalar ro‘yxati (Action Items) — tahrirlash mumkin</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[680px]">
          <thead><tr className="text-left text-xs text-slate-400 border-b border-white/10"><th className="py-2">Vazifa</th><th>Mas’ul</th><th>Muddat</th><th>Ustuvorlik</th><th></th></tr></thead>
          <tbody>
            {analysis.items.map((it) => (
              <tr key={it.id} className="border-b border-white/5">
                <td className="py-2 pr-2"><input disabled={analysis.assigned} className={inputCls + " !py-1.5"} value={it.title} onChange={(e) => editItem(it.id, { title: e.target.value })} /></td>
                <td className="pr-2"><select disabled={analysis.assigned} className={inputCls + " !py-1.5"} value={it.assigneeId} onChange={(e) => editItem(it.id, { assigneeId: e.target.value })}>{db.employees.map((e) => <option key={e.id} value={e.id} className="bg-slate-900">{e.name}</option>)}</select></td>
                <td className="pr-2"><input disabled={analysis.assigned} type="date" className={inputCls + " !py-1.5"} value={it.deadline} onChange={(e) => editItem(it.id, { deadline: e.target.value })} /></td>
                <td className="pr-2"><select disabled={analysis.assigned} className={inputCls + " !py-1.5"} value={it.priority} onChange={(e) => editItem(it.id, { priority: e.target.value })}>{["Yuqori", "O‘rta", "Past"].map((p) => <option key={p} className="bg-slate-900">{p}</option>)}</select></td>
                <td>{!analysis.assigned && <button onClick={() => setAnalysis((a) => ({ ...a, items: a.items.filter((x) => x.id !== it.id) }))} className="text-slate-500 hover:text-rose-400 p-1"><Trash2 size={16} /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!analysis.items.length && <p className="text-sm text-slate-500 py-3">Aniq vazifa topilmadi — qo‘lda qo‘shing.</p>}
      <div className="flex flex-wrap gap-2 mt-4">
        {!analysis.assigned && <Btn variant="ghost" icon={Plus} onClick={() => setAnalysis((a) => ({ ...a, items: [...a.items, { id: uid("ai"), title: "Yangi vazifa", assigneeId: db.employees[0]?.id, deadline: addDays(3), priority: "O‘rta" }] }))}>Vazifa qo‘shish</Btn>}
        {analysis.assigned ? <><span className="inline-flex items-center gap-2 text-emerald-300 text-sm px-3"><CircleCheck size={18} />Vazifalar biriktirildi va KPI’ga qo‘shildi</span><Btn variant="ghost" icon={ListChecks} onClick={() => go("vazifalar")}>Vazifalarni ochish</Btn></>
          : <Btn icon={UserCheck} onClick={assignAll} disabled={!analysis.items.length}>Vazifalarni xodimlarga biriktirish</Btn>}
      </div>
    </div>
  );
}

