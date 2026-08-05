import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Clock, MapPin, Users, Shield, Calendar, ArrowLeft, Share2,
  Heart, Minus, Plus, Zap, Copy, Check
} from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { getOpenStatus } from "@/components/experience-card";
import type { Experience, AvailabilitySlot, User as UserType } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useMemo } from "react";
import { toLocalDateStr, formatDayHeading, formatTime12h } from "@/lib/dates";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatPrice } from "@/lib/currency";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const categoryColors: Record<string, string> = {
  sports: "bg-blue-100 text-blue-700",
  adventure: "bg-amber-100 text-amber-700",
  arts: "bg-purple-100 text-purple-700",
  wellness: "bg-emerald-100 text-emerald-700",
  recreation: "bg-rose-100 text-rose-700",
};

const categoryGradients: Record<string, string> = {
  sports: "from-blue-400 to-cyan-500",
  adventure: "from-amber-400 to-orange-500",
  arts: "from-purple-400 to-pink-500",
  wellness: "from-emerald-400 to-teal-500",
  recreation: "from-rose-400 to-red-500",
};

const idealForLabels: Record<string, { emoji: string; label: string }> = {
  friends: { emoji: "👫", label: "Friends" },
  couples: { emoji: "💑", label: "Couples" },
  families: { emoji: "👨‍👩‍👧", label: "Families" },
  teams: { emoji: "🏢", label: "Teams" },
  solo: { emoji: "🧘", label: "Solo" },
};

export default function ExperienceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: user } = useQuery<UserType | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.status === 401) return null;
        return res.json();
      } catch { return null; }
    },
  });

  const { data: experience, isLoading } = useQuery<Experience>({
    queryKey: ["/api/experiences", id],
  });

  const { data: slots } = useQuery<AvailabilitySlot[]>({
    queryKey: ["/api/experiences", id, "slots"],
  });

  const [showAllDays, setShowAllDays] = useState(false);

  // Upcoming slots grouped per day, sorted; full slots kept (rendered disabled).
  const slotDays = useMemo(() => {
    if (!slots) return [] as [string, AvailabilitySlot[]][];
    const today = toLocalDateStr(new Date());
    const upcoming = slots
      .filter((s) => s.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    const byDay = new Map<string, AvailabilitySlot[]>();
    for (const s of upcoming) {
      if (!byDay.has(s.date)) byDay.set(s.date, []);
      byDay.get(s.date)!.push(s);
    }
    return Array.from(byDay.entries());
  }, [slots]);

  // Drop a stale selection if its slot became full/past after a refresh.
  useEffect(() => {
    if (selectedSlot == null || !slots) return;
    const today = toLocalDateStr(new Date());
    const s = slots.find((sl) => sl.id === selectedSlot);
    if (!s || s.status !== "open" || s.capacity <= 0 || s.date < today) {
      setSelectedSlot(null);
    }
  }, [slots, selectedSlot]);

  // Soonest bookable slot gets the "Next session" badge.
  const nextSessionId = useMemo(() => {
    for (const [, daySlots] of slotDays) {
      const open = daySlots.find((s) => s.status === "open" && s.capacity > 0);
      if (open) return open.id;
    }
    return null;
  }, [slotDays]);

  const bookMutation = useMutation({
    mutationFn: async () => {
      const slot = slots?.find(s => s.id === selectedSlot);
      return apiRequest("POST", "/api/bookings", {
        experienceId: Number(id),
        slotId: selectedSlot,
        bookingDate: slot?.date || new Date().toISOString().split("T")[0],
        startTime: slot?.startTime,
        qty,
        totalAmount: experience ? (experience.priceAmount || 0) * qty : 0,
        currencyCode: experience?.currencyCode || "USD",
        customerNote: note || undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Booking requested!", description: "The vendor will confirm your booking shortly." });
      setBookingOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    },
    onError: (err: Error) => {
      toast({ title: "Booking failed", description: err.message, variant: "destructive" });
    },
  });

  const favMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/favorites", { experienceId: Number(id) }),
    onSuccess: () => {
      toast({ title: "Added to your Bucket List!" });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
    onError: (err: Error) => {
      toast({ title: "Could not add to Bucket List", description: err.message, variant: "destructive" });
    },
  });

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: experience?.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "Link copied to clipboard!" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (experience?.title) {
      document.title = `${experience.title} · Free Spirit`;
    }
  }, [experience?.title]);

  const formatDuration = (mins: number) => {
    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m ? `${h}h ${m}min` : `${h} hour${h > 1 ? "s" : ""}`;
    }
    return `${mins} min`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="aspect-[16/7] rounded-2xl mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 text-center">
          <h2 className="text-2xl font-bold mb-4">Experience not found</h2>
          <Link href="/search"><Button className="rounded-xl">Browse Activities</Button></Link>
        </div>
      </div>
    );
  }

  const status = getOpenStatus(experience);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-20">
        <div className="py-3">
          <button onClick={() => window.history.back()} data-testid="button-back" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to results
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative aspect-[16/7] sm:aspect-[16/6] rounded-2xl sm:rounded-3xl overflow-hidden mb-8">
          <img src={experience.imageUrl || "/images/fallback.png"} alt={experience.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          <div className="absolute top-4 left-4 flex gap-2">
            {status.label && (
              <Badge className={`border-0 text-xs font-semibold px-3 py-1.5 shadow-md ${
                status.isOpen ? "bg-green-500 text-white" : "bg-white/95 text-muted-foreground"
              }`}>
                {status.isOpen && <Zap className="w-3 h-3 mr-1" />}
                {status.label}
              </Badge>
            )}
          </div>
          <div className="absolute top-4 right-4 flex gap-2">
            <button onClick={() => favMutation.mutate()} data-testid="button-favorite" title="Add to Bucket List" className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white hover:scale-110 transition-all shadow-md">
              <Heart className="w-5 h-5 text-muted-foreground" />
            </button>
            <button onClick={handleShare} data-testid="button-share" className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white hover:scale-110 transition-all shadow-md">
              {copied ? <Check className="w-5 h-5 text-green-600" /> : <Share2 className="w-5 h-5 text-muted-foreground" />}
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Badge className={`${categoryColors[experience.category] || "bg-gray-100 text-gray-700"} border-0 text-xs font-semibold px-3 py-1`}>
                  {experience.category === "arts" ? "Arts & Classes" : experience.category.charAt(0).toUpperCase() + experience.category.slice(1)}
                </Badge>
                {experience.durationMinutes && (
                  <Badge variant="secondary" className="text-xs gap-1 px-3 py-1 rounded-full">
                    <Clock className="w-3 h-3" /> {formatDuration(experience.durationMinutes)}
                  </Badge>
                )}
                {experience.capacity && (
                  <Badge variant="secondary" className="text-xs gap-1 px-3 py-1 rounded-full">
                    <Users className="w-3 h-3" /> Up to {experience.capacity}
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground mb-4 tracking-tight leading-tight" data-testid="text-experience-title">
                {experience.title}
              </h1>

              {experience.rating != null && (
                <div className="flex items-center gap-2 mb-4" data-testid="text-detail-rating">
                  <span className="text-amber-500 text-xl">★</span>
                  <span className="text-xl font-bold text-foreground">{(experience.rating / 10).toFixed(1)}</span>
                  {experience.reviewCount != null && (
                    <span className="text-muted-foreground">({experience.reviewCount} reviews)</span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                {experience.locationText && (
                  <span className="flex items-center gap-1.5 text-sm">
                    <MapPin className="w-4 h-4 text-primary/70" />
                    {experience.locationText}
                  </span>
                )}
              </div>
            </div>

            {experience.idealForTags && experience.idealForTags.length > 0 && (
              <div className="rounded-2xl bg-muted/40 border border-border/30 p-5">
                <h3 className="text-sm font-semibold text-foreground mb-3">Perfect for</h3>
                <div className="flex flex-wrap gap-2">
                  {experience.idealForTags.map((tag) => {
                    const info = idealForLabels[tag];
                    return (
                      <span key={tag} className="inline-flex items-center gap-1.5 bg-white dark:bg-background px-3.5 py-2 rounded-xl text-sm font-medium text-foreground border border-border/40 shadow-sm">
                        <span>{info?.emoji || "👥"}</span>
                        {info?.label || tag.charAt(0).toUpperCase() + tag.slice(1)}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-lg font-bold text-foreground mb-3">About this experience</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-[15px]">
                {experience.description || "No description provided."}
              </p>
            </div>

            {experience.safetyNotes && (
              <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-amber-900 dark:text-amber-200">Safety Notes</h3>
                </div>
                <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">{experience.safetyNotes}</p>
              </div>
            )}

            {experience.ageMin && (
              <div className="text-sm text-muted-foreground bg-muted/30 rounded-xl px-4 py-3 inline-flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <strong>Minimum age:</strong> {experience.ageMin} years
              </div>
            )}

            {slotDays.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-foreground mb-4">Available Slots</h2>
                <div className="space-y-5">
                  {(showAllDays ? slotDays : slotDays.slice(0, 7)).map(([day, daySlots]) => (
                    <div key={day} data-testid={`slot-day-${day}`}>
                      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        {formatDayHeading(day)}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {daySlots.map((slot) => {
                          const isFull = slot.status !== "open" || slot.capacity <= 0;
                          const almostFull = !isFull && slot.capacity <= 2;
                          return (
                            <button
                              key={slot.id}
                              disabled={isFull}
                              onClick={() => setSelectedSlot(slot.id === selectedSlot ? null : slot.id)}
                              data-testid={`button-slot-${slot.id}`}
                              className={`relative flex flex-col items-start px-4 py-2.5 rounded-xl border-2 transition-all text-left ${
                                isFull
                                  ? "border-border/30 bg-muted/40 opacity-50 cursor-not-allowed"
                                  : selectedSlot === slot.id
                                    ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                                    : "border-border/40 hover:border-primary/40 hover:shadow-sm"
                              }`}
                            >
                              {slot.id === nextSessionId && (
                                <span className="absolute -top-2.5 left-3 px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wide" data-testid="badge-next-session">
                                  Next session
                                </span>
                              )}
                              <span className="text-sm font-semibold">
                                {formatTime12h(slot.startTime)} – {formatTime12h(slot.endTime)}
                              </span>
                              <span className={`text-xs font-medium ${
                                isFull ? "text-muted-foreground" : almostFull ? "text-orange-600" : "text-muted-foreground"
                              }`}>
                                {isFull ? "Full" : almostFull ? `Almost full · ${slot.capacity} ${slot.capacity === 1 ? "spot" : "spots"}` : `${slot.capacity} spots`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {slotDays.length > 7 && (
                  <Button
                    variant="outline"
                    onClick={() => setShowAllDays(!showAllDays)}
                    data-testid="button-show-more-dates"
                    className="mt-4 rounded-xl"
                  >
                    {showAllDays ? "Show fewer dates" : `Show more dates (${slotDays.length - 7} more)`}
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-border/40 bg-white dark:bg-card p-6 space-y-5 shadow-lg shadow-black/5">
              <div>
                <div className="text-3xl font-extrabold text-foreground tracking-tight" data-testid="text-price">
                  {formatPrice(experience.priceAmount, experience.currencyCode)}
                </div>
                <span className="text-sm text-muted-foreground">per person</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2.5 block">Group size</label>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" className="rounded-xl h-10 w-10" onClick={() => setQty(Math.max(1, qty - 1))} data-testid="button-qty-decrease">
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-xl font-bold w-10 text-center" data-testid="text-qty">{qty}</span>
                    <Button variant="outline" size="icon" className="rounded-xl h-10 w-10" onClick={() => setQty(Math.min(experience.capacity || 20, qty + 1))} data-testid="button-qty-increase">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {experience.priceAmount && (
                  <div className="flex items-center justify-between py-3 border-t border-border/40">
                    <span className="text-muted-foreground font-medium">Total</span>
                    <span className="text-2xl font-extrabold text-foreground" data-testid="text-total">
                      {formatPrice(experience.priceAmount * qty, experience.currencyCode)}
                    </span>
                  </div>
                )}

                {user ? (
                  <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full h-13 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90" data-testid="button-request-booking">
                        Request Booking
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-xl">Confirm your booking</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="rounded-xl bg-muted/50 p-4">
                          <h4 className="font-semibold">{experience.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {qty} {qty === 1 ? "person" : "people"} &middot; {formatPrice((experience.priceAmount || 0) * qty, experience.currencyCode)}
                          </p>
                          {selectedSlot && slots && (
                            <p className="text-sm text-muted-foreground">
                              {(() => {
                                const s = slots.find(sl => sl.id === selectedSlot);
                                return s ? `${formatDayHeading(s.date)}, ${formatTime12h(s.startTime)}` : null;
                              })()}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Add a note (optional)</label>
                          <Textarea data-testid="input-booking-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any special requests or details for the vendor..." className="rounded-xl" />
                        </div>
                        <Button className="w-full h-12 rounded-xl font-semibold" onClick={() => bookMutation.mutate()} disabled={bookMutation.isPending} data-testid="button-confirm-booking">
                          {bookMutation.isPending ? "Submitting..." : "Confirm Request"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Link href="/login">
                    <Button className="w-full h-13 rounded-xl text-base font-semibold shadow-lg shadow-primary/20" data-testid="button-login-to-book">
                      Log in to Book
                    </Button>
                  </Link>
                )}

                <Button variant="outline" className="w-full h-11 rounded-xl gap-2 text-sm font-medium" onClick={handleShare} data-testid="button-share-friends">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Share with Friends"}
                </Button>

                <p className="text-xs text-center text-muted-foreground leading-relaxed">
                  You won't be charged yet. The vendor will confirm your request.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
