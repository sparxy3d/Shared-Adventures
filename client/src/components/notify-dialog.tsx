import { useEffect, useState } from "react";
import { BellRing, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNotify } from "@/hooks/use-notify";
import "./notify-dialog.css";

export default function NotifyDialog({ experienceId, title, open, onOpenChange }: {
  experienceId: number; title: string; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const notify = useNotify(experienceId);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  useEffect(() => {
    if (!open) { notify.reset(); setEmail(""); setName(""); }
  }, [open]);
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="notify-dialog">
      <DialogHeader>
        <span className="notify-mark"><BellRing size={19} aria-hidden="true" /></span>
        <DialogTitle>Keep this one in reach</DialogTitle>
        <DialogDescription>We’ll let you know when bookings open for <strong>{title}</strong>.</DialogDescription>
      </DialogHeader>
      {notify.isSuccess ? <div className="notify-success" role="status">
        <span><Check size={18} aria-hidden="true" /></span><div><strong>You’re on the list.</strong><p>If this experience opens for bookings, we’ll let you know.</p></div>
      </div> : <form className="notify-form" onSubmit={event => {
        event.preventDefault();
        notify.mutate({ email: email.trim(), ...(name.trim() ? { name: name.trim() } : {}) });
      }}>
        <div className="notify-fields">
          <div><Label htmlFor={`notify-email-${experienceId}`}>Email address</Label><Input id={`notify-email-${experienceId}`} type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" required /></div>
          <div><Label htmlFor={`notify-name-${experienceId}`}>Name <span>(optional)</span></Label><Input id={`notify-name-${experienceId}`} autoComplete="name" value={name} onChange={event => setName(event.target.value)} placeholder="Your name" /></div>
        </div>
        <p className="notify-privacy">We'll email you once bookings open. We won't use your email for anything else.</p>
        {notify.isError && <p className="notify-error" role="alert">We couldn’t add you just now. Please check your email and try again.</p>}
        <Button type="submit" className="notify-submit" disabled={notify.isPending}>{notify.isPending ? "Adding you…" : "Notify me"}</Button>
      </form>}
    </DialogContent>
  </Dialog>;
}
