import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, Compass } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const categories = [
  { name: "Sports", slug: "sports" },
  { name: "Adventure", slug: "adventure" },
  { name: "Arts & Classes", slug: "arts" },
  { name: "Wellness", slug: "wellness" },
];

export default function NotFound() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");

  useEffect(() => {
    document.title = "Page not found · Free Spirit";
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    else navigate("/search");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 text-center">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-primary/10 items-center justify-center mb-6">
          <Compass className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-3 tracking-tight" data-testid="text-404-title">
          We couldn't find that page
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg mb-8 max-w-xl mx-auto">
          The page you were looking for doesn't exist (or moved). Try a search, or jump straight into a category below.
        </p>

        <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                data-testid="input-404-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search activities, locations..."
                className="pl-11 h-12 rounded-xl bg-white dark:bg-card border-border/50 shadow-sm text-base"
              />
            </div>
            <Button type="submit" data-testid="button-404-search" className="h-12 px-6 rounded-xl text-base font-semibold">
              Search
            </Button>
          </div>
        </form>

        <div className="flex flex-wrap justify-center gap-2">
          {categories.map((c) => (
            <Link key={c.slug} href={`/search?category=${c.slug}`} data-testid={`chip-404-${c.slug}`}>
              <button className="px-4 py-2 rounded-full text-sm font-medium bg-white dark:bg-card text-muted-foreground hover:text-foreground border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all">
                {c.name}
              </button>
            </Link>
          ))}
        </div>

        <div className="mt-10">
          <Link href="/" data-testid="link-404-home">
            <Button variant="ghost" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to home
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
