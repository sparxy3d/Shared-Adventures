import { Link } from "wouter";
import { Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer data-testid="footer" className="bg-foreground text-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center">
                <span className="text-white font-bold text-sm">FS</span>
              </div>
              <span className="text-xl font-bold tracking-tight">Free Spirit</span>
            </div>
            <p className="text-sm opacity-70 leading-relaxed">
              Bringing people closer through shared experiences. Discover activities worth doing together.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 uppercase tracking-wider opacity-50">
              Explore
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="/search?category=sports" className="text-sm opacity-70 hover:opacity-100 transition-opacity">
                  Sports
                </Link>
              </li>
              <li>
                <Link href="/search?category=adventure" className="text-sm opacity-70 hover:opacity-100 transition-opacity">
                  Adventure
                </Link>
              </li>
              <li>
                <Link href="/search?category=arts" className="text-sm opacity-70 hover:opacity-100 transition-opacity">
                  Arts & Classes
                </Link>
              </li>
              <li>
                <Link href="/search?category=wellness" className="text-sm opacity-70 hover:opacity-100 transition-opacity">
                  Wellness
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 uppercase tracking-wider opacity-50">
              Company
            </h4>
            <ul className="space-y-3">
              <li>
                <span className="text-sm opacity-70">About Us</span>
              </li>
              <li>
                <Link href="/signup" className="text-sm opacity-70 hover:opacity-100 transition-opacity">
                  List Your Venue
                </Link>
              </li>
              <li>
                <span className="text-sm opacity-70">Contact</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 uppercase tracking-wider opacity-50">
              Support
            </h4>
            <ul className="space-y-3">
              <li>
                <span className="text-sm opacity-70">Help Center</span>
              </li>
              <li>
                <span className="text-sm opacity-70">Privacy Policy</span>
              </li>
              <li>
                <span className="text-sm opacity-70">Terms of Service</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm opacity-50">
            &copy; {new Date().getFullYear()} Free Spirit. All rights reserved.
          </p>
          <p className="text-sm opacity-50 flex items-center gap-1">
            Made with <Heart className="w-3 h-3 fill-primary text-primary" /> for connection
          </p>
        </div>
      </div>
    </footer>
  );
}
