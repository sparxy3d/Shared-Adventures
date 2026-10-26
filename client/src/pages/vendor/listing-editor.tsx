import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { ArrowLeft, CalendarDays, Check, ChevronDown, Save } from "lucide-react";
import { CATEGORIES } from "@shared/catalog";
import type { AvailabilitySlot, Experience } from "@shared/schema";
import ExperienceCard from "@/components/experience-card";
import type { Activity } from "@/lib/discovery";
import { useToast } from "@/hooks/use-toast";
import { CITY_CHOICES, EXPERIENCE_IMAGE_CHOICES, IDEAL_FOR, createListing, imageAlt, loadListing, loadListingSlots, updateListing, type ListingInput } from "@/lib/vendor-listings";
import "@/components/vendor-editor-stage-five.css";

type FormState = { title:string;category:string;description:string;locationText:string;city:string;region:string;durationMinutes:string;priceAmount:string;capacity:string;ageMin:string;safetyNotes:string;idealForTags:string[];imageUrl:string };
const blank: FormState = { title:"",category:"sports",description:"",locationText:"",city:"",region:"",durationMinutes:"",priceAmount:"",capacity:"",ageMin:"",safetyNotes:"",idealForTags:[],imageUrl:"" };
const toForm = (exp: Experience): FormState => ({ title:exp.title,category:exp.category,description:exp.description||"",locationText:exp.locationText||"",city:exp.city||"",region:exp.region||"",durationMinutes:exp.durationMinutes == null ? "" : String(exp.durationMinutes),priceAmount:exp.priceAmount == null ? "" : String(exp.priceAmount),capacity:exp.capacity == null ? "" : String(exp.capacity),ageMin:exp.ageMin == null ? "" : String(exp.ageMin),safetyNotes:exp.safetyNotes||"",idealForTags:exp.idealForTags||[],imageUrl:exp.imageUrl||"" });
const num = (value: string) => value.trim() ? Number(value) : undefined;
function listingFormData(form: FormState, status: string): ListingInput {
  return {
    title: form.title.trim(), category: form.category, description: form.description, locationText: form.locationText,
    region: form.region || form.city, city: form.city, durationMinutes: num(form.durationMinutes) ?? null,
    priceAmount: num(form.priceAmount) ?? null, capacity:num(form.capacity) ?? null, ageMin:num(form.ageMin) ?? null,
    safetyNotes:form.safetyNotes,idealForTags:form.idealForTags,status,imageUrl:form.imageUrl || null,
  };
}
function isValidInteger(value: string, min: number, max: number) { return value === "" || (/^\d+$/.test(value) && Number(value) >= min && Number(value) <= max); }

export interface ListingEditorProps {
  adminVendorId?: number;
  adminListingId?: number | "new";
  backHref?: string;
}

export default function ListingEditor({ adminVendorId, adminListingId, backHref }: ListingEditorProps = {}) {
  const { id } = useParams<{id:string}>();
  const adminMode = adminVendorId !== undefined;
  const effectiveId = adminMode ? (adminListingId === "new" || adminListingId == null ? undefined : String(adminListingId)) : id;
  const editing = !!effectiveId;
  const listingId = effectiveId ? Number(effectiveId) : 0;
  const [, navigate] = useLocation();
  const client = useQueryClient();
  const { toast } = useToast();
  const { data: vendor } = useQuery<{verificationStatus:string}>({queryKey:adminMode?["/api/admin/vendors",adminVendorId]:["/api/vendor/profile"],queryFn:adminMode?async()=>{const response=await fetch(`/api/admin/vendors/${adminVendorId}`,{credentials:"include"});if(!response.ok)throw new Error("Could not load vendor");return response.json();}:undefined});
  const listingKey=adminMode?["/api/admin/experiences",effectiveId]:["/api/vendor/experiences",effectiveId];
  const listingQuery = useQuery<Experience>({queryKey:listingKey,queryFn:()=>loadListing(listingId,adminMode),enabled:editing && Number.isFinite(listingId)});
  const slotsQuery = useQuery<AvailabilitySlot[]>({queryKey:adminMode?["/api/admin/experiences",listingId,"slots"]:["/api/vendor/experiences",listingId,"slots"],queryFn:()=>loadListingSlots(listingId,adminMode),enabled:editing});
  const [form,setForm]=useState<FormState>(blank);
  const [initialized,setInitialized]=useState(!editing);
  const [saved,setSaved]=useState("");
  const [expanded,setExpanded]=useState<Record<string,boolean>>({basics:true,group:true,details:true,photo:true,preview:true});
  const [leaveHref,setLeaveHref]=useState<string|null>(null);
  const [confirmDraft,setConfirmDraft]=useState(false);
  const [dirty,setDirty]=useState(false);
  const [submitted,setSubmitted]=useState(false);
  const [touched,setTouched]=useState<Record<string,boolean>>({});
  const [actionError,setActionError]=useState<"save"|"publish"|"draft"|null>(null);
  const lastSaveStatus=useRef<"draft"|"published"|undefined>();
  const leaveDialog=useRef<HTMLDivElement>(null);
  const previewCardRef=useRef<HTMLDivElement>(null);
  const dirtyRef=useRef(false);
  const currentUrl=useRef("");
  const validTitle=form.title.trim().length>0 && form.title.trim().length<=60;
  const validCategory=CATEGORIES.some(item=>item.value===form.category);
  const minimalValid=validTitle && validCategory && !!form.city;
  const integerErrors=useMemo(()=>({
    price:!isValidInteger(form.priceAmount,0,10_000_000), capacity:!isValidInteger(form.capacity,1,10_000), duration:!isValidInteger(form.durationMinutes,0,1440), age:!isValidInteger(form.ageMin,0,120),
  }),[form]);
  useEffect(()=>{if(listingQuery.data && !initialized){setForm(toForm(listingQuery.data));setInitialized(true);setDirty(false);}},[listingQuery.data,initialized]);
  useEffect(()=>{dirtyRef.current=dirty;},[dirty]);
  useEffect(()=>{
    const onBeforeUnload=(event:BeforeUnloadEvent)=>{if(dirtyRef.current){event.preventDefault();event.returnValue="";}};
    const onClick=(event:MouseEvent)=>{
      if(!dirtyRef.current || event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target=event.target as HTMLElement|null;
      const anchor=target?.closest("a[href]") as HTMLAnchorElement|null;
      if(!anchor || anchor.target==="_blank" || anchor.origin!==window.location.origin) return;
      const next = new URL(anchor.href);
      if(next.pathname===window.location.pathname && next.search===window.location.search && next.hash) return;
      event.preventDefault();setLeaveHref(anchor.href);
    };
    const onPop=()=>{
      if(!dirtyRef.current)return;
      const now=window.location.href;
      const next=new URL(now), previous=new URL(currentUrl.current || now);
      if(next.pathname===previous.pathname && next.search===previous.search){currentUrl.current=now;return;}
      window.history.pushState({}, "", currentUrl.current || now);setLeaveHref(now);
    };
    currentUrl.current=window.location.href;
    window.addEventListener("beforeunload",onBeforeUnload);document.addEventListener("click",onClick,true);window.addEventListener("popstate",onPop);
    return()=>{window.removeEventListener("beforeunload",onBeforeUnload);document.removeEventListener("click",onClick,true);window.removeEventListener("popstate",onPop);};
  },[]);
  useEffect(()=>{
    if(!leaveHref) return;
    const previous=document.activeElement as HTMLElement|null;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const focusable=()=>leaveDialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],[tabindex="0"]');
    focusable()?.[0]?.focus();
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){setLeaveHref(null);previous?.focus();}
      if(event.key==="Tab"){
        const items=Array.from(focusable()||[]);
        if(!items.length)return;
        if(event.shiftKey&&document.activeElement===items[0]){event.preventDefault();items[items.length-1].focus();}
        else if(!event.shiftKey&&document.activeElement===items[items.length-1]){event.preventDefault();items[0].focus();}
      }
    };
    document.addEventListener("keydown",onKey);return()=>{document.removeEventListener("keydown",onKey);document.body.style.overflow=previousOverflow;};
  },[leaveHref]);
  const saveMutation=useMutation({
    mutationFn:async({status}:{status?:"draft"|"published"})=>{
      const data=listingFormData(form,status || listingQuery.data?.status || "draft");
      if(editing) {
        if(status===undefined || status===listingQuery.data?.status) delete (data as Partial<ListingInput>).status;
        return updateListing(listingId,data,adminMode);
      }
      return createListing(data,adminVendorId);
    },
    onSuccess:async result=>{
      await client.invalidateQueries({queryKey:adminMode?["/api/admin/vendors",adminVendorId,"experiences"]:["/api/vendor/experiences"]});
      if(adminMode) await client.invalidateQueries({queryKey:["/api/admin/experiences"]});
      setDirty(false);dirtyRef.current=false;
      toast({title:editing ? "Listing saved" : "Draft saved",description:editing ? "Your changes are up to date." : "Add real availability before publishing."});
      setSaved("Saved");
      setActionError(null);
      if(!editing) navigate(adminMode?`${backHref || `/admin/vendors/${adminVendorId}?tab=listings`}&listing=${result.id}`:`/vendor/listings/${result.id}`);
      else {client.setQueryData(listingKey,result);setForm(toForm(result));}
    },
    onError:()=>{setActionError("save");toast({title:"Couldn’t save listing",description:"Your changes are still here. Retry when ready.",variant:"destructive"});},
  });
  const publishMutation=useMutation({
    mutationFn:()=>updateListing(listingId,{status:"published"},adminMode),
    onSuccess:async result=>{await client.invalidateQueries({queryKey:adminMode?["/api/admin/vendors",adminVendorId,"experiences"]:["/api/vendor/experiences"]});if(adminMode)await client.invalidateQueries({queryKey:["/api/admin/experiences"]});client.setQueryData(listingKey,result);setActionError(null);toast({title:"Listing published"});},
    onError:()=>{setActionError("publish");toast({title:"Couldn’t publish listing",description:"Check the photo, business approval and upcoming session, then retry.",variant:"destructive"});},
  });
  const draftMutation=useMutation({
    mutationFn:()=>updateListing(listingId,{status:"draft"},adminMode),
     onSuccess:async result=>{await client.invalidateQueries({queryKey:adminMode?["/api/admin/vendors",adminVendorId,"experiences"]:["/api/vendor/experiences"]});if(adminMode)await client.invalidateQueries({queryKey:["/api/admin/experiences"]});client.setQueryData(listingKey,result);setActionError(null);setConfirmDraft(false);toast({title:"Listing moved to draft"});},
    onError:()=>{setActionError("draft");toast({title:"Couldn’t change listing status",description:"Your listing is unchanged. Please retry.",variant:"destructive"});},
  });
  const save=(status?:"draft"|"published")=>{
    setSubmitted(true);
    if(!minimalValid){document.getElementById(!validTitle?"listing-title":!validCategory?"listing-category":"listing-city")?.focus();return;}
    if(Object.values(integerErrors).some(Boolean)){document.getElementById(integerErrors.price?"listing-price":integerErrors.capacity?"listing-capacity":integerErrors.duration?"listing-duration":"listing-age")?.focus();return;}
    if(status==="published" && !form.imageUrl){document.getElementById("section-photo")?.scrollIntoView({behavior:"smooth"});toast({title:"Choose a listing photo before publishing"});return;}
    lastSaveStatus.current=status;
    setActionError(null);
    saveMutation.mutate({status});
  };
  const change=(key:keyof FormState,value:string|string[])=>{setForm(prev=>({...prev,[key]:value}));setDirty(true);setSaved("");setActionError(null);};
  const status=listingQuery.data?.status || "draft";
  const upcoming=slotsQuery.data?.some(slot=>slot.status==="open" && Date.parse(`${slot.date}T${slot.startTime}:00+05:30`)>=Date.now());
  const publishReady=editing && !!form.imageUrl && !!upcoming && (adminMode || vendor?.verificationStatus==="approved") && (adminMode || status!=="unpublished");
  const canChangeStatus=adminMode || status!=="unpublished";
  const previewExperience = {
    id: listingQuery.data?.id ?? 0,
    vendorId: listingQuery.data?.vendorId ?? 0,
    title: form.title.trim() || "Your experience",
    category: form.category,
    description: form.description || null,
    locationText: form.locationText || null,
    countryId: listingQuery.data?.countryId ?? null,
    region: form.region || form.city || null,
    city: form.city || null,
    durationMinutes: num(form.durationMinutes) ?? null,
    priceAmount: num(form.priceAmount) ?? null,
    currencyCode: "LKR",
    capacity: num(form.capacity) ?? null,
    ageMin: num(form.ageMin) ?? null,
    safetyNotes: form.safetyNotes || null,
    idealForTags: form.idealForTags,
    openTime: listingQuery.data?.openTime ?? null,
    closeTime: listingQuery.data?.closeTime ?? null,
    nextSessionText: listingQuery.data?.nextSessionText ?? null,
    status,
    imageUrl: form.imageUrl || "/images/fallback.png",
    rating: listingQuery.data?.rating ?? null,
    reviewCount: listingQuery.data?.reviewCount ?? null,
    offerLabel: listingQuery.data?.offerLabel ?? null,
    createdAt: listingQuery.data?.createdAt ?? null,
    takingBookings: true,
  } as Activity;
  useEffect(()=>{
    previewCardRef.current?.querySelectorAll<HTMLElement>("a,button").forEach(element=>element.tabIndex=-1);
  },[form.imageUrl,form.title,form.priceAmount,form.city]);
  const toggle=(section:string)=>setExpanded(old=>({...old,[section]:!old[section]}));
  if(editing && listingQuery.isLoading) return <div className="v5-page"><div className="v5-skeleton v5-skel-hero"/><div className="v5-skeleton v5-skel-panel"/></div>;
  if(editing && listingQuery.isError) return <div className="v5-page v5-alert" role="alert"><h2>Listing couldn’t be opened</h2><p>It may have been removed or you may not have access.</p><button className="v5-btn v5-quiet" onClick={()=>listingQuery.refetch()}>Retry</button></div>;
  if(editing && listingQuery.data && !initialized) return <div className="v5-page"><div className="v5-skeleton v5-skel-panel"/></div>;
  const content = <div className="v5-page">
    <div className="v5-heading">
      <div><p className="v5-eyebrow">{editing?"Listing editor":"New experience"}</p><h1>{editing?listingQuery.data?.title:"Tell the story of your experience"}</h1><p className="v5-sub">{editing?"Keep your details and availability in sync.":"Start with the essentials. You can save a draft before adding sessions."}</p></div>
      <Link className="v5-btn v5-quiet" href={backHref || "/vendor/listings"}><ArrowLeft size={16}/> {adminMode?"Back to vendor":"All listings"}</Link>
      {editing&&<span className={`v5-status ${status}`} role="status">{status==="published"?"Live":status==="unpublished"?"Unpublished by admin":"Draft"}</span>}
    </div>
    <div className="v5-editor-layout">
      <main className="v5-editor-sections">
        <section id="section-basics" className="v5-panel v5-section">
          <button type="button" className="v5-section-toggle" onClick={()=>toggle("basics")} aria-expanded={expanded.basics}><h2>01 · The essentials</h2><ChevronDown size={18}/></button>
          {expanded.basics&&<div className="v5-fields">
            <div className="v5-field full"><label htmlFor="listing-title">Listing title <span aria-hidden="true">*</span></label><input id="listing-title" maxLength={60} value={form.title} onBlur={()=>setTouched(old=>({...old,title:true}))} onChange={e=>change("title",e.target.value)} aria-invalid={(touched.title||submitted)&&!validTitle} aria-describedby="title-help title-error"/><div style={{display:"flex",justifyContent:"space-between"}}><span id="title-help" className="v5-hint">Make it easy to picture the experience.</span><span className="v5-hint">{form.title.length}/60</span></div>{(touched.title||submitted)&&!validTitle&&<span className="v5-error-text" id="title-error">Enter a title up to 60 characters.</span>}</div>
            <div className="v5-field"><label htmlFor="listing-category">Category <span aria-hidden="true">*</span></label><select id="listing-category" value={form.category} onBlur={()=>setTouched(old=>({...old,category:true}))} onChange={e=>change("category",e.target.value)} aria-invalid={(touched.category||submitted)&&!validCategory}>{CATEGORIES.map(c=><option value={c.value} key={c.value}>{c.label}</option>)}</select>{(touched.category||submitted)&&!validCategory&&<span className="v5-error-text">Choose a category.</span>}</div>
            <div className="v5-field"><label htmlFor="listing-city">City <span aria-hidden="true">*</span></label><select id="listing-city" value={form.city} onBlur={()=>setTouched(old=>({...old,city:true}))} onChange={e=>change("city",e.target.value)} aria-invalid={(touched.city||submitted)&&!form.city}><option value="">Choose a city</option>{CITY_CHOICES.map(city=><option key={city}>{city}</option>)}</select>{(touched.city||submitted)&&!form.city&&<span className="v5-error-text">Choose a city.</span>}</div>
          </div>}
        </section>
        <section id="section-group" className="v5-panel v5-section">
          <button type="button" className="v5-section-toggle" onClick={()=>toggle("group")} aria-expanded={expanded.group}><h2>02 · Group and price</h2><ChevronDown size={18}/></button>
          {expanded.group&&<div className="v5-fields">
            <div className="v5-field"><label htmlFor="listing-price">Price per person (LKR)</label><input id="listing-price" inputMode="numeric" type="number" min="0" max="10000000" step="1" value={form.priceAmount} onBlur={()=>setTouched(old=>({...old,price:true}))} onChange={e=>change("priceAmount",e.target.value)} aria-invalid={(touched.price||submitted)&&integerErrors.price}/>{(touched.price||submitted)&&integerErrors.price&&<span className="v5-error-text">Use a whole LKR amount up to 10,000,000.</span>}</div>
            <div className="v5-field"><label htmlFor="listing-capacity">Group capacity</label><input id="listing-capacity" type="number" inputMode="numeric" min="1" max="10000" step="1" value={form.capacity} onBlur={()=>setTouched(old=>({...old,capacity:true}))} onChange={e=>change("capacity",e.target.value)} aria-invalid={(touched.capacity||submitted)&&integerErrors.capacity}/>{(touched.capacity||submitted)&&integerErrors.capacity&&<span className="v5-error-text">Enter a whole capacity from 1 to 10,000.</span>}</div>
            <div className="v5-field"><label htmlFor="listing-duration">Duration (minutes)</label><input id="listing-duration" type="number" inputMode="numeric" min="0" max="1440" step="1" value={form.durationMinutes} onBlur={()=>setTouched(old=>({...old,duration:true}))} onChange={e=>change("durationMinutes",e.target.value)} aria-invalid={(touched.duration||submitted)&&integerErrors.duration}/><span className="v5-hint">{form.durationMinutes && !integerErrors.duration ? `${Number(form.durationMinutes)/60} hours` : "Enter minutes; hours are shown for guests."}</span>{(touched.duration||submitted)&&integerErrors.duration&&<span className="v5-error-text">Use whole minutes from 0 to 1,440.</span>}</div>
          </div>}
        </section>
        <section id="section-details" className="v5-panel v5-section">
          <button type="button" className="v5-section-toggle" onClick={()=>toggle("details")} aria-expanded={expanded.details}><h2>03 · Details</h2><ChevronDown size={18}/></button>
          {expanded.details&&<div className="v5-fields">
            <div className="v5-field full"><label htmlFor="listing-location">Meeting point / location details</label><input id="listing-location" value={form.locationText} onChange={e=>change("locationText",e.target.value)} placeholder="Neighbourhood, landmark or meeting point"/></div>
            <div className="v5-field full"><label htmlFor="listing-description">About the experience</label><textarea id="listing-description" value={form.description} onChange={e=>change("description",e.target.value)} rows={5} placeholder="What will guests do, and what makes it worth their time?"/></div>
            <div className="v5-field"><label htmlFor="listing-age">Minimum age</label><input id="listing-age" type="number" inputMode="numeric" min="0" max="120" step="1" value={form.ageMin} onBlur={()=>setTouched(old=>({...old,age:true}))} onChange={e=>change("ageMin",e.target.value)} aria-invalid={(touched.age||submitted)&&integerErrors.age}/>{(touched.age||submitted)&&integerErrors.age&&<span className="v5-error-text">Enter a whole age from 0 to 120.</span>}</div>
            <div className="v5-field full"><span className="v5-label">Good for</span><div className="v5-chips">{IDEAL_FOR.map(tag=><button className="v5-chip" type="button" key={tag} aria-pressed={form.idealForTags.includes(tag)} onClick={()=>change("idealForTags",form.idealForTags.includes(tag)?form.idealForTags.filter(t=>t!==tag):[...form.idealForTags,tag])}>{tag[0].toUpperCase()+tag.slice(1)}</button>)}</div></div>
            <div className="v5-field full"><label htmlFor="listing-notes">What’s included, what to bring, age or fitness notes</label><textarea id="listing-notes" rows={3} value={form.safetyNotes} onChange={e=>change("safetyNotes",e.target.value)} placeholder="Share anything guests should know before they arrive."/></div>
          </div>}
        </section>
        <section id="section-photo" className="v5-panel v5-section">
          <button type="button" className="v5-section-toggle" onClick={()=>toggle("photo")} aria-expanded={expanded.photo}><h2>04 · Choose a photo</h2><ChevronDown size={18}/></button>
          <p className="v5-hint">Photo upload and promo video are coming at go-live.</p>
          {expanded.photo&&<><p className="v5-hint">Select a curated image that best represents your experience. A photo is required to publish.</p><div className="v5-images" role="radiogroup" aria-label="Experience photos">{EXPERIENCE_IMAGE_CHOICES.map((image,index)=><button className="v5-image-choice" type="button" role="radio" aria-checked={form.imageUrl===image} aria-label={`Photo option ${index+1}: ${imageAlt(image)}`} key={image} onClick={()=>change("imageUrl",image)}><img src={image} alt={imageAlt(image)} loading="lazy"/>{form.imageUrl===image&&<span><Check size={14} aria-label="Selected"/></span>}</button>)}</div></>}
        </section>
        <section id="section-preview" className="v5-panel v5-section">
          <button type="button" className="v5-section-toggle" onClick={()=>toggle("preview")} aria-expanded={expanded.preview}><h2>05 · Preview and publish</h2><ChevronDown size={18}/></button>
          {expanded.preview&&<><p className="v5-hint">A private view of the guest card. Save a photo and real open session before publishing.</p>
            {form.priceAmount===""&&<p className="v5-price-placeholder">Enter a price to preview its place on the guest card.</p>}
            <div className={`v5-card-inert${form.priceAmount===""?" no-price":""}`} aria-hidden="true" ref={previewCardRef}><ExperienceCard experience={previewExperience} saved/></div>
            <p className="v5-hint" aria-live="polite">{status==="published"?"Published · edits save directly to the live listing.":status==="unpublished"?"Unpublished by Free Spirit — contact us.":publishReady?"Ready to publish once your draft changes are saved.":"Publishing requires business approval, a photo and an upcoming open session."}</p>
            {editing&&canChangeStatus&&status!=="published"&&<button className="v5-btn v5-primary" disabled={!publishReady||publishMutation.isPending||dirty} onClick={()=>publishMutation.mutate()} title={dirty?"Save your details before publishing":!publishReady?(adminMode?"A photo and an upcoming open session are required":"Approval, a photo and an upcoming open session are required"):undefined}>Publish listing</button>}
          </>}
        </section>
        {actionError&&<div className="v5-alert" role="alert"><strong>{actionError==="publish"?"Couldn’t publish this listing":actionError==="draft"?"Couldn’t update listing status":"Couldn’t save this listing"}</strong><p>{actionError==="publish"?"Confirm your business is approved, the listing has a photo, and an upcoming open session exists. Your edits remain on this page.":"Your edits remain on this page. Please retry."}</p><button className="v5-btn v5-quiet" onClick={()=>{if(actionError==="publish")publishMutation.mutate();else if(actionError==="draft")draftMutation.mutate();else save(lastSaveStatus.current);}}>Retry</button></div>}
         {editing&&<section className="v5-panel"><h2 style={{marginTop:0}}>Availability</h2><p className="v5-hint">{slotsQuery.isLoading?"Checking real sessions…":upcoming?"An upcoming open session is ready.":"Add an open session before publishing this listing."}</p><Link className="v5-btn v5-quiet" href={adminMode?`/admin/vendors/${adminVendorId}?tab=schedule&listing=${listingId}`:`/vendor/schedule?listing=${listingId}`}><CalendarDays size={16}/> Manage sessions</Link>{slotsQuery.isError&&<button className="v5-btn v5-quiet" onClick={()=>slotsQuery.refetch()}>Retry availability</button>}</section>}
         {editing&&status==="unpublished"&&<div className="v5-notice" role="status">{adminMode?"This listing is unpublished. Admin review can republish it once it has a photo and an upcoming session.":"Unpublished by Free Spirit — contact us. Your listing status cannot be changed here."}</div>}
        {editing&&vendor&&vendor.verificationStatus!=="approved"&&<div className="v5-notice" role="status">Your business must be approved before a listing can go live.</div>}
      </main>
      <aside className="v5-panel v5-anchor"><p className="v5-eyebrow">In this listing</p><nav aria-label="Editor sections"><a href="#section-basics">Basics</a><a href="#section-group">Group and price</a><a href="#section-details">Details</a><a href="#section-photo">Photo</a><a href="#section-preview">Preview and publish</a></nav><div className="v5-sticky-save">
         {status==="draft"&&<button className="v5-btn v5-quiet" disabled={saveMutation.isPending||!minimalValid} onClick={()=>save("draft")}><Save size={16}/> Save draft</button>}
        {status==="unpublished"&&<button className="v5-btn v5-quiet" disabled={saveMutation.isPending||!minimalValid||!dirty} onClick={()=>save()}><Save size={16}/> Save details</button>}
        {status==="published"&&<button className="v5-btn v5-primary" disabled={saveMutation.isPending||!minimalValid} onClick={()=>save("published")}><Save size={16}/> Save changes</button>}
         {status==="published"&&<button className="v5-btn v5-quiet" disabled={draftMutation.isPending||dirty} onClick={()=>setConfirmDraft(true)}>Move to draft</button>}
        {canChangeStatus&&status!=="published"&&editing&&<button className="v5-btn v5-primary" disabled={!publishReady||publishMutation.isPending||dirty} onClick={()=>publishMutation.mutate()} title={!upcoming?"Add an upcoming open session first":!form.imageUrl?"Choose a photo first":vendor?.verificationStatus!=="approved"?"Business approval is required":dirty?"Save your changes before publishing":undefined}>Publish</button>}
        {!editing&&<button className="v5-btn v5-primary" disabled={saveMutation.isPending||!minimalValid} onClick={()=>save("draft")}>{saveMutation.isPending?"Saving…":"Save draft"}</button>}
        {editing&&<div className="v5-hint" aria-live="polite">{dirty?"Unsaved changes":saved||"All changes saved"}</div>}
      </div></aside>
    </div>
    <div className="v5-mobile-save">
      {editing&&status==="published"?<button className="v5-btn v5-primary" disabled={saveMutation.isPending||!minimalValid||!dirty} onClick={()=>save("published")}><Save size={16}/> Save changes</button>:status==="unpublished"?<button className="v5-btn v5-quiet" disabled={saveMutation.isPending||!minimalValid||!dirty} onClick={()=>save()}><Save size={16}/> Save details</button>:<button className="v5-btn v5-quiet" disabled={saveMutation.isPending||!minimalValid} onClick={()=>save("draft")}><Save size={16}/> Save draft</button>}
        {editing&&status==="published"&&<button className="v5-btn v5-quiet" disabled={draftMutation.isPending||dirty} onClick={()=>setConfirmDraft(true)}>Move to draft</button>}
      {editing&&canChangeStatus&&status!=="published"&&<button className="v5-btn v5-primary" disabled={!publishReady||publishMutation.isPending||dirty} onClick={()=>publishMutation.mutate()}>Publish</button>}
      {!editing&&<Link className="v5-btn v5-quiet" href="/vendor/listings">Cancel</Link>}
    </div>
     {confirmDraft&&<div className="v5-modal-backdrop" role="presentation"><div className="v5-modal" role="alertdialog" aria-modal="true" aria-labelledby="draft-confirm-title"><h2 id="draft-confirm-title">Move this listing to draft?</h2><p>This removes it from public discovery. Existing bookings and sessions are not changed.</p><div className="v5-modal-actions"><button className="v5-btn v5-quiet" disabled={draftMutation.isPending} onClick={()=>setConfirmDraft(false)}>Keep published</button><button className="v5-btn v5-danger" disabled={draftMutation.isPending} onClick={()=>draftMutation.mutate()}>{draftMutation.isPending?"Moving…":"Move to draft"}</button></div></div></div>}
     {leaveHref&&<div className="v5-modal-backdrop" role="presentation"><div className="v5-modal" role="dialog" aria-modal="true" aria-labelledby="leave-title" tabIndex={-1} ref={leaveDialog}><h2 id="leave-title">Leave without saving?</h2><p>Your changes haven’t been saved. You can stay and keep editing, or leave this page.</p><div className="v5-modal-actions"><button className="v5-btn v5-quiet" onClick={()=>setLeaveHref(null)}>Keep editing</button><button className="v5-btn v5-danger" onClick={()=>{setDirty(false);dirtyRef.current=false;const href=leaveHref;setLeaveHref(null);if(href===window.location.href)window.history.back();else navigate(new URL(href).pathname+new URL(href).search);}}>Leave page</button></div></div></div>}
  </div>;
  return content;
}
