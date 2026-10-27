import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ExperienceCard from "@/components/experience-card";
import { CATEGORIES, SUPPORTED_CITIES } from "@shared/catalog";
import type { Activity } from "@/lib/discovery";
import { sessionInstant, sriLankaToday } from "@/lib/discovery";
import "@/components/search-stage-three.css";
import { useAuth } from "@/hooks/use-auth";
import { usePricingConfig } from "@/hooks/use-pricing-config";
import { effectiveVisitorPriceLkr } from "@/lib/pricing";

type SearchFilters = {
  city: string;
  group: string;
  time: string;
  date: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  q: string;
  sort: "soonest" | "price";
};

const GROUPS = [
  { value: "", label: "Any group" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3-5", label: "3–5" },
  { value: "6+", label: "6+" },
];

const TIME_CHOICES = [
  { value: "", label: "Any time" },
  { value: "now", label: "Now" },
  { value: "tonight", label: "Tonight" },
  { value: "weekend", label: "Weekend" },
];

const emptyFilters = (): SearchFilters => ({
  city: "",
  group: "",
  time: "",
  date: "",
  category: "",
  minPrice: "",
  maxPrice: "",
  q: "",
  sort: "soonest",
});

function validAmount(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return "";
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount >= 0 ? String(amount) : "";
}

function filtersFromSearch(search: string): SearchFilters {
  const params = new URLSearchParams(search);
  const city = SUPPORTED_CITIES.some((item) => item.name === params.get("city")) ? params.get("city") || "" : "";
  const group = GROUPS.some((item) => item.value && item.value === params.get("group")) ? params.get("group") || "" : "";
  const category = CATEGORIES.some((item) => item.value === params.get("category")) ? params.get("category") || "" : "";
  const date = params.get("date") || "";
  const time = date ? "" : TIME_CHOICES.some((item) => item.value && item.value === params.get("time")) ? params.get("time") || "" : "";
  const minPrice = validAmount(params.get("minPrice"));
  const maxPrice = validAmount(params.get("maxPrice"));
  const sort = params.get("sort") === "price" ? "price" : "soonest";
  return {
    city,
    group,
    time,
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
    category,
    minPrice,
    maxPrice,
    q: params.get("q") || "",
    sort,
  };
}

function toSearchParams(filters: SearchFilters) {
  const params = new URLSearchParams();
  if (filters.city) params.set("city", filters.city);
  if (filters.group) params.set("group", filters.group);
  if (filters.date) params.set("date", filters.date);
  else if (filters.time) params.set("time", filters.time);
  if (filters.category) params.set("category", filters.category);
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.q) params.set("q", filters.q);
  params.set("sort", filters.sort);
  return params;
}

function countActiveFilters(filters: SearchFilters) {
  return [
    filters.city,
    filters.group,
    filters.time || filters.date,
    filters.category,
    filters.minPrice || filters.maxPrice,
    filters.q.trim(),
  ].filter(Boolean).length;
}

function FilterControls({
  filters,
  onChange,
}: {
  filters: SearchFilters;
  onChange: (next: SearchFilters) => void;
}) {
  const update = (patch: Partial<SearchFilters>) => onChange({ ...filters, ...patch });
  return (
    <>
      <label className="search-field">
        <span>City</span>
        <select
          aria-label="City"
          data-testid="select-city"
          value={filters.city}
          onChange={(event) => update({ city: event.target.value })}
        >
          <option value="">All supported cities</option>
          {SUPPORTED_CITIES.map((city) => <option key={city.name} value={city.name}>{city.name}</option>)}
        </select>
      </label>

      <fieldset className="search-filter-group">
        <legend>Group size</legend>
        <div className="search-pill-row">
          {GROUPS.map((option) => (
            <button
              type="button"
              key={option.value || "any"}
              data-testid={`button-group-${option.value || "any"}`}
              aria-pressed={filters.group === option.value}
              className={`search-pill${filters.group === option.value ? " is-selected" : ""}`}
              onClick={() => update({ group: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="search-filter-group">
        <legend>When</legend>
        <div className="search-pill-row search-time-row">
          {TIME_CHOICES.map((option) => (
            <button
              type="button"
              key={option.value || "any"}
              data-testid={`button-time-${option.value || "any"}`}
              aria-pressed={!filters.date && filters.time === option.value}
              className={`search-pill${!filters.date && filters.time === option.value ? " is-selected" : ""}`}
              onClick={() => update({ time: option.value, date: "" })}
            >
              {option.label}
            </button>
          ))}
          <label className={`search-date-choice${filters.date ? " is-selected" : ""}`}>
            <span>Pick a date</span>
            <input
              aria-label="Pick a date"
              data-testid="input-date-filter"
              type="date"
              min={sriLankaToday()}
              value={filters.date}
              onChange={(event) => update({ date: event.target.value, time: "" })}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="search-filter-group search-category-filter">
        <legend>Activity</legend>
        <div className="search-pill-row">
          {CATEGORIES.map((category) => (
            <button
              type="button"
              key={category.value}
              data-testid={`chip-category-${category.value}`}
              aria-pressed={filters.category === category.value}
              className={`search-pill search-category-chip${filters.category === category.value ? " is-selected" : ""}`}
              onClick={() => update({ category: filters.category === category.value ? "" : category.value })}
            >
              {category.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="search-filter-group search-price-filter">
        <legend>Price per person · LKR</legend>
        <div className="search-price-inputs">
          <label>
            <span>Min</span>
            <input
              aria-label="Minimum price in LKR"
              data-testid="input-min-price"
              inputMode="numeric"
              type="number"
              min="0"
              step="1"
              placeholder="Any"
              value={filters.minPrice}
              onChange={(event) => update({ minPrice: validAmount(event.target.value) })}
            />
          </label>
          <span className="search-price-dash" aria-hidden="true">to</span>
          <label>
            <span>Max</span>
            <input
              aria-label="Maximum price in LKR"
              data-testid="input-max-price"
              inputMode="numeric"
              type="number"
              min="0"
              step="1"
              placeholder="Any"
              value={filters.maxPrice}
              onChange={(event) => update({ maxPrice: validAmount(event.target.value) })}
            />
          </label>
        </div>
      </fieldset>
    </>
  );
}

function sortActivities(activities: Activity[], sort: SearchFilters["sort"], visitor: boolean, rate: number | null) {
  return [...activities].sort((a, b) => {
    if (sort === "price") {
      const aPrice = visitor ? effectiveVisitorPriceLkr(a.priceAmount, a.visitorPriceUsd, rate) ?? Number.POSITIVE_INFINITY : a.priceAmount ?? Number.POSITIVE_INFINITY;
      const bPrice = visitor ? effectiveVisitorPriceLkr(b.priceAmount, b.visitorPriceUsd, rate) ?? Number.POSITIVE_INFINITY : b.priceAmount ?? Number.POSITIVE_INFINITY;
      return aPrice - bPrice || a.title.localeCompare(b.title);
    }
    const rawA = a.nextSession ? sessionInstant(a.nextSession) : Number.POSITIVE_INFINITY;
    const rawB = b.nextSession ? sessionInstant(b.nextSession) : Number.POSITIVE_INFINITY;
    const aTime = Number.isFinite(rawA) ? rawA : Number.POSITIVE_INFINITY;
    const bTime = Number.isFinite(rawB) ? rawB : Number.POSITIVE_INFINITY;
    return aTime - bTime || a.title.localeCompare(b.title);
  });
}

export default function SearchPage() {
  const auth = useAuth();
  const pricingConfig = usePricingConfig();
  const search = useSearch();
  const [, navigate] = useLocation();
  const filters = useMemo(() => filtersFromSearch(search), [search]);
  const searchParams = useMemo(() => toSearchParams(filters), [filters]);
  const canonicalSearch = searchParams.toString();
  const apiParams = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.city) params.set("city", filters.city);
    if (filters.group) params.set("group", filters.group);
    if (filters.date) params.set("date", filters.date);
    else if (filters.time) params.set("time", filters.time);
    if (filters.category) params.set("category", filters.category);
    if (filters.q.trim()) params.set("q", filters.q.trim());
    return params.toString();
  }, [filters]);
  const [visibleCount, setVisibleCount] = useState(24);
  const [showSheet, setShowSheet] = useState(false);
  const [draft, setDraft] = useState<SearchFilters>(filters);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const hasOpenedSheet = useRef(false);
  const activeCount = countActiveFilters(filters);
  const hasAppliedFilters = activeCount > 0 || filters.sort !== "soonest";

  useEffect(() => {
    document.title = "Explore activities · Free Spirit";
  }, []);

  useEffect(() => {
    setVisibleCount(24);
  }, [canonicalSearch]);

  useEffect(() => {
    if (!showSheet) {
      if (hasOpenedSheet.current) filterTriggerRef.current?.focus();
      return;
    }
    hasOpenedSheet.current = true;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setDraft(filters);
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowSheet(false);
      if (event.key === "Tab") {
        const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); document.body.style.overflow = originalOverflow; };
  }, [showSheet, filters]);

  const experiencesQuery = useQuery<Activity[]>({
    queryKey: [apiParams ? `/api/experiences?${apiParams}` : "/api/experiences"],
    queryFn: async () => {
      const url = apiParams ? `/api/experiences?${apiParams}` : "/api/experiences";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Could not load activities");
      return response.json();
    },
  });

  const activities = useMemo(() => {
    if (!experiencesQuery.data) return [];
    const min = filters.minPrice ? Number(filters.minPrice) : null;
    const max = filters.maxPrice ? Number(filters.maxPrice) : null;
    const visitor = !!auth.user && !auth.user.isSriLankanResident;
    return sortActivities(
      experiencesQuery.data.filter((activity) =>
        (() => {
          const price = visitor
            ? effectiveVisitorPriceLkr(activity.priceAmount, activity.visitorPriceUsd, pricingConfig.usdToLkrRate)
            : activity.priceAmount;
          return (min === null || (price !== null && price >= min)) &&
            (max === null || (price !== null && price <= max));
        })()
      ),
      filters.sort,
      visitor,
      pricingConfig.usdToLkrRate,
    );
  }, [experiencesQuery.data, filters.minPrice, filters.maxPrice, filters.sort, auth.user?.isSriLankanResident, pricingConfig.usdToLkrRate]);

  const updateUrl = (next: SearchFilters) => {
    navigate(`/search?${toSearchParams(next).toString()}`);
  };

  const clearAll = () => {
    const cleared = emptyFilters();
    if (showSheet) setDraft(cleared);
    else updateUrl(cleared);
  };

  const applyDraft = () => {
    updateUrl(draft);
    setShowSheet(false);
  };

  const filterControls = (
    <FilterControls
      filters={showSheet ? draft : filters}
      onChange={showSheet ? setDraft : updateUrl}
    />
  );

  return (
    <div className="search-page">
      <Navbar />

      <main className="search-main">
        <header className="search-intro">
          <div className="search-eyebrow">Free Spirit · Sri Lanka</div>
          <h1>Find your next session.</h1>
          <p>Real activities, with real sessions to plan around.</p>
          <label className="search-query">
            <SearchIcon size={19} aria-hidden="true" />
            <span className="sr-only">Search activities</span>
            <input
              type="search"
              data-testid="input-search"
              placeholder="Search activities"
              value={filters.q}
              onChange={(event) => updateUrl({ ...filters, q: event.target.value })}
            />
            {filters.q && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => updateUrl({ ...filters, q: "" })}
              >
                <X size={17} aria-hidden="true" />
              </button>
            )}
          </label>
        </header>

        <section className="search-sticky-filters" aria-label="Activity filters">
          <div className="search-filter-inner">
            <div className="search-filter-desktop">{filterControls}</div>
            <button
              ref={filterTriggerRef}
              type="button"
              className="search-mobile-filter-trigger"
              aria-haspopup="dialog"
              aria-label={`Filters (${activeCount})`}
              data-testid="button-toggle-filters"
              onClick={() => setShowSheet(true)}
            >
              <SlidersHorizontal size={17} aria-hidden="true" />
              Filters
              {activeCount > 0 && <span className="search-filter-count">{activeCount}</span>}
            </button>
            {hasAppliedFilters && (
              <button
                type="button"
                className="search-clear-button"
                data-testid="button-clear-filters"
                onClick={clearAll}
              >
                Clear all
              </button>
            )}
          </div>
        </section>

        <section className="search-results" aria-labelledby="search-results-heading">
          <div className="search-results-heading">
            <div>
              <h2 id="search-results-heading" data-testid="text-results-count">
                {experiencesQuery.isLoading ? "Finding activities…" : experiencesQuery.isError ? "Activities" : `${activities.length} ${activities.length === 1 ? "activity" : "activities"}`}
              </h2>
            </div>
            <label className="search-sort">
              <span>Sort</span>
              <select
                aria-label="Sort activities"
                data-testid="select-sort"
                value={filters.sort}
                onChange={(event) => updateUrl({ ...filters, sort: event.target.value as SearchFilters["sort"] })}
              >
                <option value="soonest">Soonest session</option>
                <option value="price">Price: low to high</option>
              </select>
            </label>
          </div>

          {experiencesQuery.isLoading ? (
            <div className="search-card-grid" aria-label="Loading activities" aria-busy="true">
              {Array.from({ length: 8 }, (_, index) => (
                <div className="search-skeleton-card" key={index}>
                  <div className="search-skeleton-image" />
                  <div className="search-skeleton-copy">
                    <span /><span /><span />
                  </div>
                </div>
              ))}
            </div>
          ) : experiencesQuery.isError ? (
            <div className="search-state search-error-state" role="alert">
              <h3>Activities didn’t load.</h3>
              <p>Please try again.</p>
              <button type="button" onClick={() => experiencesQuery.refetch()}>Retry</button>
            </div>
          ) : activities.length === 0 ? (
            <div className="search-state search-empty-state">
              <div className="search-empty-mark" aria-hidden="true" />
              <h3>No activities match these filters</h3>
              {activeCount > 0 && (
                <button type="button" className="search-clear-button" onClick={clearAll}>Clear all filters</button>
              )}
            </div>
          ) : (
            <>
              <div className="search-card-grid">
                {activities.slice(0, visibleCount).map((activity) => (
                  <ExperienceCard key={activity.id} experience={activity} />
                ))}
              </div>
              {visibleCount < activities.length && (
                <div className="search-load-more-wrap">
                  <button
                    type="button"
                    className="search-load-more"
                    data-testid="button-load-more"
                    onClick={() => setVisibleCount((count) => count + 24)}
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          )}
          <p className="search-price-note">Prices are shown per person in whole Sri Lankan rupees.</p>
        </section>
      </main>

      <Footer />

      {showSheet && (
        <div className="search-sheet-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setShowSheet(false);
        }}>
          <section
            ref={sheetRef}
            className="search-filter-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-sheet-title"
          >
            <div className="search-sheet-handle" aria-hidden="true" />
            <header className="search-sheet-header">
              <div>
                <span className="search-eyebrow">Refine your search</span>
                <h2 id="search-sheet-title">Filters</h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                className="search-sheet-close"
                aria-label="Close filters"
                onClick={() => setShowSheet(false)}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </header>
            <div className="search-sheet-content">
              <FilterControls filters={draft} onChange={setDraft} />
            </div>
            <footer className="search-sheet-actions">
              <button type="button" className="search-sheet-clear" onClick={clearAll}>Clear all</button>
              <button type="button" className="search-sheet-apply" data-testid="button-apply-filters" onClick={applyDraft}>Apply</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
