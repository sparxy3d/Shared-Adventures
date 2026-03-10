import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, Edit, Calendar } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import type { Experience } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  published: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  paused: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export default function VendorExperiences() {
  const { data: experiences, isLoading } = useQuery<Experience[]>({
    queryKey: ["/api/vendor/experiences"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-8 pb-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/vendor">
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </Link>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Experiences</h1>
          <Link href="/vendor/experiences/new">
            <Button className="rounded-xl gap-2" data-testid="button-new-experience">
              <Plus className="w-4 h-4" /> New Experience
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        ) : experiences && experiences.length > 0 ? (
          <div className="space-y-3">
            {experiences.map((exp) => (
              <div
                key={exp.id}
                data-testid={`card-vendor-experience-${exp.id}`}
                className="flex items-center gap-4 rounded-2xl border border-border bg-white dark:bg-card p-4 hover:border-primary/30 transition-colors"
              >
                <div className="w-20 h-16 rounded-xl overflow-hidden flex-shrink-0">
                  {exp.imageUrl ? (
                    <img src={exp.imageUrl} alt={exp.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-orange-200/40 flex items-center justify-center">
                      <span className="text-primary font-bold">{exp.title.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground truncate">{exp.title}</h3>
                    <Badge className={`${statusColors[exp.status]} border-0 text-xs capitalize flex-shrink-0`}>
                      {exp.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground capitalize">{exp.category} &middot; {exp.city || "No location"}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Link href={`/vendor/experiences/${exp.id}/edit`}>
                    <Button variant="outline" size="icon" className="rounded-xl">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href={`/vendor/experiences/${exp.id}/availability`}>
                    <Button variant="outline" size="icon" className="rounded-xl">
                      <Calendar className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <h3 className="text-xl font-semibold mb-2">No experiences yet</h3>
            <p className="text-muted-foreground mb-6">Create your first activity listing</p>
            <Link href="/vendor/experiences/new">
              <Button className="rounded-xl gap-2">
                <Plus className="w-4 h-4" /> Create Experience
              </Button>
            </Link>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
