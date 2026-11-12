import { useState, type ImgHTMLAttributes } from "react";
import { activityPhotoSource, FALLBACK_PHOTO } from "@/lib/activity-photos";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "alt"> & {
  src?: string | null;
  srcSet?: string | null;
  alt: string;
};

/** Layout and crop belong to callers. A failed candidate switches the entire source set. */
export default function ActivityPhoto({ src, srcSet, alt, sizes = "100vw", loading = "lazy", fetchPriority,
  width, height, onError, ...rest }: Props) {
  const [failed, setFailed] = useState<string | null>(null);
  const identity = `${src || ""}|${srcSet || ""}`;
  const usingFallback = failed === identity;
  const photo = activityPhotoSource(usingFallback ? FALLBACK_PHOTO : src, usingFallback ? undefined : srcSet);
  // React 18 forwards the lowercase native attribute without its unknown-prop warning.
  const priorityAttributes = fetchPriority ? { fetchpriority: fetchPriority } : {};
  return <img {...rest} {...priorityAttributes} src={photo.src} srcSet={photo.srcSet} alt={alt}
    sizes={sizes}
    width={width ?? photo.width} height={height ?? photo.height}
    loading={loading} decoding="async"
    onError={event => {
      if (!usingFallback) setFailed(identity);
      onError?.(event);
    }} />;
}
