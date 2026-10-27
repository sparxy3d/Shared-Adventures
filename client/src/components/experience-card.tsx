import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Heart, ArrowUpRight } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { Experience } from "@shared/schema";
import { categoryLabel } from "@shared/catalog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPrice } from "@/lib/currency";
import { durationLabel, sessionChip, type Activity } from "@/lib/discovery";
import { usePricingConfig } from "@/hooks/use-pricing-config";
import { useSiteConfig } from "@/hooks/use-site-config";
import NotifyDialog from "@/components/notify-dialog";
import { formatLkr, formatUsd, validExchangeRate } from "@/lib/pricing";
import "./activity-card.css";

interface SavedActivity { experienceId: number }

export default function ExperienceCard({ experience, saved, onRemove, removePending }: {
  experience: Activity; saved?: boolean; onRemove?: () => void; removePending?: boolean; memberView?: boolean;
}) {
  const { user, isLoading: authLoading, error: authError, retry: retryAuth } = useAuth();
  const pricingConfig = usePricingConfig();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState("");
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const siteConfig = useSiteConfig();
  const bookingsOpen = siteConfig.data?.bookingsOpen === true;
  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const favorites = useQuery<SavedActivity[]>({ queryKey: ["/api/favorites"], enabled: !!user });
  const isSaved = saved ?? favorites.data?.some(f => f.experienceId === experience.id) ?? false;
  const toggle = useMutation({
    mutationFn: async () => {
      await apiRequest(isSaved ? "DELETE" : "POST", isSaved ? `/api/favorites/${experience.id}` : "/api/favorites", isSaved ? undefined : { experienceId: experience.id });
    },
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({ title: isSaved ? "Removed from your bucket list" : "Saved to your bucket list" });
    },
    onError: () => setError("Your bucket list couldn’t be updated. Please try again."),
  });
  const chip = sessionChip(experience.nextSession, clock);
  const visitorPrice = experience.visitorPriceUsd ?? null;
  const visitorLkr = visitorPrice !== null && validExchangeRate(pricingConfig.usdToLkrRate)
    ? visitorPrice * pricingConfig.usdToLkrRate : null;
  const showingVisitorPrice = !!user && !user.isSriLankanResident && visitorLkr !== null;
  const mainPrice = showingVisitorPrice ? formatUsd(visitorPrice as number) : formatPrice(experience.priceAmount, "LKR");
  const href = `/activity/${experience.id}`;
  function onHeart() {
    if (authError) { retryAuth(); return; }
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (onRemove) onRemove();
    else if (favorites.isError) favorites.refetch();
    else toggle.mutate();
  }
  return <article className="activity-card" data-testid={`card-experience-${experience.id}`}>
    <div className="activity-card-photo">
      <Link href={href} aria-label={`View ${experience.title}`}>
        <img src={experience.imageUrl || "/images/fallback.png"} srcSet={(experience as Activity & { photoSrcSet?: string | null }).photoSrcSet || undefined}
          sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" alt={experience.title} loading="lazy"
          onError={event => { if (!event.currentTarget.src.endsWith("/images/fallback.png")) event.currentTarget.src = "/images/fallback.png"; }} />
      </Link>
      <div className="activity-card-badges">
        {chip && <span data-testid={`chip-session-${experience.id}`}>{chip}</span>}
        <span>{categoryLabel(experience.category)}</span>
      </div>
      <button type="button" className={`activity-card-heart${isSaved ? " is-saved" : ""}`}
        data-testid={`button-favorite-${experience.id}`} aria-pressed={isSaved}
        aria-label={isSaved ? `Remove ${experience.title} from bucket list` : `Save ${experience.title} to bucket list`}
        disabled={authLoading || toggle.isPending || removePending || (!!user && favorites.isLoading)}
        onClick={onHeart}>
        <Heart size={20} fill={isSaved ? "currentColor" : "none"} aria-hidden="true" />
      </button>
    </div>
    <div className="activity-card-body">
      <h3><Link href={href}>{experience.title}</Link></h3>
      <p className="activity-card-meta">{[experience.city, durationLabel(experience.durationMinutes)].filter(Boolean).join(" · ")}</p>
      <div className="activity-card-bottom">
        <div>
          <p><strong>{mainPrice}</strong><span>{showingVisitorPrice ? " per person" : " / person"}</span></p>
          {showingVisitorPrice && <small>(about {formatLkr(visitorLkr as number)})</small>}
          {!user && visitorPrice !== null && validExchangeRate(pricingConfig.usdToLkrRate) && <small>Visitors: {formatUsd(visitorPrice)}</small>}
          {user && !user.isSriLankanResident && visitorPrice !== null && visitorLkr === null && <small>Resident price shown. Visitor pricing is unavailable right now.</small>}
        </div>
        <Link href={href} className="activity-card-view" aria-label={`View ${experience.title}`}>View <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
      {!bookingsOpen && <div className="activity-card-booking">
        <span>Bookings open soon</span>
        <button type="button" onClick={() => setNotifyOpen(true)} aria-label={`Get notified when bookings open for ${experience.title}`}>Notify me</button>
      </div>}
      {(error || authError || favorites.isError) && <div role="alert" className="activity-card-error">
        <p>{error || (authError ? "Your account couldn’t be checked." : "Your bucket list couldn’t be loaded.")}</p>
        <button type="button" onClick={() => error ? toggle.mutate() : authError ? retryAuth() : favorites.refetch()}>Retry</button>
      </div>}
    </div>
    <NotifyDialog experienceId={experience.id} title={experience.title} open={notifyOpen} onOpenChange={setNotifyOpen} />
  </article>;
}

// Compatibility only for the existing detail page, outside Stage 2's scope.
// Activity cards and homepage discovery never use opening hours as availability.
function getOpenStatus(exp: Experience): { label: string; isOpen: boolean } {
  if (!exp.openTime || !exp.closeTime) {
    return { label: exp.nextSessionText || "", isOpen: false };
  }
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const current = h * 60 + m;
  const [oh, om] = exp.openTime.split(":").map(Number);
  const [ch, cm] = exp.closeTime.split(":").map(Number);
  const open = oh * 60 + om;
  const close = ch * 60 + cm;
  if (current >= open && current < close) {
    return { label: "Open Now", isOpen: true };
  }
  return { label: exp.nextSessionText || `Opens ${exp.openTime}`, isOpen: false };
}
export { getOpenStatus };
