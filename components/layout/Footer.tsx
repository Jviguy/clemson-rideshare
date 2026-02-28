import Link from "next/link";
import { Car } from "lucide-react";

export function Footer() {
  return (
    <footer className="text-white" style={{ background: "#16082b" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2">
              <Car className="h-6 w-6 text-clemson-orange" />
              <span className="text-lg font-bold">
                Tiger<span className="text-clemson-orange">Ride</span>
              </span>
            </div>
            <p className="text-sm text-white/40">
              Clemson University Rideshare
            </p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/rides"
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              Browse Rides
            </Link>
            <Link
              href="/post-ride"
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              Post a Ride
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-white/10 pt-6 text-center">
          <p className="text-sm text-white/30">
            TigerRide is not endorsed by or affiliated with Clemson University.
          </p>
        </div>
      </div>
    </footer>
  );
}
