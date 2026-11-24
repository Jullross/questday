// Gera os ícones do app a partir de um SVG (desenho próprio: sol nascendo + check).
const sharp = require('sharp'); const fs = require('fs');
const art = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9f8fff"/><stop offset="1" stop-color="#2ee8c4"/></linearGradient></defs>
<rect width="512" height="512" rx="${pad ? 0 : 112}" fill="#0c0c0f"/>
<g transform="translate(256 256) scale(${pad ? 0.72 : 1}) translate(-256 -256)">
<circle cx="256" cy="256" r="150" fill="none" stroke="url(#g)" stroke-width="34"/>
<path d="M186 262 l48 48 l96 -104" fill="none" stroke="url(#g)" stroke-width="38" stroke-linecap="round" stroke-linejoin="round"/>
</g></svg>`;
const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><path d="M28 50 l13 13 l27 -29" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
(async () => {
  fs.mkdirSync('public/icons', { recursive: true });
  await sharp(Buffer.from(art(false))).resize(192).png().toFile('public/icons/icon-192.png');
  await sharp(Buffer.from(art(false))).resize(512).png().toFile('public/icons/icon-512.png');
  await sharp(Buffer.from(art(true))).resize(512).png().toFile('public/icons/maskable-512.png');
  await sharp(Buffer.from(art(true))).resize(180).png().toFile('public/icons/apple-touch-icon.png');
  await sharp(Buffer.from(badge)).resize(96).png().toFile('public/icons/badge-96.png');
  console.log('icons ok');
})();
