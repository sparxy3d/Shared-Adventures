import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  Menu, User, LogOut, LayoutDashboard, Heart, CalendarCheck,
  Search, ShoppingBag, ChevronDown,
  Dumbbell, Mountain, Palette, Sparkles, TrendingUp, Gift, Star, MapPin
} from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import type { User as UserType } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

const navCategories = [
  { name: "Activities", href: "/search", icon: Star },
  { name: "Locations", href: "/search", icon: MapPin },
  { name: "Gift Ideas", href: "/search?category=wellness", icon: Gift },
  { name: "New", href: "/search", icon: Sparkles },
  { name: "Popular", href: "/search", icon: TrendingUp },
  { name: "Gift Vouchers", href: "/search", icon: Gift },
];

export default function Navbar({ variant = "default" }: { variant?: "default" | "transparent" }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [location, navigate] = useLocation();

  const { data: user } = useQuery<UserType | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.status === 401) return null;
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    },
  });

  const handleLogout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    window.location.href = "/";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isHome = location === "/";
  const isTransparent = variant === "transparent" && isHome;

  return (
    <>
      <div
        data-testid="promo-banner"
        className="bg-gradient-to-r from-primary via-orange-500 to-amber-500 text-white text-center py-2 px-4 text-xs sm:text-sm font-medium tracking-wide"
      >
        <span className="opacity-90">Launch Offer</span>
        <span className="mx-2">—</span>
        <span>Free listings for early vendors.</span>
        <Link href="/signup" className="ml-2 underline underline-offset-2 hover:opacity-80 transition-opacity font-semibold">
          Get started
        </Link>
      </div>

      <nav
        data-testid="navbar"
        className={`sticky top-0 z-50 transition-all duration-300 ${
          isTransparent
            ? "bg-black/40 backdrop-blur-md border-b border-white/10"
            : "bg-white dark:bg-background border-b border-border shadow-sm"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-4">
            <Link href="/" data-testid="link-home" className="flex-shrink-0">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-sm">FS</span>
                </div>
                <span className={`text-lg sm:text-xl font-bold tracking-tight ${isTransparent ? "text-white" : "text-foreground"}`}>
                  Free Spirit
                </span>
              </div>
            </Link>

            <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-6">
              <div className="relative w-full">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isTransparent ? "text-white/60" : "text-muted-foreground"}`} />
                <Input
                  data-testid="input-nav-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search activities, locations..."
                  className={`pl-10 h-10 rounded-full border text-sm ${
                    isTransparent
                      ? "bg-white/15 border-white/20 text-white placeholder:text-white/50 focus:bg-white/25 focus:border-white/40"
                      : "bg-muted/50 border-border/50 focus:bg-white"
                  }`}
                />
              </div>
            </form>

            <div className="hidden md:flex items-center gap-1">
              <Button variant="ghost" size="icon" data-testid="button-cart" className={`rounded-full ${isTransparent ? "text-white hover:bg-white/10" : ""}`}>
                <ShoppingBag className="w-5 h-5" />
              </Button>
              {user ? (
                <>
                  <Link href="/favorites" data-testid="link-favorites-icon">
                    <Button variant="ghost" size="icon" className={`rounded-full ${isTransparent ? "text-white hover:bg-white/10" : ""}`}>
                      <Heart className="w-5 h-5" />
                    </Button>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        data-testid="button-user-menu"
                        className={`flex items-center gap-2 rounded-full ${isTransparent ? "text-white hover:bg-white/10" : ""}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isTransparent ? "bg-white/20" : "bg-primary/10"}`}>
                          <User className={`w-4 h-4 ${isTransparent ? "text-white" : "text-primary"}`} />
                        </div>
                        <span className="text-sm font-medium hidden lg:inline">{user.fullName.split(" ")[0]}</span>
                        <ChevronDown className="w-3 h-3 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 rounded-xl p-1">
                      <div className="px-3 py-2 border-b border-border mb-1">
                        <p className="text-sm font-medium">{user.fullName}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <DropdownMenuItem asChild>
                        <Link href="/account" data-testid="link-account" className="cursor-pointer rounded-lg">
                          <User className="w-4 h-4 mr-2" />
                          My Account
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/bookings" data-testid="link-bookings" className="cursor-pointer rounded-lg">
                          <CalendarCheck className="w-4 h-4 mr-2" />
                          My Bookings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/favorites" data-testid="link-favorites" className="cursor-pointer rounded-lg">
                          <Heart className="w-4 h-4 mr-2" />
                          Favorites
                        </Link>
                      </DropdownMenuItem>
                      {user.role === "vendor" && (
                        <DropdownMenuItem asChild>
                          <Link href="/vendor" data-testid="link-vendor" className="cursor-pointer rounded-lg">
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            Vendor Portal
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {user.role === "admin" && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin" data-testid="link-admin" className="cursor-pointer rounded-lg">
                            <LayoutDashboard className="w-4 h-4 mr-2" />
                            Admin Panel
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        data-testid="button-logout"
                        className="cursor-pointer text-destructive rounded-lg"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Link href="/login" data-testid="link-login">
                    <Button variant="ghost" className={`text-sm font-medium rounded-full ${isTransparent ? "text-white hover:bg-white/10" : ""}`}>
                      Log in
                    </Button>
                  </Link>
                  <Link href="/signup" data-testid="link-signup">
                    <Button className="text-sm font-medium rounded-full px-5">
                      Sign up
                    </Button>
                  </Link>
                </>
              )}
            </div>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" data-testid="button-mobile-menu" className={isTransparent ? "text-white" : ""}>
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-border">
                    <form onSubmit={(e) => { handleSearch(e); setOpen(false); }}>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search activities..."
                          className="pl-10 h-10 rounded-full"
                        />
                      </div>
                    </form>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <div className="space-y-1">
                      {navCategories.map((cat) => (
                        <Link key={cat.name} href={cat.href} onClick={() => setOpen(false)}>
                          <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm hover:bg-muted transition-colors text-left">
                            <cat.icon className="w-4 h-4 text-muted-foreground" />
                            {cat.name}
                          </button>
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-border my-4" />
                    {user ? (
                      <div className="space-y-1">
                        <Link href="/account" onClick={() => setOpen(false)}>
                          <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm hover:bg-muted transition-colors text-left">
                            <User className="w-4 h-4 text-muted-foreground" />
                            My Account
                          </button>
                        </Link>
                        <Link href="/bookings" onClick={() => setOpen(false)}>
                          <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm hover:bg-muted transition-colors text-left">
                            <CalendarCheck className="w-4 h-4 text-muted-foreground" />
                            My Bookings
                          </button>
                        </Link>
                        <Link href="/favorites" onClick={() => setOpen(false)}>
                          <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm hover:bg-muted transition-colors text-left">
                            <Heart className="w-4 h-4 text-muted-foreground" />
                            Favorites
                          </button>
                        </Link>
                        {user.role === "vendor" && (
                          <Link href="/vendor" onClick={() => setOpen(false)}>
                            <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm hover:bg-muted transition-colors text-left">
                              <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                              Vendor Portal
                            </button>
                          </Link>
                        )}
                        {user.role === "admin" && (
                          <Link href="/admin" onClick={() => setOpen(false)}>
                            <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm hover:bg-muted transition-colors text-left">
                              <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                              Admin Panel
                            </button>
                          </Link>
                        )}
                        <div className="border-t border-border my-2" />
                        <button
                          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm hover:bg-muted transition-colors text-left text-destructive"
                          onClick={() => { handleLogout(); setOpen(false); }}
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Link href="/login" onClick={() => setOpen(false)}>
                          <Button variant="outline" className="w-full rounded-full">Log in</Button>
                        </Link>
                        <Link href="/signup" onClick={() => setOpen(false)}>
                          <Button className="w-full rounded-full">Sign up</Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {isHome && (
          <div className={`hidden md:block border-t ${isTransparent ? "border-white/10" : "border-border/50"}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-1 h-10 overflow-x-auto scrollbar-hide">
                {navCategories.map((cat) => (
                  <Link key={cat.name} href={cat.href} data-testid={`nav-category-${cat.name.toLowerCase().replace(/\s+/g, "-")}`}>
                    <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      isTransparent
                        ? "text-white/70 hover:text-white hover:bg-white/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}>
                      <cat.icon className="w-3.5 h-3.5" />
                      {cat.name}
                    </button>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
