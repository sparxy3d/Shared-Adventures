import { Link } from "wouter";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import ExperienceCard from "@/components/experience-card";
import type { Experience } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

const categories = [
  {
    name: "Sports",
    slug: "sports",
    description: "Futsal, tennis, badminton, golf & more",
    icon: Dumbbell,
    gradient: "from-blue-500 to-cyan-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    name: "Adventure",
    slug: "adventure",
    description: "Rafting, go-karting, surfing & more",
    icon: Mountain,
    gradient: "from-amber-500 to-orange-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    name: "Arts & Classes",
    slug: "arts",
    description: "Pottery, painting, cooking & more",
    icon: Palette,
    gradient: "from-purple-500 to-pink-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
  {
    name: "Wellness",
    slug: "wellness",
    description: "Yoga, spa, group wellness & more",
    icon: Sparkles,
    gradient: "from-emerald-500 to-teal-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
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
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function Home() {
  const { data: featured, isLoading } = useQuery<Experience[]>({
    queryKey: ["/api/experiences/featured"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-orange-50/50 to-amber-50/30 dark:from-primary/10 dark:via-background dark:to-background" />
        <div className="absolute top-20 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/10 to-orange-200/20 dark:from-primary/5 dark:to-orange-900/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-amber-200/30 to-primary/10 dark:from-amber-900/10 dark:to-primary/5 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 lg:pt-32 lg:pb-28">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeUp} transition={{ duration: 0.6 }}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Make plans that actually happen
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-[1.1] tracking-tight mb-6"
            >
              Book activities that bring{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-500 to-amber-500">
                people closer
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto"
            >
              Discover sports, classes, adventures, and wellness experiences you can enjoy with friends, family, teams, or someone special.
            </motion.p>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/search" data-testid="button-explore-activities">
                <Button size="lg" className="text-base px-8 h-12 rounded-xl gap-2 shadow-lg shadow-primary/25">
                  Explore Activities
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/signup" data-testid="button-list-venue">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-base px-8 h-12 rounded-xl gap-2"
                >
                  List Your Venue
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-background bg-gradient-to-br from-primary/60 to-orange-400/60"
                    />
                  ))}
                </div>
                <span>1,000+ happy groups</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center mb-14"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            <motion.h2
              variants={fadeUp}
              className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
            >
              Find your kind of fun
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="text-muted-foreground text-lg max-w-lg mx-auto"
            >
              Whether it&apos;s action-packed or creatively inspiring, there&apos;s something for every group.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            {categories.map((cat) => (
              <motion.div key={cat.slug} variants={fadeUp} transition={{ duration: 0.4 }}>
                <Link href={`/search?category=${cat.slug}`} data-testid={`card-category-${cat.slug}`}>
                  <div
                    className={`group relative rounded-2xl p-6 ${cat.bg} border border-transparent hover:border-border/50 cursor-pointer transition-all duration-300 hover:shadow-md overflow-hidden`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl bg-white dark:bg-background shadow-sm flex items-center justify-center mb-4">
                        <cat.icon className={`w-6 h-6 ${cat.iconColor}`} />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">{cat.name}</h3>
                      <p className="text-sm text-muted-foreground">{cat.description}</p>
                      <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        Browse <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-20 lg:py-28 bg-muted/30">
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
                Popular experiences
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
                    List Your Venue
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
