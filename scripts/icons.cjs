// Gera os ícones do app com o Lume (o mascote do app, desenhado no próprio QuestDay).
const sharp = require('sharp'); const fs = require('fs'); const path = require('path');
const lume = fs.readFileSync(path.join(__dirname, 'lume.svg.txt'), 'utf8');
// Lume ocupa mais ou menos x 8–45, y 7–42 no desenho de 48x48: centro ~ (26.5, 25).
const art = (scale, rx) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><radialGradient id="glow" cx="50%" cy="56%" r="50%"><stop offset="0" stop-color="#9f8fff" stop-opacity=".28"/><stop offset="1" stop-color="#9f8fff" stop-opacity="0"/></radialGradient></defs>
<rect width="512" height="512" rx="${rx}" fill="#0c0c0f"/><rect width="512" height="512" rx="${rx}" fill="url(#glow)"/>
<g transform="translate(256 250) scale(${scale}) translate(-26.5 -25.5)">${lume}</g></svg>`;
const mono = lume.replace(/fill="#[0-9a-fA-F]{3,8}"/g, 'fill="none"').replace(/stroke="#[0-9a-fA-F]{3,8}"/g, 'stroke="#fff"').replace(/<circle[^>]*opacity[^>]*\/>/g, '');
const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><g transform="translate(24 24) scale(1.05) translate(-26.5 -25)">${mono}</g></svg>`;
(async () => {
  const out = path.join(__dirname, '..', 'public', 'icons'); fs.mkdirSync(out, { recursive: true });
  const r = (svg, size, file) => sharp(Buffer.from(svg), { density: 300 }).resize(size).png().toFile(path.join(out, file));
  await r(art(9.2, 112), 192, 'icon-192.png');
  await r(art(9.2, 112), 512, 'icon-512.png');
  await r(art(7.4, 0), 512, 'maskable-512.png');
  await r(art(8.6, 0), 180, 'apple-touch-icon.png');
  await r(badge, 96, 'badge-96.png');
  console.log('icons ok');
})();
