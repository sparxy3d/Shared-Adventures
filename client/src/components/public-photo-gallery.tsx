import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import "./public-photo-gallery.css";

export type PublicPhoto = { id: number; imageUrl: string; srcSet?: string | null; sortOrder: number };

export default function PublicPhotoGallery({ experienceId, fallbackUrl, title }: {
  experienceId: number; fallbackUrl: string; title: string;
}) {
  const photos = useQuery<PublicPhoto[]>({
    queryKey: [`/api/experiences/${experienceId}/photos`],
    queryFn: async () => {
      const response = await fetch(`/api/experiences/${experienceId}/photos`, { credentials: "include" });
      if (!response.ok) throw new Error("Gallery unavailable");
      return response.json();
    },
    enabled: Number.isFinite(experienceId) && experienceId > 0,
  });
  const images = [...(photos.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const fallback: PublicPhoto[] = [{ id: -1, imageUrl: fallbackUrl || "/images/fallback.png", sortOrder: 0 }];
  const gallery = images.length ? images : fallback;
  const [selected, setSelected] = useState(0);
  const active = gallery[Math.min(selected, gallery.length - 1)] ?? fallback[0];

  return <div className="public-gallery" aria-label={`${title} photo gallery`}>
    <div className="public-gallery-main">
      <img src={active.imageUrl} srcSet={active.srcSet || undefined} sizes="(max-width: 800px) 100vw, 1200px"
        alt={`${title}, photo ${Math.min(selected + 1, gallery.length)}`} fetchPriority="high"
        onError={event => { if (!event.currentTarget.src.endsWith("/images/fallback.png")) event.currentTarget.src = "/images/fallback.png"; }} />
      {photos.isError && <button type="button" className="public-gallery-retry" onClick={() => { void photos.refetch(); }}>Retry gallery</button>}
    </div>
    {gallery.length > 1 && <div className="public-gallery-thumbnails" aria-label="More photos">
      {gallery.map((photo, index) => <button key={photo.id} type="button" className={index === selected ? "is-current" : ""}
        onClick={() => setSelected(index)} aria-label={`Show photo ${index + 1}`} aria-pressed={index === selected}>
        <img src={photo.imageUrl} srcSet={photo.srcSet || undefined} sizes="92px" alt="" loading="lazy" />
      </button>)}
    </div>}
  </div>;
}
