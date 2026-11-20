# WORKROOM AI — Biznesingiz uchun avtonom raqamli ofis

React 18 + Tailwind CSS + lucide-react. Ma'lumotlar foydalanuvchi brauzerida (`localStorage`) saqlanadi va zaxira fayli orqali boshqa qurilmaga ko'chiriladi. Claude AI uchun ixtiyoriy server funksiyasi bor (Cloudflare Pages Functions).

## Tuzilma (foydalanuvchi uchun)
- **Bugun:** kim ofisda, AI tavsiyalarni bir bosishda tasdiqlash, bugungi vazifalar va oxirgi majlis.
- **Vazifalar:** vazifani bitta qatorda yozish kifoya ("Nigora ertaga 10 ta post tayyorlasin, shoshilinch"). Mas'ul, muddat va ustuvorlik avtomatik aniqlanadi. Ro'yxat muddati bo'yicha guruhlanadi.
- **Majlis:** video xona va jonli transkript. Majlis oxirida AI xulosa beradi va vazifalarni bir bosishda taqsimlaydi.
- **Jamoa:** xodim kartasini bossangiz, uning hamma ma'lumoti bir joyda: holat, oylik davomat taqvimi, vazifalar, KPI va maosh, yuzni skanerlash.
- **Maosh:** oylik hisobot. Qatorni bossangiz, xodimning batafsil ma'lumoti ochiladi.
- **Davomat kiosk** (tepadagi tugma yoki `/#kiosk`): kirish eshigidagi planshet uchun. Xodim kameraga qarasa, kelish yoki ketish o'zi qayd etiladi. Kioskdan chiqish uchun Room kodi so'raladi.
- **AI yordamchi:** pastki o'ng burchakdagi tugma. Rahbar ofis holatini, xodim esa qoidalar va o'z vazifalarini so'raydi.
- **Sozlamalar:** ⚙ tugmasi. Kompaniya ma'lumotlari, ish vaqti, jarima va zaxira nusxa.

## Kod tuzilmasi
`src/core.js` — biznes mantiq (KPI, davomat, majlis tahlili, Face ID). `src/ui.jsx` — umumiy komponentlar. `src/pages/*` — sahifalar. `src/main.jsx` — ilova qobig'i. `functions/api/ai.js` — Claude API proksi. `functions/api/telegram.js` — Telegram bot xabarlari. `server.mjs` — production server (Render).

## Buyruqlar

```bash
npm install
npm run build     # dist/ papkasini yaratadi
npm run preview   # build + http://localhost:4173 (production sarlavhalari va /api/ai bilan)
npm start         # production server (Render shuni ishga tushiradi; PORT o'zgaruvchisi)
npm run lint      # kod tekshiruvi
```

## Render'ga joylash (tavsiya)

Loyiha Render **Web Service** sifatida ishlaydi. `server.mjs` saytni xavfsizlik sarlavhalari bilan beradi va Claude AI uchun `/api/ai` yo'lini ochadi.

1. Loyihani GitHub'ga yuklang (`node_modules` va `dist` yuklanmaydi, `.gitignore` buni hal qiladi).
2. render.com → **New → Blueprint** → GitHub repo'ni tanlang. Render `render.yaml` faylini o'zi topadi.
3. Render ikkita qiymat so'raydi (ikkalasi ham ixtiyoriy). `TELEGRAM_BOT_TOKEN` haqida pastda, "Telegram bot" bo'limida yozilgan. `ANTHROPIC_API_KEY` uchun:
   - Claude AI kerak bo'lsa, kalitni kiriting;
   - kerak bo'lmasa, bo'sh qoldiring: Meeting AI va AI yordamchi lokal rejimda ishlaydi.
4. **Apply** tugmasini bosing. Bir necha daqiqadan keyin sayt `https://workroom-ai.onrender.com` ko'rinishidagi manzilda ochiladi (aniq nom Render'da chiqadi).

Blueprint'siz, qo'lda qilish ham mumkin: New → Web Service → repo.
- Build Command: `npm ci && npm run build`
- Start Command: `npm start`
- Health Check Path: `/healthz`
- Environment: `NODE_VERSION=20`, ixtiyoriy `ANTHROPIC_API_KEY`

**Render bo'yicha muhim:**
- Bepul (Free) rejada server 15 daqiqa so'rov kelmasa uxlab qoladi. Keyingi birinchi ochilish 30–60 soniya davom etadi. Doimiy ishlashi uchun Starter rejasi kerak.
- Sayt ma'lumotlari serverda emas, foydalanuvchi brauzerida saqlanadi. Shuning uchun server uxlab qolsa yoki qayta ishga tushsa, ma'lumot yo'qolmaydi.
- `/api/ai` boshqa domenlardan kelgan so'rovlarni qabul qilmaydi. Bir IP'dan 10 daqiqada 40 tadan ortiq so'rov kelsa, rad etadi.

### Telegram bot (kelgan / kelmagan xabarlari)
1. Telegram'da **@BotFather** ga `/newbot` yozing, botga nom bering va tokenni oling.
2. Render → saytingiz → **Environment** bo'limida `TELEGRAM_BOT_TOKEN` o'zgaruvchisiga shu tokenni yozing va saqlang.
3. Saytda ⚙ Sozlamalar → **Telegram bot** → "Guruhga qo'shish" (yoki "Shaxsiy chatga") tugmasini bosing. Telegram'da botni guruhga qo'shing yoki Start bosing. Sayt ulanganini o'zi aniqlaydi.

Bot nimalarni yuboradi:
- Kiosk xodimni tanishi bilan: ✅ keldi (o'z vaqtida), ⏰ keldi (+N daqiqa kechikish), 👋 ketdi.
- Ish kunlari, ish boshlangandan 30 daqiqa keyin (vaqtini sozlash mumkin): 📋 hisobot — kim keldi, kim kechikdi, kim kasal, ❌ kim kelmadi.
- "Sinov xabari" va "Hisobotni hozir yuborish" tugmalari ham bor.

Xabarlar davomat qayd etilgan qurilmadan (kiosk planshetidan) yuboriladi. Ertalabki hisobot ketishi uchun kiosk ochiq turishi kerak. Server baza saqlamaydi: chat manzili imzolangan token ko'rinishida faqat saytda turadi, shuning uchun bot orqali begona chatlarga xabar yuborib bo'lmaydi.

### Boshqa xostinglar
- **Cloudflare Pages:** `functions/api/ai.js` u yerda avtomatik ishlaydi. Build `npm run build`, chiqish papkasi `dist`.
- **Netlify / Vercel:** `netlify.toml` va `vercel.json` tayyor, lekin AI faqat lokal rejimda ishlaydi.

Sayt HTTPS orqali ochilishi shart, aks holda brauzer kamera va mikrofonga ruxsat bermaydi. Render HTTPS'ni avtomatik beradi.

## Imkoniyatlar
- **Face ID:** `face-api` neyron modeli (TinyFaceDetector + 68 nuqta + FaceRecognitionNet, 128 o'lchamli yuz shabloni). Modellar saytning o'zida (`/models`, ~6.7 MB) va birinchi marta kamera yoqilganda yuklanadi. Yuz topilmasa, tizim ogohlantiradi. Tanish chegarasi: evklid masofasi < 0.5.
- **Meeting AI:** Chrome'da o'zbekcha nutqni tanish (`uz-UZ`). Tahlilni Claude bajaradi (agar kalit berilgan bo'lsa), aks holda lokal qoidalar.
- **Adolatli KPI:** davomat 35%, intizom 20%, vazifalar 45%. Muddati hali kelmagan vazifalar KPI'ni pasaytirmaydi.
- **Zaxira:** Sozlamalar → "Zaxira faylini yuklab olish". Tiklash Sozlamalarda yoki kirish sahifasida.

## Xavfsizlik
- Qattiq CSP: faqat o'z skriptlari; tashqi manba faqat Google Fonts.
- `Permissions-Policy`: kamera, mikrofon va ekran ulashish faqat shu sayt uchun.
- Clickjacking'dan himoya (`frame-ancestors 'none'`, `X-Frame-Options: DENY`), HSTS va `nosniff` yoqilgan.
- API kaliti faqat serverda saqlanadi. `/api/ai` boshqa domenlardan kelgan so'rovlarni rad etadi, o'lchamni cheklaydi va promptni server tomonda tuzadi. Shuning uchun undan ixtiyoriy proksi sifatida foydalanib bo'lmaydi.
- Yuz shablonlari serverga yuborilmaydi. Skanerlashdan oldin xodimning roziligini oling (shaxsga doir ma'lumotlar to'g'risidagi qonun).
- Xarajatni nazorat qilish: Anthropic Console'da oylik limit (spend limit) qo'ying.

## Hozircha yo'q (keyingi bosqich)
- Bir nechta qurilmada bir vaqtda ishlaydigan umumiy baza va xodimlar uchun alohida login. Buning uchun backend kerak (masalan, Supabase).
