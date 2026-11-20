// /api/telegram — davomat xabarlarini Telegram'ga yuborish
// Muhit o‘zgaruvchisi: TELEGRAM_BOT_TOKEN (@BotFather'dan). Ixtiyoriy: TELEGRAM_API (faqat sinov uchun).
//
// Ulash (serverda baza kerak emas):
//  1) Sayt bir martalik kod yaratadi va t.me/<bot>?start=<kod> havolasini ochadi
//     (yoki guruhda: /ulash <kod>).
//  2) Sayt {action:"link", code} yuboradi — server getUpdates orqali shu kodni yozgan chatni topadi.
//  3) Server chat_id ni HMAC bilan imzolab token qaytaradi; sayt tokenni saqlaydi.
//  4) Xabar yuborishda faqat imzolangan token qabul qilinadi va matnni server o‘zi tuzadi —
//     shuning uchun endpoint orqali begona chatlarga yoki ixtiyoriy matn yuborib bo‘lmaydi.

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const clip = (v, n) => String(v ?? "").slice(0, n);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const api = (env) => (env.TELEGRAM_API || "https://api.telegram.org") + "/bot" + env.TELEGRAM_BOT_TOKEN;

function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

async function hmac(env, msg) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("workroom-tg:" + env.TELEGRAM_BOT_TOKEN), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function makeToken(env, chatId) { return `${chatId}.${await hmac(env, String(chatId))}`; }
async function readToken(env, token) {
  const m = /^(-?\d{1,20})\.([a-f0-9]{64})$/.exec(String(token || ""));
  if (!m) return null;
  const good = await hmac(env, m[1]);
  let diff = 0; for (let i = 0; i < 64; i++) diff |= good.charCodeAt(i) ^ m[2].charCodeAt(i);
  return diff === 0 ? m[1] : null;
}

async function tg(env, method, params) {
  const r = await fetch(`${api(env)}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params || {}) });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(j.description || "telegram " + r.status);
  return j.result;
}

let meCache = null;
async function getMe(env) {
  if (meCache && meCache.token === env.TELEGRAM_BOT_TOKEN) return meCache.me;
  const me = await tg(env, "getMe");
  meCache = { token: env.TELEGRAM_BOT_TOKEN, me };
  return me;
}

function format(b) {
  const company = esc(clip(b.company, 80));
  const name = esc(clip(b.name, 80));
  const time = esc(clip(b.time, 5));
  const late = Math.max(0, Math.min(1440, Number(b.late) || 0));
  const list = (a) => (Array.isArray(a) ? a.slice(0, 50).map((x) => esc(clip(x, 80))) : []);
  switch (b.kind) {
    case "in": return late ? `⏰ <b>${name}</b> keldi — ${time}\nKechikish: <b>${late} daqiqa</b>` : `✅ <b>${name}</b> keldi — ${time} (o‘z vaqtida)`;
    case "out": return `👋 <b>${name}</b> ketdi — ${time}`;
    case "summary": {
      const absent = list(b.absent), sick = list(b.sick), lateL = list(b.lateList);
      const total = Math.max(0, Math.min(1000, Number(b.total) || 0)), present = Math.max(0, Math.min(1000, Number(b.present) || 0));
      let t = `📋 <b>${company}</b> — ${time} holati\nKeldi: <b>${present}/${total}</b>`;
      if (lateL.length) t += `\n⏰ Kechikkanlar: ${lateL.join(", ")}`;
      if (sick.length) t += `\n🤒 Kasal / ta’tilda: ${sick.join(", ")}`;
      t += absent.length ? `\n❌ Kelmaganlar: <b>${absent.join(", ")}</b>` : `\n🎉 Hamma ishda!`;
      return t;
    }
    case "test": return `🔔 Sinov xabari: <b>${company}</b> davomat xabarlari shu chatga keladi.`;
    default: return null;
  }
}

export async function onRequestGet({ env }) {
  if (!env.TELEGRAM_BOT_TOKEN) return json({ enabled: false });
  try { const me = await getMe(env); return json({ enabled: true, username: me.username, name: me.first_name }); }
  catch { return json({ enabled: false, error: "Bot tokeni noto‘g‘ri yoki Telegram'ga ulanib bo‘lmadi" }); }
}

export async function onRequestPost({ request, env }) {
  if (!env.TELEGRAM_BOT_TOKEN) return json({ error: "Telegram bot sozlanmagan (TELEGRAM_BOT_TOKEN yo‘q)" }, 501);
  if (!sameOrigin(request)) return json({ error: "Ruxsat yo‘q" }, 403);
  let b; try { b = await request.json(); } catch { return json({ error: "Noto‘g‘ri JSON" }, 400); }

  try {
    if (b.action === "link") {
      const code = String(b.code || "");
      if (!/^[A-Za-z0-9_-]{8,40}$/.test(code)) return json({ error: "Kod noto‘g‘ri" }, 400);
      const updates = await tg(env, "getUpdates", { offset: -100, limit: 100, timeout: 0, allowed_updates: ["message"] });
      const re = new RegExp(`^/(start|ulash)(@\\w+)?\\s+${code}\\s*$`);
      const hit = [...updates].reverse().find((u) => u.message?.text && re.test(u.message.text.trim()));
      if (!hit) return json({ linked: false });
      const chat = hit.message.chat;
      const title = chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(" ") || chat.username || "chat";
      await tg(env, "sendMessage", { chat_id: chat.id, parse_mode: "HTML", text: `✅ <b>${esc(clip(b.company, 80) || "WORKROOM AI")}</b> ulandi.\nXodimlar kelganda va ketganda xabar shu yerga keladi.` });
      return json({ linked: true, token: await makeToken(env, chat.id), chatTitle: clip(title, 80), chatType: chat.type });
    }
    if (b.action === "notify") {
      const chatId = await readToken(env, b.token);
      if (!chatId) return json({ error: "Token yaroqsiz — botni qayta ulang" }, 401);
      const text = format(b);
      if (!text) return json({ error: "Noma’lum xabar turi" }, 400);
      await tg(env, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true });
      return json({ ok: true });
    }
    return json({ error: "Noma’lum amal" }, 400);
  } catch (e) {
    return json({ error: "Telegram xatosi: " + clip(e.message, 200) }, 502);
  }
}
