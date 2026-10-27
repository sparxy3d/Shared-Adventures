import { useMemo, useState } from "react";
import { Download, Mail, UsersRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AdminTable, type AdminColumn } from "@/components/admin/table";
import { AdminError, AdminLoading } from "@/components/admin/states";
import "@/pages/admin/waiting-list.css";

type CountRow = { experienceId: number; title: string; count: number };
type Entry = { id: number; experienceId: number; title: string; email: string; name: string | null; createdAt: string };
type WaitingListResponse = { counts: CountRow[]; entries: Entry[] };
const formatDate = (value: string) => new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" }).format(new Date(value));

export default function WaitingList() {
  const query = useQuery<WaitingListResponse>({
    queryKey: ["/api/admin/waiting-list"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/waiting-list");
      return response.json();
    },
  });
  const [listingFilter, setListingFilter] = useState("all");
  const [exportError, setExportError] = useState("");
  const data = query.data;
  const counts = useMemo(() => [...(data?.counts ?? [])].sort((a, b) => a.title.localeCompare(b.title)), [data?.counts]);
  const entries = useMemo(() => (data?.entries ?? []).filter((entry) => listingFilter === "all" || entry.experienceId === Number(listingFilter)), [data?.entries, listingFilter]);
  const columns: AdminColumn<Entry>[] = [
    { key: "title", label: "Experience", sortValue: (row) => row.title, render: (row) => <div className="ad-cell-title">{row.title}<span className="ad-cell-sub">{counts.find((item) => item.experienceId === row.experienceId)?.count ?? 0} waiting</span></div> },
    { key: "name", label: "Name", sortValue: (row) => row.name ?? "", render: (row) => row.name || "Name not provided" },
    { key: "email", label: "Email", sortValue: (row) => row.email, render: (row) => <a className="wl-email" href={`mailto:${row.email}`}><Mail size={14}/>{row.email}</a> },
    { key: "createdAt", label: "Joined", sortValue: (row) => row.createdAt, render: (row) => formatDate(row.createdAt) },
  ];
  const exportCsv = async () => {
    setExportError("");
    try {
      const response = await apiRequest("GET", "/api/admin/waiting-list/export");
      const file = await response.blob();
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = "free-spirit-waiting-list.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "The CSV could not be downloaded.");
    }
  };
  if (query.isLoading) return <main className="ad-content"><div className="ad-page-head"><div><p className="ad-eyebrow">Member interest</p><h1>Waiting list</h1></div></div><AdminLoading /></main>;
  if (query.isError || !data) return <main className="ad-content"><div className="ad-page-head"><div><p className="ad-eyebrow">Member interest</p><h1>Waiting list</h1></div></div><AdminError retry={() => void query.refetch()} /></main>;
  const total = data.entries.length;
  const filterControls = <label className="wl-listing-filter"><span>Experience</span><select value={listingFilter} onChange={(event) => setListingFilter(event.target.value)}><option value="all">All experiences · {total}</option>{counts.map((item) => <option value={item.experienceId} key={item.experienceId}>{item.title} · {item.count}</option>)}</select></label>;
  return <main className="ad-content ad-waiting-page">
    <header className="ad-page-head"><div><p className="ad-eyebrow">Member interest</p><h1>Waiting list</h1><p>Keep an eye on the experiences people want to join.</p></div><button className="ad-button" onClick={() => void exportCsv()}><Download size={16}/>Download CSV</button></header>
    <section className="wl-summary">
      <div className="wl-total"><span className="wl-icon"><UsersRound size={19}/></span><div><strong>{total}</strong><span>people waiting</span></div></div>
      <div className="wl-listing-counts"><span className="ad-eyebrow">Interest by experience</span>{counts.length ? counts.map((item) => <div key={item.experienceId}><span>{item.title}</span><strong>{item.count}</strong></div>) : <p>No sign-ups yet. Member requests will appear here.</p>}</div>
    </section>
    {exportError && <div className="ad-form-error" role="alert">{exportError}<button className="ad-button secondary" onClick={() => void exportCsv()}>Retry download</button></div>}
    <section className="ad-section ad-card wl-table-card"><div className="ad-section-head"><h2>Sign-ups</h2><span className="ad-badge">{entries.length} shown</span></div>{total ? <AdminTable rows={entries} columns={columns} searchText={(row) => `${row.title} ${row.email} ${row.name ?? ""}`} filterControls={filterControls}/> : <div className="ad-state wl-empty"><div className="ad-state-mark"><UsersRound size={18}/></div><h2>No waiting list members yet</h2><p>When someone asks to hear about an experience, their sign-up will appear here.</p></div>}</section>
  </main>;
}
