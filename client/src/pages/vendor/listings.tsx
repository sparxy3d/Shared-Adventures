import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { CalendarDays, Copy, Edit3, ExternalLink, Eye, Plus, Store, X } from "lucide-react";
import type { AvailabilitySlot, Experience } from "@shared/schema";
import ExperienceCard from "@/components/experience-card";
import type { Activity } from "@/lib/discovery";
import { categoryLabel } from "@shared/catalog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { duplicateListing, imageAlt, nextOpenSession } from "@/lib/vendor-listings";
import "@/components/vendor-editor-stage-five.css";

function dateLabel(date: string, time?: string) {
  const parsed = new Date(`${date}T${time || "12:00"}:00+05:30`);
  return Number.isNaN(parsed.getTime()) ? date : new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: time ? "short" : undefined, timeZone: "Asia/Colombo" }).format(parsed);
}
function Status({ status }: { status: string }) { return <span className={`v5-status ${status}`}>{status}</span>; }

export default function VendorListings() {
  const [, navigate] = useLocation();
  const client = useQueryClient();
  const { toast } = useToast();
  const query = useQuery<Experience[]>({ queryKey: ["/api/vendor/experiences"] });
  const [duplicateTarget, setDuplicateTarget] = useState<Experience | null>(null);
  const [previewTarget, setPreviewTarget] = useState<Experience | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const experiences = useMemo(() => query.data || [], [query.data]);
  const idsKey = experiences.map(exp => exp.id).join(",");
  const slotsQueries = useQuery<Record<number, AvailabilitySlot[]>>({
    queryKey: ["/api/vendor/experiences/slots-index", idsKey],
    queryFn: async () => {
      const entries = await Promise.all((query.data || []).map(async exp => {
        const res = await apiRequest("GET", `/api/vendor/experiences/${exp.id}/slots`);
        return [exp.id, await res.json() as AvailabilitySlot[]] as const;
      }));
      return Object.fromEntries(entries);
    },
    enabled: !!query.data,
  });
  const duplicate = useMutation({
    mutationFn: async (exp: Experience) => {
      return duplicateListing(exp);
    },
    onSuccess: async created => {
      await client.invalidateQueries({ queryKey: ["/api/vendor/experiences"] });
      toast({ title: "Draft duplicated", description: "A copy is ready for editing." });
      setDuplicateTarget(null);
      navigate(`/vendor/listings/${created.id}`);
    },
    onError: () => toast({ title: "Couldn’t duplicate listing", description: "Please try again.", variant: "destructive" }),
  });
  useEffect(() => {
    if (!duplicateTarget) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => modalRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]');
    modalRef.current?.querySelector<HTMLElement>("button:not(:disabled)")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDuplicateTarget(null);
      if (event.key === "Tab") {
        const items = Array.from(focusable() || []);
        if (!items.length) return;
        if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1].focus(); }
        else if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus(); }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); document.body.style.overflow = previousOverflow; previouslyFocused?.focus(); };
  }, [duplicateTarget]);
  useEffect(() => {
    if (!previewTarget) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    previewRef.current?.querySelectorAll<HTMLElement>("a,button").forEach(item => item.tabIndex = -1);
    previewRef.current?.querySelector<HTMLElement>("[data-preview-close]")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewTarget(null);
      if (event.key === "Tab") {
        const close = previewRef.current?.querySelector<HTMLElement>("[data-preview-close]");
        if (close) { event.preventDefault(); close.focus(); }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); document.body.style.overflow = previousOverflow; previouslyFocused?.focus(); };
  }, [previewTarget]);
  return <div className="v5-page">
    <header className="v5-heading">
      <div><p className="v5-eyebrow">Your catalogue</p><h1>Listings</h1><p className="v5-sub">Keep every experience clear, current and ready to book.</p></div>
      <Link className="v5-btn v5-primary" href="/vendor/listings/new"><Plus size={17}/> New listing</Link>
    </header>
    {query.isLoading && <div aria-label="Loading listings"><div className="v5-skeleton v5-skel-hero"/>{[1,2,3].map(i=><div className="v5-skeleton v5-skel-row" key={i}/>)}</div>}
    {query.isError && <section className="v5-alert" role="alert"><h2>Listings didn’t load</h2><p>Check your connection, then try again.</p><button className="v5-btn v5-quiet" onClick={()=>query.refetch()}>Retry</button></section>}
    {!query.isLoading && !query.isError && experiences.length === 0 && <section className="v5-panel v5-empty"><div className="v5-logo" aria-hidden="true" style={{margin:"0 auto 14px"}}><Store/></div><h2>Your first experience starts here</h2><p>Build a listing, add a real session, then share it with guests.</p><Link className="v5-btn v5-primary" href="/vendor/listings/new"><Plus size={17}/> Create a listing</Link></section>}
    {!query.isLoading && !query.isError && experiences.length > 0 && <div className="v5-list">
      {experiences.map(exp => {
        const next = nextOpenSession(slotsQueries.data?.[exp.id]);
        return <article key={exp.id} className="v5-listing">
          {exp.imageUrl ? <img className="v5-thumb" src={exp.imageUrl} alt={imageAlt(exp.imageUrl, `${exp.title} photo`)} onError={e=>{e.currentTarget.style.visibility="hidden";}}/> : <div className="v5-thumb v5-thumb-empty" aria-label={`No photo for ${exp.title}`}>{exp.title.slice(0,1).toUpperCase()}</div>}
          <div>
            <div style={{display:"flex",alignItems:"center",gap:9,flexWrap:"wrap"}}><h2>{exp.title}</h2><Status status={exp.status}/></div>
            <p className="v5-meta">{categoryLabel(exp.category)} · {exp.city || "City not set"}</p>
            <div className="v5-next"><CalendarDays size={15}/>{slotsQueries.isLoading ? "Checking schedule…" : next ? `Next session · ${dateLabel(next.date,next.startTime)}` : "No upcoming open session"}</div>
          </div>
          <div className="v5-actions">
            <Link href={`/vendor/listings/${exp.id}`} className="v5-btn v5-quiet" aria-label={`Edit ${exp.title}`}><Edit3 size={16}/> Edit</Link>
            <Link href={`/vendor/schedule?listing=${exp.id}`} className="v5-btn v5-quiet" aria-label={`Manage schedule for ${exp.title}`}><CalendarDays size={16}/> Schedule</Link>
            <button className="v5-btn v5-quiet" type="button" onClick={e=>{triggerRef.current=e.currentTarget;setDuplicateTarget(exp);}}><Copy size={16}/> Duplicate</button>
            {exp.status==="draft"&&<button className="v5-btn v5-quiet" type="button" onClick={e=>{triggerRef.current=e.currentTarget;setPreviewTarget(exp);}}><Eye size={16}/> Preview</button>}
            {exp.status === "published" && <a className="v5-btn v5-quiet" href={`/activity/${exp.id}`} target="_blank" rel="noreferrer"><ExternalLink size={16}/> Preview</a>}
          </div>
        </article>;
      })}
      {slotsQueries.isError && <div className="v5-alert" role="alert">Session details couldn’t be loaded. <button className="v5-btn v5-quiet" onClick={()=>slotsQueries.refetch()}>Retry</button></div>}
    </div>}
    {duplicateTarget && <div className="v5-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setDuplicateTarget(null);}}>
      <div className="v5-modal" role="dialog" aria-modal="true" aria-labelledby="duplicate-title" tabIndex={-1} ref={modalRef}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}><div><p className="v5-eyebrow">Make a copy</p><h2 id="duplicate-title">Duplicate this listing?</h2></div><button className="v5-btn v5-quiet" aria-label="Close dialog" onClick={()=>setDuplicateTarget(null)}><X size={18}/></button></div>
        <p><strong>{duplicateTarget.title}</strong> will be copied as a draft. Its details and photo stay; schedule sessions are never copied.</p>
        <div className="v5-modal-actions"><button className="v5-btn v5-quiet" onClick={()=>setDuplicateTarget(null)}>Cancel</button><button className="v5-btn v5-primary" disabled={duplicate.isPending} onClick={()=>duplicate.mutate(duplicateTarget)}>{duplicate.isPending?"Creating…":"Create draft copy"}</button></div>
      </div>
    </div>}
    {previewTarget&&<div className="v5-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setPreviewTarget(null);}}>
      <div className="v5-modal" role="dialog" aria-modal="true" aria-labelledby="draft-preview-title" tabIndex={-1} ref={previewRef}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",marginBottom:14}}><div><p className="v5-eyebrow">Draft preview</p><h2 id="draft-preview-title" style={{margin:0}}>Guest card</h2></div><button data-preview-close className="v5-btn v5-quiet" aria-label="Close preview" onClick={()=>setPreviewTarget(null)}><X size={18}/></button></div>
        <p className="v5-hint">This is a private preview. Save a session and publish before guests can view or save it.</p>
        {previewTarget.priceAmount==null&&<p className="v5-price-placeholder">Add a price to show pricing on this guest card.</p>}
        <div className={`v5-card-inert${previewTarget.priceAmount == null ? " no-price" : ""}`} aria-hidden="true"><ExperienceCard experience={previewTarget as Activity} saved /></div>
      </div>
    </div>}
  </div>;
}
