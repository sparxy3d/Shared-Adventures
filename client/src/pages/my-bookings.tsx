import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import MemberLayout, { MemberError, MemberLoading } from "@/components/member-layout";
import { formatPrice } from "@/lib/currency";
import { bookingInstant, memberBookingDate } from "@/lib/member-dates";

interface MemberBooking {
  id: number; experienceId: number; bookingDate: string; startTime: string | null;
  qty: number; totalAmount: number | null; status: string; vendorNote: string | null;
  experience: { title: string; imageUrl: string | null; locationText: string | null; city: string | null };
  vendor: { businessName: string | null; contactPhone: string | null; contactEmail: string | null };
}
const statuses: Record<string, string> = {
  requested: "bg-amber-100 text-amber-900",
  confirmed: "bg-green-100 text-green-900",
  declined: "bg-slate-100 text-slate-700",
  cancelled: "bg-slate-100 text-slate-700 line-through",
  completed: "border border-[#171717] text-[#171717] bg-white",
};
const label = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);

export default function MyBookings() {
  const { isMember } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("upcoming");
  const [selected, setSelected] = useState<MemberBooking | null>(null);
  const [shareError, setShareError] = useState("");
  const query = useQuery<MemberBooking[]>({ queryKey: ["/api/bookings"], enabled: isMember });
  const now = Date.now();
  const rows = (query.data || []).filter(b =>
    tab === "upcoming" ? bookingInstant(b.bookingDate, b.startTime) >= now : bookingInstant(b.bookingDate, b.startTime) < now,
  ).sort((a, b) => (bookingInstant(a.bookingDate, a.startTime) - bookingInstant(b.bookingDate, b.startTime)) * (tab === "upcoming" ? 1 : -1));
  async function share(booking: MemberBooking) {
    setShareError("");
    const url = `${window.location.origin}/activity/${booking.experienceId}`;
    try {
      if (navigator.share) await navigator.share({ title: booking.experience.title, url });
      else { await navigator.clipboard.writeText(url); toast({ title: "Activity link copied" }); }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setShareError("We couldn’t share this link. Open the activity and copy its address.");
    }
  }
  return <MemberLayout title="My bookings">
    <div role="tablist" aria-label="Booking dates" className="mb-6 flex gap-2">
      {["upcoming", "past"].map(value => <button key={value} role="tab" aria-selected={tab === value} aria-controls="booking-panel" id={`tab-${value}`} className={`min-h-11 rounded-xl px-5 ${tab === value ? "bg-[#FF6B24] font-semibold text-[#171717]" : "bg-white text-slate-700"}`} onClick={() => setTab(value)}>{label(value)}</button>)}
    </div>
    <div id="booking-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
      {query.isLoading ? <MemberLoading /> : query.isError ? <MemberError retry={() => query.refetch()} message="We couldn’t load your bookings." /> : rows.length ? <div className="space-y-4">
        {rows.map(booking => <button key={booking.id} data-testid={`card-booking-${booking.id}`} onClick={() => { setSelected(booking); setShareError(""); }} className="flex w-full flex-col gap-4 rounded-2xl bg-white p-4 text-left shadow-sm sm:flex-row sm:items-center">
          <img className="h-32 w-full rounded-xl object-cover sm:h-24 sm:w-32" src={booking.experience.imageUrl || "/images/fallback.png"} alt={booking.experience.title} />
          <span className="min-w-0 flex-1 space-y-2">
            <span className="block text-lg font-bold">{booking.experience.title}</span>
            <span className="block text-slate-600">{booking.vendor.businessName || "Vendor name unavailable"}</span>
            <span className="block text-slate-600">{memberBookingDate(booking.bookingDate, booking.startTime)} · {booking.qty} {booking.qty === 1 ? "person" : "people"}</span>
            <span className="block font-semibold">{formatPrice(booking.totalAmount, "LKR")}</span>
          </span>
          <span className={`self-start rounded-full px-3 py-2 text-[13px] font-semibold ${statuses[booking.status] || "bg-slate-100 text-slate-700"}`}>{label(booking.status)}</span>
        </button>)}
      </div> : <div className="rounded-2xl bg-white p-8 text-center shadow-sm"><p className="mb-4 text-xl font-semibold">{query.data?.length ? `No ${tab} bookings` : "No bookings yet"}</p><Link href="/search"><Button>Find something to do</Button></Link></div>}
    </div>
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}>
      <DialogContent className="stage-one max-h-[90vh] overflow-y-auto rounded-2xl">
        {selected && <>
          <DialogHeader><DialogTitle>{selected.experience.title}</DialogTitle><DialogDescription>{memberBookingDate(selected.bookingDate, selected.startTime)}</DialogDescription></DialogHeader>
          <p>{selected.vendor.businessName || "Vendor name unavailable"}</p>
          <p>{selected.qty} {selected.qty === 1 ? "person" : "people"} · {formatPrice(selected.totalAmount, "LKR")}</p>
          <ol aria-label="Booking status timeline" className="flex flex-wrap items-center gap-3">
            {(selected.status === "requested" ? ["requested"] : selected.status === "completed" ? ["requested", "confirmed", "completed"] : ["requested", selected.status]).map((status, index) =>
              <li key={status} className="flex items-center gap-3">{index > 0 && <span aria-hidden="true">→</span>}<span className={`rounded-xl px-3 py-2 ${statuses[status] || "bg-slate-100"}`}>{label(status)}</span></li>)}
          </ol>
          {selected.status === "requested" && <p className="text-slate-600">Waiting for the vendor to confirm or decline.</p>}
          {selected.vendorNote && <div className="rounded-xl bg-[#FFF8F1] p-4"><h3 className="font-semibold">Vendor’s note</h3><p className="whitespace-pre-wrap">{selected.vendorNote}</p></div>}
          {shareError && <p role="alert" className="text-red-800">{shareError}</p>}
          <Button onClick={() => share(selected)}>Share with your group</Button>
          {selected.status === "confirmed" && <section className="rounded-xl bg-[#FFF8F1] p-4" aria-labelledby="vendor-contact-heading">
            <h3 id="vendor-contact-heading" className="font-semibold">Address and vendor contact</h3>
            {(selected.experience.locationText || selected.experience.city) && <p className="break-words">{[selected.experience.locationText, selected.experience.city].filter(Boolean).join(" · ")}</p>}
            {selected.vendor.contactPhone && <a className="flex min-h-11 items-center underline" href={`tel:${selected.vendor.contactPhone.replace(/[^\d+]/g, "")}`}>{selected.vendor.contactPhone}</a>}
            {selected.vendor.contactEmail && <a className="flex min-h-11 items-center break-all underline" href={`mailto:${encodeURIComponent(selected.vendor.contactEmail)}`}>{selected.vendor.contactEmail}</a>}
            {!selected.vendor.contactPhone && !selected.vendor.contactEmail && <p>Vendor contact hasn’t been provided yet.</p>}
          </section>}
          <p>Need to change this? {selected.status === "confirmed" && (selected.vendor.contactPhone || selected.vendor.contactEmail) ? <a className="inline-flex min-h-11 items-center underline" href={selected.vendor.contactPhone ? `tel:${selected.vendor.contactPhone.replace(/[^\d+]/g, "")}` : `mailto:${encodeURIComponent(selected.vendor.contactEmail!)}`}>Contact the vendor</a> : "Contact the vendor."}</p>
          {selected.status !== "confirmed" && <p className="text-slate-600">Address and contact details are shared once your booking is confirmed.</p>}
          <Link className="inline-flex min-h-11 items-center underline" href={`/activity/${selected.experienceId}`}>View activity</Link>
        </>}
      </DialogContent>
    </Dialog>
  </MemberLayout>;
}
