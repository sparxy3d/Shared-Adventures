import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, X, CalendarCheck, Users } from "lucide-react";
import { Link } from "wouter";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface VendorBooking {
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
  experience: { title: string };
  customer: { fullName: string; email: string };
}

const statusColors: Record<string, string> = {
  requested: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  confirmed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  completed: "bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300",
};

export default function VendorBookings() {
  const { toast } = useToast();

  const { data: bookings, isLoading } = useQuery<VendorBooking[]>({
    queryKey: ["/api/vendor/bookings"],
  });

  const updateStatus = useMutation({
    mutationFn: ({ bookingId, status }: { bookingId: number; status: string }) =>
      apiRequest("PATCH", `/api/vendor/bookings/${bookingId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/bookings"] });
      toast({ title: "Booking updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/vendor">
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">Booking Requests</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        ) : bookings && bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                data-testid={`card-vendor-booking-${booking.id}`}
                className="rounded-2xl border border-border bg-white dark:bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold">{booking.experience.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Booked by {booking.customer.fullName} ({booking.customer.email})
                    </p>
                  </div>
                  <Badge className={`${statusColors[booking.status]} border-0 text-xs capitalize`}>
                    {booking.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <CalendarCheck className="w-3 h-3" />
                    {booking.bookingDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {booking.qty} {booking.qty === 1 ? "person" : "people"}
                  </span>
                  {booking.totalAmount && (
                    <span className="font-medium text-foreground">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: booking.currencyCode || "USD",
                        minimumFractionDigits: 0,
                      }).format(booking.totalAmount / 100)}
                    </span>
                  )}
                </div>

                {booking.customerNote && (
                  <p className="text-sm bg-muted rounded-xl p-3 mb-3">
                    <span className="font-medium">Customer note:</span> {booking.customerNote}
                  </p>
                )}

                {booking.status === "requested" && (
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      className="rounded-xl gap-1"
                      onClick={() => updateStatus.mutate({ bookingId: booking.id, status: "confirmed" })}
                      data-testid={`button-confirm-${booking.id}`}
                    >
                      <Check className="w-3 h-3" /> Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl gap-1 text-destructive"
                      onClick={() => updateStatus.mutate({ bookingId: booking.id, status: "cancelled" })}
                      data-testid={`button-cancel-${booking.id}`}
                    >
                      <X className="w-3 h-3" /> Decline
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <CalendarCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No booking requests</h3>
            <p className="text-muted-foreground">Booking requests will appear here</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
