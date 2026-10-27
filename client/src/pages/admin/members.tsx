import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage, formatAdminDate, refreshAdmin } from "@/lib/admin";
import { AdminDialog } from "@/components/admin/dialog";
import { CredentialDialog, type LoginCredentials } from "@/components/admin/credential-dialog";
import { AdminTable, type AdminColumn } from "@/components/admin/table";
import { AdminError, AdminLoading } from "@/components/admin/states";
import { useAuth } from "@/hooks/use-auth";
import { isDisabledRole } from "@shared/catalog";
import { useToast } from "@/hooks/use-toast";

type Member = { id: number; fullName?: string; name?: string; email: string; mobile?: string; phone?: string; role: string; joinedAt?: string; createdAt?: string; bookingsCount?: number; bookingCount?: number; hasLogin?: boolean; vendorId?: number | null; hasVendor?: boolean };
type NewAccount = { fullName: string; email: string; role: "admin" | "customer" };
type CreatedAccount = { user: Member; login: LoginCredentials };
type Pending = { row: Member; action: "disable" | "enable" | "reset" | "role"; role?: "customer" | "vendor" | "admin" };
function baseRole(role: string) { return role.replace(/^disabled:/, ""); }

export default function Members() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [pending, setPending] = useState<Pending | null>(null);
  const [credentials, setCredentials] = useState<LoginCredentials | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newAccount, setNewAccount] = useState<NewAccount>({ fullName: "", email: "", role: "customer" });
  const [filter, setFilter] = useState(new URLSearchParams(window.location.search).get("filter") ?? "all");
  const query = useQuery<Member[]>({ queryKey: ["/api/admin/members"], queryFn: async () => {
    const res = await fetch("/api/admin/members", { credentials: "include" });
    if (!res.ok) throw new Error(String(res.status));
    return res.json();
  } });
  const action = useMutation({
    mutationFn: async (task: Pending) => {
      if (task.action === "reset") return (await apiRequest("POST", `/api/admin/members/${task.row.id}/reset-password`, {})).json() as Promise<{ temporaryPassword: string }>;
      if (task.action === "role") return apiRequest("PATCH", `/api/admin/members/${task.row.id}/role`, { role: task.role });
      if (task.action === "disable") return apiRequest("POST", `/api/admin/members/${task.row.id}/disable`, {});
      return apiRequest("POST", `/api/admin/members/${task.row.id}/enable`, {});
    },
    onSuccess: async (result, variables) => {
      if (variables.action === "reset" && "temporaryPassword" in (result as object)) {
        setCredentials({ email: variables.row.email, temporaryPassword: (result as { temporaryPassword: string }).temporaryPassword });
      } else {
        await refreshAdmin();
        toast({ title: variables.action === "role" ? "Member role updated" : variables.action === "disable" ? "Member disabled" : "Member enabled" });
      }
      setPending(null);
    },
  });
  const createAccount = useMutation({
    mutationFn: async (account: NewAccount) => (await apiRequest("POST", "/api/admin/members", account)).json() as Promise<CreatedAccount>,
    onSuccess: async (result) => {
      await refreshAdmin();
      await query.refetch();
      setCreateOpen(false);
      setNewAccount({ fullName: "", email: "", role: "customer" });
      setCredentials(result.login);
      toast({ title: "Account created", description: "Share the temporary password securely. The new user must change it at sign-in." });
    },
  });
  const allRows = query.data ?? [];
  const isRealMember = (row: Member) => baseRole(row.role) === "customer" && !!row.hasLogin;
  const rows = allRows.filter((row) => filter === "all" || (filter === "enabled" ? !isDisabledRole(row.role) : filter === "disabled" ? isDisabledRole(row.role) : filter === "real" ? isRealMember(row) : filter === "placeholders" ? !row.hasLogin : false));
  const columns: AdminColumn<Member>[] = [
    { key: "fullName", label: "Member", sortValue: (row) => row.fullName ?? row.name ?? "", render: (row) => <><div className="ad-cell-title">{row.fullName ?? row.name ?? "Member"}</div><div className="ad-cell-sub">{row.email}</div></> },
    { key: "mobile", label: "Mobile", sortValue: (row) => row.mobile ?? row.phone ?? "", render: (row) => row.mobile ?? row.phone ?? "—" },
    { key: "role", label: "Role", render: (row) => <span className="ad-badge blue">{baseRole(row.role) === "customer" ? "Member" : baseRole(row.role) === "admin" ? "Admin" : "Vendor"}</span> },
    { key: "joinedAt", label: "Joined", sortValue: (row) => row.joinedAt ?? row.createdAt ?? "", render: (row) => formatAdminDate(row.joinedAt ?? row.createdAt) },
    { key: "bookingsCount", label: "Bookings", sortValue: (row) => row.bookingsCount ?? row.bookingCount ?? 0, render: (row) => row.bookingsCount ?? row.bookingCount ?? "—" },
    { key: "status", label: "Status", sortValue: (row) => row.hasLogin ? isDisabledRole(row.role) ? "Disabled" : "Active" : "Applicant, no login yet", render: (row) => <span className={`ad-badge ${!row.hasLogin ? "warm" : isDisabledRole(row.role) ? "red" : "green"}`}>{!row.hasLogin ? "Applicant, no login yet" : isDisabledRole(row.role) ? "Disabled" : "Active"}</span> },
    { key: "actions", label: "Actions", render: (row) => {
      const self = row.id === user?.id;
      const disabled = isDisabledRole(row.role);
      return <div className="ad-row-actions">
        {row.hasLogin && <button className="ad-icon-button" title="Reset password" aria-label="Reset password" disabled={action.isPending} onClick={() => setPending({ row, action: "reset" })}>↻</button>}
        <button className="ad-icon-button" title={disabled ? "Enable member" : "Disable member"} aria-label={disabled ? "Enable member" : "Disable member"} disabled={self || action.isPending} onClick={() => setPending({ row, action: disabled ? "enable" : "disable" })}>{disabled ? "✓" : "Ⅱ"}</button>
        {!self && <select className="ad-select" aria-label={`Change role for ${row.fullName ?? row.email}`} style={{ width: 120, minHeight: 44, padding: "0 7px", fontSize: 13 }} value={baseRole(row.role)} disabled={action.isPending} onChange={(event) => setPending({ row, action: "role", role: event.target.value as "customer" | "vendor" | "admin" })}>
          <option value="customer">Member</option><option value="vendor">Vendor</option><option value="admin">Admin</option>
        </select>}
      </div>;
    } },
  ];
  if (query.isLoading) return <main className="ad-content"><div className="ad-page-head"><div><p className="ad-eyebrow">Community accounts</p><h1>Members</h1></div></div><AdminLoading /></main>;
  if (query.isError) return <main className="ad-content"><div className="ad-page-head"><div><p className="ad-eyebrow">Community accounts</p><h1>Members</h1></div></div><AdminError retry={() => query.refetch()} /></main>;
  return <main className="ad-content"><div className="ad-page-head"><div><p className="ad-eyebrow">Community accounts</p><h1>Members</h1><p>Account access and participation, kept in one place.</p></div><button className="ad-button" onClick={() => { createAccount.reset(); setCreateOpen(true); }}>Create account</button></div>
    <section className="ad-section ad-card"><div className="ad-section-head"><h2>Member directory</h2><span className="ad-badge">{rows.length} accounts</span></div>
      <AdminTable rows={rows} columns={columns} searchText={(row) => Object.values(row).join(" ")} filterControls={<div className="ad-filter-chips">{[["all", `All · ${allRows.length}`], ["real", `Real members · ${allRows.filter(isRealMember).length}`], ["enabled", `Enabled · ${allRows.filter((row) => !isDisabledRole(row.role)).length}`], ["disabled", `Disabled · ${allRows.filter((row) => isDisabledRole(row.role)).length}`], ["placeholders", `Placeholders · ${allRows.filter((row) => !row.hasLogin).length}`]].map(([value, label]) => <button className={`ad-chip ${filter === value ? "selected" : ""}`} key={value} onClick={() => setFilter(value)}>{label}</button>)}</div>} />
      {action.isError && <p className="ad-form-error" role="alert">{errorMessage(action.error)} <button className="ad-button secondary" onClick={() => action.reset()}>Dismiss</button></p>}
      {!rows.length && <div className="ad-state" style={{ padding: "24px 12px" }}><div className="ad-state-mark"><span style={{ fontSize: 18 }}>·</span></div><h2>{allRows.length ? "No members in this view" : "No members yet"}</h2><p>{allRows.length ? "Choose another status to find the account you need." : "Member accounts will appear here after the first sign-up."}</p><button className="ad-button secondary" onClick={() => allRows.length ? setFilter("all") : query.refetch()}>{allRows.length ? "Show all members" : "Refresh members"}</button></div>}
    </section>
    {createOpen && <AdminDialog title="Create account" onClose={() => { if (!createAccount.isPending) { setCreateOpen(false); createAccount.reset(); } }}>
      <p style={{ color: "#70817a", fontSize: 13, lineHeight: 1.6 }}>Create a member or admin login. They will receive a temporary password and must change it when they sign in.</p>
      <form onSubmit={(event) => { event.preventDefault(); createAccount.mutate({ fullName: newAccount.fullName.trim(), email: newAccount.email.trim(), role: newAccount.role }); }}>
        <div className="ad-form-grid">
          <div className="ad-field"><label htmlFor="new-account-name">Full name</label><input className="ad-input" id="new-account-name" name="fullName" autoComplete="name" required maxLength={120} value={newAccount.fullName} onChange={(event) => setNewAccount((current) => ({ ...current, fullName: event.target.value }))} /></div>
          <div className="ad-field"><label htmlFor="new-account-email">Email</label><input className="ad-input" id="new-account-email" name="email" type="email" autoComplete="email" required value={newAccount.email} onChange={(event) => setNewAccount((current) => ({ ...current, email: event.target.value }))} /></div>
          <div className="ad-field"><label htmlFor="new-account-role">Role</label><select className="ad-select" id="new-account-role" value={newAccount.role} onChange={(event) => setNewAccount((current) => ({ ...current, role: event.target.value as NewAccount["role"] }))}><option value="customer">Member</option><option value="admin">Admin</option></select><small style={{ color: "#78847d", fontSize: 11 }}>Vendor accounts are created from Vendors.</small></div>
        </div>
        {createAccount.isError && <p className="ad-form-error" role="alert">Account could not be created. {errorMessage(createAccount.error)} Please correct the details or retry.</p>}
        <div className="ad-dialog-actions"><button type="button" className="ad-button secondary" disabled={createAccount.isPending} onClick={() => { setCreateOpen(false); createAccount.reset(); }}>Cancel</button><button className="ad-button" disabled={createAccount.isPending}>{createAccount.isPending ? "Creating…" : "Create account"}</button></div>
      </form>
    </AdminDialog>}
    {pending && <AdminDialog title={pending.action === "disable" ? "Disable this member?" : pending.action === "enable" ? "Enable this member?" : pending.action === "reset" ? "Reset this member’s password?" : "Change member role?"} onClose={() => { setPending(null); action.reset(); }}>
      <p style={{ color: "#70817a", fontSize: 13, lineHeight: 1.6 }}>
        {pending.action === "disable" ? `${pending.row.fullName ?? pending.row.email} will no longer be able to sign in.` :
          pending.action === "enable" ? `${pending.row.fullName ?? pending.row.email} will be able to sign in again.` :
            pending.action === "reset" ? "The current password will be replaced with a one-time password." :
            pending.role === "vendor" ? `A vendor role requires an existing vendor record owned by ${pending.row.fullName ?? pending.row.email}. The role change will be rejected if no matching record exists.` : `Change ${pending.row.fullName ?? pending.row.email} to the member role?`}
      </p>
      {action.isError && <p className="ad-form-error" role="alert">{errorMessage(action.error)}</p>}
      <div className="ad-dialog-actions"><button className="ad-button secondary" onClick={() => setPending(null)}>Go back</button><button className={`ad-button ${pending.action === "disable" || pending.action === "reset" ? "danger" : ""}`} disabled={action.isPending} onClick={() => action.mutate(pending)}>{action.isPending ? "Saving…" : pending.action === "role" ? "Change role" : pending.action === "disable" ? "Disable member" : pending.action === "enable" ? "Enable member" : "Reset password"}</button></div>
    </AdminDialog>}
    {credentials && <CredentialDialog login={credentials} onClose={() => setCredentials(null)} />}
  </main>;
}
