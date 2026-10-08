import { Link } from "wouter";
import { ArrowRight, CalendarDays, BarChart3 } from "lucide-react";

export default function VendorNextUpdate({ kind }: { kind: "schedule" | "stats" }) {
  const schedule = kind === "schedule";
  const Icon = schedule ? CalendarDays : BarChart3;
  return <section className="v-page v-next-page">
    <p className="v-eyebrow">Vendor workspace</p>
    <div className="v-next-card"><span className="v-next-icon"><Icon size={26} /></span>
      <h1>{schedule ? "Your schedule" : "Business stats"}</h1>
      <p>{schedule ? "Your availability tools are staying just where they are while this workspace takes shape." : "A clearer view of how your sessions are filling is on its way."}</p>
      <Link className="v-button v-button-primary" href={schedule ? "/vendor/experiences" : "/vendor/bookings"}>{schedule ? "Manage availability" : "View bookings"}<ArrowRight size={16} /></Link>
    </div>
  </section>;
}
