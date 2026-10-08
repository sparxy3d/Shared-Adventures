import "@/components/stage-one.css";
import { Link, useLocation } from "wouter";
import { ArrowRight, Mail, MessageCircle, Search } from "lucide-react";
import { SUPPORT_EMAIL } from "@shared/catalog";

export default function Support() {
  const [location] = useLocation();
  const pathname = location.split("?")[0].replace(/\/$/, "") || "/";
  if (pathname === "/forgot-password") {
    return (
      <main className="stage-content stage-one">
        <div className="stage-content-inner">
          <span className="stage-content-kicker">Account help</span>
          <h1 className="stage-content-title">Forgot your password?</h1>
          <p className="stage-content-lede">Email us at {SUPPORT_EMAIL} and we’ll reset it. This prototype uses support-assisted password resets.</p>
          <a className="stage-support-link" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Free Spirit password help")}`}><Mail size={17} />Email {SUPPORT_EMAIL}<ArrowRight size={16} /></a>
          <p className="stage-auth-footnote">For your security, never email us your password. <Link href="/login">Return to log in</Link></p>
        </div>
      </main>
    );
  }
  if (pathname === "/contact") {
    return (
      <main className="stage-content stage-one">
        <div className="stage-content-inner">
          <span className="stage-content-kicker">We’re listening</span>
          <h1 className="stage-content-title">Talk to a person.</h1>
          <p className="stage-content-lede">Need a hand with your account, a booking request or an experience listing? Send our team a note and include the details that will help us find your plan.</p>
          <div className="stage-info-grid">
            <section className="stage-info-panel"><h2>Member support</h2><p>Questions about finding an activity or managing your account.</p><a className="stage-support-link" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Free Spirit member support")}`}><Mail size={16} />{SUPPORT_EMAIL}</a></section>
            <section className="stage-info-panel"><h2>For providers</h2><p>Interested in listing experiences for people to enjoy together?</p><Link href="/for-vendors" className="stage-support-link">Explore vendor info <ArrowRight size={16} /></Link></section>
          </div>
        </div>
      </main>
    );
  }
  return (
    <main className="stage-content stage-one">
      <div className="stage-content-inner">
        <span className="stage-content-kicker">Help, without the runaround</span>
        <h1 className="stage-content-title">A hand with your plans.</h1>
        <p className="stage-content-lede">Find a quick answer or tell us what’s getting in the way. For activity-specific questions, your experience provider is the best person to help.</p>
        <div className="stage-info-grid">
          <section className="stage-info-panel"><MessageCircle size={20} /><h2>Booking questions</h2><p>Your request is confirmed when the provider confirms it. For details about the activity or what to bring, get in touch with the provider directly.</p></section>
          <section className="stage-info-panel"><Search size={20} /><h2>Account access</h2><p>Having trouble signing in? We’ll help you recover access to your account.</p><Link href="/forgot-password" className="stage-support-link">Get sign-in help <ArrowRight size={16} /></Link></section>
        </div>
        <div className="stage-accordion">
          <details><summary>When is my booking confirmed?</summary><p>A booking request is not final until the experience provider confirms it. Check your account for the latest status.</p></details>
          <details><summary>Can I change a booking?</summary><p>Contact the experience provider about your plans. The final booking and cancellation guidance will be shown with the experience as the service develops.</p></details>
          <details><summary>How can I reach Free Spirit?</summary><p>Write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Include the email address on your account and a short description of what you need help with.</p></details>
        </div>
        <Link href="/contact" className="stage-support-link">Contact Free Spirit <ArrowRight size={16} /></Link>
      </div>
    </main>
  );
}
