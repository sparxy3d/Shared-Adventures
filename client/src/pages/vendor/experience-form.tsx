import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import type { Experience, Country } from "@shared/schema";
import { Loader2, ArrowLeft } from "lucide-react";

const idealForOptions = ["friends", "couples", "families", "teams", "solo"];

export default function ExperienceForm() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEdit = !!id;

  const { data: existing } = useQuery<Experience>({
    queryKey: ["/api/vendor/experiences", id],
    enabled: isEdit,
  });

  const { data: countries } = useQuery<Country[]>({
    queryKey: ["/api/countries"],
  });

  const [form, setForm] = useState({
    title: "",
    category: "sports",
    description: "",
    locationText: "",
    countryId: "",
    region: "",
    city: "",
    durationMinutes: "",
    priceAmount: "",
    currencyCode: "USD",
    capacity: "",
    ageMin: "",
    safetyNotes: "",
    idealForTags: [] as string[],
    status: "draft",
    imageUrl: "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title,
        category: existing.category,
        description: existing.description || "",
        locationText: existing.locationText || "",
        countryId: existing.countryId?.toString() || "",
        region: existing.region || "",
        city: existing.city || "",
        durationMinutes: existing.durationMinutes?.toString() || "",
        priceAmount: existing.priceAmount ? (existing.priceAmount / 100).toString() : "",
        currencyCode: existing.currencyCode || "USD",
        capacity: existing.capacity?.toString() || "",
        ageMin: existing.ageMin?.toString() || "",
        safetyNotes: existing.safetyNotes || "",
        idealForTags: existing.idealForTags || [],
        status: existing.status,
        imageUrl: existing.imageUrl || "",
      });
    }
  }, [existing]);

  const mutation = useMutation({
    mutationFn: () => {
      const data = {
        ...form,
        countryId: form.countryId ? Number(form.countryId) : undefined,
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : undefined,
        priceAmount: form.priceAmount ? Math.round(Number(form.priceAmount) * 100) : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        ageMin: form.ageMin ? Number(form.ageMin) : undefined,
      };
      return isEdit
        ? apiRequest("PATCH", `/api/vendor/experiences/${id}`, data)
        : apiRequest("POST", "/api/vendor/experiences", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/experiences"] });
      toast({ title: isEdit ? "Experience updated" : "Experience created!" });
      navigate("/vendor/experiences");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const update = (key: string, value: any) => setForm((p) => ({ ...p, [key]: value }));

  const toggleTag = (tag: string) => {
    setForm((p) => ({
      ...p,
      idealForTags: p.idealForTags.includes(tag)
        ? p.idealForTags.filter((t) => t !== tag)
        : [...p.idealForTags, tag],
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-8 pb-20 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/vendor/experiences">
          <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Experiences
          </button>
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-8">
          {isEdit ? "Edit Experience" : "Create Experience"}
        </h1>

        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
          className="rounded-2xl border border-border bg-white dark:bg-card p-6 sm:p-8 space-y-5"
        >
          <div>
            <Label>Title *</Label>
            <Input
              data-testid="input-title"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              className="h-11 rounded-xl mt-1.5"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => update("category", v)}>
                <SelectTrigger className="h-11 rounded-xl mt-1.5" data-testid="select-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="adventure">Adventure</SelectItem>
                  <SelectItem value="arts">Arts & Classes</SelectItem>
                  <SelectItem value="wellness">Wellness</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v)}>
                <SelectTrigger className="h-11 rounded-xl mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Submit for Review</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              data-testid="input-description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              className="rounded-xl mt-1.5"
              rows={5}
            />
          </div>

          <div>
            <Label>Image URL</Label>
            <Input
              value={form.imageUrl}
              onChange={(e) => update("imageUrl", e.target.value)}
              placeholder="https://..."
              className="h-11 rounded-xl mt-1.5"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Price (in dollars)</Label>
              <Input
                type="number"
                step="0.01"
                data-testid="input-price"
                value={form.priceAmount}
                onChange={(e) => update("priceAmount", e.target.value)}
                className="h-11 rounded-xl mt-1.5"
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={form.currencyCode} onValueChange={(v) => update("currencyCode", v)}>
                <SelectTrigger className="h-11 rounded-xl mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="LKR">LKR</SelectItem>
                  <SelectItem value="AUD">AUD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={form.durationMinutes}
                onChange={(e) => update("durationMinutes", e.target.value)}
                className="h-11 rounded-xl mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Capacity</Label>
              <Input
                type="number"
                value={form.capacity}
                onChange={(e) => update("capacity", e.target.value)}
                className="h-11 rounded-xl mt-1.5"
              />
            </div>
            <div>
              <Label>Minimum Age</Label>
              <Input
                type="number"
                value={form.ageMin}
                onChange={(e) => update("ageMin", e.target.value)}
                className="h-11 rounded-xl mt-1.5"
              />
            </div>
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
            <Label>Location Description</Label>
            <Input
              value={form.locationText}
              onChange={(e) => update("locationText", e.target.value)}
              placeholder="Detailed location / address"
              className="h-11 rounded-xl mt-1.5"
            />
          </div>

          <div>
            <Label>Safety Notes</Label>
            <Textarea
              value={form.safetyNotes}
              onChange={(e) => update("safetyNotes", e.target.value)}
              className="rounded-xl mt-1.5"
              rows={3}
            />
          </div>

          <div>
            <Label className="mb-3 block">Ideal For</Label>
            <div className="flex flex-wrap gap-3">
              {idealForOptions.map((tag) => (
                <label key={tag} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.idealForTags.includes(tag)}
                    onCheckedChange={() => toggleTag(tag)}
                  />
                  <span className="text-sm capitalize">{tag}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="rounded-xl"
            disabled={mutation.isPending}
            data-testid="button-save-experience"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Save Changes" : "Create Experience"}
          </Button>
        </form>
      </div>
      <Footer />
    </div>
  );
}
