import { useState } from "react";
import { Check, Copy, Smartphone } from "lucide-react";
import { AdminDialog } from "./dialog";

export type LoginCredentials = { email: string; temporaryPassword: string };

export function CredentialDialog({ login, onClose }: { login: LoginCredentials; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Email: ${login.email}\nTemporary password: ${login.temporaryPassword}`);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopyFailed(true);
    }
  };
  return <AdminDialog title="Temporary login details" onClose={onClose}>
    <p style={{ fontSize: 13, color: "#70817a", lineHeight: 1.6, marginTop: 0 }}>Share these details directly with the account owner. This password is shown once and won’t be available after you close this window.</p>
    <div className="ad-credential"><div className="ad-credential-label">Email</div><div className="ad-credential-value"><span>{login.email}</span></div></div>
    <div className="ad-credential"><div className="ad-credential-label">Temporary password</div><div className="ad-credential-value"><span>{login.temporaryPassword}</span></div></div>
    <div className="ad-banner"><strong><Smartphone size={14} style={{ verticalAlign: "middle", marginRight: 5 }} />Phone or WhatsApp:</strong> tell them this is a temporary password. Ask them to sign in and change it before sharing it with anyone.</div>
    {copyFailed && <p role="alert" className="ad-form-error">Couldn’t copy automatically. Select and copy the details above.</p>}
    <div className="ad-dialog-actions"><button className="ad-button secondary" type="button" onClick={copy}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copied" : "Copy details"}</button><button className="ad-button" type="button" onClick={onClose}>Done</button></div>
  </AdminDialog>;
}
