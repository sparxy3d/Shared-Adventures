import curatedPhotos from "./curated-photos.json";

type PhotoSource = { src: string; srcSet?: string; width: number; height: number };
const curated: Record<string, { width: number; height: number; variants: { src: string; width: number }[] }> = curatedPhotos;
export const FALLBACK_PHOTO = "/images/fallback.png";

/** Preserve stored URLs as inputs; only rendering chooses a smaller representation. */
export function activityPhotoSource(src: string | null | undefined, srcSet?: string | null): PhotoSource {
  const original = src || FALLBACK_PHOTO;
  const entry = curated[original];
  if (entry) return {
    src: entry.variants[1].src,
    srcSet: entry.variants.map(v => `${v.src} ${v.width}w`).join(", "),
    width: entry.width, height: entry.height,
  };
  // Some list APIs return only the cover URL, not the gallery's srcSet.
  const uploaded = original.match(/^(\/api\/listing-images\/\d+\/)(?:400|800|1600)\.webp$/);
  return {
    src: original,
    srcSet: srcSet || (uploaded ? [400, 800, 1600].map(w => `${uploaded[1]}${w}.webp ${w}w`).join(", ") : undefined),
    width: 1600, height: 1067,
  };
}
