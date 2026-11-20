// Production build: dist/index.html + hashed assets + public/*
import { build } from "esbuild";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const dist = path.join(root, "dist");
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, "assets"), { recursive: true });

const hash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 10);

const res = await build({
  entryPoints: [path.join(root, "src/main.jsx")], bundle: true, minify: true, format: "iife",
  target: ["es2020"], define: { "process.env.NODE_ENV": '"production"' }, write: false, legalComments: "none",
});
const js = res.outputFiles[0].text;
execSync(`npx tailwindcss -i src/input.css -o dist/.tmp.css --minify`, { cwd: root, stdio: "ignore" });
const css = fs.readFileSync(path.join(dist, ".tmp.css"), "utf8"); fs.rmSync(path.join(dist, ".tmp.css"));

const jsName = `assets/app.${hash(js)}.js`, cssName = `assets/app.${hash(css)}.css`;
fs.writeFileSync(path.join(dist, jsName), js);
fs.writeFileSync(path.join(dist, cssName), css);

const html = `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>WORKROOM AI — Biznesingiz uchun avtonom raqamli ofis</title>
<meta name="description" content="WORKROOM AI — Face ID davomat, o‘zbek tilini tushunuvchi Meeting AI, adolatli KPI va maosh hisob-kitobi bitta raqamli ofisda.">
<meta name="theme-color" content="#060816">
<meta property="og:type" content="website">
<meta property="og:title" content="WORKROOM AI — Biznesingiz uchun avtonom raqamli ofis">
<meta property="og:description" content="Face ID davomat, Meeting AI va adolatli KPI — o‘zbek tilida.">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="/${cssName}">
</head>
<body>
<div id="root"></div>
<noscript>WORKROOM AI ishlashi uchun JavaScript yoqilgan bo‘lishi kerak.</noscript>
<script src="/${jsName}" defer></script>
</body>
</html>
`;
fs.writeFileSync(path.join(dist, "index.html"), html);
for (const f of fs.readdirSync(path.join(root, "public"))) fs.copyFileSync(path.join(root, "public", f), path.join(dist, f));

// Face ID: face-api kutubxonasi va faqat kerakli 3 ta model (~6.7 MB), saytning o‘zidan beriladi (CSP: 'self').
const fa = path.join(root, "node_modules/@vladmandic/face-api");
fs.mkdirSync(path.join(dist, "vendor"), { recursive: true });
fs.mkdirSync(path.join(dist, "models"), { recursive: true });
fs.copyFileSync(path.join(fa, "dist/face-api.js"), path.join(dist, "vendor/face-api.js"));
for (const m of ["tiny_face_detector_model", "face_landmark_68_tiny_model", "face_recognition_model"])
  for (const ext of ["-weights_manifest.json", ".bin"]) fs.copyFileSync(path.join(fa, "model", m + ext), path.join(dist, "models", m + ext));

// Vercel uses vercel.json at repo root; mirror the same headers there.
console.log(`dist/ tayyor: ${jsName} (${(js.length / 1024).toFixed(0)} KB), ${cssName} (${(css.length / 1024).toFixed(0)} KB)`);
