import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Store, LayoutGrid, CalendarCheck, Globe, Users, Check, X,
  Shield, TrendingUp
} from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, Vendor, Experience, Country } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: user } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) return null;
      return res.json();
    },
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/admin/stats"],
    enabled: user?.role === "admin",
  });

  const { data: vendors } = useQuery<Vendor[]>({
    queryKey: ["/api/admin/vendors"],
    enabled: user?.role === "admin",
  });

  const { data: allExperiences } = useQuery<Experience[]>({
    queryKey: ["/api/admin/experiences"],
    enabled: user?.role === "admin",
  });

  const { data: allBookings } = useQuery<any[]>({
    queryKey: ["/api/admin/bookings"],
    enabled: user?.role === "admin",
  });

  const { data: countries } = useQuery<Country[]>({
    queryKey: ["/api/countries"],
    enabled: user?.role === "admin",
  });

  const updateVendorStatus = useMutation({
    mutationFn: ({ vendorId, status }: { vendorId: number; status: string }) =>
      apiRequest("PATCH", `/api/admin/vendors/${vendorId}`, { verificationStatus: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/vendors"] });
      toast({ title: "Vendor status updated" });
    },
  });

  const updateExpStatus = useMutation({
    mutationFn: ({ expId, status }: { expId: number; status: string }) =>
      apiRequest("PATCH", `/api/admin/experiences/${expId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/experiences"] });
      toast({ title: "Experience status updated" });
    },
  });

  const [newCountry, setNewCountry] = useState({ name: "", code: "", currencyCode: "" });
  const addCountry = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/countries", newCountry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/countries"] });
      setNewCountry({ name: "", code: "", currencyCode: "" });
      toast({ title: "Country added" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  const verStatusColors: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    rejected: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-foreground mb-8" data-testid="text-admin-title">
          Admin Panel
        </h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <LayoutGrid className="w-3 h-3" /> Experiences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalExperiences || 0}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <CalendarCheck className="w-3 h-3" /> Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalBookings || 0}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Store className="w-3 h-3" /> Vendors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalVendors || 0}</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" /> Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="vendors">
          <TabsList className="mb-6">
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
            <TabsTrigger value="experiences">Experiences</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="countries">Countries</TabsTrigger>
          </TabsList>

          <TabsContent value="vendors">
            <div className="space-y-3">
              {vendors?.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-2xl border border-border p-4 bg-white dark:bg-card">
                  <div>
                    <h3 className="font-semibold">{v.businessName}</h3>
                    <p className="text-sm text-muted-foreground">{v.city}{v.region ? `, ${v.region}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${verStatusColors[v.verificationStatus]} border-0 text-xs capitalize`}>
                      {v.verificationStatus}
                    </Badge>
                    {v.verificationStatus === "pending" && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          className="rounded-lg gap-1"
                          onClick={() => updateVendorStatus.mutate({ vendorId: v.id, status: "approved" })}
                        >
                          <Check className="w-3 h-3" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg gap-1 text-destructive"
                          onClick={() => updateVendorStatus.mutate({ vendorId: v.id, status: "rejected" })}
                        >
                          <X className="w-3 h-3" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(!vendors || vendors.length === 0) && (
                <p className="text-center text-muted-foreground py-8">No vendors yet</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="experiences">
            <div className="space-y-3">
              {allExperiences?.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between rounded-2xl border border-border p-4 bg-white dark:bg-card">
                  <div>
                    <h3 className="font-semibold">{exp.title}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{exp.category} &middot; {exp.city || "No location"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={exp.status}
                      onValueChange={(status) => updateExpStatus.mutate({ expId: exp.id, status })}
                    >
                      <SelectTrigger className="w-32 h-8 rounded-lg text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
              {(!allExperiences || allExperiences.length === 0) && (
                <p className="text-center text-muted-foreground py-8">No experiences yet</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bookings">
            <div className="space-y-3">
              {allBookings?.map((b: any) => (
                <div key={b.id} className="rounded-2xl border border-border p-4 bg-white dark:bg-card">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{b.experience?.title || `Experience #${b.experienceId}`}</h3>
                      <p className="text-sm text-muted-foreground">
                        by {b.customer?.fullName || "Unknown"} &middot; {b.bookingDate}
                      </p>
                    </div>
                    <Badge className="capitalize text-xs border-0">{b.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {b.qty} people &middot;{" "}
                    {b.totalAmount
                      ? new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: b.currencyCode || "USD",
                          minimumFractionDigits: 0,
                        }).format(b.totalAmount / 100)
                      : "Free"}
                  </p>
                </div>
              ))}
              {(!allBookings || allBookings.length === 0) && (
                <p className="text-center text-muted-foreground py-8">No bookings yet</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="countries">
            <div className="rounded-2xl border border-border bg-white dark:bg-card p-6 mb-6">
              <h3 className="font-semibold mb-4">Add Country</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={newCountry.name}
                    onChange={(e) => setNewCountry(p => ({ ...p, name: e.target.value }))}
                    placeholder="Country name"
                    className="h-10 rounded-xl mt-1"
                    data-testid="input-country-name"
                  />
                </div>
                <div>
                  <Label>Code</Label>
                  <Input
                    value={newCountry.code}
                    onChange={(e) => setNewCountry(p => ({ ...p, code: e.target.value }))}
                    placeholder="e.g. US"
                    className="h-10 rounded-xl mt-1"
                    data-testid="input-country-code"
                  />
                </div>
                <div>
                  <Label>Currency</Label>
                  <Input
                    value={newCountry.currencyCode}
                    onChange={(e) => setNewCountry(p => ({ ...p, currencyCode: e.target.value }))}
                    placeholder="e.g. USD"
                    className="h-10 rounded-xl mt-1"
                    data-testid="input-currency-code"
                  />
                </div>
              </div>
              <Button
                className="mt-4 rounded-xl"
                onClick={() => addCountry.mutate()}
                disabled={!newCountry.name || !newCountry.code || !newCountry.currencyCode}
                data-testid="button-add-country"
              >
                Add Country
              </Button>
            </div>

            <div className="space-y-2">
              {countries?.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground ml-2 text-sm">{c.code}</span>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{c.currencyCode}</span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
