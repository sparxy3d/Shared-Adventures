import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ExperienceCard from "@/components/experience-card";
import type { Experience, Country } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

export default function SearchPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);

  const [category, setCategory] = useState(params.get("category") || "");
  const [country, setCountry] = useState(params.get("country") || "");
  const [city, setCity] = useState(params.get("city") || "");
  const [query, setQuery] = useState(params.get("q") || "");

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
  };

  const hasFilters = category || country || city || query;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-8 pb-8 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2" data-testid="text-search-title">
            Explore Activities
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            Find the perfect experience for your group
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-testid="input-search"
                placeholder="Search activities..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-11 rounded-xl"
              />
            </div>

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-category" className="w-full sm:w-44 h-11 rounded-xl">
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
              <SelectTrigger data-testid="select-country" className="w-full sm:w-44 h-11 rounded-xl">
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

            {hasFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                data-testid="button-clear-filters"
                className="h-11 rounded-xl gap-2"
              >
                <X className="w-4 h-4" /> Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-white dark:bg-card border border-border/50">
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
          <>
            <p className="text-sm text-muted-foreground mb-6" data-testid="text-results-count">
              {experiences.length} experience{experiences.length !== 1 ? "s" : ""} found
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {experiences.map((exp) => (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ExperienceCard experience={exp} />
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <SearchIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No experiences found</h3>
            <p className="text-muted-foreground mb-6">Try adjusting your filters or search terms</p>
            {hasFilters && (
              <Button variant="outline" onClick={clearFilters} className="rounded-xl">
                Clear all filters
              </Button>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
