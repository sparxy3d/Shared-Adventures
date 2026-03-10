import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Dumbbell,
  Mountain,
  Palette,
  Sparkles,
  Search,
  CalendarCheck,
  Users,
  ChevronRight,
  Play,
} from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ExperienceCard from "@/components/experience-card";
import type { Experience } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const categories = [
  {
    name: "Sports",
    slug: "sports",
    description: "Futsal, tennis, badminton, golf & more",
    icon: Dumbbell,
    image: "/images/volleyball.png",
    gradient: "from-blue-600 to-cyan-500",
  },
  {
    name: "Adventure",
    slug: "adventure",
    description: "Rafting, go-karting, surfing & more",
    icon: Mountain,
    image: "/images/rafting.png",
    gradient: "from-amber-600 to-orange-500",
  },
  {
    name: "Arts & Classes",
    slug: "arts",
    description: "Pottery, painting, cooking & more",
    icon: Palette,
    image: "/images/pottery.png",
    gradient: "from-purple-600 to-pink-500",
  },
  {
    name: "Wellness",
    slug: "wellness",
    description: "Yoga, spa, group wellness & more",
    icon: Sparkles,
    image: "/images/yoga.png",
    gradient: "from-emerald-600 to-teal-500",
  },
];

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Discover Activities",
    description: "Browse sports, adventures, arts, and wellness experiences in your area.",
  },
  {
    number: "02",
    icon: Users,
    title: "Invite Your People",
    description: "Share the activity with friends, family, or your team. The more, the merrier.",
  },
  {
    number: "03",
    icon: CalendarCheck,
    title: "Book Together",
    description: "Request to book for your group. The vendor confirms, and you're all set.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();

  const { data: featured, isLoading } = useQuery<Experience[]>({
    queryKey: ["/api/experiences/featured"],
  });

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/search");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="transparent" />

      <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0">
          <img
            src="/images/hero-bg.png"
            alt="Adventure background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
        </div>

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
          <motion.div
            className="max-w-3xl"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp} transition={{ duration: 0.7 }}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-sm font-medium mb-6 border border-white/20">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Activities that bring people closer
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-6"
            >
              Adventure{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-primary">
                Starts Here
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-lg sm:text-xl text-white/80 leading-relaxed mb-8 max-w-xl"
            >
              Discover unforgettable adventures, classes, sports and wellness experiences to enjoy with the people who matter most.
            </motion.p>

            <motion.form
              variants={fadeUp}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mb-8"
              onSubmit={handleHeroSearch}
            >
              <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    data-testid="input-hero-search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by activity, location or category..."
                    className="pl-12 h-13 sm:h-14 rounded-xl sm:rounded-2xl bg-white text-foreground text-base border-0 shadow-2xl placeholder:text-muted-foreground/70"
                  />
                </div>
                <Button
                  type="submit"
                  data-testid="button-hero-search"
                  className="h-13 sm:h-14 px-8 rounded-xl sm:rounded-2xl text-base font-semibold shadow-2xl shadow-primary/30"
                >
                  <Search className="w-4 h-4 mr-2 sm:hidden" />
                  <span className="hidden sm:inline">Search</span>
                  <span className="sm:hidden">Search Activities</span>
                </Button>
              </div>
            </motion.form>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <Link href="/search" data-testid="button-explore-activities">
                <Button
                  size="lg"
                  className="text-base px-8 h-12 rounded-xl gap-2 shadow-lg shadow-primary/30 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90"
                >
                  Explore Adventures
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/signup" data-testid="button-list-venue">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-base px-8 h-12 rounded-xl gap-2 border-white/30 text-white hover:bg-white/10 hover:text-white bg-white/5 backdrop-blur-sm"
                >
                  List Your Experience
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="mt-10 flex items-center gap-6 text-sm text-white/70"
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-white/30 bg-gradient-to-br from-primary/80 to-orange-400/80"
                    />
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
      </section>

      <section className="py-16 lg:py-20 bg-background relative -mt-16 z-10" data-testid="category-shortcuts">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
          >
            {categories.map((cat) => (
              <motion.div key={cat.slug} variants={fadeUp} transition={{ duration: 0.5 }}>
                <Link href={`/search?category=${cat.slug}`} data-testid={`card-category-${cat.slug}`}>
                  <div className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 aspect-[4/3] sm:aspect-[3/2]">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
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

      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            <div>
              <motion.h2
                variants={fadeUp}
                className="text-3xl sm:text-4xl font-bold text-foreground mb-2"
              >
                Popular Experiences
              </motion.h2>
              <motion.p variants={fadeUp} className="text-muted-foreground text-lg">
                Activities people love doing together
              </motion.p>
            </div>
            <motion.div variants={fadeUp}>
              <Link href="/search" data-testid="link-view-all">
                <Button variant="outline" className="rounded-xl gap-2">
                  View all <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
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
          ) : featured && featured.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={stagger}
            >
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

      <section className="py-20 lg:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            <motion.h2
              variants={fadeUp}
              className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
            >
              How it works
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-muted-foreground text-lg max-w-lg mx-auto"
            >
              From discovery to experience in three simple steps
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                variants={fadeUp}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="text-center relative"
              >
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] border-t-2 border-dashed border-border" />
                )}
                <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mb-6">
                  <step.icon className="w-8 h-8 text-primary" />
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary via-orange-500 to-amber-500 p-10 sm:p-16 text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent_70%)]" />
            <div className="relative">
              <motion.h2
                variants={fadeUp}
                className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight"
              >
                Ready to bring your people together?
              </motion.h2>
              <motion.p
                variants={fadeUp}
                className="text-white/80 text-lg sm:text-xl mb-8 max-w-2xl mx-auto"
              >
                Join thousands of groups discovering and booking activities worth doing together.
              </motion.p>
              <motion.div
                variants={fadeUp}
                className="flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <Link href="/search" data-testid="button-explore-cta">
                  <Button
                    size="lg"
                    className="bg-white text-foreground hover:bg-white/90 text-base px-8 h-12 rounded-xl shadow-lg"
                  >
                    Explore Activities
                  </Button>
                </Link>
                <Link href="/signup" data-testid="button-list-cta">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-white/30 text-white hover:bg-white/10 text-base px-8 h-12 rounded-xl"
                  >
                    List Your Experience
                  </Button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
