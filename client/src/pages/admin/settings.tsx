import { ArrowUpRight, Check, CircleOff, Mail, MapPin } from "lucide-react";
import { Link } from "wouter";
import { SUPPORTED_CITIES, SUPPORT_EMAIL } from "@shared/catalog";

function SettingRow({ icon: Icon, title, value, note, enabled }: { icon: typeof Check; title: string; value: string; note: string; enabled?: boolean }) {
  return <div style={{ display: "flex", gap: 13, alignItems: "flex-start", padding: "16px 0", borderBottom: "1px solid #edf0e9" }}>
    <span className="ad-state-mark" style={{ margin: 0, width: 36, height: 36, flex: "0 0 36px" }}><Icon size={16} /></span>
    <div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><strong style={{ fontSize: 13 }}>{title}</strong><span className={`ad-badge ${enabled ? "green" : "warm"}`}>{value}</span></div><div style={{ color: "#819087", fontSize: 11, lineHeight: 1.5, marginTop: 5 }}>{note}</div></div>
  </div>;
}
export default function Settings() {
  return <main className="ad-content">
    <div className="ad-page-head"><div><p className="ad-eyebrow">Operational controls</p><h1>Settings</h1><p>Read-only product switches and service information.</p></div></div>
    <div className="ad-banner"><strong>These settings are intentionally read-only.</strong> Changes require a go-live release; there are no controls here that can quietly alter production behavior.</div>
    <section className="ad-section ad-card">
      <div className="ad-section-head"><div><p className="ad-eyebrow">Go-live checklist</p><h2>Current product state</h2></div><span className="ad-badge blue">Read-only</span></div>
      <SettingRow icon={Check} title="Demo environment" value="ON" enabled note="Demo accounts use the @freespirit.com owner email suffix." />
      <SettingRow icon={CircleOff} title="Ratings and reviews" value="OFF" note="Ratings are not enabled. No review collection or display is active." />
      <SettingRow icon={CircleOff} title="Offers" value="OFF" note="Offer creation and redemption are not enabled." />
      <div style={{ paddingTop: 18 }}><div className="ad-section-head"><div><p className="ad-eyebrow">Shared reference</p><h2>Service footprint</h2></div></div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 19 }}>{SUPPORTED_CITIES.map((city) => <span key={city.name} className="ad-chip selected" style={{ cursor: "default" }}><MapPin size={12} style={{ verticalAlign: "middle", marginRight: 5 }} />{city.name}</span>)}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 14, borderTop: "1px solid #edf0e9" }}><div><div className="ad-cell-title"><Mail size={14} style={{ verticalAlign: "middle", marginRight: 7 }} />Support mailbox</div><div className="ad-cell-sub">{SUPPORT_EMAIL}</div></div><a className="ad-icon-button" href={`mailto:${SUPPORT_EMAIL}`} aria-label="Email support"><ArrowUpRight size={15} /></a></div>
    </section>
    <div style={{ marginTop: 14, textAlign: "right" }}><Link href="/admin" className="ad-button secondary">Back to overview</Link></div>
  </main>;
}
