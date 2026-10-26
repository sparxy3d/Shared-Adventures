import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, RotateCcw, Store } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage, formatAdminDate, refreshAdmin, isDemoEmail } from "@/lib/admin";
import { AdminDialog } from "@/components/admin/dialog";
import { CredentialDialog, type LoginCredentials } from "@/components/admin/credential-dialog";
import { AdminTable, type AdminColumn } from "@/components/admin/table";
import { AdminError, AdminLoading } from "@/components/admin/states";
import { useToast } from "@/hooks/use-toast";
import { SUPPORTED_CITIES } from "@shared/catalog";

type Vendor = { id: number; businessName: string; ownerProfileId?: number; ownerName?: string; ownerEmail?: string; contactPhone?: string; city?: string; verificationStatus: string; live?: boolean; takingBookings: boolean; approvedAt?: string; listingCount?: number; publishedCount?: number; bookingsThisMonth?: number; };
type NewVendor = { businessName: string; contactName: string; contactEmail: string; contactPhone: string; city: string; description: string };
const initial: NewVendor = { businessName: "", contactName: "", contactEmail: "", contactPhone: "", city: "", description: "" };

export default function Vendors() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [credentials, setCredentials] = useState<LoginCredentials | null>(null);
  const [confirm, setConfirm] = useState<{ row: Vendor; action: "pause" | "reset" } | null>(null);
  const [filter, setFilter] = useState(new URLSearchParams(window.location.search).get("filter") ?? "all");
  const query = useQuery<Vendor[]>({ queryKey: ["/api/admin/vendors"], queryFn: async () => {
    const res = await fetch("/api/admin/vendors", { credentials: "include" });
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  } });
  const create = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/admin/vendors", {
      businessName: draft.businessName,
      contactName: draft.contactName,
      contactEmail: draft.contactEmail,
      contactPhone: draft.contactPhone.trim() || undefined,
      city: draft.city || undefined,
      description: draft.description.trim() || undefined,
    })).json(),
    onSuccess: async (result) => {
      await refreshAdmin(); setCreateOpen(false); setDraft(initial);
      if (result.login) setCredentials(result.login);
      else toast({ title: "Vendor created" });
    },
  });
  const changeStatus = useMutation({
    mutationFn: async ({ row, status }: { row: Vendor; status: "paused" | "approved" }) => apiRequest("POST", `/api/admin/vendors/${row.id}/${status === "paused" ? "pause" : "resume"}`, {}),
    onSuccess: async (_, variables) => { await refreshAdmin(); setConfirm(null); toast({ title: variables.status === "paused" ? "Vendor paused" : "Vendor resumed" }); },
  });
  const resetPassword = useMutation({
    mutationFn: async (row: Vendor) => (await apiRequest("POST", `/api/admin/members/${row.ownerProfileId}/reset-password`, {})).json() as Promise<{ temporaryPassword: string }>,
    onSuccess: (result, row) => { setConfirm(null); setCredentials({ email: row.ownerEmail ?? "", temporaryPassword: result.temporaryPassword }); },
  });
  const allRows = (query.data ?? []).filter((row) => ["approved", "paused", "rejected"].includes(row.verificationStatus));
  const rows = allRows.filter((row) => {
    if (filter === "live") return row.live;
    if (filter === "approved-not-live") return row.verificationStatus === "approved" && !row.live;
    if (filter === "paused") return row.verificationStatus === "paused";
    if (filter === "demo") return isDemoEmail(row.ownerEmail);
    return true;
  });
  const columns: AdminColumn<Vendor>[] = [
    { key: "businessName", label: "Vendor", sortValue: (row) => row.businessName, render: (row) => <Link href={`/admin/vendors/${row.id}`} className="ad-cell-title" style={{ textDecoration: "none" }}>{row.businessName}{isDemoEmail(row.ownerEmail) && <span className="ad-badge warm" style={{ marginLeft: 7 }}>Demo</span>}<div className="ad-cell-sub">{row.ownerName ?? "Owner"} · {row.ownerEmail ?? "Email unavailable"}</div></Link> },
    { key: "city", label: "City", sortValue: (row) => row.city ?? "" },
    { key: "verificationStatus", label: "Status", render: (row) => <span className={`ad-badge ${row.live ? "green" : row.verificationStatus === "paused" ? "red" : "warm"}`}>{row.live ? "Live" : row.verificationStatus}</span> },
    { key: "takingBookings", label: "Bookings", sortValue: (row) => row.takingBookings ? 1 : 0, render: (row) => <span className={`ad-badge ${row.takingBookings ? "green" : "warm"}`}>{row.takingBookings ? "Taking bookings" : "Offline"}</span> },
    { key: "listingCount", label: "Listings", sortValue: (row) => row.listingCount ?? 0, render: (row) => row.listingCount == null ? "Not available" : <>{row.listingCount} total <span className="ad-cell-sub">{row.publishedCount ?? "Not available"} published</span></> },
    { key: "bookingsThisMonth", label: "Bookings · month", sortValue: (row) => row.bookingsThisMonth ?? 0, render: (row) => row.bookingsThisMonth ?? "Not available" },
    { key: "approvedAt", label: "Approved", sortValue: (row) => row.approvedAt ?? "", render: (row) => formatAdminDate(row.approvedAt) },
    { key: "actions", label: "Actions", render: (row) => <div className="ad-row-actions">
      <Link className="ad-icon-button" href={`/admin/vendors/${row.id}`} aria-label={`Open ${row.businessName}`}><Store size={15} /></Link>
      {row.verificationStatus === "paused" ? <button className="ad-icon-button" title="Resume vendor" aria-label="Resume vendor" disabled={changeStatus.isPending} onClick={() => changeStatus.mutate({ row, status: "approved" })}><RotateCcw size={15} /></button> : row.verificationStatus === "approved" ? <button className="ad-icon-button" title="Pause vendor" aria-label="Pause vendor" disabled={changeStatus.isPending} onClick={() => setConfirm({ row, action: "pause" })}><span style={{ fontWeight: 800 }}>Ⅱ</span></button> : null}
      {row.ownerProfileId && <button className="ad-icon-button" title="Reset member password" aria-label="Reset member password" disabled={resetPassword.isPending} onClick={() => setConfirm({ row, action: "reset" })}><RotateCcw size={15} /></button>}
    </div> },
  ];
  if (query.isLoading) return <main className="ad-content"><div className="ad-page-head"><div><p className="ad-eyebrow">Partner network</p><h1>Vendors</h1></div></div><AdminLoading /></main>;
  if (query.isError) return <main className="ad-content"><div className="ad-page-head"><div><p className="ad-eyebrow">Partner network</p><h1>Vendors</h1></div></div><AdminError retry={() => query.refetch()} /></main>;
  const filterControls = <div className="ad-filter-chips">{[["all", "All"], ["live", "Live"], ["approved-not-live", "Approved · not live"], ["paused", "Paused"], ["demo", "Demo"]].map(([value, label]) => <button key={value} className={`ad-chip ${filter === value ? "selected" : ""}`} onClick={() => setFilter(value)}>{label}</button>)}</div>;
  return <main className="ad-content">
    <div className="ad-page-head"><div><p className="ad-eyebrow">Partner network</p><h1>Vendors</h1><p>Keep the people behind the listings moving forward.</p></div><button className="ad-button" onClick={() => setCreateOpen(true)}><Plus size={16} />Add vendor</button></div>
    <section className="ad-section ad-card"><div className="ad-section-head"><h2>Vendor directory</h2><span className="ad-badge">{rows.length} shown</span></div><AdminTable rows={rows} columns={columns} searchText={(row) => `${row.businessName} ${row.ownerName ?? ""} ${row.ownerEmail ?? ""} ${row.city ?? ""}`} filterControls={filterControls} />
      {(changeStatus.isError || resetPassword.isError) && <p className="ad-form-error" role="alert">{errorMessage(changeStatus.error ?? resetPassword.error)}</p>}
      {!rows.length && <div className="ad-state" style={{ padding: "24px 12px" }}><div className="ad-state-mark"><Store size={17} /></div><h2>{allRows.length ? "No vendors in this view" : "Start your partner directory"}</h2><p>{allRows.length ? "Try another filter or clear the current view to find a vendor." : "Vendor accounts and their live status will appear here as the network grows."}</p><button className="ad-button secondary" onClick={() => allRows.length ? setFilter("all") : setCreateOpen(true)}>{allRows.length ? "Show all vendors" : "Add first vendor"}</button></div>}
    </section>
    {createOpen && <AdminDialog title="Create vendor account" onClose={() => { if (!create.isPending) { setCreateOpen(false); create.reset(); } }}>
      <p style={{ color: "#70817a", fontSize: 12, lineHeight: 1.6 }}>The owner will receive a one-time password. Share it directly after the account is created.</p>
      <form onSubmit={(event) => { event.preventDefault(); create.mutate(); }}>
        <div className="ad-form-grid">
          {[["businessName", "Business name", true], ["contactName", "Contact name", true], ["contactEmail", "Contact email", true], ["contactPhone", "Contact phone", false]].map(([key, label, required]) => <div className="ad-field" key={key as string}><label htmlFor={`vendor-${key}`}>{label}{required ? " *" : ""}</label><input className="ad-input" id={`vendor-${key}`} type={key === "contactEmail" ? "email" : "text"} required={required as boolean} value={draft[key as keyof NewVendor]} onChange={(event) => setDraft((old) => ({ ...old, [key as keyof NewVendor]: event.target.value }))} /></div>)}
          <div className="ad-field"><label htmlFor="vendor-city">City</label><select className="ad-select" id="vendor-city" value={draft.city} onChange={(event) => setDraft((old) => ({ ...old, city: event.target.value }))}><option value="">Select a city (optional)</option>{SUPPORTED_CITIES.map((city) => <option key={city.name}>{city.name}</option>)}</select></div>
          <div className="ad-field" style={{ gridColumn: "1 / -1" }}><label htmlFor="vendor-description">Business description</label><textarea className="ad-textarea" id="vendor-description" value={draft.description} onChange={(event) => setDraft((old) => ({ ...old, description: event.target.value }))} /></div>
        </div>
        {create.isError && <p className="ad-form-error" role="alert">{errorMessage(create.error)}</p>}
        <div className="ad-dialog-actions"><button type="button" className="ad-button secondary" disabled={create.isPending} onClick={() => setCreateOpen(false)}>Cancel</button><button className="ad-button" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create vendor"}</button></div>
      </form>
    </AdminDialog>}
    {confirm && <AdminDialog title={confirm.action === "pause" ? "Pause this vendor?" : "Reset owner password?"} onClose={() => setConfirm(null)}>
      <p style={{ color: "#70817a", fontSize: 13, lineHeight: 1.6 }}>{confirm.action === "pause" ? `${confirm.row.businessName} will no longer be able to take new bookings while paused.` : `A new temporary password will replace the current password for ${confirm.row.ownerEmail ?? "this owner"}.`}</p>
      {(changeStatus.isError || resetPassword.isError) && <p className="ad-form-error" role="alert">{errorMessage(changeStatus.error ?? resetPassword.error)}</p>}
      <div className="ad-dialog-actions"><button className="ad-button secondary" onClick={() => setConfirm(null)}>Go back</button><button className="ad-button danger" disabled={changeStatus.isPending || resetPassword.isPending} onClick={() => confirm.action === "pause" ? changeStatus.mutate({ row: confirm.row, status: "paused" }) : resetPassword.mutate(confirm.row)}>{confirm.action === "pause" ? "Pause vendor" : "Reset password"}</button></div>
    </AdminDialog>}
    {credentials && <CredentialDialog login={credentials} onClose={() => setCredentials(null)} />}
  </main>;
}
