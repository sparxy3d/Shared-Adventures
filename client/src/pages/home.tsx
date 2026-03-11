import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Dumbbell, Mountain, Palette, Sparkles, Search,
  CalendarCheck, Users, ChevronRight, ChevronDown, MapPin,
  Clock, Dice5, Loader2, X, Zap, RefreshCw
} from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ExperienceCard, { getOpenStatus } from "@/components/experience-card";
import type { Experience } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const categories = [
  { name: "Sports", slug: "sports", description: "Futsal, tennis, volleyball, golf & more", icon: Dumbbell, image: "/images/volleyball.png", gradient: "from-blue-600 to-cyan-500" },
  { name: "Adventure", slug: "adventure", description: "Rafting, go-karting, surfing & more", icon: Mountain, image: "/images/rafting.png", gradient: "from-amber-600 to-orange-500" },
  { name: "Arts & Classes", slug: "arts", description: "Pottery, painting, cooking & more", icon: Palette, image: "/images/pottery.png", gradient: "from-purple-600 to-pink-500" },
  { name: "Wellness", slug: "wellness", description: "Yoga, spa, group wellness & more", icon: Sparkles, image: "/images/yoga.png", gradient: "from-emerald-600 to-teal-500" },
];

const steps = [
  { number: "01", icon: Search, title: "Discover Activities", description: "Browse sports, adventures, arts, and wellness experiences in your area." },
  { number: "02", icon: Users, title: "Invite Your People", description: "Share the activity with friends, family, or your team. The more, the merrier." },
  { number: "03", icon: CalendarCheck, title: "Book Together", description: "Request to book for your group. The vendor confirms, and you're all set." },
];

const groupSizes = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3-5", label: "3–5" },
  { value: "6+", label: "6+" },
];

const timeModes = [
  { value: "now", label: "Now", icon: Zap },
  { value: "tonight", label: "Tonight", icon: Clock },
  { value: "weekend", label: "Weekend", icon: CalendarCheck },
];

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

function formatPrice(amount: number | null, currency: string | null) {
  if (!amount) return "Free";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", minimumFractionDigits: 0 }).format(amount / 100);
}

export default function Home() {
  const [, navigate] = useLocation();
  const [heroSearch, setHeroSearch] = useState("");
  const [decisionLocation, setDecisionLocation] = useState("");
  const [decisionGroup, setDecisionGroup] = useState("");
  const [decisionTime, setDecisionTime] = useState("");
  const [showSurprise, setShowSurprise] = useState(false);
  const [surpriseLoading, setSurpriseLoading] = useState(false);
  const [surpriseResult, setSurpriseResult] = useState<Experience | null>(null);
  const decisionRef = useRef<HTMLDivElement>(null);

  const { data: featured, isLoading } = useQuery<Experience[]>({ queryKey: ["/api/experiences/featured"] });

  const openExperiences = featured?.filter((exp) => {
    const s = getOpenStatus(exp);
    return s.isOpen;
  });

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) navigate(`/search?q=${encodeURIComponent(heroSearch.trim())}`);
    else navigate("/search");
  };

  const handleShowIdeas = () => {
    const params = new URLSearchParams();
    if (decisionLocation) params.set("city", decisionLocation);
    if (decisionTime) params.set("time", decisionTime);
    if (decisionGroup) params.set("group", decisionGroup);
    navigate(`/search?${params.toString()}`);
  };

  const handleSurprise = useCallback(async () => {
    setSurpriseLoading(true);
    setSurpriseResult(null);
    setShowSurprise(true);
    await new Promise((r) => setTimeout(r, 1500));
    try {
      const params = new URLSearchParams();
      if (decisionLocation) params.set("city", decisionLocation);
      const res = await fetch(`/api/experiences/surprise?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setSurpriseResult(data);
      }
    } catch {}
    setSurpriseLoading(false);
  }, [decisionLocation]);

  const scrollToDecision = () => {
    decisionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="transparent" />

      <section className="relative min-h-[88vh] sm:min-h-[92vh] flex items-center overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0">
          <img src="/images/hero-bg.png" alt="Adventure background" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
        </div>

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24">
          <motion.div className="max-w-3xl" initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} transition={{ duration: 0.7 }}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-sm font-medium mb-6 border border-white/20">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Activities that bring people closer
              </span>
            </motion.div>

            <motion.h1 variants={fadeUp} transition={{ duration: 0.7, delay: 0.1 }} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-6">
              Adventure{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-primary">Starts Here</span>
            </motion.h1>

            <motion.p variants={fadeUp} transition={{ duration: 0.7, delay: 0.2 }} className="text-lg sm:text-xl text-white/80 leading-relaxed mb-8 max-w-xl">
              Discover unforgettable adventures, classes, sports and wellness experiences to enjoy with the people who matter most.
            </motion.p>

            <motion.form variants={fadeUp} transition={{ duration: 0.7, delay: 0.3 }} className="mb-8" onSubmit={handleHeroSearch}>
              <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input data-testid="input-hero-search" value={heroSearch} onChange={(e) => setHeroSearch(e.target.value)} placeholder="Search by activity, location or category..." className="pl-12 h-13 sm:h-14 rounded-xl sm:rounded-2xl bg-white text-foreground text-base border-0 shadow-2xl placeholder:text-muted-foreground/70" />
                </div>
                <Button type="submit" data-testid="button-hero-search" className="h-13 sm:h-14 px-8 rounded-xl sm:rounded-2xl text-base font-semibold shadow-2xl shadow-primary/30">
                  Search
                </Button>
              </div>
            </motion.form>

            <motion.div variants={fadeUp} transition={{ duration: 0.7, delay: 0.4 }} className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link href="/search" data-testid="button-explore-activities">
                <Button size="lg" className="text-base px-8 h-12 rounded-xl gap-2 shadow-lg shadow-primary/30 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90">
                  Explore Adventures <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" onClick={handleSurprise} data-testid="button-surprise-hero" className="text-base px-8 h-12 rounded-xl gap-2 border-white/30 text-white hover:bg-white/10 hover:text-white bg-white/5 backdrop-blur-sm">
                <Dice5 className="w-4 h-4" /> Surprise Us
              </Button>
            </motion.div>

            <motion.div variants={fadeUp} transition={{ duration: 0.7, delay: 0.5 }} className="mt-10 flex items-center gap-6 text-sm text-white/70">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white/30 bg-gradient-to-br from-primary/80 to-orange-400/80" />
                  ))}
                </div>
                <span>1,000+ happy groups</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span>4.9 average rating</span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          onClick={scrollToDecision}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/60 hover:text-white/90 transition-colors"
          data-testid="button-scroll-down"
        >
          <span className="text-sm font-medium">What should we do right now?</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <ChevronDown className="w-5 h-5" />
          </motion.div>
        </motion.button>
      </section>

      <section ref={decisionRef} className="py-16 lg:py-20 bg-background" data-testid="decision-engine">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger} className="text-center mb-10">
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-3 tracking-tight">
              What should we do{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">right now?</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
              Find something fun near you based on time, location and group size.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white dark:bg-card rounded-3xl shadow-2xl shadow-black/5 border border-border/40 p-6 sm:p-8"
          >
            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    data-testid="input-decision-location"
                    value={decisionLocation}
                    onChange={(e) => setDecisionLocation(e.target.value)}
                    placeholder="Enter city or use current location"
                    className="pl-11 h-12 rounded-xl bg-muted/30 border-border/50 text-base"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-3 block flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" /> Group size
                </label>
                <div className="flex gap-2">
                  {groupSizes.map((g) => (
                    <button
                      key={g.value}
                      data-testid={`button-decision-group-${g.value}`}
                      onClick={() => setDecisionGroup(decisionGroup === g.value ? "" : g.value)}
                      className={`flex-1 h-12 rounded-xl text-sm font-semibold transition-all ${
                        decisionGroup === g.value
                          ? "bg-primary text-white shadow-md shadow-primary/25 scale-[1.02]"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-3 block flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" /> When
                </label>
                <div className="flex gap-2">
                  {timeModes.map((t) => (
                    <button
                      key={t.value}
                      data-testid={`button-decision-time-${t.value}`}
                      onClick={() => setDecisionTime(decisionTime === t.value ? "" : t.value)}
                      className={`flex-1 h-12 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                        decisionTime === t.value
                          ? "bg-primary text-white shadow-md shadow-primary/25 scale-[1.02]"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/30"
                      }`}
                    >
                      <t.icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button onClick={handleShowIdeas} data-testid="button-show-ideas" size="lg" className="flex-1 h-13 rounded-xl text-base font-semibold gap-2 shadow-lg shadow-primary/25 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90">
                  <Search className="w-4 h-4" /> Show Ideas
                </Button>
                <Button onClick={handleSurprise} data-testid="button-surprise-decision" variant="outline" size="lg" className="flex-1 h-13 rounded-xl text-base font-semibold gap-2 border-2 border-primary/20 hover:bg-primary/5">
                  <Dice5 className="w-4 h-4" /> Surprise Us
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-14 lg:py-16 bg-background relative" data-testid="category-shortcuts">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-10" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Find your kind of fun</motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-base">Whether it's action-packed or creatively inspiring</motion.p>
          </motion.div>

          <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={stagger}>
            {categories.map((cat) => (
              <motion.div key={cat.slug} variants={fadeUp} transition={{ duration: 0.5 }}>
                <Link href={`/search?category=${cat.slug}`} data-testid={`card-category-${cat.slug}`}>
                  <div className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 aspect-[4/3] sm:aspect-[3/2]">
                    <img src={cat.image} alt={cat.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className={`absolute inset-0 bg-gradient-to-t ${cat.gradient} opacity-60 group-hover:opacity-70 transition-opacity duration-300`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="relative h-full flex flex-col justify-end p-4 sm:p-5">
                      <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2">
                        <cat.icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-0.5">{cat.name}</h3>
                      <p className="text-xs sm:text-sm text-white/80 line-clamp-1">{cat.description}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {openExperiences && openExperiences.length > 0 && (
        <section className="py-14 lg:py-16 bg-muted/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div className="flex items-end justify-between mb-8 gap-4" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
              <div>
                <motion.div variants={fadeUp} className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-100 text-green-700 border-0 text-xs font-semibold"><Zap className="w-3 h-3 mr-1" />Live</Badge>
                </motion.div>
                <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-foreground">Open Near You</motion.h2>
              </div>
              <motion.div variants={fadeUp}>
                <Link href="/search" data-testid="link-open-near-all">
                  <Button variant="outline" size="sm" className="rounded-xl gap-1 text-xs">View all <ArrowRight className="w-3 h-3" /></Button>
                </Link>
              </motion.div>
            </motion.div>
            <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
              {openExperiences.slice(0, 4).map((exp) => (
                <div key={exp.id} className="min-w-[280px] sm:min-w-0">
                  <ExperienceCard experience={exp} />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-14 lg:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-10 gap-4" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
            <div>
              <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Popular Right Now</motion.h2>
              <motion.p variants={fadeUp} className="text-muted-foreground">Activities people love doing together</motion.p>
            </div>
            <motion.div variants={fadeUp}>
              <Link href="/search" data-testid="link-view-all">
                <Button variant="outline" className="rounded-xl gap-2">View all <ArrowRight className="w-4 h-4" /></Button>
              </Link>
            </motion.div>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
              {[1, 2, 3, 4].map((i) => (
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
          ) : featured && featured.length > 0 ? (
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
              {featured.map((exp) => (
                <motion.div key={exp.id} variants={fadeUp} transition={{ duration: 0.4 }}>
                  <ExperienceCard experience={exp} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">No experiences available yet. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-14" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
            <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold text-foreground mb-3">How it works</motion.h2>
            <motion.p variants={fadeUp} className="text-muted-foreground text-base max-w-lg mx-auto">From discovery to experience in three simple steps</motion.p>
          </motion.div>

          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
            {steps.map((step, index) => (
              <motion.div key={step.number} variants={fadeUp} transition={{ duration: 0.4, delay: index * 0.1 }} className="text-center relative">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] border-t-2 border-dashed border-border" />
                )}
                <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
                  <step.icon className="w-8 h-8 text-primary" />
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{step.number}</span>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">{step.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary via-orange-500 to-amber-500 p-10 sm:p-16 text-center" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={stagger}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_70%)]" />
            <div className="relative">
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                Ready to bring your people together?
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/80 text-lg sm:text-xl mb-8 max-w-2xl mx-auto">
                Join thousands of groups discovering and booking activities worth doing together.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/search" data-testid="button-explore-cta">
                  <Button size="lg" className="bg-white text-foreground hover:bg-white/90 text-base px-8 h-12 rounded-xl shadow-lg">Explore Activities</Button>
                </Link>
                <Link href="/signup" data-testid="button-list-cta">
                  <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10 text-base px-8 h-12 rounded-xl">List Your Experience</Button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />

      <Dialog open={showSurprise} onOpenChange={setShowSurprise}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-0 overflow-hidden border-0" data-testid="surprise-modal">
          {surpriseLoading ? (
            <div className="flex flex-col items-center justify-center py-20 px-8">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <Dice5 className="w-12 h-12 text-primary mb-4" />
              </motion.div>
              <h3 className="text-xl font-bold text-foreground mb-2">Finding something fun...</h3>
              <p className="text-muted-foreground text-sm text-center">
                Picking the perfect activity for you
              </p>
            </div>
          ) : surpriseResult ? (
            <div>
              <div className="relative aspect-[16/9] overflow-hidden">
                {surpriseResult.imageUrl && (
                  <img src={surpriseResult.imageUrl} alt={surpriseResult.title} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute top-4 left-4 flex gap-2">
                  {(() => {
                    const s = getOpenStatus(surpriseResult);
                    return s.label ? (
                      <Badge className={`border-0 text-xs font-semibold shadow-sm ${s.isOpen ? "bg-green-100 text-green-700" : "bg-white/90 text-muted-foreground"}`}>
                        {s.isOpen && <Zap className="w-3 h-3 mr-1" />}{s.label}
                      </Badge>
                    ) : null;
                  })()}
                </div>
                <button onClick={() => setShowSurprise(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1" data-testid="text-surprise-title">{surpriseResult.title}</h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {surpriseResult.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{surpriseResult.city}</span>}
                    {surpriseResult.durationMinutes && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{surpriseResult.durationMinutes}min</span>}
                  </div>
                </div>
                {surpriseResult.idealForTags && surpriseResult.idealForTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {surpriseResult.idealForTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs rounded-full">{tag}</Badge>
                    ))}
                  </div>
                )}
                <div className="text-2xl font-bold text-foreground">
                  {formatPrice(surpriseResult.priceAmount, surpriseResult.currencyCode)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">/ person</span>
                </div>
                <div className="flex gap-3">
                  <Link href={`/experience/${surpriseResult.id}`} className="flex-1">
                    <Button className="w-full h-12 rounded-xl text-base font-semibold" data-testid="button-surprise-view" onClick={() => setShowSurprise(false)}>
                      View Details
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={handleSurprise} className="h-12 rounded-xl gap-2 px-6" data-testid="button-surprise-retry">
                    <RefreshCw className="w-4 h-4" /> Try Another
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 px-8">
              <p className="text-muted-foreground">No experiences found. Try again!</p>
              <Button variant="outline" onClick={handleSurprise} className="mt-4 rounded-xl">Try Again</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
