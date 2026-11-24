// Ma'lumotlarni saqlash qatlami.
//  - DATABASE_URL bo'lsa: PostgreSQL (masalan Neon — bepul, muddatsiz). Har bir Room alohida qator (jsonb),
//    faqat o'zgargan Room'lar yoziladi. Server qayta ishga tushsa ham ma'lumot saqlanadi.
//  - Aks holda: data/db.json fayli (kompyuterda yoki Render diskida).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function createStore({ dataDir, databaseUrl }) {
  const DB_FILE = path.join(dataDir, 'db.json');
  fs.mkdirSync(dataDir, { recursive: true });
  const state = { kind: databaseUrl ? 'postgres' : 'file', ok: true, error: '', lastSave: 0, rooms: 0 };
  let timer = null, getDb = null, flushing = null, again = false;
  const hashes = new Map();
  const h = (s) => crypto.createHash('sha1').update(s).digest('hex');

  // ---------- File ----------
  function fileLoad() {
    try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) {
      if (fs.existsSync(DB_FILE)) { // buzilgan fayl: eng so'nggi zaxiradan tiklash
        console.error('db.json o‘qilmadi:', e.message);
        const b = fs.readdirSync(dataDir).filter((x) => x.startsWith('backup-')).sort().pop();
        if (b) { try { console.log('Zaxiradan tiklandi:', b); return JSON.parse(fs.readFileSync(path.join(dataDir, b), 'utf8')); } catch (_) {} }
      }
      return null;
    }
  }
  function fileWrite(db) {
    fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(db)); fs.renameSync(DB_FILE + '.tmp', DB_FILE);
  }

  // ---------- Postgres ----------
  let pool = null;
  function pgPool() {
    if (pool) return pool;
    const { Pool } = require('pg');
    const u = new URL(databaseUrl);
    const local = ['localhost', '127.0.0.1', '::1'].includes(u.hostname) || u.searchParams.get('sslmode') === 'disable';
    ['sslmode', 'channel_binding', 'sslrootcert'].forEach((k) => u.searchParams.delete(k)); // SSL'ni pastda aniq beramiz
    pool = new Pool({
      connectionString: u.toString(), max: 4, idleTimeoutMillis: 30000, connectionTimeoutMillis: 20000, keepAlive: true,
      ssl: local ? false : { rejectUnauthorized: process.env.PGSSL_NO_VERIFY !== '1' },
    });
    pool.on('error', (e) => { state.error = 'Postgres: ' + e.message; console.error(state.error); });
    return pool;
  }
  async function pgInit() {
    await pgPool().query(`CREATE TABLE IF NOT EXISTS wr_store (k text PRIMARY KEY, v jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`);
  }
  async function pgLoad() {
    await pgInit();
    const { rows } = await pgPool().query('SELECT k, v FROM wr_store');
    if (!rows.length) return null;
    const db = { rooms: {}, tgOffset: 0, events: [] };
    for (const r of rows) {
      if (r.k === 'meta') Object.assign(db, r.v);
      else if (r.k.startsWith('room:')) db.rooms[r.k.slice(5)] = r.v;
      hashes.set(r.k, h(JSON.stringify(r.v)));
    }
    return db;
  }
  async function pgFlush(db) {
    const rows = [];
    const meta = JSON.stringify({ tgOffset: db.tgOffset || 0, events: (db.events || []).slice(-200) });
    if (hashes.get('meta') !== h(meta)) rows.push(['meta', meta]);
    const live = new Set(['meta']);
    for (const [code, room] of Object.entries(db.rooms)) {
      const k = 'room:' + code; live.add(k);
      const s = JSON.stringify(room);
      if (hashes.get(k) !== h(s)) rows.push([k, s]);
    }
    const gone = [...hashes.keys()].filter((k) => !live.has(k));
    if (!rows.length && !gone.length) return;
    const c = await pgPool().connect();
    try {
      await c.query('BEGIN');
      for (const [k, s] of rows) await c.query('INSERT INTO wr_store (k, v, updated_at) VALUES ($1, $2::jsonb, now()) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v, updated_at = now()', [k, s]);
      if (gone.length) await c.query('DELETE FROM wr_store WHERE k = ANY($1)', [gone]);
      await c.query('COMMIT');
      for (const [k, s] of rows) hashes.set(k, h(s));
      gone.forEach((k) => hashes.delete(k));
    } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; }
    finally { c.release(); }
  }

  // ---------- Public ----------
  async function load() {
    if (state.kind === 'postgres') {
      let lastErr;
      for (let i = 1; i <= 6; i++) { // Neon "uyg'onishi" uchun bir necha urinish
        try {
          let db = await pgLoad();
          if (!db) { // bo'sh baza: avvalgi fayldagi ma'lumotni bir marta ko'chiramiz
            const f = fileLoad();
            if (f && f.rooms && Object.keys(f.rooms).length) { console.log('db.json → Postgres ko‘chirildi'); db = f; await pgFlush(db); }
          }
          state.ok = true; state.error = '';
          return db || { rooms: {}, tgOffset: 0 };
        } catch (e) { lastErr = e; console.error(`Postgres’ga ulanib bo‘lmadi (${i}/6):`, e.message); await new Promise((r) => setTimeout(r, 2000 * i)); }
      }
      // Bo'sh ma'lumot bilan ishga tushib, bazadagi haqiqiy ma'lumotni ustidan yozib yubormaslik uchun to'xtaymiz
      throw new Error('DATABASE_URL bilan bazaga ulanib bo‘lmadi: ' + (lastErr && lastErr.message));
    }
    return fileLoad() || { rooms: {}, tgOffset: 0 };
  }
  async function flush() {
    if (!getDb) return;
    if (flushing) { again = true; return flushing; }
    flushing = (async () => {
      const db = getDb();
      try {
        if (state.kind === 'postgres') await pgFlush(db); else fileWrite(db);
        state.ok = true; state.error = ''; state.lastSave = Date.now(); state.rooms = Object.keys(db.rooms).length;
      } catch (e) {
        state.ok = false; state.error = (state.kind === 'postgres' ? 'Postgres: ' : 'Fayl: ') + e.message;
        console.error('Saqlash xatosi:', state.error);
        clearTimeout(timer); timer = setTimeout(flush, 5000); // keyinroq qayta urinish
      }
    })();
    try { await flushing; } finally { flushing = null; }
    if (again) { again = false; return flush(); }
  }
  function saveSoon() { clearTimeout(timer); timer = setTimeout(flush, state.kind === 'postgres' ? 800 : 300); }
  function backup() {
    try {
      const db = getDb && getDb(); if (!db) return;
      const d = new Date().toISOString().slice(0, 10); const f = path.join(dataDir, `backup-${d}.json`);
      if (!fs.existsSync(f)) { fs.writeFileSync(f, JSON.stringify(db)); fs.readdirSync(dataDir).filter((x) => x.startsWith('backup-')).sort().slice(0, -7).forEach((x) => fs.unlinkSync(path.join(dataDir, x))); }
    } catch (e) { console.error('Backup xatosi:', e.message); }
  }
  async function close() { clearTimeout(timer); await flush(); if (pool) await pool.end().catch(() => {}); }
  async function ping() {
    if (state.kind !== 'postgres') return { ok: true };
    try { const t = Date.now(); await pgPool().query('SELECT 1'); return { ok: true, ms: Date.now() - t }; } catch (e) { return { ok: false, error: e.message }; }
  }
  return { state, load, flush, saveSoon, backup, close, ping, bind: (fn) => (getDb = fn) };
}
module.exports = { createStore };
