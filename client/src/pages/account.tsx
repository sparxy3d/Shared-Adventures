import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import type { User } from "@shared/schema";
import { Loader2, User as UserIcon } from "lucide-react";
import { useLocation } from "wouter";

export default function Account() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) return null;
      return res.json();
    },
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phone || "");
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/auth/profile", { fullName, phone }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  if (!isLoading && !user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-8 pb-20 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-foreground mb-8" data-testid="text-account-title">My Account</h1>

        <div className="rounded-2xl border border-border bg-white dark:bg-card p-6 sm:p-8">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{user?.fullName}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <span className="text-xs font-medium text-primary capitalize">{user?.role}</span>
            </div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-5">
            <div>
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                data-testid="input-fullname"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-11 rounded-xl mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                data-testid="input-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Your phone number"
                className="h-11 rounded-xl mt-1.5"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={user?.email || ""}
                disabled
                className="h-11 rounded-xl mt-1.5 opacity-60"
              />
            </div>
            <Button
              type="submit"
              className="rounded-xl"
              disabled={updateMutation.isPending}
              data-testid="button-save-profile"
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}
