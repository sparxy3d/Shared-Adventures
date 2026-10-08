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
import VendorProfile from "@/pages/vendor/vendor-profile";
import VendorExperiences from "@/pages/vendor/vendor-experiences";
import ExperienceForm from "@/pages/vendor/experience-form";
import Availability from "@/pages/vendor/availability";
import VendorBookings from "@/pages/vendor/vendor-bookings";
import AdminDashboard from "@/pages/admin/admin-dashboard";
import ForVendors from "@/pages/for-vendors";
import VendorApply from "@/pages/vendor-apply";
import Legal from "@/pages/legal";
import Support from "@/pages/support";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

function LegalPage() {
  return <><Navbar /><Legal /><Footer /></>;
}
function SupportPage() {
  return <><Navbar /><Support /><Footer /></>;
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
      <Route path="/vendor" component={VendorDashboard} />
      <Route path="/vendor/profile" component={VendorProfile} />
      <Route path="/vendor/experiences" component={VendorExperiences} />
      <Route path="/vendor/experiences/new" component={ExperienceForm} />
      <Route path="/vendor/experiences/:id/edit" component={ExperienceForm} />
      <Route path="/vendor/experiences/:id/availability" component={Availability} />
      <Route path="/vendor/bookings" component={VendorBookings} />
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
