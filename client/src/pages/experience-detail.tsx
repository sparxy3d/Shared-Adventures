import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Clock, MapPin, Users, Shield, Calendar, ArrowLeft, Share2,
  Heart, Star, ChevronRight, Minus, Plus
} from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import type { Experience, AvailabilitySlot, User as UserType } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const categoryGradients: Record<string, string> = {
  sports: "from-blue-400 to-cyan-500",
  adventure: "from-amber-400 to-orange-500",
  arts: "from-purple-400 to-pink-500",
  wellness: "from-emerald-400 to-teal-500",
};

export default function ExperienceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

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
      toast({ title: "Added to favorites!" });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
    },
    onError: (err: Error) => {
      toast({ title: "Could not add favorite", description: err.message, variant: "destructive" });
    },
  });

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: experience?.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied to clipboard!" });
    }
  };

  const formatPrice = (amount: number | null, currency: string | null) => {
    if (!amount) return "Free";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
          <Link href="/search">
            <Button>Browse Activities</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="py-4">
          <button
            onClick={() => window.history.back()}
            data-testid="button-back"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative aspect-[16/7] rounded-2xl overflow-hidden mb-8"
        >
          {experience.imageUrl ? (
            <img
              src={experience.imageUrl}
              alt={experience.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${categoryGradients[experience.category] || "from-gray-400 to-gray-500"} flex items-center justify-center`}>
              <span className="text-white/40 text-[120px] font-light">{experience.title.charAt(0)}</span>
            </div>
          )}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => favMutation.mutate()}
              data-testid="button-favorite"
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-sm"
            >
              <Heart className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={handleShare}
              data-testid="button-share"
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-sm"
            >
              <Share2 className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Badge variant="secondary" className="capitalize">
                  {experience.category === "arts" ? "Arts & Classes" : experience.category}
                </Badge>
                {experience.idealForTags?.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4" data-testid="text-experience-title">
                {experience.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                {experience.city && (
                  <span className="flex items-center gap-1.5 text-sm">
                    <MapPin className="w-4 h-4" />
                    {experience.city}{experience.region ? `, ${experience.region}` : ""}
                  </span>
                )}
                {experience.durationMinutes && (
                  <span className="flex items-center gap-1.5 text-sm">
                    <Clock className="w-4 h-4" />
                    {experience.durationMinutes} minutes
                  </span>
                )}
                {experience.capacity && (
                  <span className="flex items-center gap-1.5 text-sm">
                    <Users className="w-4 h-4" />
                    Up to {experience.capacity} people
                  </span>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">About this experience</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {experience.description || "No description provided."}
              </p>
            </div>

            {experience.safetyNotes && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-amber-900 dark:text-amber-200">Safety Notes</h3>
                </div>
                <p className="text-sm text-amber-800 dark:text-amber-300">{experience.safetyNotes}</p>
              </div>
            )}

            {experience.ageMin && (
              <div className="text-sm text-muted-foreground">
                <strong>Minimum age:</strong> {experience.ageMin} years
              </div>
            )}

            {slots && slots.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Available Slots</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {slots.filter(s => s.status === "open").map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlot(slot.id === selectedSlot ? null : slot.id)}
                      data-testid={`button-slot-${slot.id}`}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        selectedSlot === slot.id
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div className="text-left">
                          <div className="text-sm font-medium">{slot.date}</div>
                          <div className="text-xs text-muted-foreground">
                            {slot.startTime} - {slot.endTime}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {slot.capacity} spots
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-border bg-white dark:bg-card p-6 space-y-6">
              <div>
                <div className="text-3xl font-bold text-foreground" data-testid="text-price">
                  {formatPrice(experience.priceAmount, experience.currencyCode)}
                </div>
                <span className="text-sm text-muted-foreground">per person</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Group size</label>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-xl"
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      data-testid="button-qty-decrease"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-lg font-semibold w-8 text-center" data-testid="text-qty">{qty}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-xl"
                      onClick={() => setQty(Math.min(experience.capacity || 20, qty + 1))}
                      data-testid="button-qty-increase"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {experience.priceAmount && (
                  <div className="flex items-center justify-between py-3 border-t border-border">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-xl font-bold text-foreground" data-testid="text-total">
                      {formatPrice(experience.priceAmount * qty, experience.currencyCode)}
                    </span>
                  </div>
                )}

                {user ? (
                  <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full h-12 rounded-xl text-base" data-testid="button-request-booking">
                        Request to Book
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm your booking request</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="rounded-xl bg-muted p-4">
                          <h4 className="font-medium">{experience.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {qty} {qty === 1 ? "person" : "people"} &middot;{" "}
                            {formatPrice((experience.priceAmount || 0) * qty, experience.currencyCode)}
                          </p>
                          {selectedSlot && slots && (
                            <p className="text-sm text-muted-foreground">
                              {slots.find(s => s.id === selectedSlot)?.date},{" "}
                              {slots.find(s => s.id === selectedSlot)?.startTime}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Add a note (optional)</label>
                          <Textarea
                            data-testid="input-booking-note"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Any special requests or details for the vendor..."
                            className="rounded-xl"
                          />
                        </div>
                        <Button
                          className="w-full h-12 rounded-xl"
                          onClick={() => bookMutation.mutate()}
                          disabled={bookMutation.isPending}
                          data-testid="button-confirm-booking"
                        >
                          {bookMutation.isPending ? "Submitting..." : "Confirm Request"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <Link href="/login">
                    <Button className="w-full h-12 rounded-xl text-base" data-testid="button-login-to-book">
                      Log in to Book
                    </Button>
                  </Link>
                )}

                <p className="text-xs text-center text-muted-foreground">
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
