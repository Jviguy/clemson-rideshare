import type { ReactNode } from "react";

export const metadata = {
  title: "Clemson Rideshare - Sign In",
  description: "Clemson University student rideshare platform",
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-clemson-orange via-clemson-orange-dark to-clemson-purple overflow-hidden">
      {/* Decorative paw prints */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Large paw - top right */}
        <svg
          className="absolute -top-16 -right-16 h-80 w-80 text-white/[0.06] rotate-12"
          viewBox="0 0 200 200"
          fill="currentColor"
        >
          <ellipse cx="100" cy="140" rx="42" ry="52" />
          <ellipse cx="56" cy="70" rx="18" ry="24" transform="rotate(-15 56 70)" />
          <ellipse cx="144" cy="70" rx="18" ry="24" transform="rotate(15 144 70)" />
          <ellipse cx="40" cy="112" rx="16" ry="20" transform="rotate(-30 40 112)" />
          <ellipse cx="160" cy="112" rx="16" ry="20" transform="rotate(30 160 112)" />
        </svg>

        {/* Medium paw - bottom left */}
        <svg
          className="absolute -bottom-10 -left-10 h-56 w-56 text-white/[0.05] -rotate-20"
          viewBox="0 0 200 200"
          fill="currentColor"
        >
          <ellipse cx="100" cy="140" rx="42" ry="52" />
          <ellipse cx="56" cy="70" rx="18" ry="24" transform="rotate(-15 56 70)" />
          <ellipse cx="144" cy="70" rx="18" ry="24" transform="rotate(15 144 70)" />
          <ellipse cx="40" cy="112" rx="16" ry="20" transform="rotate(-30 40 112)" />
          <ellipse cx="160" cy="112" rx="16" ry="20" transform="rotate(30 160 112)" />
        </svg>

        {/* Small paw - center left */}
        <svg
          className="absolute top-1/3 left-8 h-32 w-32 text-white/[0.04] rotate-45"
          viewBox="0 0 200 200"
          fill="currentColor"
        >
          <ellipse cx="100" cy="140" rx="42" ry="52" />
          <ellipse cx="56" cy="70" rx="18" ry="24" transform="rotate(-15 56 70)" />
          <ellipse cx="144" cy="70" rx="18" ry="24" transform="rotate(15 144 70)" />
          <ellipse cx="40" cy="112" rx="16" ry="20" transform="rotate(-30 40 112)" />
          <ellipse cx="160" cy="112" rx="16" ry="20" transform="rotate(30 160 112)" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-md px-4 py-8">
        {/* Branding header */}
        <div className="mb-8 text-center">
          {/* Tiger paw icon */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-lg backdrop-blur-sm">
            <svg
              className="h-10 w-10 text-white"
              viewBox="0 0 200 200"
              fill="currentColor"
            >
              <ellipse cx="100" cy="140" rx="42" ry="52" />
              <ellipse cx="56" cy="70" rx="18" ry="24" transform="rotate(-15 56 70)" />
              <ellipse cx="144" cy="70" rx="18" ry="24" transform="rotate(15 144 70)" />
              <ellipse cx="40" cy="112" rx="16" ry="20" transform="rotate(-30 40 112)" />
              <ellipse cx="160" cy="112" rx="16" ry="20" transform="rotate(30 160 112)" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Clemson Rideshare
          </h1>
          <p className="mt-1 text-sm text-white/70">
            Share rides with fellow Tigers
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
