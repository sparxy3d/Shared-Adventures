import { Switch, Route } from "wouter";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/search" component={SearchPage} />
      <Route path="/experience/:id" component={ExperienceDetail} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/account" component={Account} />
      <Route path="/bookings" component={MyBookings} />
      <Route path="/favorites" component={Favorites} />
      <Route path="/vendor" component={VendorDashboard} />
      <Route path="/vendor/profile" component={VendorProfile} />
      <Route path="/vendor/experiences" component={VendorExperiences} />
      <Route path="/vendor/experiences/new" component={ExperienceForm} />
      <Route path="/vendor/experiences/:id/edit" component={ExperienceForm} />
      <Route path="/vendor/experiences/:id/availability" component={Availability} />
      <Route path="/vendor/bookings" component={VendorBookings} />
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
