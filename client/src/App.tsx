import type { ReactNode } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import SearchPage from "@/pages/search";
import ExperienceDetail from "@/pages/experience-detail";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Account from "@/pages/account";
import MyBookings from "@/pages/my-bookings";
import Favorites from "@/pages/favorites";
import VendorDashboard from "@/pages/vendor/dashboard";
import VendorProfile from "@/pages/vendor/business-profile";
import VendorListings from "@/pages/vendor/listings";
import ListingEditor from "@/pages/vendor/listing-editor";
import VendorSchedule from "@/pages/vendor/schedule";
import VendorStats from "@/pages/vendor/stats";
import VendorBookings from "@/pages/vendor/vendor-bookings";
import AdminDashboard from "@/pages/admin/admin-dashboard";
import ForVendors from "@/pages/for-vendors";
import VendorApply from "@/pages/vendor-apply";
import Legal from "@/pages/legal";
import Support from "@/pages/support";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { RequireRole } from "@/components/require-role";
import VendorShell from "@/components/vendor-shell";

function LegalPage() {
  return <><Navbar /><Legal /><Footer /></>;
}
function SupportPage() {
  return <><Navbar /><Support /><Footer /></>;
}

function VendorRoute({ children }: { children: ReactNode }) {
  return <RequireRole role="vendor"><VendorShell>{children}</VendorShell></RequireRole>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/activities">{() => <Redirect to="/search" />}</Route>
      <Route path="/search" component={SearchPage} />
      <Route path="/activity/:id" component={ExperienceDetail} />
      <Route path="/experience/:id">{params => <Redirect to={`/activity/${params.id}${window.location.search}${window.location.hash}`} />}</Route>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/account/bookings" component={MyBookings} />
      <Route path="/account/saved" component={Favorites} />
      <Route path="/account/profile" component={Account} />
      <Route path="/account">{() => <Redirect to="/account/profile" />}</Route>
      <Route path="/bookings">{() => <Redirect to="/account/bookings" />}</Route>
      <Route path="/favorites">{() => <Redirect to="/account/saved" />}</Route>
      <Route path="/terms" component={LegalPage} />
      <Route path="/privacy" component={LegalPage} />
      <Route path="/vendor-terms" component={LegalPage} />
      <Route path="/about" component={LegalPage} />
      <Route path="/contact" component={SupportPage} />
      <Route path="/help" component={SupportPage} />
      <Route path="/forgot-password" component={SupportPage} />
      <Route path="/vendor">{() => <VendorRoute><VendorDashboard /></VendorRoute>}</Route>
      <Route path="/vendor/profile">{() => <VendorRoute><VendorProfile /></VendorRoute>}</Route>
      <Route path="/vendor/listings/new">{() => <VendorRoute><ListingEditor key="new" /></VendorRoute>}</Route>
      <Route path="/vendor/listings/:id">{params => <VendorRoute><ListingEditor key={params.id} /></VendorRoute>}</Route>
      <Route path="/vendor/listings">{() => <VendorRoute><VendorListings /></VendorRoute>}</Route>
      <Route path="/vendor/experiences">{() => <Redirect to="/vendor/listings" />}</Route>
      <Route path="/vendor/experiences/new">{() => <Redirect to="/vendor/listings/new" />}</Route>
      <Route path="/vendor/experiences/:id/edit">{params => <Redirect to={`/vendor/listings/${params.id}`} />}</Route>
      <Route path="/vendor/experiences/:id/availability">{params => <Redirect to={`/vendor/schedule?listing=${params.id}`} />}</Route>
      <Route path="/vendor/bookings">{() => <VendorRoute><VendorBookings /></VendorRoute>}</Route>
      <Route path="/vendor/schedule">{() => <VendorRoute><VendorSchedule /></VendorRoute>}</Route>
      <Route path="/vendor/stats">{() => <VendorRoute><VendorStats /></VendorRoute>}</Route>
      <Route path="/for-vendors" component={ForVendors} />
      <Route path="/for-vendors/apply" component={VendorApply} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
