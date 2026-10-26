import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { ArrowDown, ArrowRight, BadgeCheck, Bell, CalendarDays, Check, CircleDollarSign, Clock3, List, Store } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import VendorApplicationForm from "@/components/vendor-application-form";
import "@/components/vendor-pitch-stage-four.css";

const faqs = [
  { question: "Who sets prices?", answer: "You do. You set the price for your experience." },
  { question: "How are bookings confirmed?", answer: "You confirm each request after checking the session and group size." },
  { question: "How do I get paid?", answer: "Customers pay through Free Spirit when you accept their booking. We pay you after the session, minus our commission." },
  { question: "Can I pause?", answer: "Yes. Switch off Taking bookings in your dashboard at any time. Bookings you've already confirmed still go ahead." },
];

export default function ForVendors() {
  const applicationRef = useRef<HTMLElement>(null);
  useEffect(() => { document.title = "For experience providers | Free Spirit"; }, []);
  const scrollToApplication = () => applicationRef.current?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });

  return (
    <div className="v4">
      <Navbar />
      <main>
        <section className="v4-hero" aria-labelledby="vendor-pitch-title">
          <div className="v4-shell v4-hero-shell">
            <div className="v4-hero-inner">
              <p className="v4-eyebrow">For experience providers</p>
              <h1 id="vendor-pitch-title">Fill your sessions with groups who want to do something <span>together.</span></h1>
              <p className="v4-hero-copy">Friends planning tonight, teams booking an outing, families looking for a weekend plan. Free Spirit brings them to you.</p>
              <div className="v4-hero-actions">
                <button className="v4-button v4-button--orange" type="button" onClick={scrollToApplication} data-testid="button-apply-to-list">
                  Apply to list <ArrowDown size={17} aria-hidden="true" />
                </button>
                <Link className="v4-button v4-button--outline" href="/login">Log in as vendor <ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
              <ul className="v4-hero-points" aria-label="Your listing, your terms">
                <li><List size={17} aria-hidden="true" /><span>List as many activities as you run</span></li>
                <li><CircleDollarSign size={17} aria-hidden="true" /><span>You set your prices</span></li>
                <li><BadgeCheck size={17} aria-hidden="true" /><span>You confirm every booking</span></li>
              </ul>
            </div>
            <div className="v4-hero-gallery">
              <div className="v4-hero-grid" aria-label="Experiences on Free Spirit">
                <div className="v4-hero-tile">
                  <img src="/images/category-sports-800.webp" srcSet="/images/category-sports-400.webp 400w, /images/category-sports-800.webp 800w" sizes="(max-width: 760px) 50vw, 22vw" alt="Friends playing sports together outdoors" />
                  <span>Sports</span>
                </div>
                <div className="v4-hero-tile">
                  <img src="/images/rafting.png" alt="A group rafting together on a flowing river" />
                  <span>Adventure</span>
                </div>
                <div className="v4-hero-tile">
                  <img src="/images/pottery.png" alt="People shaping clay at pottery wheels in a sunlit workshop" />
                  <span>Arts &amp; Classes</span>
                </div>
                <div className="v4-hero-tile">
                  <img src="/images/yoga.png" alt="A guided yoga session in a peaceful studio" />
                  <span>Wellness</span>
                </div>
              </div>
              <p className="v4-hero-caption">Sports · Adventure · Arts &amp; Classes · Wellness · Recreation</p>
            </div>
          </div>
        </section>

        <section className="v4-section">
          <div className="v4-shell v4-audience">
            <div>
              <p className="v4-eyebrow">A place for your kind of thing</p>
              <h2>Who books on Free Spirit</h2>
            </div>
            <div className="v4-audience-list">
              <div className="v4-audience-item"><span className="v4-index">01</span><div><strong>Friends looking for tonight</strong><p>Put a good activity within reach when the group is ready to get out.</p></div></div>
              <div className="v4-audience-item"><span className="v4-index">02</span><div><strong>Teams planning an outing</strong><p>Give workmates something more memorable than another meeting room.</p></div></div>
              <div className="v4-audience-item"><span className="v4-index">03</span><div><strong>Families and couples on weekends</strong><p>Help people find a shared experience worth setting time aside for.</p></div></div>
            </div>
          </div>
        </section>

        <section className="v4-section v4-process" aria-labelledby="vendor-process-title">
          <div className="v4-shell">
            <div className="v4-process-head">
              <div><p className="v4-eyebrow">Straightforward from the start</p><h2 id="vendor-process-title">How it works</h2></div>
              <p className="v4-process-note">A clear process, with each booking request in your hands.</p>
            </div>
            <div className="v4-steps">
              <article className="v4-step"><span className="v4-step-number">01 / YOUR LISTING</span><h3>You list, we set you up</h3><p>Tell us what you offer, where you host and the groups you can welcome. We’ll help you get started.</p></article>
              <article className="v4-step"><span className="v4-step-number">02 / EACH BOOKING</span><h3>Customers book, you confirm</h3><p>Review every request and confirm the sessions that work for your schedule.</p></article>
              <article className="v4-step"><span className="v4-step-number">03 / AFTER THE SESSION</span><h3>You get paid after the session</h3><p>Payment follows the experience. We’ll talk through the arrangements together.</p></article>
            </div>
          </div>
        </section>

        <section className="v4-section">
          <div className="v4-shell v4-cost">
            <div>
              <p className="v4-eyebrow">Costs and commission</p>
              <h2>What it costs</h2>
              <p className="v4-lede">You decide what your activity costs. The application is where we’ll talk through the details.</p>
            </div>
            <div className="v4-cost-note">
              <span className="v4-eyebrow">How we charge</span>
              <p>Simple commission only on completed bookings, <em>details on application.</em></p>
            </div>
          </div>
        </section>

        <section className="v4-section v4-preview" aria-labelledby="vendor-preview-title">
          <div className="v4-shell">
            <div className="v4-preview-head">
              <div><p className="v4-eyebrow">A look at your vendor space</p><h2 id="vendor-preview-title">What you get</h2></div>
              <p>Your own place to manage a listing, booking requests and the sessions you make available.</p>
            </div>
            <div className="v4-preview-grid">
              <article className="v4-preview-card v4-preview-card--wide">
                <div className="v4-preview-bar"><span className="v4-preview-brand">Free Spirit <span style={{ color: "#ff6b24" }}>Vendor</span></span><span className="v4-preview-tag"><Store size={13} aria-hidden="true" /> Dashboard</span></div>
                <h3>Your business, at a glance</h3>
                <p className="v4-preview-subtitle">A home for the work behind each good day out.</p>
                <div className="v4-dash-lines">
                  <div className="v4-dash-line"><span>Business profile</span><strong>Keep details current</strong></div>
                  <div className="v4-dash-line"><span>Experience page</span><strong>Your activity, your words</strong></div>
                  <div className="v4-dash-line"><span>Session schedule</span><strong>Set times that work for you</strong></div>
                </div>
              </article>
              <article className="v4-preview-card">
                <div className="v4-preview-bar"><span className="v4-preview-brand">Your listing</span><span className="v4-preview-tag"><Check size={13} aria-hidden="true" /> Your page</span></div>
                <div className="v4-mini-listing">
                  <img src="/images/rafting.png" alt="Rafting experience photo example" />
                  <div><strong>A page for your experience</strong><span>Details you provide</span></div>
                </div>
              </article>
              <article className="v4-preview-card">
                <div className="v4-preview-bar"><span className="v4-preview-brand">Booking alerts</span><span className="v4-preview-tag v4-preview-tag--soon"><Bell size={13} aria-hidden="true" /> Coming soon</span></div>
                <h3>Know when a request arrives</h3>
                <p className="v4-preview-subtitle">Booking alerts are coming soon. You’ll be able to review requests in your vendor space.</p>
              </article>
              <article className="v4-preview-card">
                <div className="v4-preview-bar"><span className="v4-preview-brand">Weekly schedule</span><span className="v4-preview-tag"><CalendarDays size={13} aria-hidden="true" /> Availability</span></div>
                <div className="v4-week" aria-label="Illustration of a weekly availability calendar">
                  {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <div className="v4-week-day" key={`${day}-${index}`}><strong>{day}</strong>{index % 3 !== 1 && <><i /><i /></>}</div>)}
                </div>
              </article>
              <article className="v4-preview-card">
                <div className="v4-preview-bar"><span className="v4-preview-brand">Booking requests</span><span className="v4-preview-tag"><Clock3 size={13} aria-hidden="true" /> Your decision</span></div>
                <h3>Confirm what works</h3>
                <p className="v4-preview-subtitle">Each request waits for your confirmation. No invented bookings or activity counts.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="v4-section">
          <div className="v4-shell v4-faq">
            <div className="v4-faq-intro"><p className="v4-eyebrow">Before you apply</p><h2>Good to know.</h2><p>We’ll take the time to talk through the details with you.</p></div>
            <div className="v4-faq-list">
              {faqs.map(({ question, answer }) => <article className="v4-faq-item" key={question}><h3>{question}</h3><p>{answer}</p></article>)}
            </div>
          </div>
        </section>

        <section className="v4-endcap">
          <div className="v4-shell v4-endcap-inner">
            <h2>Have something people would love to do together?</h2>
            <button className="v4-button v4-button--orange" type="button" onClick={scrollToApplication}>Apply to list <ArrowRight size={17} aria-hidden="true" /></button>
          </div>
        </section>

        <section className="v4-apply-wrap" ref={applicationRef} id="vendor-application" aria-labelledby="vendor-application-title">
          <div className="v4-shell">
            <div className="v4-apply-intro">
              <p className="v4-eyebrow">Let’s talk about your activity</p>
              <h2 id="vendor-application-title">Start with the details.</h2>
              <p>Tell us a little about your business and the experience you host. We’ll call you to talk it through.</p>
            </div>
            <VendorApplicationForm />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
