// Cloudflare Pages Function: /api/ai
// Meeting AI tahlili va AI Mentor javoblari uchun Claude API'ga xavfsiz proksi.
// Kalit faqat serverda turadi (ANTHROPIC_API_KEY). Prompt server tomonda tuziladi —
// shuning uchun bu endpoint ixtiyoriy matn yuboradigan "bepul proksi" bo‘lib qolmaydi.
//
// Muhit o‘zgaruvchilari (Cloudflare Pages → Settings → Environment variables):
//   ANTHROPIC_API_KEY  (majburiy, Secret sifatida)
//   AI_MODEL           (ixtiyoriy, standart: claude-sonnet-5-5)

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

const clip = (v, n) => String(v ?? "").slice(0, n);

function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true; // GET / server-server
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

export async function onRequestGet({ env }) {
  return json({ enabled: Boolean(env.ANTHROPIC_API_KEY) });
}

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) return json({ error: "AI o‘chirilgan (ANTHROPIC_API_KEY yo‘q)" }, 501);
  if (!sameOrigin(request)) return json({ error: "Ruxsat yo‘q" }, 403);
  const len = Number(request.headers.get("Content-Length") || 0);
  if (len > 60000) return json({ error: "So‘rov juda katta" }, 413);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Noto‘g‘ri JSON" }, 400); }

  let system, user, maxTokens;
  if (body.task === "meeting") {
    const employees = (Array.isArray(body.employees) ? body.employees : []).slice(0, 50)
      .map((e) => `${clip(e.id, 40)}: ${clip(e.name, 80)} (${clip(e.role, 60)})`).join("\n");
    const lines = (Array.isArray(body.lines) ? body.lines : []).slice(0, 400)
      .map((l) => `${clip(l.speaker, 60)}: ${clip(l.text, 600)}`).join("\n");
    if (!lines) return json({ error: "Transkript bo‘sh" }, 400);
    system = "Sen o‘zbek tilidagi ish majlislarini tahlil qiluvchi AI yordamchisan. Faqat so‘ralgan JSON'ni qaytar, boshqa hech narsa yozma.";
    user = `Bugun ${clip(body.today, 10)} (${clip(body.weekday, 12)}).\nXodimlar (id: ism):\n${employees}\n\nMajlis transkripti:\n${lines}\n\nFaqat JSON qaytar: {"summary": "3-4 gapli o‘zbekcha (lotin) xulosa", "decisions": ["qaror"], "items": [{"title": "qisqa vazifa nomi", "assigneeId": "xodim id", "deadline": "YYYY-MM-DD", "priority": "Yuqori" | "O‘rta" | "Past"}]}. assigneeId faqat yuqoridagi id'lardan bo‘lsin. Muddat aytilmagan bo‘lsa, 5 kun keyingi sanani qo‘y.`;
    maxTokens = 1500;
  } else if (body.task === "mentor") {
    const rules = (Array.isArray(body.rules) ? body.rules : []).slice(0, 30).map((r) => "- " + clip(r, 500)).join("\n");
    const tasks = (Array.isArray(body.tasks) ? body.tasks : []).slice(0, 30).map((t) => "- " + clip(t, 200)).join("\n");
    const q = clip(body.question, 1000).trim();
    if (!q) return json({ error: "Savol bo‘sh" }, 400);
    system = `Sen "${clip(body.company, 120)}" kompaniyasining yangi xodimlarga yordam beruvchi AI Mentorisan. Faqat o‘zbek tilida (lotin), qisqa va samimiy javob ber (3-5 gap). Faqat kompaniya, ish tartibi va xodimning vazifalari haqidagi savollarga javob ber.`;
    user = `Kompaniya qoidalari:\n${rules}\n\nSuhbatdosh: ${clip(body.employee, 120)}. Uning faol vazifalari:\n${tasks || "yo‘q"}\n\nSavol: ${q}`;
    maxTokens = 600;
  } else {
    return json({ error: "Noma’lum vazifa" }, 400);
  }

  let r;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: env.AI_MODEL || "claude-sonnet-5-5", max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    });
  } catch {
    return json({ error: "AI xizmatiga ulanib bo‘lmadi" }, 502);
  }
  if (!r.ok) return json({ error: "AI xizmati xatosi", status: r.status }, 502);
  const data = await r.json();
  const text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("").trim();

  if (body.task === "meeting") {
    const m = text.match(/\{[\s\S]*\}/);
    try { return json({ result: JSON.parse(m ? m[0] : text) }); } catch { return json({ error: "AI javobini o‘qib bo‘lmadi" }, 502); }
  }
  return json({ text });
}
