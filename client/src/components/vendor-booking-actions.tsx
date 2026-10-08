import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X, Ban } from "lucide-react";
import { DECLINE_REASONS } from "@shared/catalog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { VendorBooking } from "@/lib/vendor-bookings";

export default function VendorBookingActions({ booking, compact = false }: { booking: VendorBooking; compact?: boolean }) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const update = useMutation({
    mutationFn: async (body: { status: "confirmed" | "declined" | "cancelled"; declineReason?: string; vendorNote?: string }) =>
      apiRequest("PATCH", `/api/vendor/bookings/${booking.id}`, body),
    onSuccess: async (_, vars) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/vendor/bookings"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/vendor/dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/bookings"] }),
        queryClient.invalidateQueries({ predicate: q => {
          const key = q.queryKey[0];
          return typeof key === "string" && (key.startsWith("/api/experiences") || key.startsWith("/api/vendor/experiences"));
        } }),
      ]);
      setDeclining(false); setReason(""); setNote("");
      toast({ title: vars.status === "confirmed" ? "Booking confirmed" : vars.status === "declined" ? "Request declined" : "Booking cancelled" });
    },
    onError: (error: Error) => {
      if (error.message.startsWith("401:")) void queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      if (error.message.startsWith("409:")) {
        void queryClient.invalidateQueries({ queryKey: ["/api/vendor/bookings"] });
        void queryClient.invalidateQueries({ queryKey: ["/api/vendor/dashboard"] });
      }
    },
  });
  const act = (status: "confirmed" | "declined" | "cancelled", declineReason?: string, vendorNote?: string) =>
    update.mutate({ status, ...(declineReason ? { declineReason } : {}), ...(vendorNote?.trim() ? { vendorNote: vendorNote.trim() } : {}) });
  const failure = update.error?.message.startsWith("409:")
    ? "This booking changed. Refresh and try again."
    : "Couldn’t update the booking. Please try again.";

  if (booking.status === "requested") return <div className={`vba ${compact ? "vba-compact" : ""}`}>
    {!declining ? <div className="vba-buttons">
      <button className="v-button v-button-primary" disabled={update.isPending} onClick={() => act("confirmed")}><Check size={16} />Confirm</button>
      <button className="v-button v-button-quiet" disabled={update.isPending} onClick={() => setDeclining(true)}><X size={16} />Decline</button>
    </div> : <div className="vba-decline">
      <label>Reason for declining<select value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Choose a reason</option>{DECLINE_REASONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label>Optional note<textarea value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Add a little context for the member" rows={2} /></label>
      {update.isError && <p className="v-inline-error" role="alert">{failure} <button onClick={() => act("declined", reason, note)} disabled={!reason || update.isPending}>Retry</button></p>}
      <div className="vba-buttons"><button className="v-button v-button-danger" disabled={!reason || update.isPending} onClick={() => act("declined", reason, note)}>Decline request</button><button className="v-button v-button-quiet" onClick={() => setDeclining(false)}>Keep request</button></div>
    </div>}
    {update.isError && !declining && <p className="v-inline-error" role="alert">{failure} <button onClick={() => act("confirmed")}>Retry</button></p>}
  </div>;
  if (booking.status === "confirmed") return <div className="vba">
    <button className="v-button v-button-danger v-button-outline" disabled={update.isPending} onClick={() => { if (window.confirm("The member will be told")) act("cancelled"); }}><Ban size={16} />Cancel booking</button>
    {update.isError && <p className="v-inline-error" role="alert">{failure} <button onClick={() => { if (window.confirm("The member will be told")) act("cancelled"); }}>Retry</button></p>}
  </div>;
  return null;
}
