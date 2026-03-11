import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Users, Heart, Zap, ChevronRight } from "lucide-react";
import type { Experience } from "@shared/schema";
import { motion } from "framer-motion";

const categoryColors: Record<string, string> = {
  sports: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  adventure: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  arts: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  wellness: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

const categoryGradients: Record<string, string> = {
  sports: "from-blue-400 to-cyan-500",
  adventure: "from-amber-400 to-orange-500",
  arts: "from-purple-400 to-pink-500",
  wellness: "from-emerald-400 to-teal-500",
};

const idealForIcons: Record<string, string> = {
  friends: "👫",
  couples: "💑",
  families: "👨‍👩‍👧",
  teams: "🏢",
  solo: "🧘",
};

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

export default function ExperienceCard({ experience }: { experience: Experience }) {
  const formatPrice = (amount: number | null, currency: string | null) => {
    if (!amount) return "Free";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const status = getOpenStatus(experience);

  return (
    <Link href={`/experience/${experience.id}`}>
      <motion.div
        data-testid={`card-experience-${experience.id}`}
        className="group cursor-pointer rounded-2xl overflow-hidden bg-white dark:bg-card border border-border/40 hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 flex flex-col h-full"
        whileHover={{ y: -6 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          {experience.imageUrl ? (
            <img
              src={experience.imageUrl}
              alt={experience.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${categoryGradients[experience.category] || "from-gray-400 to-gray-500"} flex items-center justify-center`}>
              <span className="text-white/80 text-6xl font-light">
                {experience.title.charAt(0)}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

          <div className="absolute top-3 left-3 flex items-center gap-2">
            <Badge className={`${categoryColors[experience.category] || "bg-gray-100 text-gray-700"} border-0 text-xs font-semibold px-2.5 py-1 shadow-sm`}>
              {experience.category === "arts" ? "Arts & Classes" : experience.category.charAt(0).toUpperCase() + experience.category.slice(1)}
            </Badge>
            {status.label && (
              <Badge className={`border-0 text-xs font-semibold px-2.5 py-1 shadow-sm ${
                status.isOpen
                  ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                  : "bg-white/90 text-muted-foreground dark:bg-black/60 dark:text-white/70"
              }`}>
                {status.isOpen && <Zap className="w-3 h-3 mr-1" />}
                {status.label}
              </Badge>
            )}
          </div>

          <div className="absolute top-3 right-3">
            <button
              data-testid={`button-favorite-${experience.id}`}
              className="w-9 h-9 rounded-full bg-white/90 dark:bg-black/50 flex items-center justify-center backdrop-blur-sm hover:bg-white hover:scale-110 transition-all shadow-sm"
              onClick={(e) => e.preventDefault()}
            >
              <Heart className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {experience.durationMinutes && (
            <div className="absolute bottom-3 left-3">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-white bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full">
                <Clock className="w-3 h-3" />
                {experience.durationMinutes >= 60
                  ? `${Math.floor(experience.durationMinutes / 60)}h${experience.durationMinutes % 60 ? ` ${experience.durationMinutes % 60}m` : ""}`
                  : `${experience.durationMinutes}m`}
              </span>
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-bold text-[15px] text-foreground mb-1.5 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
            {experience.title}
          </h3>

          <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-3">
            {experience.city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {experience.city}
              </span>
            )}
            {experience.capacity && (
              <>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 flex-shrink-0" />
                  Up to {experience.capacity}
                </span>
              </>
            )}
          </div>

          {experience.idealForTags && experience.idealForTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {experience.idealForTags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground font-medium"
                >
                  <span className="text-[10px]">{idealForIcons[tag] || "👥"}</span>
                  {tag.charAt(0).toUpperCase() + tag.slice(1)}
                </span>
              ))}
            </div>
          )}

          <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between">
            <div>
              <span className="text-lg font-bold text-foreground">
                {formatPrice(experience.priceAmount, experience.currencyCode)}
              </span>
              <span className="text-[11px] text-muted-foreground ml-1">/ person</span>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              View <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export { getOpenStatus };
