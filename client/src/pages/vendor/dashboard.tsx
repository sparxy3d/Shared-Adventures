import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, LayoutGrid, CalendarCheck, Store, ArrowRight, Users } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import type { User, Vendor, Experience } from "@shared/schema";

export default function VendorDashboard() {
  const [, navigate] = useLocation();

  const { data: user } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) return null;
      return res.json();
    },
  });

  const { data: vendor } = useQuery<Vendor | null>({
    queryKey: ["/api/vendor/profile"],
    enabled: !!user,
  });

  const { data: experiences } = useQuery<Experience[]>({
    queryKey: ["/api/vendor/experiences"],
    enabled: !!vendor,
  });

  const { data: bookings } = useQuery<any[]>({
    queryKey: ["/api/vendor/bookings"],
    enabled: !!vendor,
  });

  if (!user) return null;

  if (!vendor) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 max-w-lg mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Store className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Become a Vendor</h1>
          <p className="text-muted-foreground mb-8">
            Set up your vendor profile to start listing activities on Free Spirit.
          </p>
          <Link href="/vendor/profile">
            <Button className="rounded-xl gap-2">
              Create Vendor Profile <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-8 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-vendor-title">
              Vendor Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">{vendor.businessName}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/vendor/experiences/new">
              <Button className="rounded-xl gap-2" data-testid="button-new-experience">
                <Plus className="w-4 h-4" /> New Experience
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-8">
          <Badge
            className={`border-0 ${
              vendor.verificationStatus === "approved"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                : vendor.verificationStatus === "rejected"
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
            }`}
          >
            {vendor.verificationStatus === "approved" ? "Verified" : vendor.verificationStatus === "rejected" ? "Rejected" : "Pending Verification"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Experiences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{experiences?.length || 0}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{bookings?.length || 0}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {bookings?.filter((b: any) => b.status === "requested").length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/vendor/profile">
            <div className="rounded-2xl border border-border p-6 hover:border-primary/50 transition-colors cursor-pointer">
              <Store className="w-6 h-6 text-primary mb-3" />
              <h3 className="font-semibold mb-1">Vendor Profile</h3>
              <p className="text-sm text-muted-foreground">Manage your business information</p>
            </div>
          </Link>
          <Link href="/vendor/experiences">
            <div className="rounded-2xl border border-border p-6 hover:border-primary/50 transition-colors cursor-pointer">
              <LayoutGrid className="w-6 h-6 text-primary mb-3" />
              <h3 className="font-semibold mb-1">Experiences</h3>
              <p className="text-sm text-muted-foreground">Manage your activity listings</p>
            </div>
          </Link>
          <Link href="/vendor/bookings">
            <div className="rounded-2xl border border-border p-6 hover:border-primary/50 transition-colors cursor-pointer">
              <CalendarCheck className="w-6 h-6 text-primary mb-3" />
              <h3 className="font-semibold mb-1">Bookings</h3>
              <p className="text-sm text-muted-foreground">View and manage booking requests</p>
            </div>
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
