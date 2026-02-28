"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Car, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { signOutAction } from "@/lib/actions/auth";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { clsx } from "clsx";

interface NavbarClientProps {
  user: { name: string; email: string } | null;
}

export function NavbarClient({ user }: NavbarClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const pathname = usePathname();

  const isHome = pathname === "/";

  // Initial theme setup
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen && !(event.target as HTMLElement).closest(".user-dropdown")) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!isHome) {
      setScrolled(true);
      return;
    }

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome]);

  const isTransparent = isHome && !scrolled && !mobileOpen;

  return (
    <header
      className={clsx(
        "z-40 w-full transition-all duration-300",
        isHome ? "fixed top-0" : "sticky top-0",
        isTransparent
          ? "bg-transparent border-transparent"
          : "bg-background shadow-sm border-b border-gray-100 dark:border-clemson-orange/50"
      )}
    >
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Car className="h-7 w-7 text-clemson-orange" />
          <span
            className={clsx(
              "text-xl font-bold transition-colors",
              isTransparent ? "text-white" : "text-foreground"
            )}
          >
            Tiger
            <span className="text-clemson-orange">Ride</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-6">
          {user && (
            <>
              <Link
                href="/rides"
                className={clsx(
                  "text-sm font-medium transition-colors",
                  isTransparent
                    ? "text-white/90 hover:text-white"
                    : "text-foreground hover:text-clemson-orange"
                )}
              >
                Browse Rides
              </Link>
              <Link
                href="/post-ride"
                className={clsx(
                  "text-sm font-medium transition-colors",
                  isTransparent
                    ? "text-white/90 hover:text-white"
                    : "text-foreground hover:text-clemson-orange"
                )}
              >
                Post a Ride
              </Link>
              <Link
                href="/my-rides"
                className={clsx(
                  "text-sm font-medium transition-colors",
                  isTransparent
                    ? "text-white/90 hover:text-white"
                    : "text-foreground hover:text-clemson-orange"
                )}
              >
                My Rides
              </Link>
            </>
          )}
        </nav>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <NotificationBell />
              <div className="relative user-dropdown">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={clsx(
                    "flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer p-2 rounded-lg hover:text-clemson-orange",
                    isTransparent
                      ? "text-white"
                      : "text-foreground"
                  )}
                >
                  {user.name}
                  <svg
                    className={clsx(
                      "h-4 w-4 transition-transform",
                      dropdownOpen && "rotate-180"
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-background shadow-xl border border-gray-100 dark:border-gray-800 py-1 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800 mb-1">
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <form action={signOutAction}>
                      <button
                        type="submit"
                        className="w-full text-left px-4 py-2.5 text-sm text-error hover:bg-error/5 transition-colors font-medium cursor-pointer"
                      >
                        Sign Out
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className={clsx(
                    isTransparent ? "text-white hover:bg-white/10" : "text-foreground"
                  )}
                >
                  Login
                </Button>
              </Link>
              <Link href="/signup">
                <Button
                  variant="primary"
                  size="sm"
                  className={clsx(
                    "font-semibold shadow-sm transition-all",
                    isTransparent && "border border-white/20"
                  )}
                >
                  Sign Up
                </Button>
              </Link>
            </>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className={clsx(
              "p-2 rounded-lg transition-colors cursor-pointer ml-1",
              isTransparent
                ? "text-white hover:bg-white/10"
                : "text-foreground hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            )}
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile hamburger button */}
        <div className="flex items-center gap-1 md:hidden">
          <button
            onClick={toggleDarkMode}
            className={clsx(
              "p-2 rounded-lg transition-colors cursor-pointer",
              isTransparent
                ? "text-white hover:bg-white/10"
                : "text-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            type="button"
            className={clsx(
              "p-2 rounded-lg transition-colors cursor-pointer",
              isTransparent
                ? "text-white hover:bg-white/10"
                : "text-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
            )}
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="absolute top-full left-0 right-0 bg-background border-t border-gray-100 dark:border-gray-800 shadow-lg md:hidden z-50">
          <div className="flex flex-col px-4 py-3 gap-1">
            {user && (
              <>
                <Link
                  href="/rides"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Browse Rides
                </Link>
                <Link
                  href="/post-ride"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Post a Ride
                </Link>
                <Link
                  href="/my-rides"
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  My Rides
                </Link>
              </>
            )}

            <div className="border-t border-gray-100 dark:border-gray-800 mt-2 pt-2">
              {user ? (
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <NotificationBell />
                    <span className="text-sm font-medium text-foreground">
                      {user.name}
                    </span>
                  </div>
                  <form action={signOutAction}>
                    <Button variant="ghost" size="sm" type="submit" className="text-foreground">
                      Sign Out
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="flex flex-col gap-2 px-3 py-2">
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full text-foreground">
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
    </header>
  );
}
