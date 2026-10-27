import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, Check, CircleOff, Mail, MapPin, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { SUPPORTED_CITIES, SUPPORT_EMAIL } from "@shared/catalog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import "@/pages/admin/pricing-settings.css";

type PricingSettings = {
  introductoryRate: number;
  standardRate: number;
  introductoryMonths: number;
  usdToLkrRate: number | null;
  exchangeRateUpdatedAt: string | null;
  exchangeRateUpdatedBy: number | null;
  exchangeRateUpdatedByName: string | null;
};
type SettingsForm = { introductoryRate: string; standardRate: string; introductoryMonths: string; usdToLkrRate: string };
type SiteSettings = { showDemoContent: boolean; bookingsOpen: boolean };
const asForm = (settings: PricingSettings): SettingsForm => ({
  introductoryRate: String(settings.introductoryRate),
  standardRate: String(settings.standardRate),
  introductoryMonths: String(settings.introductoryMonths),
  usdToLkrRate: settings.usdToLkrRate == null ? "" : String(settings.usdToLkrRate),
});

function SettingRow({ icon: Icon, title, value, note, enabled }: { icon: typeof Check; title: string; value: string; note: string; enabled?: boolean }) {
  return <div className="ad-setting-row">
    <span className="ad-state-mark"><Icon size={16} /></span>
    <div className="ad-setting-copy"><div className="ad-setting-title"><strong>{title}</strong><span className={`ad-badge ${enabled ? "green" : "warm"}`}>{value}</span></div><div className="ad-setting-note">{note}</div></div>
  </div>;
}

function validDecimal(value: string, maxDecimals: number) {
  return value !== "" && new RegExp(`^\\d+(?:\\.\\d{1,${maxDecimals}})?$`).test(value);
}

export default function Settings() {
  const client = useQueryClient();
  const { toast } = useToast();
  const query = useQuery<PricingSettings>({
    queryKey: ["/api/admin/pricing-settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/pricing-settings");
      return response.json();
    },
  });
  const [form, setForm] = useState<SettingsForm>({ introductoryRate: "", standardRate: "", introductoryMonths: "", usdToLkrRate: "" });
  const [fieldError, setFieldError] = useState("");
  const [confirmSwitch, setConfirmSwitch] = useState<keyof SiteSettings | null>(null);
  const siteQuery = useQuery<SiteSettings>({
    queryKey: ["/api/admin/site-settings"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/site-settings")).json(),
  });
  const siteMutation = useMutation({
    mutationFn: async (body: Partial<SiteSettings>) => (await apiRequest("PATCH", "/api/admin/site-settings", body)).json() as Promise<SiteSettings>,
    onSuccess: (settings) => {
      client.setQueryData(["/api/admin/site-settings"], settings);
      setConfirmSwitch(null);
      toast({ title: "Site settings saved", description: "The public experience has been updated." });
    },
    onError: () => toast({ title: "Could not update site settings", description: "The previous setting remains active. Please retry.", variant: "destructive" }),
  });
  useEffect(() => { if (query.data) setForm(asForm(query.data)); }, [query.data]);
  const mutation = useMutation({
    mutationFn: async (body: { introductoryRate: number; standardRate: number; introductoryMonths: number; usdToLkrRate?: number | null }) => {
      const response = await apiRequest("PATCH", "/api/admin/pricing-settings", body);
      return response.json() as Promise<PricingSettings>;
    },
    onSuccess: async (settings) => {
      client.setQueryData(["/api/admin/pricing-settings"], settings);
      void client.invalidateQueries({ queryKey: ["/api/pricing-config"] });
      void client.invalidateQueries({ queryKey: ["/api/vendor/dashboard"] });
      setFieldError("");
      toast({ title: "Pricing settings saved", description: "New bookings will use the updated rates." });
    },
    onError: () => toast({ title: "Could not save pricing settings", description: "Your entries are still here. Please retry.", variant: "destructive" }),
  });
  const changed = (key: keyof SettingsForm, value: string) => { setForm((previous) => ({ ...previous, [key]: value })); setFieldError(""); };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const introValid = validDecimal(form.introductoryRate, 2) && Number(form.introductoryRate) <= 100;
    const standardValid = validDecimal(form.standardRate, 2) && Number(form.standardRate) <= 100;
    const monthsValid = /^\d+$/.test(form.introductoryMonths) && Number(form.introductoryMonths) <= 120;
    const exchangeValid = form.usdToLkrRate === "" || (validDecimal(form.usdToLkrRate, 6) && Number(form.usdToLkrRate) > 0 && Number(form.usdToLkrRate) <= 1_000_000);
    if (!introValid || !standardValid || !monthsValid || !exchangeValid) {
      setFieldError("Check the highlighted values. Rates must be 0 to 100 with up to 2 decimals, months 0 to 120, and exchange rate greater than 0 up to 1,000,000 with up to 6 decimals.");
      return;
    }
    const exchangeValue = form.usdToLkrRate === "" ? null : Number(form.usdToLkrRate);
    const body: { introductoryRate: number; standardRate: number; introductoryMonths: number; usdToLkrRate?: number | null } = {
      introductoryRate: Number(form.introductoryRate),
      standardRate: Number(form.standardRate),
      introductoryMonths: Number(form.introductoryMonths),
    };
    if (!query.data) return;
    if (exchangeValue !== query.data.usdToLkrRate) body.usdToLkrRate = exchangeValue;
    mutation.mutate(body);
  };

  if (query.isLoading) return <main className="ad-content"><div className="ad-page-head"><div><p className="ad-eyebrow">Operational controls</p><h1>Settings</h1></div></div><div className="ad-pricing-skeleton" /><div className="ad-pricing-skeleton" /></main>;
  if (query.isError || !query.data) return <main className="ad-content"><div className="ad-page-head"><div><p className="ad-eyebrow">Operational controls</p><h1>Settings</h1><p>Commission and display conversion for new pricing.</p></div></div><div className="ad-banner ad-pricing-error" role="alert"><strong>Pricing settings could not be loaded.</strong><p>{query.error instanceof Error ? query.error.message : "Please try again."}</p><button className="ad-button secondary" onClick={() => void query.refetch()}>Retry</button></div></main>;

  const exchangeUpdated = query.data.exchangeRateUpdatedAt ? new Intl.DateTimeFormat("en-LK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Colombo" }).format(new Date(query.data.exchangeRateUpdatedAt)) : "Never";
  return <main className="ad-content ad-pricing-page">
    <div className="ad-page-head"><div><p className="ad-eyebrow">Operational controls</p><h1>Settings</h1><p>Pricing rules used when a booking is created.</p></div></div>
    <div className="ad-banner"><strong>Pricing updates apply to new bookings only.</strong> Existing booking totals and commission snapshots stay unchanged.</div>
    <section className="ad-section ad-card ad-pricing-card">
      <div className="ad-section-head"><div><p className="ad-eyebrow">Commission and visitor pricing</p><h2>Pricing controls</h2><p>Rates are percentages. Exchange rate is LKR for one USD.</p></div><span className="ad-badge blue">Admin editable</span></div>
      <form className="ad-pricing-form" onSubmit={save} noValidate>
        <label className="ad-pricing-field"><span>Introductory commission (%)</span><input type="number" inputMode="decimal" min="0" max="100" step="0.01" value={form.introductoryRate} onChange={(event) => changed("introductoryRate", event.target.value)} aria-invalid={!!fieldError && (!validDecimal(form.introductoryRate, 2) || Number(form.introductoryRate) > 100)} /><small>Rate during a vendor’s introductory period, unless that vendor has an override.</small></label>
        <label className="ad-pricing-field"><span>Standard commission (%)</span><input type="number" inputMode="decimal" min="0" max="100" step="0.01" value={form.standardRate} onChange={(event) => changed("standardRate", event.target.value)} aria-invalid={!!fieldError && (!validDecimal(form.standardRate, 2) || Number(form.standardRate) > 100)} /><small>Rate after the introductory period ends.</small></label>
        <label className="ad-pricing-field"><span>Introductory period (months)</span><input type="number" inputMode="numeric" min="0" max="120" step="1" value={form.introductoryMonths} onChange={(event) => changed("introductoryMonths", event.target.value)} aria-invalid={!!fieldError && (!/^\d+$/.test(form.introductoryMonths) || Number(form.introductoryMonths) > 120)} /><small>Calendar months from the vendor’s first published listing.</small></label>
        <label className="ad-pricing-field"><span>USD to LKR exchange rate</span><input type="number" inputMode="decimal" min="0.000001" max="1000000" step="0.000001" placeholder="Not set" value={form.usdToLkrRate} onChange={(event) => changed("usdToLkrRate", event.target.value)} aria-invalid={!!fieldError && form.usdToLkrRate !== "" && (!validDecimal(form.usdToLkrRate, 6) || Number(form.usdToLkrRate) <= 0 || Number(form.usdToLkrRate) > 1_000_000)} /><small>Required to display or book a visitor USD price. Leave blank to unset.</small></label>
        <div className="ad-pricing-audit"><RefreshCw size={15} /><span>Last exchange rate update: <strong>{exchangeUpdated}</strong>{query.data.exchangeRateUpdatedByName ? ` by ${query.data.exchangeRateUpdatedByName}` : ""}</span></div>
        {fieldError && <p className="ad-pricing-inline-error" role="alert">{fieldError}</p>}
        {mutation.isError && <div className="ad-pricing-inline-error" role="alert">Settings were not saved. Your entries remain here. <button type="submit">Retry save</button></div>}
        <div className="ad-pricing-actions"><button className="ad-button" type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Save pricing settings"}</button></div>
      </form>
    </section>
    <section className="ad-section ad-card ad-ops-card">
      <div className="ad-section-head"><div><p className="ad-eyebrow">Marketplace availability</p><h2>Public site controls</h2><p>These settings affect what members can discover and book.</p></div><span className="ad-badge blue">Admin editable</span></div>
      {siteQuery.isLoading ? <div className="ad-site-loading"><i/><i/></div> : siteQuery.isError || !siteQuery.data ? <div className="ad-banner ad-pricing-error" role="alert"><strong>Marketplace settings could not be loaded.</strong><p>Existing settings have not been changed.</p><button className="ad-button secondary" onClick={() => void siteQuery.refetch()}>Retry</button></div> : <div className="ad-site-controls">
        {([{ key: "showDemoContent", title: "Show demo content on the public site", detail: "Include Free Spirit demo experiences and vendors in public discovery.", on: "Visible", off: "Hidden" }, { key: "bookingsOpen", title: "Bookings open", detail: "Allow new booking requests across the marketplace.", on: "Open", off: "Closed" }] as const).map((item) => {
          const enabled = siteQuery.data[item.key];
          return <div className="ad-site-control" key={item.key}><div><strong>{item.title}</strong><p>{item.detail}</p></div><div className="ad-site-actions"><span className={`ad-badge ${enabled ? "green" : "warm"}`}>{enabled ? item.on : item.off}</span><button role="switch" aria-label={item.title} aria-checked={enabled} className="ad-button secondary" disabled={siteMutation.isPending} onClick={() => enabled ? setConfirmSwitch(item.key) : siteMutation.mutate({ [item.key]: true })}>{enabled ? "Turn off" : "Turn on"}</button></div></div>;
        })}
        {siteMutation.isError && <div className="ad-pricing-inline-error" role="alert">Site settings were not saved. <button type="button" onClick={() => { if (siteMutation.variables) siteMutation.mutate(siteMutation.variables); }}>Retry</button></div>}
      </div>}
      <div className="ad-section-head ad-ops-subhead"><div><p className="ad-eyebrow">Go-live checklist</p><h2>Current product state</h2></div><span className="ad-badge blue">Read-only</span></div>
      <SettingRow icon={siteQuery.data?.showDemoContent ? Check : CircleOff} title="Demo environment" value={siteQuery.data?.showDemoContent ? "ON" : "OFF"} enabled={siteQuery.data?.showDemoContent} note="Controls whether demo experiences are included in public discovery." />
      <SettingRow icon={CircleOff} title="Ratings and reviews" value="OFF" note="Ratings are not enabled. No review collection or display is active." />
      <SettingRow icon={CircleOff} title="Offers" value="OFF" note="Offer creation and redemption are not enabled." />
      <div className="ad-service-footprint"><div className="ad-section-head"><div><p className="ad-eyebrow">Shared reference</p><h2>Service footprint</h2></div></div>
        <div className="ad-city-list">{SUPPORTED_CITIES.map((city) => <span key={city.name} className="ad-chip selected"><MapPin size={12} />{city.name}</span>)}</div>
      </div>
      <div className="ad-support-row"><div><div className="ad-cell-title"><Mail size={14} />Support mailbox</div><div className="ad-cell-sub">{SUPPORT_EMAIL}</div></div><a className="ad-icon-button" href={`mailto:${SUPPORT_EMAIL}`} aria-label="Email support"><ArrowUpRight size={15} /></a></div>
    </section>
    <div className="ad-pricing-back"><Link href="/admin" className="ad-button secondary">Back to overview</Link></div>
    {confirmSwitch && siteQuery.data && <div className="ad-site-confirm-backdrop"><section className="ad-site-confirm" role="alertdialog" aria-modal="true" aria-labelledby="site-switch-title"><p className="ad-eyebrow">Confirm site change</p><h2 id="site-switch-title">Turn off {confirmSwitch === "showDemoContent" ? "demo content" : "bookings"}?</h2><p>{confirmSwitch === "showDemoContent" ? "Demo listings and vendors will no longer appear in public discovery." : "Members will not be able to complete new bookings while bookings are closed."}</p><div><button className="ad-button secondary" onClick={() => setConfirmSwitch(null)}>Keep enabled</button><button className="ad-button danger" disabled={siteMutation.isPending} onClick={() => siteMutation.mutate({ [confirmSwitch]: false })}>{siteMutation.isPending ? "Saving…" : "Turn off"}</button></div></section></div>}
  </main>;
}
