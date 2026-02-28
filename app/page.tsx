import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LandingHero } from "@/components/landing/LandingHero";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <LandingHero />
      <Footer />
    </div>
  );
}
