import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Store, LayoutGrid, CalendarCheck, Globe, Users, Check, X, Pencil,
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

type ExperienceEditForm = {
  title: string;
  description: string;
  category: string;
  city: string;
  region: string;
  locationText: string;
  priceAmount: string;
  capacity: string;
  durationMinutes: string;
  openTime: string;
  closeTime: string;
  ageMin: string;
  safetyNotes: string;
  imageUrl: string;
  offerLabel: string;
};

const experienceEditForm = (exp: Experience): ExperienceEditForm => ({
  title: exp.title || "",
  description: exp.description || "",
  category: exp.category || "sports",
  city: exp.city || "",
  region: exp.region || "",
  locationText: exp.locationText || "",
  priceAmount: exp.priceAmount == null ? "" : String(exp.priceAmount),
  capacity: exp.capacity == null ? "" : String(exp.capacity),
  durationMinutes: exp.durationMinutes == null ? "" : String(exp.durationMinutes),
  openTime: exp.openTime || "",
  closeTime: exp.closeTime || "",
  ageMin: exp.ageMin == null ? "" : String(exp.ageMin),
  safetyNotes: exp.safetyNotes || "",
  imageUrl: exp.imageUrl || "",
  offerLabel: exp.offerLabel || "",
});

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
  const [experienceDraft, setExperienceDraft] = useState<ExperienceEditForm | null>(null);

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

  const updateExperienceDetails = useMutation({
    mutationFn: ({ expId, changes }: { expId: number; changes: Partial<Experience> }) =>
      apiRequest("PATCH", `/api/admin/experiences/${expId}`, changes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/experiences"] });
      setEditingExperience(null);
      setExperienceDraft(null);
      toast({ title: "Experience updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Could not update experience", description: err.message, variant: "destructive" });
    },
  });

  const getExperienceChanges = () => {
    if (!editingExperience || !experienceDraft) return {};
    const changes: Partial<Experience> = {};
    const stringFields = [
      "title", "description", "category", "city", "region", "locationText",
      "openTime", "closeTime", "safetyNotes", "imageUrl", "offerLabel",
    ] as const;
    for (const field of stringFields) {
      const currentValue = editingExperience[field] ?? "";
      const nextValue = experienceDraft[field];
      if (currentValue !== nextValue) changes[field] = nextValue;
    }
    const numberFields = ["priceAmount", "capacity", "durationMinutes", "ageMin"] as const;
    for (const field of numberFields) {
      const rawValue = experienceDraft[field];
      const nextValue = rawValue === "" ? null : Number(rawValue);
      if (editingExperience[field] !== nextValue) changes[field] = nextValue;
    }
    return changes;
  };

  const saveExperienceDetails = () => {
    if (!editingExperience || !experienceDraft) return;
    if (!experienceDraft.title.trim() || !experienceNumbersValid) return;
    const changes = getExperienceChanges();
    if (Object.keys(changes).length === 0) return;
    updateExperienceDetails.mutate({ expId: editingExperience.id, changes });
  };
  const experienceNumbersValid = !experienceDraft || (
    ["priceAmount", "capacity", "durationMinutes", "ageMin"] as const
  ).every((field) => experienceDraft[field] === "" || (
    /^\d+$/.test(experienceDraft[field]) && Number.isSafeInteger(Number(experienceDraft[field]))
  ));

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
      <div className="pt-8 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg gap-1"
                      data-testid={`button-edit-experience-${exp.id}`}
                      onClick={() => {
                        setEditingExperience(exp);
                        setExperienceDraft(experienceEditForm(exp));
                      }}
                    >
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                  </div>
                </div>
              ))}
              {(!allExperiences || allExperiences.length === 0) && (
                <p className="text-center text-muted-foreground py-8">No experiences yet</p>
              )}
            </div>
            <Dialog
              open={!!editingExperience}
              onOpenChange={(open) => {
                if (!open && !updateExperienceDetails.isPending) {
                  setEditingExperience(null);
                  setExperienceDraft(null);
                }
              }}
            >
              <DialogContent className="max-h-[85vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit experience</DialogTitle>
                </DialogHeader>
                {experienceDraft && (
                  <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveExperienceDetails(); }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <Label htmlFor="admin-exp-title">Title</Label>
                        <Input id="admin-exp-title" value={experienceDraft.title} onChange={(e) => setExperienceDraft({ ...experienceDraft, title: e.target.value })} className="mt-1" data-testid="input-admin-exp-title" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label htmlFor="admin-exp-description">Description</Label>
                        <Textarea id="admin-exp-description" value={experienceDraft.description} onChange={(e) => setExperienceDraft({ ...experienceDraft, description: e.target.value })} className="mt-1" data-testid="input-admin-exp-description" />
                      </div>
                      <div>
                        <Label htmlFor="admin-exp-category">Category</Label>
                        <Select value={experienceDraft.category} onValueChange={(category) => setExperienceDraft({ ...experienceDraft, category })}>
                          <SelectTrigger id="admin-exp-category" className="mt-1" data-testid="select-admin-exp-category">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sports">Sports</SelectItem>
                            <SelectItem value="adventure">Adventure</SelectItem>
                            <SelectItem value="arts">Arts &amp; Classes</SelectItem>
                            <SelectItem value="wellness">Wellness</SelectItem>
                            <SelectItem value="recreation">Recreation</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="admin-exp-city">City</Label>
                        <Input id="admin-exp-city" value={experienceDraft.city} onChange={(e) => setExperienceDraft({ ...experienceDraft, city: e.target.value })} className="mt-1" data-testid="input-admin-exp-city" />
                      </div>
                      <div>
                        <Label htmlFor="admin-exp-region">Region</Label>
                        <Input id="admin-exp-region" value={experienceDraft.region} onChange={(e) => setExperienceDraft({ ...experienceDraft, region: e.target.value })} className="mt-1" data-testid="input-admin-exp-region" />
                      </div>
                      <div>
                        <Label htmlFor="admin-exp-location">Location text</Label>
                        <Input id="admin-exp-location" value={experienceDraft.locationText} onChange={(e) => setExperienceDraft({ ...experienceDraft, locationText: e.target.value })} className="mt-1" data-testid="input-admin-exp-location" />
                      </div>
                      <div>
                        <Label htmlFor="admin-exp-price">Price per person (LKR)</Label>
                        <Input id="admin-exp-price" type="number" min="0" step="1" value={experienceDraft.priceAmount} onChange={(e) => setExperienceDraft({ ...experienceDraft, priceAmount: e.target.value })} className="mt-1" data-testid="input-admin-exp-price" />
                        <p className="text-xs text-muted-foreground mt-1">Whole Sri Lankan rupees, no decimal places.</p>
                      </div>
                      <div>
                        <Label htmlFor="admin-exp-capacity">Capacity</Label>
                        <Input id="admin-exp-capacity" type="number" min="0" step="1" value={experienceDraft.capacity} onChange={(e) => setExperienceDraft({ ...experienceDraft, capacity: e.target.value })} className="mt-1" data-testid="input-admin-exp-capacity" />
                      </div>
                      <div>
                        <Label htmlFor="admin-exp-duration">Duration (minutes)</Label>
                        <Input id="admin-exp-duration" type="number" min="0" step="1" value={experienceDraft.durationMinutes} onChange={(e) => setExperienceDraft({ ...experienceDraft, durationMinutes: e.target.value })} className="mt-1" data-testid="input-admin-exp-duration" />
                      </div>
                      <div>
                        <Label htmlFor="admin-exp-open-time">Opening time</Label>
                        <Input id="admin-exp-open-time" type="time" value={experienceDraft.openTime} onChange={(e) => setExperienceDraft({ ...experienceDraft, openTime: e.target.value })} className="mt-1" data-testid="input-admin-exp-open-time" />
                      </div>
                      <div>
                        <Label htmlFor="admin-exp-close-time">Closing time</Label>
                        <Input id="admin-exp-close-time" type="time" value={experienceDraft.closeTime} onChange={(e) => setExperienceDraft({ ...experienceDraft, closeTime: e.target.value })} className="mt-1" data-testid="input-admin-exp-close-time" />
                      </div>
                      <div>
                        <Label htmlFor="admin-exp-age">Minimum age</Label>
                        <Input id="admin-exp-age" type="number" min="0" step="1" value={experienceDraft.ageMin} onChange={(e) => setExperienceDraft({ ...experienceDraft, ageMin: e.target.value })} className="mt-1" data-testid="input-admin-exp-age" />
                      </div>
                      <div>
                        <Label htmlFor="admin-exp-image">Image URL</Label>
                        <Input id="admin-exp-image" value={experienceDraft.imageUrl} onChange={(e) => setExperienceDraft({ ...experienceDraft, imageUrl: e.target.value })} className="mt-1" data-testid="input-admin-exp-image" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label htmlFor="admin-exp-safety">Safety notes</Label>
                        <Textarea id="admin-exp-safety" value={experienceDraft.safetyNotes} onChange={(e) => setExperienceDraft({ ...experienceDraft, safetyNotes: e.target.value })} className="mt-1" data-testid="input-admin-exp-safety" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label htmlFor="admin-exp-offer">Offer label</Label>
                        <Input id="admin-exp-offer" value={experienceDraft.offerLabel} onChange={(e) => setExperienceDraft({ ...experienceDraft, offerLabel: e.target.value })} className="mt-1" data-testid="input-admin-exp-offer" />
                      </div>
                    </div>
                    {!experienceNumbersValid && (
                      <p className="text-sm text-destructive" role="alert">Price, capacity, duration and minimum age must be whole, non-negative numbers.</p>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        disabled={updateExperienceDetails.isPending}
                        onClick={() => {
                          setEditingExperience(null);
                          setExperienceDraft(null);
                        }}
                        data-testid="button-cancel-edit-experience"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="rounded-xl"
                        disabled={updateExperienceDetails.isPending || !experienceDraft.title.trim() || !experienceNumbersValid || Object.keys(getExperienceChanges()).length === 0}
                        data-testid="button-save-edit-experience"
                      >
                        {updateExperienceDetails.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </form>
                )}
              </DialogContent>
            </Dialog>
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
                      ? `${b.currencyCode || "LKR"} ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(b.totalAmount)}`
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
