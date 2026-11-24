// Build do QuestDay: gera dist/ com um index.html autocontido + service worker, manifest e ícones.
// Uso: node scripts/build.mjs   (precisa de esbuild, react, react-dom, react-icons e tailwindcss instalados)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.join(root, 'dist');
const require = createRequire(path.join(root, 'package.json'));
const extra = (process.env.NODE_PATH || '').split(path.delimiter).filter(Boolean);
const resolve = (id) => require.resolve(id, { paths: [root, ...extra] });
const esbuild = await import(pathToFileURL(resolve('esbuild')).href);

// Variáveis do .env (só as conhecidas). No GitHub Actions vêm das "Variables" do repositório.
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) for (const ln of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) { const m = ln.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/); if (m && process.env[m[1]] == null) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, ''); }
const GOOGLE_CLIENT_ID = (process.env.GOOGLE_CLIENT_ID || '').trim();

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
const tmp = fs.mkdtempSync(path.join(root, '.build-'));
const src = fs.readFileSync(path.join(root, 'src/app.jsx'), 'utf8');

// 1) Ícones: só os nomes usados como texto no app (ex.: <Ic n="Sun" />) entram no pacote.
const lu = require(resolve('react-icons/lu'));
const alias = { Wand2: 'WandSparkles' };
const names = [...new Set([...src.matchAll(/['"]([A-Z][A-Za-z0-9]*)['"]/g)].map((m) => m[1]))].filter((n) => lu['Lu' + (alias[n] || n)]).sort();
const entry = path.join(tmp, 'vendor.js');
fs.writeFileSync(entry, `import React from 'react';import * as RDC from 'react-dom/client';import {createPortal} from 'react-dom';
import {${names.map((n) => `Lu${alias[n] || n} as ${n}`).join(',')}} from 'react-icons/lu';
window.React=React;window.ReactDOM={...RDC,createPortal};window.LucideReact={${names.join(',')}};`);
const nodePaths = [path.join(root, 'node_modules'), ...extra];
const common = { bundle: true, minify: true, write: false, target: 'es2019', logLevel: 'warning', nodePaths, define: { 'process.env.NODE_ENV': '"production"', __GOOGLE_CLIENT_ID__: JSON.stringify(GOOGLE_CLIENT_ID) } };
const vendor = (await esbuild.build({ ...common, entryPoints: [entry] })).outputFiles[0].text;

// 2) App: JSX com React global (o vendor expõe window.React).
const app = (await esbuild.build({ ...common, entryPoints: [path.join(root, 'src/app.jsx')], format: 'iife', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment', loader: { '.jsx': 'jsx' } })).outputFiles[0].text;

// 3) Tailwind v4: compila só as classes que aparecem no código.
const twDir = path.dirname(resolve('tailwindcss/package.json'));
const { compile } = await import(pathToFileURL(path.join(twDir, 'dist/lib.mjs')).href);
const compiler = await compile('@import "tailwindcss";', {
  base: '/',
  loadStylesheet: async (id, base) => { const p = id === 'tailwindcss' ? path.join(twDir, 'index.css') : path.resolve(base, id); return { path: p, base: path.dirname(p), content: fs.readFileSync(p, 'utf8') }; },
});
const cand = new Set(fs.readdirSync(path.join(root, 'src')).filter((f) => /\.(jsx?|html)$/.test(f)).flatMap((f) => fs.readFileSync(path.join(root, 'src', f), 'utf8').split(/[\s"'`{}]+/)).filter(Boolean));
const css = compiler.build([...cand]);

// 4) Página única + arquivos públicos.
const shell = fs.readFileSync(path.join(root, 'src/shell.html'), 'utf8');
const html = shell.split('%%CSS%%').join(css).split('%%VENDOR%%').join(vendor.replace(/<\/script/gi, '<\\/script')).split('%%APP%%').join(app.replace(/<\/script/gi, '<\\/script'));
fs.writeFileSync(path.join(dist, 'index.html'), html);
fs.cpSync(path.join(root, 'public'), dist, { recursive: true });
const build = Date.now().toString(36);
fs.writeFileSync(path.join(dist, 'sw.js'), fs.readFileSync(path.join(dist, 'sw.js'), 'utf8').replace('__BUILD__', build));
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`dist/index.html ${(html.length / 1024).toFixed(0)} KB · ${names.length} ícones · build ${build} · Google Agenda ${GOOGLE_CLIENT_ID ? 'configurada' : 'sem Client ID'}`);
