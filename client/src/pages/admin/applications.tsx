import { useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ExternalLink, Mail, MessageCircle, Phone, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { applicationFields, errorMessage, formatAdminDate, refreshAdmin } from "@/lib/admin";
import { formatPrice } from "@/lib/currency";
import { AdminTable } from "@/components/admin/table";
import type { AdminColumn } from "@/components/admin/table";
import { AdminDialog } from "@/components/admin/dialog";
import { CredentialDialog, type LoginCredentials } from "@/components/admin/credential-dialog";
import { AdminError, AdminLoading } from "@/components/admin/states";
import VendorDocuments from "@/components/admin/vendor-documents";
import { useToast } from "@/hooks/use-toast";

type Application = { id: number; businessName?: string; ownerName?: string; ownerEmail?: string; ownerPhone?: string; contactEmail?: string; contactPhone?: string; address?: string; city?: string; category?: string; description?: string; verificationStatus: string; createdAt?: string; approvedAt?: string; applicationDescription?: string; };
export default function Applications() {
  const { toast } = useToast();
  const [declining, setDeclining] = useState<Application | null>(null);
  const [details, setDetails] = useState<Application | null>(null);
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState(new URLSearchParams(window.location.search).get("filter") ?? "all");
  const [credentials, setCredentials] = useState<LoginCredentials | null>(null);
  const query = useQuery<Application[]>({ queryKey: ["/api/admin/vendors"], queryFn: async () => {
    const response = await fetch("/api/admin/vendors", { credentials: "include" });
    if (!response.ok) throw new Error(String(response.status));
    return response.json();
  } });
  const action = useMutation({
    mutationFn: async ({ row, status, declineReason }: { row: Application; status: string; declineReason?: string }) => {
      if (status === "contacted") { await apiRequest("POST", `/api/admin/vendors/${row.id}/contacted`, {}); return null; }
      const response = status === "rejected"
        ? await apiRequest("POST", `/api/admin/vendors/${row.id}/decline`, { reason: declineReason })
        : await apiRequest("POST", `/api/admin/vendors/${row.id}/approve`, {});
      return response.json();
    },
    onSuccess: async (result, variables) => {
      await refreshAdmin();
      if (variables.status === "approved" && result?.login) setCredentials(result.login);
      else toast({ title: variables.status === "approved" ? "Application approved" : variables.status === "contacted" ? "Marked as contacted" : "Application declined" });
      setDeclining(null); setReason("");
    },
  });
  const pipeline = (query.data ?? []).filter((row) => ["pending", "contacted", "rejected"].includes(row.verificationStatus));
  const rows = pipeline.filter((row) => filter === "all" || (filter === "waiting" ? ["pending", "contacted"].includes(row.verificationStatus) : filter === "new" ? row.verificationStatus === "pending" : row.verificationStatus === filter));
  const columns: AdminColumn<Application>[] = [
    { key: "businessName", label: "Business / owner", sortValue: (row) => row.businessName ?? row.ownerName ?? "", render: (row) => { const fields = applicationFields(row.description ?? row.applicationDescription ?? ""); return <><button className="ad-business-trigger" onClick={() => setDetails(row)}>{row.businessName ?? fields.businessName ?? "Business application"}</button><div className="ad-cell-sub">{row.ownerName ?? fields.contactName ?? "Owner details pending"}</div></>; } },
    { key: "contact", label: "Contact", sortValue: (row) => row.contactEmail ?? row.ownerEmail ?? "", render: (row) => { const fields = applicationFields(row.description ?? row.applicationDescription ?? ""); const email = row.contactEmail ?? row.ownerEmail ?? fields.ownerEmail; const phone = row.contactPhone ?? row.ownerPhone ?? fields.ownerPhone; return <><div>{email || "Not provided"}</div>{phone && <div className="ad-cell-sub">{phone}</div>}</>; } },
    { key: "location", label: "City / category", sortValue: (row) => row.city ?? "", render: (row) => { const fields = applicationFields(row.applicationDescription ?? row.description ?? ""); return <>{row.city ?? fields.city ?? "Not provided"}<div className="ad-cell-sub">{row.category ?? fields.category ?? "Not provided"}</div></>; } },
    { key: "application", label: "Application", sortValue: (row) => applicationFields(row.description ?? row.applicationDescription ?? "").description, render: (row) => { const description = applicationFields(row.description ?? row.applicationDescription ?? "").description; return <span title={description} style={{ display: "block", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{description || "Not provided"}</span>; } },
    { key: "terms", label: "Terms accepted", sortValue: (row) => applicationFields(row.description ?? row.applicationDescription ?? "").termsAcceptedAt ?? "", render: (row) => formatAdminDate(applicationFields(row.description ?? row.applicationDescription ?? "").termsAcceptedAt, true) },
    { key: "status", label: "Status", render: (row) => <span className={`ad-badge ${row.verificationStatus === "pending" ? "warm" : row.verificationStatus === "rejected" ? "red" : "blue"}`}>{row.verificationStatus === "pending" ? "New" : row.verificationStatus === "rejected" ? "Declined" : "Contacted"}</span> },
    { key: "actions", label: "Actions", render: (row) => { const fields = applicationFields(row.description ?? row.applicationDescription ?? ""); const phone = row.contactPhone ?? row.ownerPhone ?? fields.ownerPhone; const email = row.contactEmail ?? row.ownerEmail ?? fields.ownerEmail; return <div className="ad-row-actions">
      {email && <a className="ad-icon-button" href={`mailto:${email}`} aria-label={`Email ${row.businessName ?? "applicant"}`}><Mail size={15} /></a>}
      {phone && <a className="ad-icon-button" href={`tel:${phone}`} aria-label={`Call ${row.businessName ?? "applicant"}`}><Phone size={15} /></a>}
      {phone && <a className="ad-icon-button" href={`https://wa.me/${phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" aria-label="Open WhatsApp"><MessageCircle size={15} /></a>}
      {row.verificationStatus === "pending" && <button className="ad-icon-button" title="Mark contacted" aria-label="Mark contacted" disabled={action.isPending} onClick={() => action.mutate({ row, status: "contacted" })}><Phone size={15} /></button>}
      {row.verificationStatus !== "rejected" && <button className="ad-icon-button" title="Approve" aria-label="Approve application" disabled={action.isPending} onClick={() => action.mutate({ row, status: "approved" })}><Check size={15} /></button>}
      {row.verificationStatus !== "rejected" && <button className="ad-icon-button" title="Decline" aria-label="Decline application" disabled={action.isPending} onClick={() => setDeclining(row)}><X size={15} /></button>}
    </div>; } },
  ];
  if (query.isLoading) return <main className="ad-content"><div className="ad-page-head"><div><p className="ad-eyebrow">Vendor pipeline</p><h1>Applications</h1></div></div><AdminLoading /></main>;
  if (query.isError) return <main className="ad-content"><div className="ad-page-head"><div><p className="ad-eyebrow">Vendor pipeline</p><h1>Applications</h1></div></div><AdminError retry={() => query.refetch()} /></main>;
  return <main className="ad-content">
    <div className="ad-page-head"><div><p className="ad-eyebrow">Vendor pipeline</p><h1>Applications</h1><p>Every new partnership starts with a thoughtful reply.</p></div></div>
    <div className="ad-banner"><strong>Internal notes are disabled until go-live.</strong> Notes cannot be saved or shared yet.</div>
    <section className="ad-section ad-card"><div className="ad-section-head"><h2>Applicant records</h2><span className="ad-badge">{rows.length} applications</span></div>
      <AdminTable rows={rows} columns={columns} searchText={(row) => Object.values(row).join(" ")} filterControls={<div className="ad-filter-chips">{[["all", `All · ${pipeline.length}`], ["waiting", `Waiting · ${pipeline.filter((r) => ["pending", "contacted"].includes(r.verificationStatus)).length}`], ["new", `New · ${pipeline.filter((r) => r.verificationStatus === "pending").length}`], ["contacted", `Contacted · ${pipeline.filter((r) => r.verificationStatus === "contacted").length}`], ["rejected", `Declined · ${pipeline.filter((r) => r.verificationStatus === "rejected").length}`]].map(([value, label]) => <button key={value} className={`ad-chip ${filter === value ? "selected" : ""}`} onClick={() => setFilter(value)}>{label}</button>)}</div>} />
      {action.isError && <div className="ad-form-error" role="alert">{errorMessage(action.error)} <button className="ad-button secondary" onClick={() => action.reset()}>Dismiss</button></div>}
      {!rows.length && <div className="ad-state" style={{ padding: "24px 12px" }}><div className="ad-state-mark"><Check size={18} /></div><h2>{pipeline.length ? "No applications in this view" : "No applications yet"}</h2><p>{pipeline.length ? "Choose another application status to see more records." : "New vendor applications will appear here when they are submitted."}</p><button className="ad-button secondary" onClick={() => pipeline.length ? setFilter("all") : query.refetch()}>{pipeline.length ? "Show all applications" : "Refresh applications"}</button></div>}
    </section>
    {declining && <AdminDialog title="Decline application" onClose={() => { setDeclining(null); setReason(""); }}>
      <p style={{ color: "#70817a", fontSize: 13, lineHeight: 1.5 }}>This decision will be recorded for {declining.businessName ?? "this applicant"}. Give a reason before continuing.</p>
      <div className="ad-field"><label htmlFor="application-decline-reason">Reason *</label><textarea className="ad-textarea" id="application-decline-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} /></div>
      {action.isError && <p className="ad-form-error" role="alert">{errorMessage(action.error)}</p>}
      <div className="ad-dialog-actions"><button className="ad-button secondary" onClick={() => setDeclining(null)}>Keep application</button><button className="ad-button danger" disabled={!reason.trim() || action.isPending} onClick={() => action.mutate({ row: declining, status: "rejected", declineReason: reason.trim() })}>{action.isPending ? "Declining…" : "Decline application"}</button></div>
    </AdminDialog>}
    {details && (() => {
      const fields = applicationFields(details.description ?? details.applicationDescription ?? "");
      const email = details.contactEmail ?? details.ownerEmail ?? fields.ownerEmail;
      const phone = details.contactPhone ?? details.ownerPhone ?? fields.ownerPhone;
      const mapHref = fields.mapsLink ? (/^https?:\/\//i.test(fields.mapsLink) ? fields.mapsLink : `https://${fields.mapsLink}`) : "";
      const detailRows: Array<{ label: string; value: ReactNode }> = [
        { label: "Business", value: details.businessName ?? "Not provided" },
        { label: "Contact name", value: details.ownerName ?? fields.contactName ?? "Not provided" },
        { label: "Contact email", value: email || "Not provided" },
        { label: "Mobile", value: phone || "Not provided" },
        { label: "City", value: details.city ?? "Not provided" },
        { label: "Address", value: details.address || "Not provided" },
        { label: "Activity types", value: fields.category || details.category || "Not provided" },
        { label: "Typical group sizes", value: fields.groupSizes.join(", ") || "Not provided" },
        { label: "Typical price", value: /^LKR \d+$/i.test(fields.typicalPrice) ? formatPrice(Number(fields.typicalPrice.slice(4)), "LKR") : fields.typicalPrice || "Not provided" },
        { label: "Google Maps", value: mapHref ? <a href={mapHref} target="_blank" rel="noreferrer">Open map <ExternalLink size={13} /></a> : "Not provided" },
        { label: "Application description", value: fields.description || "Not provided" },
        { label: "Vendor terms", value: fields.termsVersion || "Not provided" },
        { label: "Terms accepted", value: formatAdminDate(fields.termsAcceptedAt, true) },
        { label: "Application status", value: details.verificationStatus === "pending" ? "New" : details.verificationStatus === "contacted" ? "Contacted" : "Declined" },
        { label: "Submitted", value: formatAdminDate(details.createdAt, true) },
      ];
      return <AdminDialog title={details.businessName ?? "Application details"} onClose={() => setDetails(null)}>
        <div className="ad-detail-list">{detailRows.map((item) => <div className="ad-detail-row" key={item.label}><span className="ad-detail-label">{item.label}</span><div className="ad-detail-value">{item.value}</div></div>)}</div>
        <VendorDocuments vendorId={details.id} />
        <div className="ad-dialog-actions"><button className="ad-button secondary" disabled aria-disabled="true">Internal notes are disabled until go-live.</button><button className="ad-button" onClick={() => setDetails(null)}>Close</button></div>
      </AdminDialog>;
    })()}
    {credentials && <CredentialDialog login={credentials} onClose={() => setCredentials(null)} />}
  </main>;
}
