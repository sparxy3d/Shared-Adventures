import "@/components/stage-one.css";
import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";
import { CATEGORIES, SUPPORT_EMAIL } from "@shared/catalog";
import BrandLogo from "./brand-logo";

export default function Footer() {
  return (
    <footer className="stage-footer stage-one" data-testid="footer">
      <div className="stage-footer-main">
        <div className="stage-footer-brand-cell">
          <Link href="/" className="stage-footer-brand"><BrandLogo variant="footer" /></Link>
        </div>
        <section className="stage-footer-column">
          <h2>Explore</h2>
          <Link href="/search">All experiences</Link>
          {CATEGORIES.map((category) => <Link key={category.value} href={`/search?category=${category.value}`}>{category.label}</Link>)}
        </section>
        <section className="stage-footer-column">
          <h2>For vendors</h2>
          <Link href="/for-vendors">List your experience</Link>
          <Link href="/login">Vendor login</Link>
        </section>
        <section className="stage-footer-column">
          <h2>Company</h2>
          <Link href="/about">About Free Spirit</Link>
          <Link href="/contact">Contact</Link>
        </section>
        <section className="stage-footer-column">
          <h2>Support</h2>
          <Link href="/help">Help center</Link>
          <Link href="/privacy">Privacy policy</Link>
          <Link href="/terms">Terms of service</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </section>
      </div>
      <div className="stage-footer-bottom">
        <span>© {new Date().getFullYear()} Free Spirit · Sri Lanka</span>
      </div>
    </footer>
  );
}
