import sharp from "sharp";
import { readFileSync } from "node:fs";

const svg = readFileSync("src/app/icon.svg");

await sharp(svg).resize(192, 192).png().toFile("public/icon-192.png");
await sharp(svg).resize(512, 512).png().toFile("public/icon-512.png");

// maskable: centre the mark on a solid Neon Night background with safe padding
const inner = await sharp(svg).resize(360, 360).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#0A0A0F" } })
  .composite([{ input: inner, gravity: "center" }])
  .png()
  .toFile("public/maskable-512.png");

console.log("icons generated");
