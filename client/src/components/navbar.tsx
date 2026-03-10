import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, User, LogOut, LayoutDashboard, Heart, CalendarCheck } from "lucide-react";
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

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

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

  const isHome = location === "/";

  return (
    <nav
      data-testid="navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isHome
          ? "bg-white/80 dark:bg-background/80 backdrop-blur-lg border-b border-transparent"
          : "bg-white dark:bg-background border-b border-border"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" data-testid="link-home">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center">
                <span className="text-white font-bold text-sm">FS</span>
              </div>
              <span className="text-xl font-bold text-foreground tracking-tight">
                Free Spirit
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link href="/search" data-testid="link-explore">
              <Button
                variant="ghost"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Explore
              </Button>
            </Link>
            {user?.role === "vendor" && (
              <Link href="/vendor" data-testid="link-vendor-dashboard">
                <Button
                  variant="ghost"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Vendor Portal
                </Button>
              </Link>
            )}
            {user?.role === "admin" && (
              <Link href="/admin" data-testid="link-admin-dashboard">
                <Button
                  variant="ghost"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Admin
                </Button>
              </Link>
            )}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    data-testid="button-user-menu"
                    className="flex items-center gap-2"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{user.fullName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/account" data-testid="link-account" className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      My Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/bookings" data-testid="link-bookings" className="cursor-pointer">
                      <CalendarCheck className="w-4 h-4 mr-2" />
                      My Bookings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/favorites" data-testid="link-favorites" className="cursor-pointer">
                      <Heart className="w-4 h-4 mr-2" />
                      Favorites
                    </Link>
                  </DropdownMenuItem>
                  {user.role === "vendor" && (
                    <DropdownMenuItem asChild>
                      <Link href="/vendor" data-testid="link-vendor" className="cursor-pointer">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Vendor Portal
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {user.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" data-testid="link-admin" className="cursor-pointer">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    data-testid="button-logout"
                    className="cursor-pointer text-destructive"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/login" data-testid="link-login">
                  <Button variant="ghost" className="text-sm font-medium">
                    Log in
                  </Button>
                </Link>
                <Link href="/signup" data-testid="link-signup">
                  <Button className="text-sm font-medium">
                    Sign up
                  </Button>
                </Link>
              </>
            )}
          </div>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col gap-4 mt-8">
                <Link href="/search" onClick={() => setOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    Explore Activities
                  </Button>
                </Link>
                {user ? (
                  <>
                    <Link href="/account" onClick={() => setOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        My Account
                      </Button>
                    </Link>
                    <Link href="/bookings" onClick={() => setOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        My Bookings
                      </Button>
                    </Link>
                    <Link href="/favorites" onClick={() => setOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        Favorites
                      </Button>
                    </Link>
                    {user.role === "vendor" && (
                      <Link href="/vendor" onClick={() => setOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start">
                          Vendor Portal
                        </Button>
                      </Link>
                    )}
                    {user.role === "admin" && (
                      <Link href="/admin" onClick={() => setOpen(false)}>
                        <Button variant="ghost" className="w-full justify-start">
                          Admin Panel
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-destructive"
                      onClick={() => { handleLogout(); setOpen(false); }}
                    >
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        Log in
                      </Button>
                    </Link>
                    <Link href="/signup" onClick={() => setOpen(false)}>
                      <Button className="w-full">Sign up</Button>
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
