import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Clock, MapPin, Users, ArrowRight } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@shared/schema";

interface BookingWithExperience {
  id: number;
  experienceId: number;
  bookingDate: string;
  startTime: string | null;
  qty: number;
  totalAmount: number | null;
  currencyCode: string | null;
  status: string;
  customerNote: string | null;
  vendorNote: string | null;
  createdAt: string;
  experience: {
    id: number;
    title: string;
    category: string;
    imageUrl: string | null;
    city: string | null;
    durationMinutes: number | null;
  };
}

const statusColors: Record<string, string> = {
  requested: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  confirmed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  completed: "bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300",
};

export default function MyBookings() {
  const [, navigate] = useLocation();

  const { data: user } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) return null;
      return res.json();
    },
  });

  const { data: bookings, isLoading } = useQuery<BookingWithExperience[]>({
    queryKey: ["/api/bookings"],
    enabled: !!user,
  });

  if (!user && !isLoading) {
    navigate("/login");
    return null;
  }

  const formatPrice = (amount: number | null, currency: string | null) => {
    if (!amount) return "Free";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-8 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-foreground mb-8" data-testid="text-bookings-title">My Bookings</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        ) : bookings && bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                data-testid={`card-booking-${booking.id}`}
                className="flex flex-col sm:flex-row gap-4 rounded-2xl border border-border bg-white dark:bg-card p-4 sm:p-5 hover:border-primary/30 transition-colors"
              >
                <div className="w-full sm:w-32 h-24 sm:h-auto rounded-xl overflow-hidden flex-shrink-0">
                  {booking.experience.imageUrl ? (
                    <img
                      src={booking.experience.imageUrl}
                      alt={booking.experience.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/30 to-orange-300/30 flex items-center justify-center">
                      <CalendarCheck className="w-6 h-6 text-primary" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <Link href={`/experience/${booking.experienceId}`}>
                      <h3 className="font-semibold text-foreground hover:text-primary transition-colors">
                        {booking.experience.title}
                      </h3>
                    </Link>
                    <Badge className={`${statusColors[booking.status]} border-0 text-xs capitalize flex-shrink-0`}>
                      {booking.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1">
                      <CalendarCheck className="w-3 h-3" />
                      {booking.bookingDate}
                    </span>
                    {booking.startTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {booking.startTime}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {booking.qty} {booking.qty === 1 ? "person" : "people"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">
                      {formatPrice(booking.totalAmount, booking.currencyCode)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <CalendarCheck className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No bookings yet</h3>
            <p className="text-muted-foreground mb-6">Discover activities and make your first booking</p>
            <Link href="/search">
              <Button className="rounded-xl gap-2">
                Explore Activities <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
