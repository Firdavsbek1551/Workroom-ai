// /api/ai — Meeting AI tahlili va AI yordamchi javoblari uchun Google Gemini API'ga xavfsiz proksi.
// Kalit faqat serverda turadi. Prompt server tomonda tuziladi —
// shuning uchun bu endpoint ixtiyoriy matn yuboradigan "bepul proksi" bo‘lib qolmaydi.
//
// Muhit o‘zgaruvchilari:
//   GEMINI_API_KEY   (majburiy) — https://aistudio.google.com/apikey
//   GEMINI_MODEL     (ixtiyoriy) — standart: gemini-3.8-flash; topilmasa zaxira modellar sinab ko‘riladi
//   GEMINI_API_BASE  (faqat sinov uchun)

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

const clip = (v, n) => String(v ?? "").slice(0, n);

function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true; // GET / server-server
  try { return new URL(origin).host === new URL(request.url).host; } catch { return false; }
}

const FALLBACK_MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];

// Gemini generateContent. Model topilmasa (404) keyingi zaxira modelga o‘tadi.
async function gemini(env, { system, user, maxTokens, wantJson }) {
  const models = [...new Set([env.GEMINI_MODEL, ...FALLBACK_MODELS].filter(Boolean))];
  let lastStatus = 0;
  for (const model of models) {
    let r;
    try {
      r = await fetch(`${env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com"}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": env.GEMINI_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { maxOutputTokens: maxTokens, ...(wantJson ? { responseMimeType: "application/json" } : {}) },
        }),
      });
    } catch { return { error: "AI xizmatiga ulanib bo‘lmadi", status: 502 }; }
    lastStatus = r.status;
    if (r.status === 404) continue; // bunday model yo‘q — keyingisi
    if (!r.ok) return { error: "AI xizmati xatosi", status: 502, upstream: r.status };
    const data = await r.json();
    const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
    if (!text) return { error: "AI bo‘sh javob qaytardi", status: 502 };
    return { text, model };
  }
  return { error: "Gemini modeli topilmadi — GEMINI_MODEL ni tekshiring", status: 502, upstream: lastStatus };
}

export async function onRequestGet({ env }) {
  return json({ enabled: Boolean(env.GEMINI_API_KEY), provider: "Gemini" });
}

export async function onRequestPost({ request, env }) {
  if (!env.GEMINI_API_KEY) return json({ error: "AI o‘chirilgan (GEMINI_API_KEY yo‘q)" }, 501);
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
    maxTokens = 4096;
  } else if (body.task === "mentor") {
    const rules = (Array.isArray(body.rules) ? body.rules : []).slice(0, 30).map((r) => "- " + clip(r, 500)).join("\n");
    const tasks = (Array.isArray(body.tasks) ? body.tasks : []).slice(0, 30).map((t) => "- " + clip(t, 200)).join("\n");
    const q = clip(body.question, 1000).trim();
    if (!q) return json({ error: "Savol bo‘sh" }, 400);
    system = `Sen "${clip(body.company, 120)}" kompaniyasining yangi xodimlarga yordam beruvchi AI Mentorisan. Faqat o‘zbek tilida (lotin), qisqa va samimiy javob ber (3-5 gap). Faqat kompaniya, ish tartibi va xodimning vazifalari haqidagi savollarga javob ber.`;
    user = `Kompaniya qoidalari:\n${rules}\n\nSuhbatdosh: ${clip(body.employee, 120)}. Uning faol vazifalari:\n${tasks || "yo‘q"}\n\nSavol: ${q}`;
    maxTokens = 1500;
  } else {
    return json({ error: "Noma’lum vazifa" }, 400);
  }

  const out = await gemini(env, { system, user, maxTokens, wantJson: body.task === "meeting" });
  if (out.error) return json({ error: out.error, upstream: out.upstream }, out.status);
  const text = out.text;

  if (body.task === "meeting") {
    const m = text.match(/\{[\s\S]*\}/);
    try { return json({ result: JSON.parse(m ? m[0] : text), provider: "Gemini" }); } catch { return json({ error: "AI javobini o‘qib bo‘lmadi" }, 502); }
  }
  return json({ text, provider: "Gemini" });
}
