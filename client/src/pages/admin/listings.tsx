import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowDownUp, ChevronLeft, ChevronRight, ExternalLink, Search } from "lucide-react";
import type { AvailabilitySlot, Experience, Vendor } from "@shared/schema";
import { CATEGORIES } from "@shared/catalog";
import { formatPrice } from "@/lib/currency";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { nextOpenSession } from "@/lib/vendor-listings";
import { formatVendorDate, formatVendorTime } from "@/lib/vendor-bookings";
import { shiftDate, sriLankaDateKey } from "@/lib/vendor-schedule";
import "@/pages/admin/admin-vendor.css";

type AdminExperience = Experience & { vendor?: Vendor & { owner?: { email?: string | null } }; vendorName?: string; ownerEmail?: string };
type EnrichedVendor = Vendor & { owner?: { email?: string | null }; ownerEmail?: string | null };
type SortKey = "title" | "vendorName" | "category" | "city" | "priceAmount" | "status";
const PAGE_SIZE = 25;

function statusTitle(status: string) {
  return status === "published" ? "Published" : status === "unpublished" ? "Unpublished" : "Draft";
}

export default function AdminListings() {
  const [, navigate] = useLocation();
  const client = useQueryClient();
  const { toast } = useToast();
  const listingsQuery = useQuery<AdminExperience[]>({ queryKey: ["/api/admin/experiences"] });
  const vendorsQuery = useQuery<EnrichedVendor[]>({ queryKey: ["/api/admin/vendors"] });
  const listings = listingsQuery.data ?? [];
  const vendors = vendorsQuery.data ?? [];
  const ownerByVendor = useMemo(() => new Map<number, EnrichedVendor>(vendors.map((vendor) => [vendor.id, vendor])), [vendors]);
  const slotsQueries = useQueries({
    queries: listings.map((listing) => ({
      queryKey: ["/api/admin/experiences", listing.id, "slots"],
      staleTime: 30_000,
    })),
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(() => new URLSearchParams(window.location.search).get("filter") === "published" ? "published" : "all");
  const [noSessionsOnly, setNoSessionsOnly] = useState(() => new URLSearchParams(window.location.search).get("filter") === "no-sessions");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [demoFilter, setDemoFilter] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({ key: "title", descending: false });
  const [page, setPage] = useState(0);
  const [unpublish, setUnpublish] = useState<AdminExperience | null>(null);
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const today = sriLankaDateKey();
  const lastAttentionDay = shiftDate(today, 14);
  const hasSessionWithinAttentionWindow = (listing: AdminExperience) => {
    const index = listings.findIndex((row) => row.id === listing.id);
    const slots = slotsQueries[index]?.data as AvailabilitySlot[] | undefined;
    return slots?.some((slot) => {
      if (slot.status !== "open" || slot.date < today || slot.date > lastAttentionDay) return false;
      return Date.parse(`${slot.date}T${slot.startTime}:00+05:30`) >= Date.now();
    }) ?? false;
  };
  const slotsStillLoading = slotsQueries.some((query) => query.isLoading);
  const slotsFailed = slotsQueries.some((query) => query.isError);
  const visible = useMemo(() => listings.filter((listing) => {
    const vendor = listing.vendor ?? ownerByVendor.get(listing.vendorId);
    const vendorName = listing.vendorName || vendor?.businessName || "";
    const ownerEmail = listing.ownerEmail || vendor?.owner?.email || "";
    const text = `${listing.title} ${listing.city ?? ""} ${listing.category} ${vendorName} ${ownerEmail}`.toLowerCase();
    return (!search || text.includes(search.toLowerCase())) &&
      (statusFilter === "all" || listing.status === statusFilter) &&
      (!noSessionsOnly || (listing.status === "published" && !hasSessionWithinAttentionWindow(listing))) &&
      (categoryFilter === "all" || listing.category === categoryFilter) &&
      (cityFilter === "all" || listing.city === cityFilter) &&
      (demoFilter === "all" || (demoFilter === "demo" ? ownerEmail.toLowerCase().endsWith("@freespirit.com") : !ownerEmail.toLowerCase().endsWith("@freespirit.com")));
  }), [listings, ownerByVendor, search, statusFilter, noSessionsOnly, categoryFilter, cityFilter, demoFilter, slotsQueries, today, lastAttentionDay]);

  const sorted = useMemo(() => [...visible].sort((a, b) => {
    const vendorA = a.vendor ?? ownerByVendor.get(a.vendorId);
    const vendorB = b.vendor ?? ownerByVendor.get(b.vendorId);
    const values: Record<SortKey, string | number> = {
      title: a.title.toLowerCase(),
      vendorName: (a.vendorName || vendorA?.businessName || "").toLowerCase(),
      category: a.category.toLowerCase(), city: (a.city || "").toLowerCase(),
      priceAmount: a.priceAmount ?? -1, status: a.status,
    };
    const valuesB: Record<SortKey, string | number> = {
      title: b.title.toLowerCase(),
      vendorName: (b.vendorName || vendorB?.businessName || "").toLowerCase(),
      category: b.category.toLowerCase(), city: (b.city || "").toLowerCase(),
      priceAmount: b.priceAmount ?? -1, status: b.status,
    };
    const result = typeof values[sort.key] === "number"
      ? Number(values[sort.key]) - Number(valuesB[sort.key])
      : String(values[sort.key]).localeCompare(String(valuesB[sort.key]));
    return sort.descending ? -result : result;
  }), [visible, sort, ownerByVendor]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "published" | "unpublished" }) =>
      apiRequest("PATCH", `/api/admin/experiences/${id}`, { status }),
    onSuccess: async (_result, variables) => {
      await client.invalidateQueries({ queryKey: ["/api/admin/experiences"] });
      await client.invalidateQueries({ queryKey: ["/api/admin/vendors"] });
      if (variables.status === "unpublished") {
        const why = reason.trim();
        toast({ title: "Listing unpublished", description: why ? `Reason: ${why}` : "The listing is no longer public." });
        setUnpublish(null); setReason(""); setConfirmed(false);
      } else toast({ title: "Listing published" });
    },
    onError: () => toast({ title: "Couldn’t update listing", description: "The listing status is unchanged. Retry when ready.", variant: "destructive" }),
  });

  const slotFor = (listing: AdminExperience): AvailabilitySlot | undefined =>
    nextOpenSession(slotsQueries[listings.findIndex((row) => row.id === listing.id)]?.data as AvailabilitySlot[] | undefined);
  const sortBy = (key: SortKey) => { setSort((old) => old.key === key ? { key, descending: !old.descending } : { key, descending: false }); setPage(0); };
  const toggleFilter = (setter: (value: string) => void, value: string) => { setter(value); setPage(0); };
  const setNoSessionFilter = (value: boolean) => { setNoSessionsOnly(value); setPage(0); };

  if (listingsQuery.isLoading || vendorsQuery.isLoading) return <main className="av-page"><div className="av-header"><div className="av-skeleton av-skel-title"/><div className="av-skeleton av-skel-panel"/></div><div className="av-skeleton av-skel-table"/></main>;
  if (listingsQuery.isError || vendorsQuery.isError) return <main className="av-page"><div className="av-alert" role="alert"><strong>Listings couldn’t be loaded.</strong><p>The directory is unchanged. Try again.</p><button className="av-button" onClick={() => { void listingsQuery.refetch(); void vendorsQuery.refetch(); }}>Retry</button></div></main>;

  const sortHeading = (key: SortKey, label: string) => <button className="av-sort" onClick={() => sortBy(key)}>{label}<ArrowDownUp size={14} aria-hidden="true"/></button>;
  const row = (listing: AdminExperience) => {
    const vendor = listing.vendor ?? ownerByVendor.get(listing.vendorId);
    const next = slotFor(listing);
    const isDemo = (listing.ownerEmail || vendor?.owner?.email || "").toLowerCase().endsWith("@freespirit.com");
    return <tr key={listing.id}>
      <td><div className="av-listing-cell">{listing.imageUrl ? <img className="av-thumb" src={listing.imageUrl} alt="" loading="lazy"/> : <div className="av-thumb av-thumb-empty"/>}<div><strong>{listing.title}</strong><small>{listing.city || "City not set"}</small></div></div></td>
      <td>{vendor?.businessName || listing.vendorName || `Vendor ${listing.vendorId}`}{isDemo && <span className="av-tag av-demo">Demo</span>}</td>
      <td>{CATEGORIES.find((c) => c.value === listing.category)?.label ?? listing.category}</td>
      <td>{listing.city || "—"}</td>
      <td>{listing.priceAmount == null ? "—" : formatPrice(listing.priceAmount, "LKR")}</td>
      <td><span className={`av-status av-status-${listing.status}`}>{statusTitle(listing.status)}</span></td>
      <td>{slotsQueries[listings.findIndex((item) => item.id === listing.id)]?.isLoading ? "Checking…" : next ? `${formatVendorDate(next.date)} · ${formatVendorTime(next.startTime)}` : "No upcoming session"}</td>
      <td><div className="av-row-actions">
        {listing.status === "published"
          ? <button className="av-link-button av-danger-text" onClick={() => { setUnpublish(listing); setReason(""); setConfirmed(false); }}>Unpublish</button>
          : <button className="av-link-button" disabled={statusMutation.isPending || !listing.imageUrl || !next} title={!listing.imageUrl || !next ? "A photo and upcoming open session are required" : undefined} onClick={() => statusMutation.mutate({ id: listing.id, status: "published" })}>Publish</button>}
        <button className="av-link-button" onClick={() => navigate(`/admin/vendors/${listing.vendorId}?tab=listings&listing=${listing.id}`)}>Edit</button>
        <a className="av-icon-link" href={`/activity/${listing.id}`} target="_blank" rel="noreferrer" aria-label={`View public listing ${listing.title}`}><ExternalLink size={15}/></a>
      </div></td>
    </tr>;
  };
  const card = (listing: AdminExperience) => {
    const vendor = listing.vendor ?? ownerByVendor.get(listing.vendorId);
    const next = slotFor(listing);
    return <article className="av-phone-card" key={listing.id}>
      <div className="av-listing-cell">{listing.imageUrl ? <img className="av-thumb" src={listing.imageUrl} alt="" loading="lazy"/> : <div className="av-thumb av-thumb-empty"/>}<div><strong>{listing.title}</strong><small>{vendor?.businessName || listing.vendorName || `Vendor ${listing.vendorId}`}</small></div></div>
      <div className="av-phone-meta"><span>{CATEGORIES.find((c)=>c.value===listing.category)?.label ?? listing.category} · {listing.city || "No city"}</span><b className={`av-status av-status-${listing.status}`}>{statusTitle(listing.status)}</b><span>{listing.priceAmount == null ? "Price unset" : formatPrice(listing.priceAmount, "LKR")}</span><span>{next ? `Next: ${formatVendorDate(next.date)} · ${formatVendorTime(next.startTime)}` : "No upcoming session"}</span></div>
      <div className="av-row-actions">
        {listing.status === "published" ? <button className="av-link-button av-danger-text" onClick={() => { setUnpublish(listing); setReason(""); setConfirmed(false); }}>Unpublish</button> : <button className="av-link-button" disabled={statusMutation.isPending || !listing.imageUrl || !next} onClick={() => statusMutation.mutate({id:listing.id,status:"published"})}>Publish</button>}
        <button className="av-link-button" onClick={() => navigate(`/admin/vendors/${listing.vendorId}?tab=listings&listing=${listing.id}`)}>Edit</button>
        <a className="av-icon-link" href={`/activity/${listing.id}`} target="_blank" rel="noreferrer" aria-label="View public listing"><ExternalLink size={15}/></a>
      </div>
    </article>;
  };

  return <main className="av-page">
    <header className="av-header"><div><p className="av-kicker">Catalog control</p><h1>Listings</h1><p>Keep public experiences accurate, bookable and easy to find.</p></div><span className="av-count">{listings.length} total</span></header>
    <section className="av-toolbar" aria-label="Listing search and filters">
      <label className="av-search"><Search size={17}/><span className="sr-only">Search listings</span><input value={search} onChange={(e)=>{setSearch(e.target.value);setPage(0);}} placeholder="Search listings, vendors, city"/></label>
      <label className="av-select-wrap"><span className="sr-only">Category</span><select value={categoryFilter} onChange={(e)=>toggleFilter(setCategoryFilter,e.target.value)}><option value="all">All categories</option>{CATEGORIES.map((c)=><option value={c.value} key={c.value}>{c.label}</option>)}</select></label>
      <label className="av-select-wrap"><span className="sr-only">City</span><select value={cityFilter} onChange={(e)=>toggleFilter(setCityFilter,e.target.value)}><option value="all">All cities</option>{Array.from(new Set(listings.map((l)=>l.city).filter(Boolean))).sort().map((city)=><option key={city} value={city!}>{city}</option>)}</select></label>
      <div className="av-filter-chip-row" aria-label="Status filter">{[["all","All status"],["published","Published"],["draft","Draft"],["unpublished","Unpublished"]].map(([value,label])=><button key={value} className={`av-filter-chip${statusFilter===value?" is-selected":""}`} aria-pressed={statusFilter===value} onClick={()=>toggleFilter(setStatusFilter,value)}>{label}</button>)}<button className={`av-filter-chip${noSessionsOnly?" is-selected":""}`} aria-pressed={noSessionsOnly} onClick={()=>setNoSessionFilter(!noSessionsOnly)}>No sessions · next 14 days</button></div>
      <div className="av-filter-chip-row av-demo-chips" aria-label="Demo vendor filter">{[["all","All vendors"],["demo","Demo"],["live","Non-demo"]].map(([value,label])=><button key={value} className={`av-filter-chip${demoFilter===value?" is-selected":""}`} onClick={()=>toggleFilter(setDemoFilter,value)}>{label}</button>)}</div>
    </section>
    {statusMutation.isError && <div className="av-alert" role="alert"><strong>Listing status could not be updated.</strong><p>The current listing status is unchanged. Retry the action when ready.</p><button className="av-button av-button-soft" disabled={statusMutation.isPending || !statusMutation.variables} onClick={()=>statusMutation.variables && statusMutation.mutate(statusMutation.variables)}>Retry status change</button></div>}
    {noSessionsOnly && slotsStillLoading && <div className="av-alert" role="status"><p>Checking real availability for the next 14 days…</p></div>}
    {noSessionsOnly && slotsFailed && <div className="av-alert" role="alert"><p>Some session schedules could not be checked, so the no-sessions filter may be incomplete.</p><button className="av-button av-button-soft" onClick={()=>slotsQueries.forEach((query)=>{if(query.isError)void query.refetch();})}>Retry availability</button></div>}
    <section className="av-table-panel" aria-label="Listing results">
      <div className="av-table-scroll"><table className="av-table"><thead><tr><th>{sortHeading("title","Experience")}</th><th>{sortHeading("vendorName","Vendor")}</th><th>{sortHeading("category","Category")}</th><th>{sortHeading("city","City")}</th><th>{sortHeading("priceAmount","Price")}</th><th>{sortHeading("status","Status")}</th><th>Next session</th><th>Actions</th></tr></thead><tbody>{pageRows.map(row)}</tbody></table></div>
      <div className="av-phone-list">{pageRows.map(card)}</div>
       {!sorted.length && !(noSessionsOnly && slotsStillLoading) && <div className="av-empty"><h2>No matching listings</h2><p>Try clearing a filter or search term to see more of the catalog.</p><button className="av-button av-button-soft" onClick={()=>{setSearch("");setStatusFilter("all");setNoSessionsOnly(false);setCategoryFilter("all");setCityFilter("all");setDemoFilter("all");}}>Clear filters</button></div>}
      {!!sorted.length && <footer className="av-pagination"><span>{page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE,sorted.length)} of {sorted.length}</span><div><button aria-label="Previous page" disabled={!page} onClick={()=>setPage((p)=>Math.max(0,p-1))}><ChevronLeft size={17}/></button><span>Page {page+1} of {pages}</span><button aria-label="Next page" disabled={page+1>=pages} onClick={()=>setPage((p)=>Math.min(pages-1,p+1))}><ChevronRight size={17}/></button></div></footer>}
    </section>
    {unpublish && <div className="av-overlay" role="presentation"><section className="av-dialog" role="dialog" aria-modal="true" aria-labelledby="av-unpublish-title">
      <p className="av-kicker">Public visibility</p><h2 id="av-unpublish-title">Unpublish “{unpublish.title}”?</h2><p>This removes the experience from public discovery. Existing bookings are not changed. Reason is shared with the vendor by phone for now; it won’t be stored.</p>
      <label className="av-field"><span>Reason for unpublishing</span><textarea value={reason} maxLength={300} onChange={(e)=>setReason(e.target.value)} placeholder="Briefly record why this listing is coming down" required/></label>
      <label className="av-check"><input type="checkbox" checked={confirmed} onChange={(e)=>setConfirmed(e.target.checked)}/><span>I understand this listing will no longer be visible to guests.</span></label>
      <div className="av-dialog-actions"><button className="av-button av-button-soft" onClick={()=>setUnpublish(null)}>Keep published</button><button className="av-button av-button-danger" disabled={!reason.trim()||!confirmed||statusMutation.isPending} onClick={()=>statusMutation.mutate({id:unpublish.id,status:"unpublished"})}>{statusMutation.isPending?"Unpublishing…":"Unpublish listing"}</button></div>
    </section></div>}
  </main>;
}
