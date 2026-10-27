import "@/components/stage-one.css";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import type { AuthUser } from "@/hooks/use-auth";
import { homeForRole } from "@/hooks/use-auth";
import { safeNextUrl } from "@/lib/auth-navigation";
import AuthLayout from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

export default function Signup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSriLankanResident, setIsSriLankanResident] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const signupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/signup", { fullName: name.trim(), email: email.trim(), phone: `+94${phone.replace(/\D/g, "")}`, password, isSriLankanResident });
      return response.json() as Promise<AuthUser>;
    },
    onSuccess: (user) => {
      queryClient.clear();
      queryClient.setQueryData(["/api/auth/me"], user);
      toast({ title: "You’re in.", description: "Your Free Spirit account is ready." });
      const next = safeNextUrl(new URLSearchParams(window.location.search).get("next"));
      navigate(user.role === "customer" ? next || "/" : homeForRole(user.role));
    },
  });
  return (
    <AuthLayout eyebrow="Sri Lanka, together" title="Make more of your time." titleTestId="text-signup-title" description="A few details, then it’s time to find something your whole group will love.">
      <form onSubmit={(event) => { event.preventDefault(); if (accepted && phone.replace(/\D/g, "").length === 9) signupMutation.mutate(); }}>
        <div className="stage-field"><Label htmlFor="signup-name">Full name</Label><Input id="signup-name" data-testid="input-fullname" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="How friends know you" required /></div>
        <div className="stage-field"><Label htmlFor="signup-email">Email address</Label><Input id="signup-email" data-testid="input-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></div>
        <fieldset className="stage-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Are you a Sri Lankan citizen or resident?</legend>
          <label style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
            <input type="radio" name="residency" required checked={isSriLankanResident === true} onChange={() => setIsSriLankanResident(true)} />
            Yes, I am
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <input type="radio" name="residency" required checked={isSriLankanResident === false} onChange={() => setIsSriLankanResident(false)} />
            No, I’m visiting
          </label>
        </fieldset>
        <div className="stage-field">
          <Label htmlFor="signup-phone">Mobile number</Label>
          <div className="stage-phone-input">
            <span aria-hidden="true">+94</span>
            <Input id="signup-phone" data-testid="input-phone" type="tel" inputMode="numeric" autoComplete="tel-national" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 9))} placeholder="77 123 4567" pattern="[0-9]{9}" title="Enter the 9 digits after +94" required />
          </div>
        </div>
        <div className="stage-field">
          <Label htmlFor="signup-password">Password</Label>
          <div className="stage-password-wrap">
            <Input id="signup-password" data-testid="input-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" minLength={8} required />
            <button type="button" className="stage-password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </div>
        </div>
        <div className="stage-terms-check">
          <Checkbox id="terms-consent" checked={accepted} onCheckedChange={(value) => setAccepted(value === true)} aria-required="true" />
          <label htmlFor="terms-consent">I agree to the <Link href="/terms">Terms of Service</Link> and have read the <Link href="/privacy">Privacy Policy</Link>.</label>
        </div>
        {signupMutation.isError && <p className="stage-auth-alert" role="alert">We couldn’t create your account just now. Check your details and try again.</p>}
        <Button type="submit" className="stage-submit" disabled={signupMutation.isPending || !accepted || isSriLankanResident === null || phone.replace(/\D/g, "").length !== 9} data-testid="button-signup">
          {signupMutation.isPending ? "Creating your account…" : "Create member account"}
        </Button>
      </form>
      <div className="stage-social-divider">Or continue with</div>
      <div className="stage-social-actions">
        <div className="stage-social-wrap"><Button type="button" variant="outline" disabled className="stage-social" aria-disabled="true">Continue with Google</Button><span>Coming soon</span></div>
        <div className="stage-social-wrap"><Button type="button" variant="outline" disabled className="stage-social" aria-disabled="true">Continue with Facebook</Button><span>Coming soon</span></div>
      </div>
      <p className="stage-auth-bottom">Already have an account? <Link href={safeNextUrl(new URLSearchParams(window.location.search).get("next")) ? `/login?next=${encodeURIComponent(safeNextUrl(new URLSearchParams(window.location.search).get("next"))!)}` : "/login"} data-testid="link-login">Log in</Link></p>
      <p className="stage-auth-footnote">Have a business? <Link href="/for-vendors">List your experience</Link></p>
    </AuthLayout>
  );
}
