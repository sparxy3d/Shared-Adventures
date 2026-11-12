// One-time/static generation. Run: npx tsx script/generate-activity-photos.ts
// Originals stay untouched. No enlargement: 1600 targets retain source resolution.
import sharp from "sharp";
import { mkdir, writeFile, stat } from "node:fs/promises";
import { EXPERIENCE_IMAGES } from "../shared/catalog";

const sources = [...EXPERIENCE_IMAGES, "/images/fallback.png", "/images/hero-bg.png"];
const manifest: Record<string, { width: number; height: number; variants: { src: string; width: number; bytes: number }[] }> = {};
await mkdir("client/public/images/responsive", { recursive: true });
for (const source of sources) {
  const input = `client/public${source}`;
  const metadata = await sharp(input).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Missing dimensions: ${source}`);
  const stem = source.split("/").pop()!.replace(/\.[^.]+$/, "");
  const variants = [];
  for (const target of [400, 800, 1600]) {
    const src = `/images/responsive/${stem}-${target}.webp`;
    const info = await sharp(input).rotate().resize({ width: target, withoutEnlargement: true })
      .webp({ quality: 85, effort: 6 }).toFile(`client/public${src}`);
    variants.push({ src, width: info.width, bytes: info.size });
  }
  manifest[source] = { width: metadata.width, height: metadata.height, variants };
  console.log(`${source}: ${(await stat(input)).size} -> ${variants.map(v => `${v.width}px=${v.bytes}`).join(", ")}`);
}
await writeFile("client/src/lib/curated-photos.json", JSON.stringify(manifest, null, 2) + "\n");
