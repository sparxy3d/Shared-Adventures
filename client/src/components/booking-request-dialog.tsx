import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Skeleton } from "./ui/skeleton";
import { RequireRole } from "./require-role";
import { GUEST_BOOKING_ENABLED } from "@shared/catalog";
import type { ActivityBooking } from "@/hooks/use-activity-booking";
import { formatPrice } from "@/lib/currency";
import { memberBookingDate } from "@/lib/member-dates";
import { queryClient } from "@/lib/queryClient";
import { sessionBookable } from "@/lib/activity-sessions";
import "./booking-request-stage-three.css";

class RequestError extends Error {
  constructor(public status: number) { super("Request could not be sent"); }
}
export default function BookingRequestDialog({ flow }: { flow: ActivityBooking }) {
  const [step, setStep] = useState(1);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [guest, setGuest] = useState(false);
  const [guestDetails, setGuestDetails] = useState({ name: "", phone: "", email: "" });
  const activity = flow.activity.data;
  const user = flow.auth.user;
  const detailsComplete = activity?.priceAmount != null && flow.capacity !== null;
  const request = useMutation({
    mutationFn: async () => {
      if (!activity || !flow.selectedSlot || !user || user.role !== "customer") throw new RequestError(401);
      if (!detailsComplete) throw new RequestError(400);
      if (!sessionBookable(flow.selectedSlot, flow.qty)) throw new RequestError(409);
      const response = await fetch("/api/bookings", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experienceId: activity.id, slotId: flow.selectedSlot.id, qty: flow.qty, customerNote: note.trim() || null }),
      });
      if (!response.ok) throw new RequestError(response.status);
      return response.json();
    },
    onSuccess: () => {
      setError(""); setStep(3);
      void flow.slots.refetch();
      void queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
    onError: (failure) => {
      if (failure instanceof RequestError && failure.status === 409) { setError(""); flow.conflict(); return; }
      if (failure instanceof RequestError && failure.status === 401) {
        setStep(1); setError("Please log in to send your request.");
        void queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        return;
      }
      setError("We couldn’t send your request. Please try again.");
    },
  });
  useEffect(() => {
    if (!flow.requestOpen) { setStep(1); setError(""); setGuest(false); setNote(""); }
  }, [flow.requestOpen]);
  useEffect(() => {
    if (step === 2 && !user && !guest && !flow.auth.isLoading) setStep(1);
  }, [user, guest, step, flow.auth.isLoading]);
  useEffect(() => {
    if (flow.requestOpen && flow.slots.data && !flow.selectedSlot && step !== 3 && !request.isPending) flow.conflict();
  }, [flow.requestOpen, flow.slots.data, flow.selectedSlot, step, request.isPending]);
  if (!activity || !flow.takingBookings) return null;
  const returnUrl = `/activity/${activity.id}?${new URLSearchParams({ slot: String(flow.selectedSlotId || ""), group: String(flow.qty), booking: "1" })}`;
  const authUrl = (path: string) => `${path}?next=${encodeURIComponent(returnUrl)}`;
  const firstName = user?.fullName.trim().split(/\s+/)[0];
  const title = step === 1 ? "Who's booking" : step === 2 ? "Review" : "Sent";
  return <Dialog open={flow.requestOpen} onOpenChange={open => { if (!open && !request.isPending) flow.closeRequest(); }}>
    <DialogContent className="booking-request-stage-three" onEscapeKeyDown={event => { if (request.isPending) event.preventDefault(); }} onInteractOutside={event => { if (request.isPending) event.preventDefault(); }}>
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>Step {step} of 3 · Request only, no payment</DialogDescription></DialogHeader>
      {flow.auth.isLoading ? <Skeleton className="h-40 bg-slate-200" /> : flow.auth.error ? <div role="alert"><p>We couldn’t load your account.</p><button className="br-secondary" onClick={() => flow.auth.retry()}>Retry</button></div> : user && user.role !== "customer" ? <RequireRole role="customer"><span /></RequireRole> : <>
        {!detailsComplete && step !== 3 && <div className="br-error"><p>The price or group capacity hasn’t been listed yet.</p><Link className="br-secondary" href="/search">Explore other activities</Link></div>}
        {error && <div role="alert" className="br-error"><p>{error}</p>{step === 2 && <button className="br-secondary" disabled={request.isPending} onClick={() => request.mutate()}>Retry</button>}</div>}
        {step === 1 && (user ? <div className="br-stack">
          <label>Full name<input readOnly value={user.fullName} /></label>
          <label>Email<input readOnly type="email" value={user.email} /></label>
          <label>Mobile<input readOnly type="tel" value={user.phone || ""} placeholder="Not provided" /></label>
          <button className="br-primary" disabled={!flow.selectedSlot || !detailsComplete} onClick={() => { setError(""); setStep(2); }}>Continue as {firstName}</button>
        </div> : <div className="br-stack">
          <p>Log in or sign up to request this session. Your session and group size will be kept.</p>
          <Link className="br-primary" href={authUrl("/login")}>Log in</Link>
          <Link className="br-secondary" href={authUrl("/signup")}>Sign up</Link>
          {GUEST_BOOKING_ENABLED && (guest ? <form className="br-stack" onSubmit={event => { event.preventDefault(); setStep(2); }}>
            <label>Full name<input required autoComplete="name" value={guestDetails.name} onChange={event => setGuestDetails({ ...guestDetails, name: event.target.value })} /></label>
            <label>Mobile<input required type="tel" autoComplete="tel" value={guestDetails.phone} onChange={event => setGuestDetails({ ...guestDetails, phone: event.target.value })} /></label>
            <label>Email<input required type="email" autoComplete="email" value={guestDetails.email} onChange={event => setGuestDetails({ ...guestDetails, email: event.target.value })} /></label>
            <button className="br-secondary" type="submit">Review as guest</button>
          </form> : <button className="br-secondary" onClick={() => setGuest(true)}>Continue as guest</button>)}
        </div>)}
        {step === 2 && <div className="br-stack">
          <h3>{activity.title}</h3>
          {flow.selectedSlot && <p>{memberBookingDate(flow.selectedSlot.date, flow.selectedSlot.startTime.slice(0, 5))}</p>}
          <p>{flow.qty} {flow.qty === 1 ? "person" : "people"}</p>
          <p className="br-total">{activity.priceAmount == null ? "Price not listed" : formatPrice(activity.priceAmount * flow.qty, "LKR")}</p>
          <p>No payment now. The vendor usually confirms your request within a few hours.</p>
          <label>Note to the vendor (optional)<textarea maxLength={1000} value={note} onChange={event => setNote(event.target.value)} /></label>
          {!user && <div className="br-error">Guest requests aren’t available to send yet. <Link href={authUrl("/login")}>Log in to send your request</Link></div>}
          <button className="br-primary" data-testid="button-send-request" disabled={!user || !flow.selectedSlot || !detailsComplete || request.isPending} onClick={() => { setError(""); request.mutate(); }}>{request.isPending ? "Sending request…" : "Send request"}</button>
          <button className="br-secondary" disabled={request.isPending} onClick={() => setStep(1)}>Back</button>
        </div>}
        {step === 3 && <div className="br-stack br-sent" data-testid="booking-sent">
          <CheckCircle2 size={48} aria-hidden="true" className="br-success" />
          <h3>Request sent to {activity.vendorName || "the vendor"}</h3>
          <span className="br-requested">Requested</span>
          <p>Nothing has been charged. You can follow your request in My bookings.</p>
          <Link className="br-primary" href="/account/bookings">View my bookings</Link>
          <Link className="br-secondary" href="/search">Keep exploring</Link>
        </div>}
      </>}
    </DialogContent>
  </Dialog>;
}
