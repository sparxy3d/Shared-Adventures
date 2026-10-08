import "@/components/stage-one.css";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import type { AuthUser } from "@/hooks/use-auth";
import { homeForRole } from "@/hooks/use-auth";
import AuthLayout from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { safeNextUrl } from "@/lib/auth-navigation";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

function authError(error: Error): string {
  if (error.message.startsWith("429")) return "Too many attempts — try again in 15 minutes";
  if (error.message.startsWith("401")) return "Email or password is incorrect";
  return "We couldn’t log you in. Please try again.";
}

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const next = safeNextUrl(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const loginMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/login", { email, password });
      return response.json() as Promise<AuthUser>;
    },
    onSuccess: (user) => {
      queryClient.clear();
      queryClient.setQueryData(["/api/auth/me"], user);
      toast({ title: "Welcome back", description: "You’re signed in and ready to make a plan." });
      navigate(user.role === "customer" && next ? next : homeForRole(user.role));
    },
  });
  return (
    <AuthLayout eyebrow="Your next day out starts here" title="Good to have you back." titleTestId="text-login-title" description="Log in and pick up where the plans left off.">
      <form onSubmit={(event) => { event.preventDefault(); loginMutation.mutate(); }}>
        <div className="stage-field"><Label htmlFor="login-email">Email address</Label><Input id="login-email" data-testid="input-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></div>
        <div className="stage-field">
          <Label htmlFor="login-password">Password</Label>
          <div className="stage-password-wrap">
            <Input id="login-password" data-testid="input-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" required />
            <button type="button" className="stage-password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </div>
          <div className="stage-forgot-row"><Link href="/forgot-password">Forgot password?</Link></div>
        </div>
        {loginMutation.isError && <p className="stage-auth-alert" role="alert">{authError(loginMutation.error)}</p>}
        <Button type="submit" className="stage-submit" disabled={loginMutation.isPending} data-testid="button-login">
          {loginMutation.isPending ? "Logging you in…" : "Log in"}
        </Button>
      </form>
      <div className="stage-social-divider">Or continue with</div>
      <div className="stage-social-actions">
        <div className="stage-social-wrap"><Button type="button" variant="outline" disabled className="stage-social" aria-disabled="true">Continue with Google</Button><span>Coming soon</span></div>
        <div className="stage-social-wrap"><Button type="button" variant="outline" disabled className="stage-social" aria-disabled="true">Continue with Facebook</Button><span>Coming soon</span></div>
      </div>
      <p className="stage-auth-bottom">New here? <Link href="/signup" data-testid="link-signup">Sign up</Link></p>
      <p className="stage-auth-footnote">Have a business? <Link href="/for-vendors">List your experience</Link></p>
    </AuthLayout>
  );
}
