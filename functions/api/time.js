// /api/time — server vaqti (qurilma soatini o‘zgartirib davomatni aldashning oldini olish uchun)
export function onRequestGet() {
  return new Response(JSON.stringify({ now: Date.now() }), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
