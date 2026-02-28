"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { signOutAction } from "@/lib/actions/auth";

interface NavbarClientProps {
  user: { name: string; email: string } | null;
}

export function NavbarClient({ user }: NavbarClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop nav links */}
      <nav className="hidden md:flex items-center gap-6">
        {user && (
          <>
            <Link
              href="/rides"
              className="text-sm font-medium text-gray-700 hover:text-clemson-orange transition-colors"
            >
              Browse Rides
            </Link>
            <Link
              href="/post-ride"
              className="text-sm font-medium text-gray-700 hover:text-clemson-orange transition-colors"
            >
              Post a Ride
            </Link>
            <Link
              href="/my-rides"
              className="text-sm font-medium text-gray-700 hover:text-clemson-orange transition-colors"
            >
              My Rides
            </Link>
          </>
        )}
      </nav>

      {/* Desktop right side */}
      <div className="hidden md:flex items-center gap-3">
        {user ? (
          <>
            <span className="text-sm font-medium text-gray-700">
              {user.name}
            </span>
            <form action={signOutAction}>
              <Button variant="ghost" size="sm" type="submit">
                Sign Out
              </Button>
            </form>
          </>
        ) : (
          <>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="primary" size="sm">
                Sign Up
              </Button>
            </Link>
          </>
        )}
      </div>

      {/* Mobile hamburger button */}
      <button
        type="button"
        className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-t border-gray-200 shadow-lg md:hidden z-50">
          <div className="flex flex-col px-4 py-3 gap-1">
            {user && (
              <>
                <Link
                  href="/rides"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Browse Rides
                </Link>
                <Link
                  href="/post-ride"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Post a Ride
                </Link>
                <Link
                  href="/my-rides"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  My Rides
                </Link>
              </>
            )}

            <div className="border-t border-gray-200 mt-2 pt-2">
              {user ? (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-medium text-gray-700">
                    {user.name}
                  </span>
                  <form action={signOutAction}>
                    <Button variant="ghost" size="sm" type="submit">
                      Sign Out
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="flex flex-col gap-2 px-3 py-2">
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link href="/signup" onClick={() => setMobileOpen(false)}>
                    <Button variant="primary" size="sm" className="w-full">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
