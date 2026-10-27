import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/auth-layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { homeForRole, type AuthUser } from "@/hooks/use-auth";
import "./set-password.css";

export default function SetPassword() {
  const [, navigate] = useLocation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [validation, setValidation] = useState("");
  const changePassword = useMutation({
    mutationFn: async () => {
      if (password.length < 8) throw new Error("Choose a password with at least 8 characters.");
      if (password === currentPassword) throw new Error("Your new password must be different from the temporary password.");
      if (password !== confirmation) throw new Error("The passwords do not match.");
      const response = await apiRequest("POST", "/api/auth/change-password", { currentPassword, newPassword: password });
      return response.json().catch(() => ({}));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.removeQueries({ queryKey: ["/api/auth/me"] });
      const result = await queryClient.fetchQuery<AuthUser | null>({
        queryKey: ["/api/auth/me"],
        queryFn: async () => {
          const response = await fetch("/api/auth/me", { credentials: "include" });
          if (response.status === 401) return null;
          if (!response.ok) throw new Error("Your account is still updating. Please log in again.");
          return response.json();
        },
        staleTime: 0,
      });
      queryClient.setQueryData(["/api/auth/me"], result);
      navigate(result ? homeForRole(result.role) : "/login");
    },
  });
  const error = validation || (changePassword.error instanceof Error ? changePassword.error.message : "");

  return <div className="set-password-page">
    <AuthLayout eyebrow="One quick security step" title="Set a new password." description="Your account is ready. Replace the temporary password before continuing.">
      <form className="set-password-form" onSubmit={event => {
        event.preventDefault();
        setValidation("");
        changePassword.mutate();
      }}>
        <div className="set-password-note"><KeyRound size={18} aria-hidden="true" /><span>Choose a password you have not used for this account before.</span></div>
        <div className="stage-field">
          <Label htmlFor="temporary-password">Current temporary password</Label>
          <Input id="temporary-password" type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required />
        </div>
        <div className="stage-field">
          <Label htmlFor="new-password">New password</Label>
          <div className="stage-password-wrap">
            <Input id="new-password" type={visible ? "text" : "password"} autoComplete="new-password" minLength={8} value={password} onChange={event => setPassword(event.target.value)} required />
            <button type="button" className="stage-password-toggle" aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </div>
          <p className="set-password-hint">At least 8 characters, and different from your temporary password.</p>
        </div>
        <div className="stage-field">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <Input id="confirm-password" type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} required />
        </div>
        {error && <p className="stage-auth-alert" role="alert">{error}</p>}
        <Button type="submit" className="stage-submit" disabled={changePassword.isPending}>
          {changePassword.isPending ? "Updating password…" : "Save new password"}
        </Button>
      </form>
      <p className="set-password-footnote">You’ll continue to your Free Spirit account once your password is updated.</p>
      <Button type="button" variant="ghost" onClick={async () => {
        await apiRequest("POST", "/api/auth/logout");
        queryClient.clear();
        navigate("/login");
      }}>Log out</Button>
    </AuthLayout>
  </div>;
}
