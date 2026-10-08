import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { ArrowLeft, Building2, CalendarDays, KeyRound, ListChecks, Save, ShieldCheck, Users } from "lucide-react";
import type { Experience, Vendor } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { applicationDetails, profilePayload } from "@/lib/vendor-listings";
import ListingEditor from "@/pages/vendor/listing-editor";
import VendorSchedule from "@/pages/vendor/schedule";
import VendorStats from "@/pages/vendor/stats";
import { AdminBookings } from "@/pages/admin/bookings";
import { CredentialDialog } from "@/components/admin/credential-dialog";
import "@/pages/admin/admin-vendor.css";

type DetailVendor = Vendor & {
  ownerId?: number; ownerEmail?: string | null; ownerName?: string | null; ownerPhone?: string | null;
  listingsCount?: number; bookingsThisMonth?: number; monthlyBookings?: number; approvedAt?: string | null;
};
type Tab = "profile" | "listings" | "schedule" | "bookings" | "stats";
const TABS: { id: Tab; label: string; icon: typeof Building2 }[] = [
  { id: "profile", label: "Profile", icon: Building2 },
  { id: "listings", label: "Listings", icon: ListChecks },
  { id: "schedule", label: "Schedule", icon: CalendarDays },
  { id: "bookings", label: "Bookings", icon: Users },
  { id: "stats", label: "Stats", icon: ShieldCheck },
];
const tabSet = new Set<Tab>(["profile", "listings", "schedule", "bookings", "stats"]);

export default function VendorDetail() {
  const params = useParams<{ id: string }>();
  const vendorId = Number(params.id);
  const [, navigate] = useLocation();
  const client = useQueryClient();
  const { toast } = useToast();
  const search = new URLSearchParams(window.location.search);
  const tabParam = search.get("tab") as Tab | null;
  const activeTab: Tab = tabParam && tabSet.has(tabParam) ? tabParam : "profile";
  const listingParam = search.get("listing");
  const adminListingId: number | "new" | undefined = listingParam === "new" ? "new" : listingParam && /^\d+$/.test(listingParam) ? Number(listingParam) : undefined;
  const vendorQuery = useQuery<DetailVendor>({ queryKey: ["/api/admin/vendors", vendorId] });
  const vendor = vendorQuery.data;
  const experiencesQuery = useQuery<Experience[]>({ queryKey: ["/api/admin/vendors", vendorId, "experiences"], enabled: activeTab === "listings" && !listingParam });
  const [profile, setProfile] = useState({ businessName: "", about: "", city: "", region: "", address: "", contactEmail: "", contactPhone: "" });
  const [initialized, setInitialized] = useState<number | null>(null);
  const [confirmation, setConfirmation] = useState<"pause" | "reset" | null>(null);
  const [credential, setCredential] = useState<{ email: string; temporaryPassword: string } | null>(null);

  useEffect(() => {
    if (!vendor || initialized === vendor.id) return;
    setProfile({
      businessName: vendor.businessName || "", about: applicationDetails(vendor.description).about,
      city: vendor.city || "", region: vendor.region || "", address: vendor.address || "",
      contactEmail: vendor.contactEmail || "", contactPhone: vendor.contactPhone || "",
    });
    setInitialized(vendor.id);
  }, [vendor, initialized]);

  const moveTab = (tab: Tab) => navigate(`/admin/vendors/${vendorId}?tab=${tab}`);
  const setListing = (listing?: number | "new") => navigate(`/admin/vendors/${vendorId}?tab=listings${listing === undefined ? "" : `&listing=${listing}`}`);
  const saveProfile = useMutation({
    mutationFn: () => {
      if (!vendor) throw new Error("Vendor not loaded");
      return apiRequest("PATCH", `/api/admin/vendors/${vendorId}`, profilePayload({
        ...vendor, businessName: profile.businessName, city: profile.city, region: profile.region,
        address: profile.address, contactEmail: profile.contactEmail, contactPhone: profile.contactPhone,
      }, profile.about));
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["/api/admin/vendors", vendorId] });
      await client.invalidateQueries({ queryKey: ["/api/admin/vendors"] });
      toast({ title: "Vendor profile saved" });
    },
    onError: () => toast({ title: "Couldn’t save vendor profile", description: "Your edits are still here. Retry when ready.", variant: "destructive" }),
  });
  const statusMutation = useMutation({
    mutationFn: (status: "paused" | "approved") => apiRequest("POST", `/api/admin/vendors/${vendorId}/${status === "paused" ? "pause" : "resume"}`),
    onSuccess: async (_data, status) => {
      await client.invalidateQueries({ queryKey: ["/api/admin/vendors", vendorId] });
      await client.invalidateQueries({ queryKey: ["/api/admin/vendors"] });
      toast({ title: status === "paused" ? "Vendor paused" : "Vendor resumed" });
      setConfirmation(null);
    },
    onError: () => toast({ title: "Vendor status was not changed", variant: "destructive" }),
  });
  const resetPassword = useMutation({
    mutationFn: async () => {
      if (!vendor?.ownerId) throw new Error("Vendor owner is unavailable");
      const response = await apiRequest("POST", `/api/admin/members/${vendor.ownerId}/reset-password`);
      return response.json() as Promise<{ email?: string; temporaryPassword?: string; password?: string }>;
    },
    onSuccess: (value) => {
      const temporaryPassword = value.temporaryPassword || value.password || "";
      if (!temporaryPassword) {
        toast({ title: "Password reset", description: "The reset completed, but no one-time credential was returned." });
        setConfirmation(null);
        return;
      }
      setCredential({ email: value.email || vendor?.ownerEmail || "", temporaryPassword });
      setConfirmation(null);
    },
    onError: () => toast({ title: "Couldn’t reset password", description: "The owner account was not changed.", variant: "destructive" }),
  });
  if (!Number.isInteger(vendorId) || vendorId <= 0) return <main className="av-page"><div className="av-alert" role="alert">Vendor record not found. <Link href="/admin/vendors">Return to vendors</Link></div></main>;
  if (vendorQuery.isLoading) return <main className="av-page"><div className="av-skeleton av-skel-title"/><div className="av-skeleton av-skel-panel"/></main>;
  if (vendorQuery.isError || !vendor) return <main className="av-page"><div className="av-alert" role="alert"><strong>Vendor couldn’t be opened.</strong><p>Try the vendor record again.</p><button className="av-button" onClick={()=>void vendorQuery.refetch()}>Retry</button></div></main>;

  const metadata = applicationDetails(vendor.description);
  const field = (key: keyof typeof profile, label: string, full = false) => <label className={`av-field${full ? " av-field-full" : ""}`} key={key}><span>{label}</span><input value={profile[key]} maxLength={key === "businessName" ? 120 : undefined} onChange={(event)=>setProfile((current)=>({...current,[key]:event.target.value}))}/></label>;

  return <main className="av-page av-detail">
    <Link className="av-back" href="/admin/vendors"><ArrowLeft size={16}/> Vendors</Link>
    <header className="av-header av-vendor-heading"><div><p className="av-kicker">Vendor record · #{vendor.id}</p><h1>{vendor.businessName}</h1><p>{vendor.city || "City not set"}{vendor.region ? ` · ${vendor.region}` : ""} · {vendor.ownerEmail || "Owner email unavailable"}</p></div><span className={`av-status av-status-${vendor.verificationStatus}`}>{vendor.verificationStatus}</span></header>
    <aside className="av-admin-banner"><ShieldCheck size={18}/><div><strong>Admin editing</strong><span>Changes here affect the vendor’s live account and catalog.</span></div>
      {vendor.verificationStatus === "paused" ? <button className="av-button av-button-soft" onClick={()=>statusMutation.mutate("approved")} disabled={statusMutation.isPending}>Resume vendor</button> : <button className="av-button av-button-soft" onClick={()=>setConfirmation("pause")} disabled={statusMutation.isPending}>Pause vendor</button>}
      <button className="av-button av-button-soft" onClick={()=>setConfirmation("reset")}><KeyRound size={15}/>Reset password</button>
    </aside>
    <nav className="av-tabs" aria-label="Vendor detail sections">{TABS.map(({id,label,icon:Icon})=><button key={id} className={activeTab===id?"is-active":""} aria-current={activeTab===id?"page":undefined} onClick={()=>moveTab(id)}><Icon size={16}/>{label}</button>)}</nav>

    {activeTab === "profile" && <section className="av-section">
      <div className="av-section-heading"><div><p className="av-kicker">Business record</p><h2>Profile</h2><p>Public business details and owner contact channels.</p></div><span className="av-record-mark">FS / {String(vendor.id).padStart(3,"0")}</span></div>
      <form className="av-profile-form" onSubmit={(event)=>{event.preventDefault();saveProfile.mutate();}}>
        {field("businessName","Business name")}{field("city","City")}{field("region","Region")}{field("address","Business address",true)}
        {field("contactEmail","Business contact email")}{field("contactPhone","Business contact phone")}
        <label className="av-field av-field-full"><span>About the business</span><textarea rows={5} maxLength={4000} value={profile.about} onChange={(e)=>setProfile((value)=>({...value,about:e.target.value}))}/><small>Application and accepted-terms metadata is preserved when saving.</small></label>
        <div className="av-form-actions"><button className="av-button" type="submit" disabled={saveProfile.isPending||!profile.businessName.trim()}><Save size={16}/>{saveProfile.isPending?"Saving…":"Save profile"}</button></div>
      </form>
      <section className="av-metadata"><h3>Application record · preserved</h3><div className="av-meta-grid"><div><small>Terms version</small><strong>{metadata.termsVersion}</strong></div><div><small>Accepted</small><strong>{metadata.termsDate}</strong></div><div><small>Approval date</small><strong>{vendor.approvedAt ? new Date(vendor.approvedAt).toLocaleDateString("en-LK",{dateStyle:"medium",timeZone:"Asia/Colombo"}) : "Not recorded"}</strong></div><div><small>Original application</small><p>{metadata.metadata}</p></div></div></section>
    </section>}

    {activeTab === "listings" && <section className="av-section">
      {listingParam ? <ListingEditor adminVendorId={vendorId} adminListingId={adminListingId ?? "new"} backHref={`/admin/vendors/${vendorId}?tab=listings`}/> : <>
        <div className="av-section-heading"><div><p className="av-kicker">Catalog</p><h2>Listings</h2><p>{experiencesQuery.data?.length ?? 0} experiences attached to this vendor.</p></div><button className="av-button" onClick={()=>setListing("new")}>Add listing</button></div>
        {experiencesQuery.isLoading ? <div className="av-skeleton av-skel-table"/> : experiencesQuery.isError ? <div className="av-alert" role="alert">Vendor listings couldn’t be loaded. <button className="av-link-button" onClick={()=>void experiencesQuery.refetch()}>Retry</button></div> : experiencesQuery.data?.length ? <div className="av-vendor-listings">{experiencesQuery.data.map((experience)=><article className="av-vendor-listing" key={experience.id}>
          {experience.imageUrl ? <img src={experience.imageUrl} alt="" loading="lazy"/> : <div className="av-thumb av-thumb-empty"/>}
          <div className="av-vendor-listing-copy"><strong>{experience.title}</strong><span>{experience.category} · {experience.city || "No city"}</span></div>
          <span className={`av-status av-status-${experience.status}`}>{experience.status}</span>
          <button className="av-button av-button-soft" onClick={()=>setListing(experience.id)}>Edit listing</button>
        </article>)}</div> : <div className="av-empty"><h3>No listings yet</h3><p>Add the vendor’s first experience to begin building their catalog.</p><button className="av-button" onClick={()=>setListing("new")}>Add listing</button></div>}
      </>}
    </section>}
    {activeTab === "schedule" && <section className="av-embedded"><VendorSchedule adminVendorId={vendorId}/></section>}
    {activeTab === "stats" && <section className="av-embedded"><VendorStats adminVendorId={vendorId}/></section>}
    {activeTab === "bookings" && <section className="av-bookings-shared"><AdminBookings vendorId={vendorId}/></section>}
    {confirmation && <div className="av-overlay"><section className="av-dialog" role="dialog" aria-modal="true" aria-labelledby="av-vendor-confirm-title"><p className="av-kicker">Confirm action</p><h2 id="av-vendor-confirm-title">{confirmation==="pause"?"Pause this vendor?":"Reset owner password?"}</h2><p>{confirmation==="pause"?"Pausing hides this vendor’s published listings and prevents new activity.":"A new one-time password will replace the owner’s current password."}</p><div className="av-dialog-actions"><button className="av-button av-button-soft" onClick={()=>setConfirmation(null)}>Cancel</button><button className="av-button av-button-danger" disabled={statusMutation.isPending||resetPassword.isPending} onClick={()=>confirmation==="pause"?statusMutation.mutate("paused"):resetPassword.mutate()}>{confirmation==="pause"?(statusMutation.isPending?"Pausing…":"Pause vendor"):(resetPassword.isPending?"Resetting…":"Reset password")}</button></div></section></div>}
    {credential && <CredentialDialog login={{email:credential.email,temporaryPassword:credential.temporaryPassword}} onClose={()=>setCredential(null)}/>}
  </main>;
}
