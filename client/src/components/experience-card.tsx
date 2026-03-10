import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Users, Heart } from "lucide-react";
import type { Experience } from "@shared/schema";
import { motion } from "framer-motion";

const categoryColors: Record<string, string> = {
  sports: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  adventure: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  arts: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  wellness: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
};

const categoryGradients: Record<string, string> = {
  sports: "from-blue-400 to-cyan-500",
  adventure: "from-amber-400 to-orange-500",
  arts: "from-purple-400 to-pink-500",
  wellness: "from-emerald-400 to-teal-500",
};

export default function ExperienceCard({ experience }: { experience: Experience }) {
  const formatPrice = (amount: number | null, currency: string | null) => {
    if (!amount) return "Free";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  return (
    <Link href={`/experience/${experience.id}`}>
      <motion.div
        data-testid={`card-experience-${experience.id}`}
        className="group cursor-pointer rounded-2xl overflow-hidden bg-white dark:bg-card border border-border/50 hover:border-border transition-all duration-300 hover:shadow-lg"
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          {experience.imageUrl ? (
            <img
              src={experience.imageUrl}
              alt={experience.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-br ${categoryGradients[experience.category] || "from-gray-400 to-gray-500"} flex items-center justify-center`}
            >
              <span className="text-white/80 text-6xl font-light">
                {experience.title.charAt(0)}
              </span>
            </div>
          )}
          <div className="absolute top-3 left-3">
            <Badge
              className={`${categoryColors[experience.category] || "bg-gray-100 text-gray-700"} border-0 text-xs font-medium px-2.5 py-1`}
            >
              {experience.category === "arts" ? "Arts & Classes" : experience.category.charAt(0).toUpperCase() + experience.category.slice(1)}
            </Badge>
          </div>
          <div className="absolute top-3 right-3">
            <button
              data-testid={`button-favorite-${experience.id}`}
              className="w-8 h-8 rounded-full bg-white/90 dark:bg-black/50 flex items-center justify-center backdrop-blur-sm hover:bg-white transition-colors"
              onClick={(e) => e.preventDefault()}
            >
              <Heart className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="p-4">
          <h3 className="font-semibold text-base text-foreground mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">
            {experience.title}
          </h3>

          <div className="flex items-center gap-3 text-muted-foreground text-xs mb-3">
            {experience.city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {experience.city}
              </span>
            )}
            {experience.durationMinutes && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {experience.durationMinutes} min
              </span>
            )}
            {experience.capacity && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                Up to {experience.capacity}
              </span>
            )}
          </div>

          {experience.idealForTags && experience.idealForTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {experience.idealForTags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <span className="text-lg font-bold text-foreground">
              {formatPrice(experience.priceAmount, experience.currencyCode)}
            </span>
            <span className="text-xs text-muted-foreground">per person</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
