import Link from "next/link";
import {
  Car,
  Users,
  DollarSign,
  ShieldCheck,
  CreditCard,
  Map,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const steps = [
  {
    icon: Car,
    title: "Post Your Ride",
    description:
      "Heading home or going on a trip? Post your ride with your route, date, and available seats.",
  },
  {
    icon: Users,
    title: "Match with Tigers",
    description:
      "Find fellow Clemson students going the same way. Connect with verified @clemson.edu users.",
  },
  {
    icon: DollarSign,
    title: "Split the Cost",
    description:
      "Share gas and travel expenses fairly. Payments are handled securely through Stripe.",
  },
];

const features = [
  {
    icon: ShieldCheck,
    title: "Clemson Verified",
    description:
      "Only @clemson.edu email addresses can sign up. Ride with fellow Tigers you can trust.",
  },
  {
    icon: CreditCard,
    title: "Guaranteed Payments",
    description:
      "Stripe pre-authorization ensures riders are committed. Drivers always get paid.",
  },
  {
    icon: Map,
    title: "Smart Routes",
    description:
      "Powered by Amazon Location Service for accurate routing, distance estimates, and pickup matching.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-clemson-purple via-clemson-purple-dark to-clemson-orange">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20100%20100%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2240%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.05)%22%20stroke-width%3D%221%22%2F%3E%3C%2Fsvg%3E')] opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32 lg:py-40">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl">
              Share the Road,{" "}
              <span className="text-white/90">Share the Cost</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-white/80 max-w-2xl">
              Clemson&apos;s student rideshare platform. Find rides home, split
              gas costs, and travel with fellow Tigers.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
              <Link href="/signup">
                <Button
                  size="lg"
                  variant="primary"
                  className="font-bold shadow-2xl px-10 transition-all hover:scale-105 border-2 border-white/20"
                >
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="bg-background py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              How it Works
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              Getting started is simple. Post, match, and ride in three easy
              steps.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="flex flex-col items-center text-center"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-clemson-orange/10">
                  <step.icon className="h-8 w-8 text-clemson-orange" />
                </div>
                <div className="mt-2 flex h-8 w-8 items-center justify-center rounded-full bg-clemson-purple text-sm font-bold text-white">
                  {index + 1}
                </div>
                <h3 className="mt-4 text-xl font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-gray-500 leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              Built for Clemson Students
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              Every feature is designed with safety, trust, and convenience in
              mind.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl bg-background p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-clemson-purple/10">
                  <feature.icon className="h-6 w-6 text-clemson-purple" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
