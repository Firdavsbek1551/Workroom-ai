// WORKROOM AI — production server (Render Web Service va lokal preview uchun)
//  - dist/ papkasini xavfsizlik sarlavhalari bilan beradi (public/_headers dan o‘qiladi)
//  - /api/ai        -> functions/api/ai.js (Google Gemini proksi; GEMINI_API_KEY bo‘lmasa o‘chiq)
//  - /api/telegram  -> functions/api/telegram.js (davomat xabarlari; TELEGRAM_BOT_TOKEN bo‘lmasa o‘chiq)
//  - /healthz -> Render health check
// Ishga tushirish: `npm start` (production) yoki `npm run preview` (localhost, HTTP)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "dist");
const PREVIEW = process.argv.includes("--preview");
const port = Number(process.env.PORT) || (PREVIEW ? 4173 : 10000);
const host = PREVIEW ? "127.0.0.1" : "0.0.0.0";

if (!fs.existsSync(path.join(root, "index.html"))) {
  console.error("dist/ topilmadi. Avval `npm run build` ni ishga tushiring.");
  process.exit(1);
}

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8", ".bin": "application/octet-stream", ".png": "image/png", ".ico": "image/x-icon",
};
const COMPRESSIBLE = new Set([".html", ".js", ".css", ".svg", ".json", ".webmanifest", ".txt"]);

// _headers faylini o‘qish: "yo‘l-shablon" qatori, keyin bo‘sh joy bilan boshlanadigan "Nom: qiymat" qatorlari
const rules = [];
{
  let cur = null;
  for (const line of fs.readFileSync(path.join(root, "_headers"), "utf8").split("\n")) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) { cur = { pattern: line.trim(), headers: {} }; rules.push(cur); }
    else if (cur) { const i = line.indexOf(":"); cur.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  }
}
const match = (pat, p) => (pat.endsWith("*") ? p.startsWith(pat.slice(0, -1)) : p === pat);
function headersFor(p) {
  const h = {};
  for (const r of rules) if (match(r.pattern, p)) Object.assign(h, r.headers);
  if (PREVIEW) { // localhost HTTP: HSTS va upgrade-insecure-requests kerak emas
    delete h["Strict-Transport-Security"];
    if (h["Content-Security-Policy"]) h["Content-Security-Policy"] = h["Content-Security-Policy"].replace("; upgrade-insecure-requests", "");
  }
  return h;
}

// ---- Sessiya cookie: API faqat saytning o‘zidan (sahifa ochilganda berilgan cookie bilan) chaqiriladi ----
// SESSION_SECRET Render'da avtomatik yaratiladi (render.yaml: generateValue). Bo‘lmasa — har ishga tushishda tasodifiy.
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const SESSION_TTL = 24 * 3600 * 1000;
const sign = (v) => crypto.createHmac("sha256", SECRET).update(v).digest("hex");
const newSession = () => { const ts = String(Date.now()); return `${ts}.${sign(ts)}`; };
function validSession(req) {
  const m = /(?:^|;\s*)wr_s=(\d{10,16})\.([a-f0-9]{64})/.exec(String(req.headers.cookie || ""));
  if (!m || Date.now() - Number(m[1]) > SESSION_TTL) return false;
  const a = Buffer.from(sign(m[1])), b = Buffer.from(m[2]);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const sessionCookie = () => `wr_s=${newSession()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL / 1000}${PREVIEW ? "" : "; Secure"}`;

// AI uchun kunlik umumiy limit (Gemini xarajatini cheklash). AI_DAILY_LIMIT — standart 500.
const AI_DAILY = Number(process.env.AI_DAILY_LIMIT) || 500;
let aiDay = "", aiCount = 0;
function aiDailyExceeded() {
  const d = new Date().toISOString().slice(0, 10);
  if (d !== aiDay) { aiDay = d; aiCount = 0; }
  return ++aiCount > AI_DAILY;
}

// Oddiy so‘rov cheklovi (10 daqiqalik oyna): AI — 20 ta, Telegram — 300 ta (ertalabki oqim uchun)
const hits = new Map();
function rateLimited(key, max) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const arr = (hits.get(key) || []).filter((t) => now - t < win);
  arr.push(now); hits.set(key, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max;
}

const API = {
  "/api/ai": { mod: import(path.join(here, "functions", "api", "ai.js")), max: 20 },
  "/api/telegram": { mod: import(path.join(here, "functions", "api", "telegram.js")), max: 300 },
};

async function handleApi(req, res, route) {
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  const send = (status, obj) => { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }); res.end(JSON.stringify(obj)); };
  if (req.method !== "GET" && req.method !== "POST") return send(405, { error: "Method not allowed" });
  if (req.method === "POST") {
    if (req.headers["x-workroom"] !== "1" || !String(req.headers["content-type"] || "").startsWith("application/json")) return send(403, { error: "Ruxsat yo‘q" });
    if (!validSession(req)) return send(401, { error: "Sessiya eskirgan — sahifani yangilang", reauth: true });
    if (rateLimited(route + "|" + ip, API[route].max)) return send(429, { error: "Juda ko‘p so‘rov, birozdan keyin urinib ko‘ring" });
    if (route === "/api/ai" && aiDailyExceeded()) return send(429, { error: "Bugungi AI limiti tugadi" });
  }

  const chunks = []; let size = 0;
  if (req.method === "POST") {
    for await (const c of req) { size += c.length; if (size > 60000) return send(413, { error: "So‘rov juda katta" }); chunks.push(c); }
  }
  // Render proksi orqali kelgan asl manzil — Origin tekshiruvi to‘g‘ri ishlashi uchun
  const proto = String(req.headers["x-forwarded-proto"] || (PREVIEW ? "http" : "https")).split(",")[0];
  const url = `${proto}://${req.headers.host}${req.url}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
  const request = new Request(url, { method: req.method, headers, body: req.method === "POST" ? Buffer.concat(chunks) : undefined });

  try {
    const mod = await API[route].mod;
    const fn = req.method === "POST" ? mod.onRequestPost : mod.onRequestGet;
    const r = await fn({ request, env: process.env });
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    console.error(route, "xatosi:", e?.message);
    send(500, { error: "Ichki xato" });
  }
}

const server = http.createServer(async (req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { res.writeHead(400); return res.end(); }

  if (p === "/healthz") { res.writeHead(200, { "Content-Type": "text/plain" }); return res.end("ok"); }
  if (p === "/api/time") { res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" }); return res.end(JSON.stringify({ now: Date.now() })); }
  if (API[p]) return handleApi(req, res, p);
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, { Allow: "GET, HEAD" }); return res.end(); }

  if (p === "/") p = "/index.html";
  const file = path.join(root, path.normalize(p));
  let stat = null;
  if (file.startsWith(root + path.sep) && path.basename(file) !== "_headers") { try { stat = fs.statSync(file); } catch { } }
  const isFile = stat && stat.isFile();
  // Hash-routing ishlatiladi (#bugun), shuning uchun noma’lum yo‘llar index.html ga qaytadi
  const servePath = isFile ? p : "/index.html";
  const filePath = isFile ? file : path.join(root, "index.html");
  const ext = path.extname(filePath);

  const h = { "Content-Type": TYPES[ext] || "application/octet-stream", ...headersFor(servePath) };
  if (!isFile && path.extname(p)) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("404"); }

  const gzip = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(String(req.headers["accept-encoding"] || ""));
  if (gzip) { h["Content-Encoding"] = "gzip"; h["Vary"] = "Accept-Encoding"; }
  if (servePath === "/index.html") h["Set-Cookie"] = sessionCookie();
  res.writeHead(200, h);
  if (req.method === "HEAD") return res.end();
  const stream = fs.createReadStream(filePath);
  (gzip ? stream.pipe(zlib.createGzip()) : stream).pipe(res);
});

server.listen(port, host, () => console.log(`WORKROOM AI ishga tushdi: ${PREVIEW ? `http://localhost:${port}` : `port ${port}`}${process.env.GEMINI_API_KEY ? " · Gemini AI yoqilgan" : " · Gemini AI o‘chiq (lokal rejim)"}${process.env.TELEGRAM_BOT_TOKEN ? " · Telegram bot yoqilgan" : " · Telegram bot o‘chiq"}`));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
