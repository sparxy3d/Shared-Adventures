import "@/components/stage-one.css";
import { Link } from "wouter";
import type { ReactNode } from "react";
import BrandLogo from "./brand-logo";

type AuthLayoutProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  titleTestId?: string;
  description: string;
  variant?: "login";
};

export default function AuthLayout({ children, eyebrow, title, titleTestId, description, variant }: AuthLayoutProps) {
  return (
    <main className={`stage-auth stage-one${variant === "login" ? " stage-login" : ""}`}>
      <Link href="/" className="fs-auth-brand" aria-label="Free Spirit home">
        <BrandLogo variant="auth" />
      </Link>
      <div className="stage-auth-card">
        <aside className="stage-auth-visual" aria-label="A Free Spirit outing in Sri Lanka">
          <img className="stage-auth-photo" src="/images/hero-bg.png" alt="Friends meeting for an outdoor activity in Sri Lanka" />
          {variant !== "login" && <div className="stage-photo-caption">
            <span>Free Spirit</span>
            <strong>Good plans start together.</strong>
          </div>}
        </aside>
        <section className="stage-auth-form-wrap">
          <div className="stage-auth-form">
            <p className="stage-auth-eyebrow">{eyebrow}</p>
            <h1 className="stage-auth-title" data-testid={titleTestId}>{title}</h1>
            <p className="stage-auth-subtitle">{description}</p>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
