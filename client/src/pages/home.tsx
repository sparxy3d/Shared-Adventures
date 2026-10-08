import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useReducedMotion } from "framer-motion";
import {
  ArrowDown, ArrowRight, CalendarDays, Check, Clock3, Compass,
  Dice5, LocateFixed, MapPin, Search, Users, X,
} from "lucide-react";
import { CATEGORIES, SUPPORTED_CITIES } from "@shared/catalog";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ExperienceCard from "@/components/experience-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useHomepageDiscovery } from "@/hooks/use-homepage-discovery";
import { ideasHeading, nearestCity, sriLankaToday, type Activity, type DiscoveryChoices } from "@/lib/discovery";
import "@/components/homepage.css";

const categoryTiles = {
  sports: { line: "Play together", image: "/images/volleyball.png" },
  adventure: { line: "Feel the thrill", image: "/images/rafting.png" },
  arts: { line: "Create something", image: "/images/pottery.png" },
  wellness: { line: "Unwind together", image: "/images/yoga.png" },
  recreation: { line: "Game night, sorted", image: "/images/recreation.png" },
};
const categories = CATEGORIES.map(category => ({ title: category.label, category: category.value, ...categoryTiles[category.value] }));

const steps = [
  { number: "01", icon: Compass, title: "Discover", copy: "Find activities by place, group size and time." },
  { number: "02", icon: Users, title: "Decide together", copy: "Pick one everyone enjoys, or let us surprise you." },
  { number: "03", icon: Check, title: "Make it happen", copy: "Request your booking; the vendor confirms." },
];

const groupOptions: { value: DiscoveryChoices["group"]; label: string }[] = [
  { value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3-5", label: "3–5" }, { value: "6+", label: "6+" },
];
const timeOptions: { value: DiscoveryChoices["time"]; label: string }[] = [
  { value: "now", label: "Now" }, { value: "tonight", label: "Tonight" }, { value: "weekend", label: "Weekend" },
];

function ActivityGrid({ items, columns = "two" }: { items: Activity[]; columns?: "two" | "four" }) {
  return <div className={`home-activity-grid home-activity-grid--${columns}`}>{items.map((activity) => <ExperienceCard key={activity.id} experience={activity} />)}</div>;
}

function LoadingCards({ count = 2 }: { count?: number }) {
  return <div className="home-activity-grid home-activity-grid--two" aria-label="Loading activities">{Array.from({ length: count }, (_, i) => <Skeleton key={i} className="home-card-skeleton" />)}</div>;
}

export default function Home() {
  const discovery = useHomepageDiscovery();
  const { choices, setChoices, submitted, showIdeas, clearFilters, live, results, fallback, fallbackCards, openNow, nowCards, featured, moreCards, surprise, cityStorageError } = discovery;
  const reduceMotion = useReducedMotion();
  const discoveryRef = useRef<HTMLElement>(null);
  const ideasRef = useRef<HTMLDivElement>(null);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const surpriseRun = useRef(0);
  const [cityFocused, setCityFocused] = useState(false);
  const [cityError, setCityError] = useState("");
  const [surpriseOpen, setSurpriseOpen] = useState(false);
  const [surpriseResult, setSurpriseResult] = useState<Activity | null>(null);
  const [surpriseMessage, setSurpriseMessage] = useState("");
  const [surpriseBusy, setSurpriseBusy] = useState(false);
  const [surpriseExclude, setSurpriseExclude] = useState<number | undefined>();

  useEffect(() => { document.title = "Free Spirit — More moments together"; }, []);

  const scrollToDiscovery = () => discoveryRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  const submitIdeas = () => {
    showIdeas({ ...choices });
    window.setTimeout(() => ideasRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }), 60);
  };
  const chooseCity = (city: string) => {
    setChoices((current) => ({ ...current, city }));
    setCityError("");
    setCityFocused(false);
  };
  const locateMe = () => {
    setCityError("");
    if (!navigator.geolocation) {
      setCityError("Couldn't get your location — pick a city");
      cityInputRef.current?.focus();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => chooseCity(nearestCity(coords.latitude, coords.longitude)),
      () => {
        setCityError("Couldn't get your location — pick a city");
        cityInputRef.current?.focus();
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  };
  const openDatePicker = () => {
    setChoices((current) => ({ ...current, time: "date", date: current.date || sriLankaToday() }));
    const picker = dateRef.current;
    if (!picker) return;
    window.requestAnimationFrame(() => {
      try { if (typeof picker.showPicker === "function") picker.showPicker(); else picker.focus(); }
      catch { picker.focus(); }
    });
  };
  const runSurprise = async (exclude?: number, filters = choices) => {
    const run = ++surpriseRun.current;
    setSurpriseOpen(true);
    setSurpriseBusy(true);
    setSurpriseResult(null);
    setSurpriseMessage("");
    setSurpriseExclude(exclude);
    const revealDelay = reduceMotion ? Promise.resolve() : new Promise<void>((resolve) => window.setTimeout(resolve, 600));
    try {
      const [picked] = await Promise.all([surprise.mutateAsync({ filters: { ...filters }, exclude }), revealDelay]);
      if (run !== surpriseRun.current) return;
      setSurpriseResult(picked);
      if (!picked) setSurpriseMessage("Nothing matches those choices yet.");
    } catch {
      if (run === surpriseRun.current) setSurpriseMessage("Couldn’t pick an activity. Please try again.");
    } finally {
      if (run === surpriseRun.current) setSurpriseBusy(false);
    }
  };
  const closeSurprise = (open: boolean) => {
    setSurpriseOpen(open);
    if (!open) {
      surpriseRun.current += 1;
      setSurpriseBusy(false);
    }
  };
  const weekendSurprise = () => {
    const next = { ...choices, time: "weekend" as const, date: "" };
    setChoices(next);
    void runSurprise(undefined, next);
  };
  const cityMatches = SUPPORTED_CITIES.filter(({ name }) => name.toLowerCase().includes(choices.city.toLowerCase()));
  const liveCount = live.data?.length;

  return (
    <div className="home-stage">
      <Navbar variant="transparent" />
      <main>
        <section className="home-hero" aria-labelledby="home-title">
          <img className="home-hero-photo" src="/images/hero-bg.png" alt="Friends enjoying an outdoor activity together" />
          <div className="home-hero-shade" />
          <div className="home-hero-content">
            <p className="home-handwritten">More moments together</p>
            <h1 id="home-title">Life is better<br /><span>together.</span></h1>
            <p className="home-hero-subtitle">Discover experiences, classes and activities to enjoy with the people who matter.</p>
            <div className="home-hero-actions">
              <Link href="/search" className="home-button home-button--orange">Explore experiences <ArrowRight size={17} aria-hidden="true" /></Link>
              <button type="button" className="home-button home-button--outline" onClick={() => void runSurprise()}> <Dice5 size={17} aria-hidden="true" /> Surprise Us</button>
            </div>
          </div>
          <span className="home-hero-caption">A little plan can turn into a story.</span>
        </section>

        <section ref={discoveryRef} className="home-discovery-wrap" aria-labelledby="discovery-heading">
          <div className="home-discovery-card">
            <div className="home-discovery-intro">
              <div>
                <p className="home-eyebrow">A good place to start</p>
                <h2 id="discovery-heading">What should we do <span>right now?</span></h2>
              </div>
              <span className="home-discovery-mark" aria-hidden="true"><Compass size={22} /></span>
            </div>

            <div className="home-filters">
              <div className="home-city-field">
                <label htmlFor="home-city">Where are you?</label>
                <div className="home-city-input-wrap">
                  <MapPin size={18} aria-hidden="true" />
                  <input
                    ref={cityInputRef}
                    id="home-city"
                    role="combobox"
                    aria-expanded={cityFocused && cityMatches.length > 0}
                    aria-controls="home-city-suggestions"
                    aria-autocomplete="list"
                    value={choices.city}
                    onChange={(event) => { setChoices((current) => ({ ...current, city: event.target.value })); setCityFocused(true); setCityError(""); }}
                    onFocus={() => setCityFocused(true)}
                    onBlur={() => window.setTimeout(() => setCityFocused(false), 140)}
                    placeholder="Choose a city"
                    autoComplete="off"
                  />
                  {choices.city && <button className="home-clear-city" type="button" aria-label="Clear city" onMouseDown={(event) => event.preventDefault()} onClick={() => chooseCity("")}><X size={17} /></button>}
                </div>
                <button className="home-locate" type="button" onClick={locateMe}><LocateFixed size={16} /> <span>Use my location</span></button>
                {cityFocused && cityMatches.length > 0 && <div className="home-city-suggestions" id="home-city-suggestions" role="listbox" aria-label="Suggested cities">{cityMatches.map(({ name }) => <button type="button" role="option" aria-selected={choices.city === name} key={name} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseCity(name)}><MapPin size={15} />{name}</button>)}</div>}
                {(cityError || cityStorageError) && <p className="home-field-error" role="alert">{cityError || cityStorageError}</p>}
              </div>

              <fieldset className="home-choice-field">
                <legend><Users size={16} /> How many people?</legend>
                <div className="home-choice-row" role="group" aria-label="Group size">{groupOptions.map((option) => <button type="button" key={option.value} aria-pressed={choices.group === option.value} className={`home-pill ${choices.group === option.value ? "is-selected" : ""}`} onClick={() => setChoices((current) => ({ ...current, group: option.value }))}>{option.label}</button>)}</div>
              </fieldset>

              <fieldset className="home-choice-field">
                <legend><Clock3 size={16} /> When?</legend>
                <div className="home-choice-row home-time-row" role="group" aria-label="When">{timeOptions.map((option) => <button type="button" key={option.value} aria-pressed={choices.time === option.value} className={`home-pill ${choices.time === option.value ? "is-selected" : ""}`} onClick={() => setChoices((current) => ({ ...current, time: option.value, date: "" }))}>{option.label}</button>)}<button type="button" aria-pressed={choices.time === "date"} className={`home-pill home-date-trigger ${choices.time === "date" ? "is-selected" : ""}`} onClick={openDatePicker}><CalendarDays size={15} />{choices.date ? new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Colombo", day: "numeric", month: "short" }).format(new Date(`${choices.date}T12:00:00+05:30`)) : "Pick a date"}</button></div>
                <input ref={dateRef} className="home-native-date" hidden={choices.time !== "date"} type="date" aria-label="Choose a date" min={sriLankaToday()} value={choices.date} onChange={(event) => { if (event.target.value >= sriLankaToday()) setChoices((current) => ({ ...current, time: "date", date: event.target.value })); }} />
              </fieldset>
            </div>

            <div className="home-discovery-actions">
              <button type="button" className="home-button home-button--orange home-button--wide" onClick={submitIdeas}>
                 <Search size={18} />{live.isFetching ? "Show ideas" : liveCount === undefined ? "Show ideas" : `Show ${liveCount} ${liveCount === 1 ? "idea" : "ideas"}`}
              </button>
              <button type="button" className="home-button home-button--outline home-button--wide" onClick={() => void runSurprise()} disabled={surpriseBusy}><Dice5 size={18} /> Surprise Us</button>
            </div>
            {live.isError && <div className="home-live-error" role="alert">Couldn’t load the live count. <button type="button" onClick={() => void live.refetch()}>Retry</button></div>}
            <p className="home-quiet-note">See what’s open now · Perfect for groups · Instant ideas, less planning</p>
          </div>

          {submitted && <div ref={ideasRef} className="home-ideas" aria-live="polite">
            <div className="home-section-heading home-ideas-heading">
              <div><p className="home-eyebrow">Your ideas</p><h2>{results.isLoading ? "Finding ideas…" : results.isError ? "Your ideas" : ideasHeading(results.data?.length ?? 0, submitted)}</h2></div>
              <button type="button" className="home-text-button" onClick={() => { clearFilters(); window.setTimeout(() => ideasRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }), 60); }}>Clear filters</button>
            </div>
            {results.isLoading ? <LoadingCards /> : results.isError ? <div className="home-inline-error" role="alert"><p>We couldn’t load these ideas.</p><button type="button" className="home-button home-button--outline" onClick={() => void results.refetch()}>Retry</button></div> : results.data?.length ? <ActivityGrid items={results.data} /> : <>
              <div className="home-empty">
                <span className="home-empty-icon"><Search size={22} /></span>
                <h3>Nothing matches right now</h3>
                <p>Try a little more room in your plan.</p>
                <div className="home-empty-actions"><button type="button" className="home-button home-button--orange" onClick={() => showIdeas({ ...submitted, time: "weekend", date: "" })}>Try Weekend</button><button type="button" className="home-button home-button--outline" onClick={() => showIdeas({ ...submitted, city: "" })}>Any city</button></div>
              </div>
              {!fallback.isLoading && fallback.isError && <div className="home-inline-error" role="alert"><p>Couldn’t load next available sessions.</p><button type="button" className="home-button home-button--outline" onClick={() => void fallback.refetch()}>Retry</button></div>}
              {fallback.isLoading ? <LoadingCards /> : fallbackCards.length > 0 && <div className="home-next-available"><p className="home-eyebrow">Next available · same group and city</p><ActivityGrid items={fallbackCards} /></div>}
            </>}
          </div>}
        </section>

        <section className="home-categories home-section-shell" aria-labelledby="categories-title">
          <div className="home-section-heading"><div><h2 id="categories-title">Explore by category</h2></div><Link href="/search" className="home-text-link">Browse all <ArrowRight size={16} /></Link></div>
          <div className="home-category-rail">{categories.map((category) => <Link key={category.category} href={`/search?category=${category.category}`} className="home-category-tile"><img src={category.image} alt={`${category.title} activities`} loading="lazy" /><span className="home-category-shade" /><span className="home-category-copy"><strong>{category.title}</strong><span>{category.line}</span></span><ArrowRight size={18} className="home-category-arrow" aria-hidden="true" /></Link>)}</div>
        </section>

        {(openNow.isLoading || openNow.isError || nowCards.length > 0) && <section className="home-now home-section-shell" aria-label={choices.city ? "Open near you" : "Open now"}>
          {openNow.isError ? <div className="home-data-error" role="alert"><div><p className="home-eyebrow">Session availability</p><h2>Open sessions are taking a moment.</h2></div><button type="button" className="home-button home-button--outline" onClick={() => void openNow.refetch()}>Retry</button></div> : openNow.isLoading ? <><div className="home-section-heading"><div><p className="home-eyebrow">Available sessions</p><h2>Open {choices.city ? "near you" : "now"}</h2></div></div><LoadingCards count={2} /></> : nowCards.length > 0 && <><div className="home-section-heading"><div><p className="home-eyebrow">Available sessions</p><h2 id="open-now-title">Open {choices.city ? "near you" : "now"}</h2></div><span className="home-live-label"><i /> Live</span></div><ActivityGrid items={nowCards} columns="four" /></>}
        </section>}

        <section className="home-featured home-section-shell" aria-labelledby="more-title">
          <div className="home-section-heading"><div><p className="home-eyebrow">Good plans, coming up</p><h2 id="more-title">More to explore</h2></div><Link href="/search" className="home-text-link">See everything <ArrowRight size={16} /></Link></div>
          {featured.isLoading ? <LoadingCards count={4} /> : featured.isError ? <div className="home-data-error" role="alert"><p>Couldn’t load experiences right now.</p><button type="button" className="home-button home-button--outline" onClick={() => void featured.refetch()}>Retry</button></div> : moreCards.length > 0 ? <ActivityGrid items={moreCards} columns="four" /> : <div className="home-light-empty">More sessions will appear here as they become available. <Link href="/search" className="home-text-link">Explore activities</Link></div>}
        </section>

        <section className="home-how" aria-labelledby="how-title">
          <div className="home-section-shell">
            <div className="home-how-intro"><h2 id="how-title">How Free Spirit works</h2></div>
            <div className="home-steps">{steps.map(({ number, icon: Icon, title, copy }) => <article className="home-step" key={number}><span className="home-step-number">{number}</span><span className="home-step-icon"><Icon size={20} /></span><h3>{title}</h3><p>{copy}</p></article>)}</div>
          </div>
        </section>

        <section className="home-final-cta" aria-labelledby="final-cta-title">
          <img src="/images/rafting.png" alt="Rafting together on a river" loading="lazy" />
          <div className="home-final-shade" />
          <div className="home-final-content"><p className="home-eyebrow">Make room for a good story</p><h2 id="final-cta-title">Great memories<br />start with a plan.</h2><div className="home-final-actions"><button type="button" className="home-button home-button--orange" onClick={scrollToDiscovery}>Find something to do <ArrowRight size={17} /></button><Link href="/for-vendors" className="home-button home-button--outline">List your experience</Link></div></div>
        </section>
      </main>
      <Footer />

      <Dialog open={surpriseOpen} onOpenChange={closeSurprise}>
        <DialogContent className="home-surprise-dialog">
          <DialogHeader><p className="home-eyebrow">A little help deciding</p><DialogTitle>Surprise us</DialogTitle><DialogDescription>One real session picked for your group and plans.</DialogDescription></DialogHeader>
          {surpriseBusy ? <div className="home-surprise-loading" aria-live="polite"><Skeleton className="home-shuffle-skeleton" /><span className="home-surprise-die"><Dice5 size={28} /></span><p>Finding a good one…</p></div> : surpriseResult ? <div className="home-surprise-result"><ExperienceCard experience={surpriseResult} /><Link className="home-button home-button--orange home-button--wide" href={`/activity/${surpriseResult.id}`}>View details</Link><button type="button" className="home-button home-button--outline home-button--wide" onClick={() => void runSurprise(surpriseResult.id)}>Try another <Dice5 size={17} /></button></div> : <div className="home-surprise-empty" role={surpriseMessage.startsWith("Couldn’t") ? "alert" : undefined}><p>{surpriseMessage || "Nothing matches those choices yet"}</p><div className="home-empty-actions"><button type="button" className="home-button home-button--orange" onClick={weekendSurprise}>Try Weekend</button><button type="button" className="home-button home-button--outline" onClick={() => void runSurprise(surpriseExclude)}>Retry</button></div></div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
