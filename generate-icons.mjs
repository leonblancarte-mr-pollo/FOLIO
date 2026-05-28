import { Resvg } from "@resvg/resvg-js";
import { writeFileSync, mkdirSync } from "fs";

mkdirSync("public", { recursive: true });

// Geometric "F" on oxblood background — no font dependency
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#7A2E2E"/>
  <!-- vertical stem -->
  <rect x="138" y="108" width="68" height="296" rx="6" fill="#F4EDE0"/>
  <!-- top bar -->
  <rect x="138" y="108" width="240" height="68" rx="6" fill="#F4EDE0"/>
  <!-- middle bar (slightly shorter) -->
  <rect x="138" y="230" width="192" height="60" rx="6" fill="#F4EDE0"/>
</svg>`;

for (const size of [192, 512]) {
  const rendered = new Resvg(svg, { fitTo: { mode: "width", value: size } }).render();
  writeFileSync(`public/icon-${size}.png`, rendered.asPng());
  console.log(`✓ public/icon-${size}.png`);
}

// 180×180 for apple-touch-icon
const rendered180 = new Resvg(svg, { fitTo: { mode: "width", value: 180 } }).render();
writeFileSync("public/apple-touch-icon.png", rendered180.asPng());
console.log("✓ public/apple-touch-icon.png");

console.log("Done.");
