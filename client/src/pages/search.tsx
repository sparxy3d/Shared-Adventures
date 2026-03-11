import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search as SearchIcon, X, MapPin, Sparkles, Clock, Users, SlidersHorizontal } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ExperienceCard from "@/components/experience-card";
import type { Experience, Country } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";

const timeOptions = [
  { value: "", label: "Any Time" },
  { value: "now", label: "Now" },
  { value: "tonight", label: "Tonight" },
  { value: "weekend", label: "Weekend" },
];

const groupOptions = [
  { value: "", label: "Any" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3-5", label: "3–5" },
  { value: "6+", label: "6+" },
];

export default function SearchPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);

  const [category, setCategory] = useState(params.get("category") || "");
  const [country, setCountry] = useState(params.get("country") || "");
  const [city, setCity] = useState(params.get("city") || "");
  const [query, setQuery] = useState(params.get("q") || "");
  const [timeMode, setTimeMode] = useState(params.get("time") || "");
  const [groupSize, setGroupSize] = useState(params.get("group") || "");
  const [showFilters, setShowFilters] = useState(false);

  const queryString = new URLSearchParams({
    ...(category && { category }),
    ...(country && { country }),
    ...(city && { city }),
    ...(query && { q: query }),
  }).toString();

  const { data: experiences, isLoading } = useQuery<Experience[]>({
    queryKey: ["/api/experiences", queryString],
    queryFn: async () => {
      const url = queryString ? `/api/experiences?${queryString}` : "/api/experiences";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch experiences");
      return res.json();
    },
  });

  const { data: countries } = useQuery<Country[]>({
    queryKey: ["/api/countries"],
  });

  const clearFilters = () => {
    setCategory("");
    setCountry("");
    setCity("");
    setQuery("");
    setTimeMode("");
    setGroupSize("");
  };

  const hasFilters = category || country || city || query || timeMode || groupSize;

  const getHeadline = () => {
    if (query) return `Results for "${query}"`;
    if (timeMode === "now") return "Things you can do right now";
    if (timeMode === "tonight") return "Plans for tonight";
    if (timeMode === "weekend") return "Weekend adventures";
    if (category === "sports") return "Sports & active fun";
    if (category === "adventure") return "Adventures waiting for you";
    if (category === "arts") return "Arts & creative classes";
    if (category === "wellness") return "Wellness & relaxation";
    return "What should we do?";
  };

  const getSubheadline = () => {
    if (hasFilters) return `${experiences?.length || 0} experiences found`;
    return "Discover activities that are open, available, and worth doing together.";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="bg-gradient-to-b from-primary/[0.04] via-orange-50/30 to-background dark:from-primary/[0.06] dark:via-background dark:to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-2 tracking-tight" data-testid="text-search-title">
              {getHeadline()}
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg mb-6" data-testid="text-results-count">
              {getSubheadline()}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  data-testid="input-search"
                  placeholder="Search activities, locations..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-11 h-12 rounded-xl bg-white dark:bg-card border-border/50 shadow-sm text-base"
                />
              </div>

              <div className="relative flex-shrink-0 w-full sm:w-auto">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                <Input
                  data-testid="input-city"
                  placeholder="City or location"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="pl-11 h-12 rounded-xl bg-white dark:bg-card border-border/50 shadow-sm sm:w-52"
                />
              </div>

              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={`h-12 rounded-xl gap-2 sm:px-4 border-border/50 ${showFilters ? "bg-primary/5 border-primary/30" : ""}`}
                data-testid="button-toggle-filters"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="sm:hidden">Filters</span>
              </Button>

              {hasFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  data-testid="button-clear-filters"
                  className="h-12 rounded-xl gap-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" /> Clear
                </Button>
              )}
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger data-testid="select-category" className="h-11 rounded-xl bg-white dark:bg-card border-border/50 shadow-sm">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sports">Sports</SelectItem>
                        <SelectItem value="adventure">Adventure</SelectItem>
                        <SelectItem value="arts">Arts & Classes</SelectItem>
                        <SelectItem value="wellness">Wellness</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger data-testid="select-country" className="h-11 rounded-xl bg-white dark:bg-card border-border/50 shadow-sm">
                        <SelectValue placeholder="Country" />
                      </SelectTrigger>
                      <SelectContent>
                        {countries?.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div>
                      <div className="flex gap-1 h-11">
                        {timeOptions.map((t) => (
                          <button
                            key={t.value}
                            data-testid={`button-time-${t.value || "any"}`}
                            onClick={() => setTimeMode(t.value)}
                            className={`flex-1 rounded-lg text-xs font-medium transition-all ${
                              timeMode === t.value
                                ? "bg-primary text-white shadow-sm"
                                : "bg-white dark:bg-card text-muted-foreground hover:text-foreground border border-border/50"
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex gap-1 h-11">
                        {groupOptions.map((g) => (
                          <button
                            key={g.value}
                            data-testid={`button-group-${g.value || "any"}`}
                            onClick={() => setGroupSize(g.value)}
                            className={`flex-1 rounded-lg text-xs font-medium transition-all ${
                              groupSize === g.value
                                ? "bg-primary text-white shadow-sm"
                                : "bg-white dark:bg-card text-muted-foreground hover:text-foreground border border-border/50"
                            }`}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { label: "Sports", cat: "sports" },
                { label: "Adventure", cat: "adventure" },
                { label: "Arts & Classes", cat: "arts" },
                { label: "Wellness", cat: "wellness" },
              ].map((c) => (
                <button
                  key={c.cat}
                  data-testid={`chip-category-${c.cat}`}
                  onClick={() => setCategory(category === c.cat ? "" : c.cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    category === c.cat
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : "bg-white dark:bg-card text-muted-foreground hover:text-foreground border border-border/50 hover:border-primary/30 hover:shadow-sm"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-white dark:bg-card border border-border/40">
                <Skeleton className="aspect-[4/3]" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : experiences && experiences.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {experiences.map((exp, i) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.3) }}
              >
                <ExperienceCard experience={exp} />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <div className="w-20 h-20 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-10 h-10 text-muted-foreground/60" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">No experiences found</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Try adjusting your filters or search terms to discover more activities
            </p>
            {hasFilters && (
              <Button variant="outline" onClick={clearFilters} className="rounded-xl px-6">
                Clear all filters
              </Button>
            )}
          </motion.div>
        )}
      </div>

      <Footer />
    </div>
  );
}
