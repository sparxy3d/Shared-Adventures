import { useState } from "react";
import type { AvailabilitySlot } from "@shared/schema";
import { Heart, Minus, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatPrice } from "@/lib/currency";
import { sessionAvailability, sessionBookable, sessionDayHeading } from "@/lib/activity-sessions";
import { formatTime12h } from "@/lib/dates";
import type { ActivityBooking } from "@/hooks/use-activity-booking";
import { formatLkr, formatUsd, validExchangeRate } from "@/lib/pricing";

type ActivitySessionPanelProps = {
  flow: ActivityBooking;
  title: string;
  priceAmount: number | null;
  visitorPriceUsd?: number | null;
};

function priceText(amount: number | null, visitorPriceUsd: number | null | undefined, flow: ActivityBooking) {
  if (amount === null) return "Price not listed";
  if (!visitorPriceUsd && visitorPriceUsd !== 0) return formatPrice(amount, "LKR");
  const rate = flow.pricingConfig.usdToLkrRate;
  if (!flow.auth.user) {
    return validExchangeRate(rate)
      ? `${formatPrice(amount, "LKR")} · Visitors: ${formatUsd(visitorPriceUsd)} (about ${formatLkr(visitorPriceUsd * rate)})`
      : formatPrice(amount, "LKR");
  }
  if (flow.auth.user.isSriLankanResident) return formatPrice(amount, "LKR");
  if (!validExchangeRate(rate)) return `${formatPrice(amount, "LKR")} · visitor price unavailable`;
  return `${formatUsd(visitorPriceUsd)} · about ${formatLkr(visitorPriceUsd * rate)}`;
}

function PanelContent({ flow, title, priceAmount, visitorPriceUsd }: ActivitySessionPanelProps) {
  const [showAllDays, setShowAllDays] = useState(false);
  const { days, qty, capacity, setQty, slots, selectedSlot, selectedSlotId, nextSessionId } = flow;
  const hasPrice = priceAmount !== null;
  const total = flow.pricing?.totalAmount ?? null;
  const needsRate = visitorPriceUsd != null && flow.visitorCount > 0 && !validExchangeRate(flow.pricingConfig.usdToLkrRate);
  const canRequest = !!selectedSlot && hasPrice && !!capacity && !needsRate;
  const visibleDays = showAllDays ? days : days.slice(0, 7);
  const fitCount = days.flatMap(([, daySlots]) => daySlots).filter(slot => sessionBookable(slot, qty)).length;
  const saveProblem = flow.saveError || (flow.favoritesError ? "Your bucket list couldn’t be loaded." : flow.auth.error ? "Your account couldn’t be checked." : "");

  return <>
    <div className="activity-detail-price" data-testid="text-price">{priceText(priceAmount, visitorPriceUsd, flow)}</div>
    {hasPrice && <div className="activity-detail-per-person">per person</div>}

    <section className="activity-detail-group" aria-label="Group size">
      <div className="activity-detail-group-head">
        <label>Group size</label>
        <div className="activity-detail-stepper">
          <button type="button" aria-label="Remove one person" data-testid="button-qty-decrease" disabled={qty <= 1 || !capacity}
            onClick={() => setQty(qty - 1)}><Minus size={18} aria-hidden="true" /></button>
          <output aria-live="polite" data-testid="text-qty">{qty}</output>
          <button type="button" aria-label="Add one person" data-testid="button-qty-increase" disabled={!capacity || qty >= capacity}
            onClick={() => setQty(qty + 1)}><Plus size={18} aria-hidden="true" /></button>
        </div>
      </div>
      <p className="activity-detail-hint">
        {capacity ? `For up to ${capacity} people.` : "Group capacity isn’t listed for this activity."}
      </p>
    </section>

    {hasPrice && <div className="activity-detail-total">
      <span>Total for {qty} {qty === 1 ? "person" : "people"}</span>
      <strong data-testid="text-total">{total === null ? "Visitor rate unavailable" : formatLkr(total)}</strong>
      <p data-testid="text-total-calculation">
        {flow.residentCount} resident{flow.residentCount === 1 ? "" : "s"}: {formatLkr(flow.pricing?.residentSubtotal ?? 0)}
        {" · "}
        {flow.visitorCount} visitor{flow.visitorCount === 1 ? "" : "s"}: {total === null ? "rate unavailable" : formatLkr(flow.pricing?.visitorSubtotal ?? 0)}
        {total !== null && ` · ${formatLkr(total)} total`}
      </p>
      {needsRate && <p className="activity-detail-notice">Visitor booking is unavailable until the exchange rate is available.</p>}
    </div>}

    <div className="activity-detail-sessions-title"><span>Choose a session</span></div>
    {slots.isLoading ? <div aria-label="Loading sessions" className="activity-detail-skeleton activity-detail-skeleton-line wide" /> :
      slots.isError ? <div className="activity-detail-error" role="alert">
        <p>Sessions couldn’t be loaded.</p>
        <button type="button" onClick={() => { void slots.refetch(); }}>Retry</button>
      </div> : <>
        {!flow.hasOpenSessions && <div className="activity-detail-empty">
          <p>No sessions open right now. Save it to your bucket list.</p>
          <button type="button" className="activity-detail-inline-button" onClick={flow.toggleSaved}
            disabled={flow.saving} aria-label={flow.isSaved ? "Remove from bucket list" : "Save to bucket list"}
            aria-pressed={flow.isSaved}>
            <Heart size={17} fill={flow.isSaved ? "currentColor" : "none"} aria-hidden="true" />
            {flow.isSaved ? "Saved to your bucket list" : "Save to your bucket list"}
          </button>
        </div>}
        {flow.hasOpenSessions && fitCount === 0 && <p className="activity-detail-notice">No sessions fit this group size. Try fewer people.</p>}
        {days.length > 0 &&
          <div>
            {visibleDays.map(([day, daySlots]) => <section className="activity-detail-day" key={day} data-testid={`slot-day-${day}`}>
              <h3 className="activity-detail-day-title">{sessionDayHeading(day)}</h3>
              <div className="activity-detail-times">
                {daySlots.map((slot: AvailabilitySlot) => {
                  const bookable = sessionBookable(slot, qty);
                  const state = sessionAvailability(slot);
                  const selected = selectedSlotId === slot.id && !!selectedSlot;
                  return <button type="button" key={slot.id} disabled={!bookable} onClick={() => flow.selectSlot(slot)}
                    aria-pressed={selected} data-testid={`button-slot-${slot.id}`}
                    className={`activity-detail-time${selected ? " is-selected" : ""}`}>
                    {slot.id === nextSessionId && <span className="activity-detail-next" data-testid="badge-next-session">Next session</span>}
                    <span className="activity-detail-time-label">{formatTime12h(slot.startTime.slice(0, 5))} – {formatTime12h(slot.endTime.slice(0, 5))}</span>
                    <span className={`activity-detail-time-state${state === "Almost full" ? " is-tight" : ""}`}>{state}</span>
                  </button>;
                })}
              </div>
            </section>)}
            {days.length > 7 && <button type="button" className="activity-detail-inline-button" data-testid="button-show-more-dates"
              onClick={() => setShowAllDays(value => !value)}>
              {showAllDays ? "Show fewer dates" : `Show more dates (${days.length - 7} more)`}
            </button>}
          </div>}
      </>}

    {saveProblem && <div className="activity-detail-error" role="alert">
      <p>{saveProblem}</p><button type="button" onClick={flow.retrySave}>Retry</button>
    </div>}
    {flow.panelError && <p className="activity-detail-error" role="alert">{flow.panelError}</p>}
    <button type="button" className="activity-detail-cta" data-testid="button-request-booking" disabled={!canRequest}
      onClick={flow.openRequest}>Request to book</button>
    <p className="activity-detail-disclaimer">The vendor confirms your request. Nothing is charged when you send it.</p>
    <span className="sr-only" aria-live="polite">{selectedSlot ? `Selected ${title} session` : "No session selected"}</span>
  </>;
}

export default function ActivitySessionPanel(props: ActivitySessionPanelProps) {
  const isMobile = useIsMobile();
  const { flow, priceAmount } = props;
  const price = priceText(priceAmount, props.visitorPriceUsd, flow);
  if (!flow.takingBookings) {
    return <div className="activity-detail-offline" role="status">
      <span className="activity-detail-offline-mark" aria-hidden="true" />
      <div><strong>Not taking bookings right now</strong><p>This experience is still here to explore. Check back another time.</p></div>
    </div>;
  }
  if (!isMobile) {
    return <aside className="activity-detail-panel sticky-panel" aria-label="Request a session">
      <PanelContent {...props} />
    </aside>;
  }

  return <>
    <div className="activity-detail-mobile-bar">
      <div className="activity-detail-mobile-price">{price}<small>{priceAmount !== null ? "per person" : "activity price"}</small></div>
      <button type="button" className="activity-detail-cta" onClick={() => flow.setSessionSheetOpen(true)}
        aria-haspopup="dialog" aria-expanded={flow.sessionSheetOpen}>Choose a session</button>
    </div>
    <Dialog open={flow.sessionSheetOpen} onOpenChange={flow.setSessionSheetOpen}>
      <DialogContent className="activity-detail-sheet" aria-describedby="activity-session-sheet-description">
        <DialogHeader>
          <DialogTitle className="text-xl">{props.title}</DialogTitle>
          <DialogDescription id="activity-session-sheet-description">Choose a date and time, then send a request to the vendor.</DialogDescription>
        </DialogHeader>
        <div className="activity-detail-panel"><PanelContent {...props} /></div>
      </DialogContent>
    </Dialog>
  </>;
}
