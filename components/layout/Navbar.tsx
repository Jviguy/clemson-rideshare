import Link from "next/link";
import { Car } from "lucide-react";
import { getSession } from "@/lib/auth/cognito";
import { NavbarClient } from "./NavbarClient";

export async function Navbar() {
  const user = await getSession();

  return (
    <header className="sticky top-0 z-40 w-full bg-white shadow-sm">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Car className="h-7 w-7 text-clemson-orange" />
          <span className="text-xl font-bold text-gray-900">
            Tiger<span className="text-clemson-orange">Ride</span>
          </span>
        </Link>

        {/* Center + Right: handled by client component for mobile toggle */}
        <NavbarClient
          user={user ? { name: user.name, email: user.email } : null}
        />
      </div>
    </header>
  );
}
