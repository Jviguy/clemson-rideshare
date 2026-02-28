"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useMotionValue,
  useSpring,
  type Variants,
} from "motion/react";
import {
  Car,
  Users,
  DollarSign,
  ShieldCheck,
  CreditCard,
  MapPin,
  Bell,
  ArrowRight,
  ChevronDown,
  Star,
  Clock,
  Route,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

// ─── Animated Counter ───
function AnimatedCounter({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 50, damping: 20 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (isInView) motionVal.set(target);
  }, [isInView, motionVal, target]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(Math.round(v).toString()));
    return unsub;
  }, [spring]);

  return <span ref={ref}>{prefix}{display}{suffix}</span>;
}

// ─── Floating Orbs (CSS-only, no blur filter — uses large soft radial gradients instead) ───
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full will-change-transform"
          style={{
            width: `${400 + i * 150}px`,
            height: `${400 + i * 150}px`,
            background: i % 2 === 0
              ? "radial-gradient(circle, rgba(245,102,0,0.1) 0%, rgba(245,102,0,0.03) 40%, transparent 70%)"
              : "radial-gradient(circle, rgba(82,45,128,0.08) 0%, rgba(82,45,128,0.02) 40%, transparent 70%)",
          }}
          initial={{ x: `${10 + i * 25}%`, y: `${5 + i * 20}%` }}
          animate={{
            x: [`${10 + i * 25}%`, `${25 + i * 12}%`, `${10 + i * 25}%`],
            y: [`${5 + i * 20}%`, `${18 + i * 10}%`, `${5 + i * 20}%`],
          }}
          transition={{ duration: 18 + i * 6, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─── Variants ───
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28, filter: "blur(4px)" },
  visible: {
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1, scale: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

// ─── Data ───
const steps = [
  {
    icon: Route,
    title: "Post your route",
    description: "Heading home for the weekend? Post your trip — set your departure, seats, and price.",
    color: "from-clemson-orange to-amber-500",
  },
  {
    icon: Users,
    title: "Match with riders",
    description: "Verified Clemson students request to join. You choose who rides with you.",
    color: "from-clemson-purple to-violet-500",
  },
  {
    icon: DollarSign,
    title: "Split & save",
    description: "Payment is held when they join and released to you when the ride completes. No awkward Venmos.",
    color: "from-emerald-500 to-teal-500",
  },
];

const features = [
  {
    icon: ShieldCheck,
    title: "Clemson students only",
    description: "Sign up requires a @clemson.edu email. Every rider and driver is a verified Tiger.",
    accent: "text-rose-500",
    bg: "bg-rose-500/8",
  },
  {
    icon: CreditCard,
    title: "No-stress payments",
    description: "Funds are held upfront so riders are committed and drivers always get paid. No cash, no IOUs.",
    accent: "text-violet-500",
    bg: "bg-violet-500/8",
  },
  {
    icon: MapPin,
    title: "Real-time maps",
    description: "Search any address, see your route on the map, and get accurate distance & time estimates.",
    accent: "text-blue-500",
    bg: "bg-blue-500/8",
  },
  {
    icon: Bell,
    title: "Never miss a ride",
    description: "Get reminders 24 hours and 2 hours before departure — plus email and in-app notifications.",
    accent: "text-amber-500",
    bg: "bg-amber-500/8",
  },
  {
    icon: Clock,
    title: "Flexible scheduling",
    description: "Post rides days in advance or a few hours out. Find last-minute rides when you need them.",
    accent: "text-emerald-500",
    bg: "bg-emerald-500/8",
  },
  {
    icon: Star,
    title: "Your ride, your rules",
    description: "Set your price, add rules (no smoking, one bag max), and approve every request before they join.",
    accent: "text-pink-500",
    bg: "bg-pink-500/8",
  },
];

const testimonials = [
  {
    quote: "Way cheaper than Uber to get to the airport. Found a ride in like 2 minutes.",
    name: "Sarah M.",
    detail: "Clemson → ATL, saved $45",
  },
  {
    quote: "I drive to Charlotte every other weekend — now I actually cover my gas money.",
    name: "Marcus J.",
    detail: "Driver, 12 rides posted",
  },
  {
    quote: "Love that it's only Clemson students. Feels way safer than random ride apps.",
    name: "Priya K.",
    detail: "Rider since February",
  },
];

const stats = [
  { value: 45, prefix: "$", suffix: "", label: "Avg savings vs Uber" },
  { value: 100, prefix: "", suffix: "%", label: "Clemson verified" },
  { value: 10, prefix: "", suffix: "%", label: "Platform fee" },
  { value: 5, prefix: "", suffix: " min", label: "Avg time to find a ride" },
];

// ─── Main Component ───
export function LandingHero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <main>
      {/* ════════ HERO ════════ */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{ background: "linear-gradient(145deg, #1a0a2e 0%, #16082b 35%, #2d1045 65%, #3D1F60 100%)" }}
      >
        <FloatingOrbs />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center will-change-transform"
        >
          <motion.div initial="hidden" animate="visible" variants={stagger} className="flex flex-col items-center">
            {/* Badge */}
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-1.5 mb-8"
            >
              <Car className="h-3.5 w-3.5 text-clemson-orange" />
              <span className="text-sm text-white/60 font-medium">
                Rideshare built for Clemson
              </span>
            </motion.div>

            {/* Heading */}
            <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl lg:text-8xl font-extrabold tracking-tight leading-tight overflow-visible">
              <span className="block text-white">Going home?</span>
              <span className="inline-block pb-3 bg-gradient-to-r from-clemson-orange via-amber-400 to-clemson-orange bg-clip-text text-transparent">
                Take a Tiger.
              </span>
            </motion.h1>

            {/* Sub */}
            <motion.p variants={fadeUp} className="mt-8 text-lg sm:text-xl text-white/50 max-w-xl leading-relaxed font-light">
              Share rides with fellow Clemson students.
              Save money on gas, skip the Uber markup,
              and travel with people you trust.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row items-center gap-4">
              <Link href="/signup">
                <Button
                  size="lg"
                  variant="primary"
                  className="px-8 font-bold shadow-2xl shadow-clemson-orange/25 hover:shadow-clemson-orange/40 transition-all hover:scale-105 text-base"
                >
                  Sign up free
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <Link href="/rides">
                <Button
                  size="lg"
                  variant="ghost"
                  className="px-8 font-semibold text-white/80 hover:text-white border border-white/15 hover:bg-white/10 hover:border-white/25 transition-all text-base"
                >
                  Browse rides
                </Button>
              </Link>
            </motion.div>

            {/* Social proof line */}
            <motion.p variants={fadeUp} className="mt-8 text-sm text-white/30">
              Only available to verified @clemson.edu students
            </motion.p>
          </motion.div>
        </motion.div>

        {/* Scroll chevron */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
            <ChevronDown className="h-6 w-6 text-white/25" />
          </motion.div>
        </motion.div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ════════ STATS BAR ════════ */}
      <section className="relative py-16 bg-background border-b border-gray-100 dark:border-clemson-orange/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid grid-cols-2 sm:grid-cols-4 gap-8"
          >
            {stats.map((stat) => (
              <motion.div key={stat.label} variants={fadeUp} className="text-center">
                <div className="text-3xl sm:text-4xl font-extrabold text-foreground tabular-nums">
                  <AnimatedCounter target={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                </div>
                <div className="mt-1 text-sm text-gray-400 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════ HOW IT WORKS ════════ */}
      <section className="relative py-28 sm:py-36 bg-background overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center"
          >
            <motion.p variants={fadeUp} className="text-sm font-semibold tracking-widest uppercase text-clemson-orange">
              How it works
            </motion.p>
            <motion.h2 variants={fadeUp} className="mt-3 text-3xl sm:text-5xl font-bold text-foreground tracking-tight">
              Get a ride in three steps
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {steps.map((step, i) => (
              <motion.div key={step.title} variants={fadeUp}>
                <div className="group relative rounded-2xl border border-gray-100 dark:border-clemson-orange/20 bg-background p-8 transition-all duration-300 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 h-full">
                  <div className="absolute -top-4 -left-2 flex h-9 w-9 items-center justify-center rounded-full bg-clemson-purple text-sm font-bold text-white shadow-lg">
                    {i + 1}
                  </div>
                  <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} shadow-lg`}>
                    <step.icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-foreground">{step.title}</h3>
                  <p className="mt-3 text-gray-500 leading-relaxed">{step.description}</p>

                  {/* Connector arrow (not on last) */}
                  {i < 2 && (
                    <div className="hidden md:flex absolute -right-6 top-1/2 -translate-y-1/2 z-10">
                      <ArrowRight className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════ FEATURES ════════ */}
      <section className="relative py-28 sm:py-36 overflow-hidden border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center"
          >
            <motion.p variants={fadeUp} className="text-sm font-semibold tracking-widest uppercase text-clemson-purple">
              Why TigerRide
            </motion.p>
            <motion.h2 variants={fadeUp} className="mt-3 text-3xl sm:text-5xl font-bold text-foreground tracking-tight">
              Everything you need. Nothing you don&apos;t.
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              We built TigerRide because getting home from Clemson shouldn&apos;t cost a fortune
              or require trusting a stranger from the internet.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={stagger}
            className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {features.map((f) => (
              <motion.div key={f.title} variants={scaleIn}>
                <div className="group h-full rounded-2xl border border-gray-100 dark:border-clemson-orange/20 bg-background p-7 transition-all duration-300 hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5">
                  <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${f.bg}`}>
                    <f.icon className={`h-5 w-5 ${f.accent}`} />
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-foreground">{f.title}</h3>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">{f.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════ TESTIMONIALS ════════ */}
      <section className="relative py-28 sm:py-36 bg-background overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center"
          >
            <motion.p variants={fadeUp} className="text-sm font-semibold tracking-widest uppercase text-clemson-orange">
              From the Tigers
            </motion.p>
            <motion.h2 variants={fadeUp} className="mt-3 text-3xl sm:text-5xl font-bold text-foreground tracking-tight">
              Students love it
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={stagger}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {testimonials.map((t) => (
              <motion.div key={t.name} variants={fadeUp}>
                <div className="h-full rounded-2xl border border-gray-100 dark:border-clemson-orange/20 bg-background p-7">
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-clemson-orange text-clemson-orange" />
                    ))}
                  </div>
                  <p className="text-foreground leading-relaxed font-medium">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-5 pt-5 border-t border-gray-100 dark:border-clemson-orange/20">
                    <p className="font-semibold text-sm text-foreground">{t.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t.detail}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ════════ FINAL CTA ════════ */}
      <section className="relative py-28 sm:py-36 overflow-hidden"
        style={{ background: "linear-gradient(180deg, var(--background) 0%, #1a0a2e 40%, #16082b 100%)" }}
      >
        <FloatingOrbs />

        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
              Stop overpaying.
              <br />
              <span className="bg-gradient-to-r from-clemson-orange to-amber-400 bg-clip-text text-transparent">
                Start riding together.
              </span>
            </motion.h2>

            <motion.p variants={fadeUp} className="mt-6 text-lg text-white/45 max-w-xl mx-auto">
              Sign up with your @clemson.edu email and find your next ride in minutes.
              It&apos;s free — you only pay for the rides you take.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button
                  size="lg"
                  variant="primary"
                  className="px-10 font-bold shadow-2xl shadow-clemson-orange/25 hover:shadow-clemson-orange/40 transition-all hover:scale-105 text-base"
                >
                  Get started — it&apos;s free
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <Link href="/rides">
                <Button
                  size="lg"
                  variant="ghost"
                  className="px-8 font-semibold text-white/70 hover:text-white border border-white/15 hover:bg-white/10 hover:border-white/25 transition-all text-base"
                >
                  Browse available rides
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
