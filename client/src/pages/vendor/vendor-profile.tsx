import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import type { Vendor, Country } from "@shared/schema";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function VendorProfile() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: vendor } = useQuery<Vendor | null>({
    queryKey: ["/api/vendor/profile"],
  });

  const { data: countries } = useQuery<Country[]>({
    queryKey: ["/api/countries"],
  });

  const [form, setForm] = useState({
    businessName: "",
    description: "",
    countryId: "",
    region: "",
    city: "",
    address: "",
    contactEmail: "",
    contactPhone: "",
  });

  useEffect(() => {
    if (vendor) {
      setForm({
        businessName: vendor.businessName,
        description: vendor.description || "",
        countryId: vendor.countryId?.toString() || "",
        region: vendor.region || "",
        city: vendor.city || "",
        address: vendor.address || "",
        contactEmail: vendor.contactEmail || "",
        contactPhone: vendor.contactPhone || "",
      });
    }
  }, [vendor]);

  const saveMutation = useMutation({
    mutationFn: () => {
      const data = {
        ...form,
        countryId: form.countryId ? Number(form.countryId) : undefined,
      };
      return vendor
        ? apiRequest("PATCH", "/api/vendor/profile", data)
        : apiRequest("POST", "/api/vendor/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: vendor ? "Profile updated" : "Vendor profile created!" });
      if (!vendor) navigate("/vendor");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const update = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/vendor">
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">
          {vendor ? "Edit Vendor Profile" : "Create Vendor Profile"}
        </h1>

        <form
          onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}
          className="rounded-2xl border border-border bg-white dark:bg-card p-6 sm:p-8 space-y-5"
        >
          <div>
            <Label>Business Name *</Label>
            <Input
              data-testid="input-business-name"
              value={form.businessName}
              onChange={(e) => update("businessName", e.target.value)}
              className="h-11 rounded-xl mt-1.5"
              required
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              data-testid="input-description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="rounded-xl mt-1.5"
              rows={4}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Country</Label>
              <Select value={form.countryId} onValueChange={(v) => update("countryId", v)}>
                <SelectTrigger className="h-11 rounded-xl mt-1.5">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries?.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>City</Label>
              <Input
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className="h-11 rounded-xl mt-1.5"
              />
            </div>
          </div>
          <div>
            <Label>Region</Label>
            <Input
              value={form.region}
              onChange={(e) => update("region", e.target.value)}
              className="h-11 rounded-xl mt-1.5"
            />
          </div>
          <div>
            <Label>Address</Label>
            <Input
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              className="h-11 rounded-xl mt-1.5"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={form.contactEmail}
                onChange={(e) => update("contactEmail", e.target.value)}
                className="h-11 rounded-xl mt-1.5"
              />
            </div>
            <div>
              <Label>Contact Phone</Label>
              <Input
                value={form.contactPhone}
                onChange={(e) => update("contactPhone", e.target.value)}
                className="h-11 rounded-xl mt-1.5"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="rounded-xl"
            disabled={saveMutation.isPending}
            data-testid="button-save-vendor"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : vendor ? "Save Changes" : "Create Profile"}
          </Button>
        </form>
      </div>
      <Footer />
    </div>
  );
}
