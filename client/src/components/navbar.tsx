import "@/components/stage-one.css";
import { useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import BrandLogo from "./brand-logo";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { CATEGORIES, SUPPORT_EMAIL } from "@shared/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowRight, CalendarDays, ChevronDown, Compass, Heart, LifeBuoy, LogOut, Menu,
  Search, Store, UserRound,
} from "lucide-react";

const categoryLinks = CATEGORIES.map((category) => ({
  label: category.label,
  href: `/search?category=${category.value}`,
}));

export default function Navbar(_props: { variant?: "default" | "transparent" } = {}) {
  const { toast } = useToast();
  const { user, isLoading, error, retry } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const logout = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(["/api/auth/me"], null);
      setDrawerOpen(false);
      toast({ title: "Signed out", description: "You’re all set. See you next time." });
      navigate("/");
    },
  });
  const doSearch = (event: FormEvent) => {
    event.preventDefault();
    const term = search.trim();
    if (!term) return;
    navigate(`/search?q=${encodeURIComponent(term)}`);
    setShowSearch(false);
    setDrawerOpen(false);
  };
  const dashboard = user?.role === "vendor" ? "/vendor" : user?.role === "admin" ? "/admin" : "/";

  const CatalogLinks = ({ close }: { close?: () => void }) => (
    <>
      {categoryLinks.map((item) => (
        <DropdownMenuItem key={item.label} asChild>
          <Link href={item.href} className="stage-menu-item" onClick={close}>{item.label}</Link>
        </DropdownMenuItem>
      ))}
    </>
  );

  return (
    <header className="stage-shell stage-one">
      <nav className="stage-nav" aria-label="Main navigation">
        <div className="stage-nav-inner">
          <Link href="/" className="stage-brand" aria-label="Free Spirit home">
            <BrandLogo />
          </Link>
          <div className="stage-desktop-links">
            <Link href="/search" className="stage-nav-link">Explore</Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="stage-categories-trigger">Categories <ChevronDown size={15} /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="stage-menu-content stage-one">
                <CatalogLinks />
              </DropdownMenuContent>
            </DropdownMenu>
            <Link href="/for-vendors" className="stage-nav-link">For vendors</Link>
          </div>
          <Button variant="ghost" size="icon" className="stage-search-trigger" aria-label="Open search" onClick={() => setShowSearch((value) => !value)}>
            <Search size={20} />
          </Button>
          {isLoading ? <span className="stage-auth-skeleton" role="status" aria-label="Loading account" /> : error ? (
            <div className="stage-auth-state-error"><span role="alert">Account unavailable</span><button type="button" onClick={() => { void retry(); }}>Retry</button></div>
          ) : user ? (
            <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="stage-avatar-trigger" aria-label={`Account menu for ${user.fullName}`}>
                  <span className="stage-avatar" aria-hidden="true">{user.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>
                  <span className="stage-avatar-name">{user.fullName.split(" ")[0]}</span><ChevronDown size={15} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="stage-menu-content stage-one">
                <div className="stage-menu-profile"><strong>{user.fullName}</strong><span>{user.email}</span></div>
                <DropdownMenuSeparator />
                {user.role !== "customer" && <DropdownMenuItem asChild><Link href={dashboard} className="stage-menu-item"><Compass size={16} />{user.role === "vendor" ? "Vendor dashboard" : "Admin console"}</Link></DropdownMenuItem>}
                <DropdownMenuItem asChild><Link href="/account/bookings" className="stage-menu-item"><CalendarDays size={16} />My bookings</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/account/saved" className="stage-menu-item"><Heart size={16} />Bucket list</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/account/profile" className="stage-menu-item"><UserRound size={16} />Profile</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                {logout.isError && <p className="stage-menu-error" role="alert">Couldn’t log out. Please try again.</p>}
                <DropdownMenuItem onClick={() => logout.mutate()} disabled={logout.isPending} data-testid="button-logout" className="stage-menu-item stage-logout">
                  <LogOut size={16} />{logout.isPending ? "Signing out…" : logout.isError ? "Retry log out" : "Log out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {logout.isError && <span className="stage-inline-logout-error" role="alert">Couldn’t log out. Retry from the account menu.</span>}
            </>
          ) : (
            <div className="stage-auth-actions">
              <Link href="/login" className="stage-login-link">Log in</Link>
              <Link href="/signup" className="stage-small-cta">Sign up</Link>
            </div>
          )}
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" className="stage-mobile-trigger" aria-label="Open navigation menu"><Menu size={22} /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="stage-drawer stage-one">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <SheetDescription className="sr-only">Explore activities and manage your account.</SheetDescription>
              <div className="stage-drawer-head">
                <Link href="/" className="stage-brand" onClick={() => setDrawerOpen(false)}><span className="stage-brand-mark">fs</span><span>Free Spirit</span></Link>
              </div>
              <form onSubmit={doSearch} className="stage-search stage-drawer-search" role="search">
                <Search size={18} aria-hidden="true" /><Input aria-label="Search experiences" placeholder="Search activities" value={search} onChange={(event) => setSearch(event.target.value)} />
                <button type="submit" aria-label="Submit search"><ArrowRight size={17} /></button>
              </form>
              <div className="stage-drawer-links">
                <Link href="/search" className="stage-nav-link" onClick={() => setDrawerOpen(false)}><Compass size={17} />Explore</Link>
                <p className="stage-drawer-label">Categories</p>
                {categoryLinks.map((item) => <Link key={item.label} href={item.href} className="stage-nav-link" onClick={() => setDrawerOpen(false)}>{item.label}</Link>)}
                <Link href="/for-vendors" className="stage-nav-link" onClick={() => setDrawerOpen(false)}><Store size={17} />For vendors</Link>
              </div>
              <div className="stage-drawer-links stage-drawer-utility">
                <Link href="/about" className="stage-nav-link" onClick={() => setDrawerOpen(false)}>About</Link>
                <Link href="/contact" className="stage-nav-link" onClick={() => setDrawerOpen(false)}>Contact</Link>
                <Link href="/help" className="stage-nav-link" onClick={() => setDrawerOpen(false)}><LifeBuoy size={17} />Help &amp; support</Link>
                <Link href="/privacy" className="stage-nav-link" onClick={() => setDrawerOpen(false)}>Privacy</Link>
                <Link href="/terms" className="stage-nav-link" onClick={() => setDrawerOpen(false)}>Terms</Link>
                <a className="stage-nav-link" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
              </div>
              {isLoading ? <div className="stage-drawer-loading"><span className="stage-auth-skeleton" role="status" aria-label="Loading account" /></div> : error ? (
                <div className="stage-drawer-loading"><p role="alert">We couldn’t load your account.</p><button className="stage-drawer-secondary" onClick={() => { void retry(); }}>Try again</button></div>
              ) : user ? (
                <div className="stage-drawer-actions">
                  {user.role !== "customer" && <Link href={dashboard} className="stage-small-cta" onClick={() => setDrawerOpen(false)}>{user.role === "vendor" ? "Vendor dashboard" : "Admin console"}</Link>}
                  <Link href="/account/bookings" className="stage-drawer-secondary" onClick={() => setDrawerOpen(false)}>My bookings</Link>
                  <Link href="/account/saved" className="stage-drawer-secondary" onClick={() => setDrawerOpen(false)}>Bucket list</Link>
                  <Link href="/account/profile" className="stage-drawer-secondary" onClick={() => setDrawerOpen(false)}>Profile</Link>
                  {logout.isError && <p className="stage-menu-error" role="alert">Couldn’t log out. Please try again.</p>}
                  <button className="stage-drawer-secondary" disabled={logout.isPending} onClick={() => logout.mutate()}>{logout.isPending ? "Logging out…" : logout.isError ? "Retry log out" : "Log out"}</button>
                </div>
              ) : <div className="stage-drawer-actions">
                <Link href="/login" className="stage-drawer-secondary" onClick={() => setDrawerOpen(false)}>Log in</Link>
                <Link href="/signup" className="stage-small-cta" onClick={() => setDrawerOpen(false)}>Sign up <ArrowRight size={15} /></Link>
              </div>}
            </SheetContent>
          </Sheet>
        </div>
        {showSearch && <form onSubmit={doSearch} className="stage-search-popover" role="search">
          <Search size={18} aria-hidden="true" /><Input autoFocus aria-label="Search experiences" placeholder="Search activities and places" value={search} onChange={(event) => setSearch(event.target.value)} />
          <button type="submit" aria-label="Submit search"><ArrowRight size={17} /></button>
        </form>}
      </nav>
    </header>
  );
}
