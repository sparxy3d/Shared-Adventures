import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import "@/components/listing-photo-editor.css";

export type ListingPhoto = { id: number; experienceId: number; imageUrl: string; sortOrder: number; storageKey: string | null; srcSet: string | null };
type Props = { listingId?: number; adminMode?: boolean; onCoverChange?: (url: string) => void; onUploadStateChange?: (uploaded: boolean) => void };
const endpoint = (id: number, adminMode: boolean) => `/api/${adminMode ? "admin" : "vendor"}/experiences/${id}/photos`;

export default function ListingPhotoEditor({ listingId, adminMode = false, onCoverChange, onUploadStateChange }: Props) {
  const [photos, setPhotos] = useState<ListingPhoto[]>([]);
  useEffect(() => { onUploadStateChange?.(photos.some(photo => !!photo.storageKey)); }, [photos, onUploadStateChange]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [removeId, setRemoveId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const path = listingId ? endpoint(listingId, adminMode) : "";

  useEffect(() => {
    if (!listingId) return;
    let active = true;
    setLoading(true);
    apiRequest("GET", path).then((response) => response.json() as Promise<ListingPhoto[]>)
      .then((items) => { if (active) setPhotos([...items].sort((a, b) => a.sortOrder - b.sortOrder)); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Photos could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [listingId, path]);

  const upload = async (files: FileList | null) => {
    if (!files?.length || !listingId) return;
    if (files.length > 6 - photos.length) { setError(`Choose at most ${6 - photos.length} more photos.`); return; }
    if (Array.from(files).some(file => file.size > 10_000_000)) { setError("Each photo must be no larger than 10MB."); return; }
    const allowed = Array.from(files).slice(0, Math.max(0, 6 - photos.length));
    if (!allowed.length) { setError("A listing can have up to six photos."); return; }
    setError("");
    setProgress({ done: 0, total: allowed.length });
    try {
      for (let index = 0; index < allowed.length; index += 1) {
        const data = new FormData();
        data.append("photos", allowed[index]);
        const response = await new Promise<Response>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", path);
          xhr.withCredentials = true;
          xhr.upload.onprogress = (event) => { if (event.lengthComputable) setProgress({ done: Math.round((index + event.loaded / event.total) * 100), total: 100 }); };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve(new Response(xhr.responseText, { status: xhr.status }));
            else {
              try {
                const payload = JSON.parse(xhr.responseText) as { code?: string; message?: string };
                if (xhr.status === 403 && payload.code === "PASSWORD_CHANGE_REQUIRED") window.location.assign("/set-password");
                reject(new Error(payload.message || xhr.responseText || "Photo upload failed."));
              } catch { reject(new Error(xhr.responseText || "Photo upload failed.")); }
            }
          };
          xhr.onerror = () => reject(new Error("Photo upload failed. Check your connection and retry."));
          xhr.send(data);
        });
        const updated = await response.json() as ListingPhoto[];
        setPhotos([...updated].sort((a, b) => a.sortOrder - b.sortOrder));
        if (index === 0 && updated.length) onCoverChange?.([...updated].sort((a, b) => a.sortOrder - b.sortOrder)[0].imageUrl);
        setProgress({ done: index + 1, total: allowed.length });
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Photo upload failed. Please retry.");
    } finally {
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const reorder = async (from: number, to: number) => {
    if (to < 0 || to >= photos.length) return;
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setError("");
    setPhotos(next);
    try {
      const response = await apiRequest("PUT", path, { photoIds: next.map((photo) => photo.id) });
      const updated = await response.json() as ListingPhoto[];
      const sorted = [...updated].sort((a, b) => a.sortOrder - b.sortOrder);
      setPhotos(sorted);
      if (sorted[0]) onCoverChange?.(sorted[0].imageUrl);
    } catch (reason) {
      setPhotos(photos);
      setError(reason instanceof Error ? reason.message : "Photo order could not be saved.");
    }
  };
  const remove = async () => {
    if (removeId == null) return;
    setError("");
    try {
      const response = await apiRequest("DELETE", `${path}/${removeId}`);
      const updated = await response.json() as ListingPhoto[];
      const sorted = [...updated].sort((a, b) => a.sortOrder - b.sortOrder);
      setPhotos(sorted);
      onCoverChange?.(sorted[0]?.imageUrl ?? "");
      setRemoveId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Photo could not be removed.");
    }
  };

  if (!listingId) return <div className="listing-photo-note"><ImagePlus size={17} /><p><strong>Save draft first to upload your own photos.</strong> Your selected cover stays saved while you finish the listing details.</p></div>;
  return <div className="listing-photo-editor">
    <div className="listing-photo-head"><div><strong>Your photos</strong><span>{photos.length} of 6 · first photo is the cover</span></div><button type="button" className="v5-btn v5-quiet" onClick={() => fileRef.current?.click()} disabled={photos.length >= 6 || !!progress}><ImagePlus size={15} />Add photos</button><input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple hidden aria-label="Choose listing photos" onChange={(event) => void upload(event.target.files)} /></div>
    {loading && <div className="listing-photo-loading" aria-label="Loading photos"><i/><i/><i/></div>}
    {!loading && photos.length === 0 && <p className="listing-photo-empty">Your original photos will appear here. JPG, PNG or WebP, up to 10 MB each.</p>}
    {photos.length > 0 && <div className="listing-photo-grid">{photos.map((photo, index) => <article key={photo.id} className="listing-photo-item" draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", String(index))} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void reorder(Number(event.dataTransfer.getData("text/plain")), index); }}>
      <img src={photo.imageUrl} srcSet={photo.srcSet || undefined} sizes="(max-width: 700px) 45vw, 180px" alt={`Listing photo ${index + 1}`} />
      <div className="listing-photo-tools"><span>{index === 0 ? "Cover" : `Photo ${index + 1}`}</span><div><button type="button" aria-label={`Move photo ${index + 1} up`} disabled={index === 0} onClick={() => void reorder(index, index - 1)}><ArrowUp size={14}/></button><button type="button" aria-label={`Move photo ${index + 1} down`} disabled={index === photos.length - 1} onClick={() => void reorder(index, index + 1)}><ArrowDown size={14}/></button><button type="button" className="remove" aria-label={`Remove photo ${index + 1}`} onClick={() => setRemoveId(photo.id)}><Trash2 size={14}/></button></div></div>
    </article>)}</div>}
    {progress && <div className="listing-photo-progress" role="status"><LoaderCircle size={15} /> Uploading photos · {progress.total === 100 ? `${progress.done}%` : `${progress.done} of ${progress.total}`}</div>}
    {error && <div className="listing-photo-error" role="alert">{error}<button type="button" onClick={() => setError("")}>Dismiss</button></div>}
    {removeId != null && <div className="listing-photo-confirm-backdrop"><section className="listing-photo-confirm" role="alertdialog" aria-modal="true" aria-labelledby="photo-remove-title"><h3 id="photo-remove-title">Remove this photo?</h3><p>This permanently removes the image from the listing. If it is the cover, the next photo becomes the cover.</p><div><button type="button" className="v5-btn v5-quiet" onClick={() => setRemoveId(null)}>Keep photo</button><button type="button" className="v5-btn v5-danger" onClick={() => void remove()}>Remove photo</button></div></section></div>}
  </div>;
}

