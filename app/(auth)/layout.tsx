"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Car } from "lucide-react";

function FloatingOrb({ delay, size, x, y, color }: {
  delay: number;
  size: number;
  x: string;
  y: string;
  color: string;
}) {
  return (
    <motion.div
      className="absolute rounded-full will-change-transform"
      style={{
        width: size,
        height: size,
        background: color,
        left: x,
        top: y,
      }}
      animate={{
        x: [0, 30, -20, 0],
        y: [0, -25, 15, 0],
        scale: [1, 1.1, 0.95, 1],
      }}
      transition={{
        duration: 20 + delay * 3,
        repeat: Infinity,
        ease: "easeInOut",
        delay: delay,
      }}
    />
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(145deg, #1a0a2e 0%, #16082b 35%, #2d1045 65%, #3D1F60 100%)" }}
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <FloatingOrb
          delay={0}
          size={500}
          x="-10%"
          y="-20%"
          color="radial-gradient(circle, rgba(245,102,0,0.08) 0%, rgba(245,102,0,0.02) 40%, transparent 70%)"
        />
        <FloatingOrb
          delay={2}
          size={400}
          x="60%"
          y="50%"
          color="radial-gradient(circle, rgba(82,45,128,0.12) 0%, rgba(82,45,128,0.03) 40%, transparent 70%)"
        />
        <FloatingOrb
          delay={4}
          size={350}
          x="70%"
          y="-10%"
          color="radial-gradient(circle, rgba(245,102,0,0.06) 0%, rgba(245,102,0,0.01) 40%, transparent 70%)"
        />
        <FloatingOrb
          delay={1}
          size={300}
          x="-5%"
          y="60%"
          color="radial-gradient(circle, rgba(82,45,128,0.08) 0%, rgba(82,45,128,0.02) 40%, transparent 70%)"
        />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 w-full max-w-md px-4 py-8">
        {/* Branding header */}
        <motion.div
          className="mb-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link href="/" className="inline-block">
            <motion.div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-clemson-orange shadow-lg shadow-clemson-orange/25"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ scale: 1.05, rotate: -3 }}
            >
              <Car className="h-9 w-9 text-white" />
            </motion.div>
          </Link>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Tiger<span className="text-clemson-orange">Ride</span>
          </h1>
          <p className="mt-1 text-sm text-white/40">
            Rideshare for Clemson students
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.div>

        {/* Bottom trust line */}
        <motion.p
          className="mt-6 text-center text-xs text-white/25"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Only available to verified @clemson.edu students
        </motion.p>
      </div>
    </div>
  );
}
