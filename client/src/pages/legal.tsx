import "@/components/stage-one.css";
import { Link, useLocation } from "wouter";
import { ArrowUpRight } from "lucide-react";
import { SUPPORT_EMAIL } from "@shared/catalog";

const legalPages: Record<string, { eyebrow: string; title: string; lede: string; sections: { heading: string; body: string }[] }> = {
  "/terms": {
    eyebrow: "The useful details",
    title: "Terms of service",
    lede: "The ground rules for discovering and requesting experiences with Free Spirit.",
    sections: [
      { heading: "Using Free Spirit", body: "Free Spirit helps members discover activities offered by independent experience providers. Please use the marketplace lawfully, keep your account details accurate, and make bookings only for people in your group." },
      { heading: "Experiences and bookings", body: "Experience details, schedules and participation requirements are supplied by the provider. A booking request is not confirmed until the provider confirms it. Check the details and any provider instructions before setting out." },
      { heading: "Respect and safety", body: "Follow the provider’s safety guidance and arrive prepared for the activity. Contact the provider with questions about a session; contact our support team if you need help using the marketplace." },
      { heading: "A working draft", body: "These terms are a draft while Free Spirit’s member booking flows are being completed. The final terms will explain cancellations, payments, responsibilities and dispute handling in detail." },
    ],
  },
  "/privacy": {
    eyebrow: "Your information",
    title: "Privacy policy",
    lede: "A clear account of the information needed to help your group make a plan.",
    sections: [
      { heading: "Information you share", body: "When you create an account, you provide contact details such as your name, email address and mobile number. Details you add to bookings help providers prepare for your group." },
      { heading: "How it is used", body: "Account and booking information is used to operate Free Spirit, help you manage your plans and connect you with the experience provider relevant to a booking." },
      { heading: "Your choices", body: "You can update your member profile from your account. For questions about your information, contact the Free Spirit support team." },
      { heading: "A working draft", body: "This policy is a draft. Before the marketplace launches fully, the final policy will describe data retention, service providers, security and your applicable privacy rights." },
    ],
  },
  "/vendor-terms": {
    eyebrow: "For experience providers",
    title: "Vendor terms",
    lede: "A starting point for the people and places who make memorable days possible.",
    sections: [
      { heading: "Your listings", body: "Providers are responsible for accurate experience descriptions, schedules, requirements and pricing, and for keeping listing details current." },
      { heading: "Your guests", body: "Providers are responsible for communicating relevant preparation and safety information and delivering the experience as described." },
      { heading: "A working draft", body: "Vendor terms are a draft and are not a final agreement. Contact our team before relying on these notes as contractual terms." },
    ],
  },
};

export default function Legal() {
  const [location] = useLocation();
  const pathname = location.split("?")[0].replace(/\/$/, "") || "/";
  if (pathname === "/about") {
    return (
      <main className="stage-content stage-one">
        <div className="stage-content-inner">
          <span className="stage-content-kicker">A little less scrolling. A lot more living.</span>
          <h1 className="stage-content-title">Good plans bring us closer.</h1>
          <p className="stage-content-lede">Free Spirit is a Sri Lankan marketplace for the things you do together: an afternoon on the water, a first pottery class, a game that gets everyone laughing.</p>
          <div className="stage-info-grid">
            <section className="stage-info-panel"><h2>Made for the group chat</h2><p>Find real activities from local experience providers, then gather your people and turn “we should” into an actual day out.</p></section>
            <section className="stage-info-panel"><h2>Rooted here</h2><p>From a city afternoon to a day further down the coast, Free Spirit is for finding something to do across Sri Lanka.</p></section>
          </div>
          <Link className="stage-support-link" href="/search">Explore experiences <ArrowUpRight size={16} /></Link>
        </div>
      </main>
    );
  }
  const page = legalPages[pathname] ?? legalPages["/terms"];
  const isDraft = pathname !== "/about";
  return (
    <main className="stage-content stage-one">
      <div className="stage-content-inner">
        <span className="stage-content-kicker">{page.eyebrow}</span>
        <h1 className="stage-content-title">{page.title}</h1>
        <p className="stage-content-lede">{page.lede}</p>
        {isDraft && <div className="stage-draft-note" role="status">Draft — final version coming soon</div>}
        <div className="stage-legal-body">
          {page.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p></section>)}
          <p>Questions? Visit <Link href="/help">Help &amp; support</Link> or email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
        </div>
      </div>
    </main>
  );
}
