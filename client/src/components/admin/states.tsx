import { AlertCircle, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

export function AdminLoading({ rows = 3 }: { rows?: number }) {
  return <div aria-label="Loading records" role="status" style={{ display: "grid", gap: 11 }}>{Array.from({ length: rows }, (_, index) => <div className="ad-skeleton" key={index} />)}</div>;
}
export function AdminError({ retry }: { retry: () => unknown }) {
  return <div className="ad-card ad-state" role="alert"><div className="ad-state-mark"><AlertCircle size={19} /></div><h2>We couldn’t load this information</h2><p>Something interrupted the request. Please try again.</p><button className="ad-button secondary" onClick={() => retry()}><RefreshCw size={14} />Retry</button></div>;
}
export function AdminEmpty({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="ad-card ad-state"><div className="ad-state-mark"><span style={{ fontSize: 18 }}>·</span></div><h2>{title}</h2><p>{description}</p>{action}</div>;
}
