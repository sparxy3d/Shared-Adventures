import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import MemberLayout from "@/components/member-layout";
import { SUPPORTED_CITIES, SUPPORT_EMAIL } from "@shared/catalog";

export default function Account() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [show, setShow] = useState(false);
  const storageKey = `free-spirit-home-city-${user?.id}`;
  useEffect(() => {
    if (!user) return;
    setName(user.fullName); setPhone(user.phone || "");
    try {
      const saved = localStorage.getItem(`free-spirit-home-city-${user.id}`);
      setCity(SUPPORTED_CITIES.some(c => c.name === saved) ? saved! : "");
    } catch { setError("Your browser can’t save a home city on this device."); }
  }, [user?.id]);
  const update = useMutation({
    mutationFn: async () => (await apiRequest("PATCH", "/api/auth/profile", { fullName: name.trim(), phone: phone.trim() || null })).json(),
    onSuccess: data => {
      queryClient.setQueryData(["/api/auth/me"], data);
      setError("");
      try { if (city) localStorage.setItem(storageKey, city); else localStorage.removeItem(storageKey); }
      catch { setError("Profile updated, but your browser couldn’t save the home city."); }
      toast({ title: "Profile updated" });
    },
    onError: () => setError("We couldn’t save your profile. Check your details and try again."),
  });
  const change = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/change-password", { currentPassword, newPassword }),
    onSuccess: () => { setCurrentPassword(""); setNewPassword(""); setRepeat(""); setPasswordError(""); toast({ title: "Password changed" }); },
    onError: (error: Error) => setPasswordError(error.message.includes("Current password is incorrect") ? "Current password is incorrect" : "We couldn’t change your password. Please try again."),
  });
  const logout = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => { queryClient.clear(); queryClient.setQueryData(["/api/auth/me"], null); navigate("/"); toast({ title: "Logged out" }); },
    onError: () => setError("We couldn’t log you out. Please try again."),
  });
  return <MemberLayout title="Profile">
    <div className="max-w-2xl space-y-6">
      <form className="space-y-5 rounded-2xl bg-white p-5 shadow-sm sm:p-8" onSubmit={event => { event.preventDefault(); setError(""); update.mutate(); }}>
        {error && <p role="alert" className="rounded-xl border border-red-200 p-3 text-red-800">{error}</p>}
        <div><Label htmlFor="fullName">Full name</Label><Input id="fullName" data-testid="input-fullname" value={name} onChange={e => setName(e.target.value)} required maxLength={120} autoComplete="name" /></div>
        <div><Label htmlFor="email">Email (read-only)</Label><Input id="email" type="email" value={user?.email || ""} readOnly autoComplete="email" /></div>
        <div><Label htmlFor="phone">Mobile (+94)</Label><Input id="phone" data-testid="input-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={40} placeholder="+94 77 123 4567" autoComplete="tel" /></div>
        <div><Label htmlFor="home-city">Home city</Label><select id="home-city" className="mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3" value={city} onChange={e => setCity(e.target.value)}>
          <option value="">Choose your city</option>{SUPPORTED_CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select><p className="mt-2 text-[13px] text-slate-600">Saved on this device</p></div>
        <Button type="submit" disabled={update.isPending} data-testid="button-save-profile">{update.isPending ? "Saving…" : "Save changes"}</Button>
      </form>
      <form className="space-y-5 rounded-2xl bg-white p-5 shadow-sm sm:p-8" onSubmit={event => {
        event.preventDefault();
        if (newPassword !== repeat) { setPasswordError("The new passwords don’t match."); return; }
        setPasswordError(""); change.mutate();
      }}>
        <h2 className="text-xl font-bold">Change password</h2>
        {passwordError && <p role="alert" className="rounded-xl border border-red-200 p-3 text-red-800">{passwordError}</p>}
        {[{ id: "current-password", title: "Current password", value: currentPassword, set: setCurrentPassword, current: true },
          { id: "new-password", title: "New password", value: newPassword, set: setNewPassword, current: false },
          { id: "repeat-password", title: "Repeat new password", value: repeat, set: setRepeat, current: false }].map(field =>
          <div key={field.id}><Label htmlFor={field.id}>{field.title}</Label><Input id={field.id} type={show ? "text" : "password"} required minLength={field.current ? 1 : 8} maxLength={200} value={field.value} onChange={e => field.set(e.target.value)} autoComplete={field.current ? "current-password" : "new-password"} /></div>)}
        <button type="button" className="flex min-h-11 items-center gap-2 text-slate-700" aria-pressed={show} onClick={() => setShow(!show)}>{show ? <EyeOff size={20} /> : <Eye size={20} />}{show ? "Hide passwords" : "Show passwords"}</button>
        <p className="text-[13px] text-slate-600">Use at least 8 characters.</p>
        <Button type="submit" disabled={change.isPending}>{change.isPending ? "Changing…" : "Change password"}</Button>
      </form>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" className="member-secondary" disabled={logout.isPending} onClick={() => logout.mutate()}>Log out</Button>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="outline" className="border-red-700 text-red-700">Delete my account</Button></AlertDialogTrigger>
          <AlertDialogContent className="stage-one">
            <AlertDialogHeader><AlertDialogTitle>Request account deletion?</AlertDialogTitle><AlertDialogDescription>This prototype opens an email to our support team. It does not delete your account automatically. Contact {SUPPORT_EMAIL} to request deletion.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Keep my account</AlertDialogCancel><AlertDialogAction onClick={() => { window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Account deletion request")}`; }}>Email support</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  </MemberLayout>;
}
