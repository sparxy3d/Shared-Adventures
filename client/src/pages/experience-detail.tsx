import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Clock3, Heart, MapPin, Share2, ShieldCheck } from "lucide-react";
import { categoryLabel, IDEAL_FOR_TAGS } from "@shared/catalog";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ExperienceCard from "@/components/experience-card";
import ActivitySessionPanel from "@/components/activity-session-panel";
import BookingRequestDialog from "@/components/booking-request-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useActivityBooking } from "@/hooks/use-activity-booking";
import { durationLabel } from "@/lib/discovery";
import "./../components/activity-detail-stage-three.css";

const idealForNames: Record<(typeof IDEAL_FOR_TAGS)[number], string> = {
  friends: "Friends", couples: "Couples", families: "Families", teams: "Teams", solo: "Solo",
};

function ActivitySkeleton() {
  return <div className="activity-detail" aria-label="Loading activity">
    <Navbar />
    <main className="activity-detail-shell">
      <div className="activity-detail-skeleton activity-detail-skeleton-photo" />
      <div className="activity-detail-grid">
        <div><div className="activity-detail-skeleton activity-detail-skeleton-line medium" />
          <div className="activity-detail-skeleton activity-detail-skeleton-line wide" />
          <div className="activity-detail-skeleton activity-detail-skeleton-line" style={{ width: "91%" }} />
          <div className="activity-detail-skeleton activity-detail-skeleton-line" style={{ width: "78%", height: 96, marginTop: 32 }} /></div>
        <div className="activity-detail-skeleton activity-detail-skeleton-panel" />
      </div>
    </main>
    <Footer />
  </div>;
}

export default function ExperienceDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const flow = useActivityBooking(id);
  const { toast } = useToast();
  const [shareError, setShareError] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const activity = flow.activity.data;

  useEffect(() => {
    if (activity?.title) document.title = `${activity.title} · Free Spirit`;
  }, [activity?.title]);

  async function shareActivity() {
    setShareError("");
    try {
      if (navigator.share) {
        await navigator.share({ title: activity?.title, url: window.location.href });
        toast({ title: "Share link ready" });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setShareCopied(true);
        toast({ title: "Link copied" });
        window.setTimeout(() => setShareCopied(false), 2200);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareError("The activity link couldn’t be shared. Please try again.");
    }
  }

  if (flow.activity.isLoading) return <ActivitySkeleton />;
  if (flow.unavailable) return <div className="activity-detail"><Navbar /><main className="activity-detail-shell">
    <div className="activity-detail-state"><h1>This activity isn’t available right now</h1><Link href="/search">Explore</Link></div>
  </main><Footer /></div>;
  if (flow.activity.isError || !activity) return <div className="activity-detail"><Navbar /><main className="activity-detail-shell">
    <div className="activity-detail-state"><h1>We couldn’t load this activity.</h1><p>Please try again in a moment.</p>
      <button type="button" onClick={() => { void flow.activity.refetch(); }}>Retry</button></div>
  </main><Footer /></div>;

  const priceAmount = activity.priceAmount ?? null;
  const duration = durationLabel(activity.durationMinutes);
  const idealTags = (activity.idealForTags || []).filter((tag): tag is (typeof IDEAL_FOR_TAGS)[number] =>
    IDEAL_FOR_TAGS.includes(tag as (typeof IDEAL_FOR_TAGS)[number]));

  return <div className="activity-detail">
    <Navbar />
    <main className="activity-detail-shell">
      <div className="activity-detail-topline">
        <Link href="/search" className="activity-detail-back" data-testid="button-back">
          <ArrowLeft size={18} aria-hidden="true" /> Back to results
        </Link>
      </div>

      <div className="activity-detail-photo">
        <img src={activity.imageUrl || "/images/fallback.png"} alt={activity.title}
          onError={event => { if (!event.currentTarget.src.endsWith("/images/fallback.png")) event.currentTarget.src = "/images/fallback.png"; }} />
      </div>
      {shareCopied && <div className="activity-detail-share-toast" role="status">Link copied to clipboard</div>}
      {shareError && <div className="activity-detail-error" role="alert">{shareError} <button type="button" onClick={shareActivity}>Retry</button></div>}
      {(flow.saveError || flow.favoritesError || flow.auth.error) && <div className="activity-detail-error" role="alert">
        {flow.saveError || (flow.auth.error ? "Your account couldn’t be checked." : "Your bucket list couldn’t be loaded.")}
        <button type="button" onClick={flow.retrySave}>Retry</button>
      </div>}

      <div className="activity-detail-grid">
        <article className="activity-detail-main">
          <div className="activity-detail-title-block">
            <div>
            <span className="activity-detail-category">{categoryLabel(activity.category)}</span>
            <h1 data-testid="text-experience-title">{activity.title}</h1>
            <p className="activity-detail-subtitle">
              {activity.city && <span>{activity.city}</span>}
              {duration && <span><Clock3 size={16} aria-hidden="true" />{duration}</span>}
              {flow.capacity !== null && <span>Up to {flow.capacity} people</span>}
            </p>
            {activity.vendorName && <p className="activity-detail-vendor">{activity.vendorName}</p>}
            </div>
            <div className="activity-detail-actions">
              <button type="button" className={`activity-detail-icon-button${flow.isSaved ? " is-saved" : ""}`}
                data-testid="button-favorite" aria-label={flow.isSaved ? "Remove from bucket list" : "Save to bucket list"}
                aria-pressed={flow.isSaved} disabled={flow.saving} onClick={flow.toggleSaved}>
                <Heart size={20} fill={flow.isSaved ? "currentColor" : "none"} aria-hidden="true" />
              </button>
              <button type="button" className="activity-detail-icon-button" data-testid="button-share"
                aria-label="Share this activity" onClick={shareActivity}><Share2 size={19} aria-hidden="true" /></button>
            </div>
          </div>

          <section className="activity-detail-section">
            <h2>About this experience</h2>
            <p className="activity-detail-copy">{activity.description}</p>
          </section>

          {idealTags.length > 0 && <section className="activity-detail-section">
            <h2>Good for</h2>
            <div className="activity-detail-tag-list">
              {idealTags.map(tag => <span className="activity-detail-tag" key={tag}>{idealForNames[tag]}</span>)}
            </div>
          </section>}

          {activity.safetyNotes && <section className="activity-detail-section activity-detail-safety">
            <h2><ShieldCheck size={19} aria-hidden="true" /> Safety notes</h2>
            <p className="activity-detail-copy">{activity.safetyNotes}</p>
          </section>}
          {activity.ageMin != null && <p className="activity-detail-age"><ShieldCheck size={17} aria-hidden="true" />
            Minimum age: {activity.ageMin} years
          </p>}

          {(activity.locationText || activity.city) && <section className="activity-detail-section">
            <h2>Location</h2>
            <div className="activity-detail-location"><MapPin size={19} aria-hidden="true" />
              <span>{[activity.locationText, activity.city].filter(Boolean).join(", ")}</span>
            </div>
          </section>}
        </article>
        <ActivitySessionPanel flow={flow} title={activity.title} priceAmount={priceAmount} visitorPriceUsd={activity.visitorPriceUsd ?? null} />
      </div>

      <section className="activity-detail-related" aria-labelledby="related-activities-title">
        <div className="activity-detail-related-head"><h2 id="related-activities-title">More like this</h2></div>
        {flow.related.isLoading ? <div className="activity-detail-related-grid" aria-label="Loading similar activities">
          {[0, 1, 2, 3].map(item => <Skeleton key={item} className="aspect-[4/5] rounded-2xl bg-slate-200" />)}
        </div> : flow.related.isError ? <div className="activity-detail-empty" role="alert">
          Similar activities couldn’t be loaded. <button type="button" className="activity-detail-inline-button" onClick={() => { void flow.related.refetch(); }}>Retry</button>
        </div> : flow.relatedCards.length > 0 ? <div className="activity-detail-related-grid">
          {flow.relatedCards.map(card => <ExperienceCard key={card.id} experience={card} />)}
        </div> : <div className="activity-detail-empty">
          <p>No similar activities to show just yet.</p><Link className="activity-detail-inline-button" href="/search">Explore activities</Link>
        </div>}
      </section>
    </main>
    <Footer />
    <BookingRequestDialog flow={flow} />
  </div>;
}
