// Genera los íconos de la PWA a partir del logo de SEMA ("SEMA LOGO PROVISIONAL.png").
// Requiere: npm i -D @resvg/resvg-js. El PNG fuente se incrusta en un SVG y se reescala.
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

mkdirSync("public", { recursive: true });

const b64 = readFileSync("SEMA LOGO PROVISIONAL.png").toString("base64");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512">
  <image width="512" height="512" xlink:href="data:image/png;base64,${b64}"/>
</svg>`;

for (const [file, size] of [["icon-192", 192], ["icon-512", 512], ["apple-touch-icon", 180]]) {
  const rendered = new Resvg(svg, { fitTo: { mode: "width", value: size } }).render();
  writeFileSync(`public/${file}.png`, rendered.asPng());
  console.log(`✓ public/${file}.png`);
}
console.log("Done.");
