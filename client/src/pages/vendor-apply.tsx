import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import VendorApplicationForm from "@/components/vendor-application-form";
import "@/components/vendor-pitch-stage-four.css";

export default function VendorApply() {
  useEffect(() => { document.title = "Apply to list your experience | Free Spirit"; }, []);
  return (
    <div className="v4">
      <Navbar />
      <main className="v4-apply-wrap">
        <div className="v4-shell">
          <Link href="/for-vendors" className="v4-back-link"><ArrowLeft size={16} aria-hidden="true" /> For vendors</Link>
          <div className="v4-apply-intro">
            <p className="v4-eyebrow">Free Spirit vendor application</p>
            <h1>Let’s talk about what you host.</h1>
            <p>Share a few details about your business and activity. We’ll call you to talk it through.</p>
          </div>
          <VendorApplicationForm />
        </div>
      </main>
      <Footer />
    </div>
  );
}
