"use client";

import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Mic, Target, TrendingUp, Users, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { InteractiveChatDemo } from "@/components/landing/interactive-chat-demo";
import { Button } from "@/components/ui/button";
import { CloudAnimation } from "@/components/ui/cloud-animation";
import type { LandingPageCMSContent } from "@/lib/cms/landing-page-types";
import { cn } from "@/lib/utils";

interface LandingPageClientProps {
  content: LandingPageCMSContent;
}

// Icon mapping
const IconMap = {
  Zap,
  Mic,
  Target,
  TrendingUp,
} as const;

// Decorative floating elements
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-red-400/30 rounded-full"
          initial={{
            x: Math.random() * 100 + "%",
            y: Math.random() * 100 + "%",
            scale: 0,
            opacity: 0,
          }}
          animate={{
            y: [null, -100],
            scale: [0, 1, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 4 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeInOut",
          }}
          style={{
            left: `${20 + Math.random() * 60}%`,
            top: `${20 + Math.random() * 60}%`,
          }}
        />
      ))}
    </div>
  );
}

// Hero Section with Cloud Animation - Split Layout
function HeroSection({ content }: { content: LandingPageCMSContent }) {
  const [isVisible, setIsVisible] = useState(false);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 300], [0, 100]);
  const opacity1 = useTransform(scrollY, [0, 200], [1, 0]);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-gradient-to-br from-white via-stone-50/50 to-white">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-gradient-to-br from-red-50/40 via-rose-50/20 to-transparent rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-tr from-stone-100/60 to-transparent rounded-full blur-[80px]" />
      </div>

      {/* Cloud Animation Background */}
      <div className="absolute inset-0 opacity-60">
        <CloudAnimation
          className="absolute inset-0 h-full w-full"
          particleColor="rgba(220, 38, 38, 0.15)"
          particleCount={120}
        />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Floating particles */}
      <FloatingParticles />

      {/* Content - Split Layout */}
      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-7xl items-center px-4 pt-20 sm:px-6 lg:px-8">
        <div className="grid w-full gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left - Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-center"
            style={{ y: y1, opacity: opacity1 }}
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isVisible ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-full border border-red-100 w-fit mb-6"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold tracking-wide text-red-700 uppercase">
                AI-Powered Executive Consulting
              </span>
            </motion.div>

            {/* Main Heading - cleaner styling */}
            <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl leading-tight">
              <span className="block">{content.hero.title_main}</span>
              <span className="mt-2 block text-red-600">
                {content.hero.title_highlight}
              </span>
            </h1>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={isVisible ? { opacity: 1 } : {}}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mt-8 max-w-lg text-lg leading-relaxed text-stone-600 sm:text-xl font-light"
            >
              {content.hero.subtitle}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="mt-8 flex flex-col gap-4 sm:flex-row"
            >
              <Link href={content.hero.cta_primary_link}>
                <Button
                  size="lg"
                  className="group gap-2 bg-gradient-to-r from-red-600 to-red-700 px-8 py-6 text-base font-semibold text-white shadow-xl shadow-red-600/25 transition-all hover:shadow-2xl hover:shadow-red-600/30 hover:scale-105"
                >
                  {content.hero.cta_primary_text}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link href={content.hero.cta_secondary_link}>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-stone-300 bg-white/80 backdrop-blur-sm px-8 py-6 text-base font-medium text-stone-700 hover:border-stone-400 hover:bg-white hover:text-stone-900 transition-all hover:scale-105"
                >
                  {content.hero.cta_secondary_text}
                </Button>
              </Link>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isVisible ? { opacity: 1 } : {}}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="mt-12 flex items-center gap-6 text-sm text-stone-400"
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-red-500 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <span>Trusted by founders</span>
              </div>
              <div className="h-4 w-px bg-stone-200" />
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>Instant responses</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right - Interactive Chat Demo */}
          <motion.div
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={isVisible ? { opacity: 1, x: 0, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center lg:justify-end"
          >
            <div className="w-full max-w-2xl xl:max-w-3xl relative">
              {/* Decorative elements behind chat */}
              <div className="absolute -inset-4 bg-gradient-to-r from-red-500/10 to-rose-500/10 rounded-3xl blur-2xl" />
              <div className="absolute -inset-1 bg-gradient-to-r from-stone-100 to-stone-50 rounded-3xl" />
              <InteractiveChatDemo content={content} />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isVisible ? { opacity: 1 } : {}}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-stone-400">
            Explore
          </span>
          <div className="h-12 w-px bg-gradient-to-b from-stone-400 via-stone-300 to-transparent" />
        </motion.div>
      </motion.div>
    </section>
  );
}

// Executive Cards - Chat Style Layout (Single Box)
function ExecutiveCards({ content }: { content: LandingPageCMSContent }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  const executives = [
    {
      name: content.executives.alex_name,
      role: content.executives.alex_role,
      image: content.executives.alex_image,
      expertise: content.executives.alex_expertise.split(","),
      accent: "from-red-500 to-rose-600",
      accentLight: "bg-red-50",
      textColor: "text-red-700",
      borderColor: "border-red-200",
      description: "Brand strategist with Fortune 500 experience",
    },
    {
      name: content.executives.kim_name,
      role: content.executives.kim_role,
      image: content.executives.kim_image,
      expertise: content.executives.kim_expertise.split(","),
      accent: "from-stone-800 to-stone-950",
      accentLight: "bg-stone-100",
      textColor: "text-stone-700",
      borderColor: "border-stone-200",
      description: "Revenue architect and sales optimization expert",
    },
  ];

  return (
    <section ref={ref} className="relative bg-gradient-to-b from-stone-50 to-white py-24 sm:py-32 lg:py-40 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-red-100/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-stone-200/50 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="mb-16 text-center"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-block px-4 py-1.5 mb-6 text-xs font-bold uppercase tracking-[0.25em] text-red-700 bg-red-50 rounded-full"
          >
            The Experts Behind Your Growth
          </motion.span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-stone-900">
            {content.executives.section_title}{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                {content.executives.section_title_highlight}
              </span>
              <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 200 8" fill="none">
                <path d="M0 4C50 2 100 6 150 4C175 3 190 5 200 4" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-red-200" />
              </svg>
            </span>
          </h2>
          <p className="mt-8 max-w-2xl mx-auto text-lg leading-relaxed text-stone-600">
            {content.executives.section_subtitle}
          </p>
        </motion.div>

        {/* Chat Style Executive Box */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          {/* Glow effect */}
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-red-500/20 via-rose-500/20 to-stone-500/20 blur-xl" />

          {/* Main container */}
          <div className="relative bg-white rounded-3xl border border-stone-100 shadow-2xl shadow-stone-200/50 overflow-hidden">
            {/* Header bar */}
            <div className="flex items-center gap-3 px-6 py-4 bg-stone-50 border-b border-stone-100">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-stone-300" />
              </div>
              <span className="ml-2 text-sm font-medium text-stone-500">Executive Team</span>
            </div>

            {/* Chat-style messages */}
            <div className="p-6 sm:p-8 space-y-6">
              {executives.map((exec, i) => (
                <motion.div
                  key={exec.name}
                  initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ delay: 0.2 + i * 0.15, duration: 0.5 }}
                  className={cn(
                    "flex gap-4 p-5 rounded-2xl border",
                    exec.accentLight,
                    exec.borderColor
                  )}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="size-16 sm:size-20 overflow-hidden rounded-full ring-2 ring-white shadow-lg">
                      <Image
                        src={exec.image}
                        alt={exec.name}
                        width={80}
                        height={80}
                        className="size-full object-cover"
                      />
                    </div>
                    {/* Status indicator */}
                    <div className="absolute bottom-0 right-0 size-4 rounded-full border-2 border-white bg-green-500" />
                  </div>

                  {/* Message content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={cn("text-lg sm:text-xl font-bold", exec.textColor)}>
                        {exec.name}
                      </h3>
                      <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                        {exec.role}
                      </span>
                    </div>
                    <p className="text-sm text-stone-600 leading-relaxed mb-3">
                      {exec.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {exec.expertise.map((skill) => (
                        <span
                          key={skill}
                          className="px-3 py-1 text-xs font-medium rounded-md bg-white/80 border border-stone-200 text-stone-600"
                        >
                          {skill.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <div className="flex -space-x-2">
                  {executives.map((exec) => (
                    <div
                      key={exec.name}
                      className="size-8 rounded-full ring-2 ring-white overflow-hidden bg-stone-200"
                    >
                      <Image
                        src={exec.image}
                        alt={exec.name}
                        width={32}
                        height={32}
                        className="size-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <span className="ml-2">Available 24/7</span>
              </div>
              <Link href="/login">
                <Button
                  size="sm"
                  className="gap-2 bg-stone-900 text-white hover:bg-stone-800 transition-all"
                >
                  Start Chatting
                  <ArrowRight className="size-3" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* CTA for both executives */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-12 text-center"
        >
          <Link href="/login">
            <Button
              size="lg"
              className="gap-2 bg-stone-900 px-8 py-6 text-base font-semibold text-white shadow-xl hover:bg-stone-800 transition-all hover:scale-105"
            >
              Chat with Both Executives
              <Users className="size-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

// Benefits Grid - Enhanced visual design
function BenefitsGrid({ content }: { content: LandingPageCMSContent }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const benefits = [
    {
      icon:
        IconMap[content.benefits.benefit_1_icon as keyof typeof IconMap] || Zap,
      title: content.benefits.benefit_1_title,
      desc: content.benefits.benefit_1_desc,
      num: "01",
      gradient: "from-amber-500 to-orange-500",
    },
    {
      icon:
        IconMap[content.benefits.benefit_2_icon as keyof typeof IconMap] || Mic,
      title: content.benefits.benefit_2_title,
      desc: content.benefits.benefit_2_desc,
      num: "02",
      gradient: "from-red-500 to-rose-500",
    },
    {
      icon:
        IconMap[content.benefits.benefit_3_icon as keyof typeof IconMap] ||
        Target,
      title: content.benefits.benefit_3_title,
      desc: content.benefits.benefit_3_desc,
      num: "03",
      gradient: "from-violet-500 to-purple-500",
    },
    {
      icon:
        IconMap[content.benefits.benefit_4_icon as keyof typeof IconMap] ||
        TrendingUp,
      title: content.benefits.benefit_4_title,
      desc: content.benefits.benefit_4_desc,
      num: "04",
      gradient: "from-emerald-500 to-teal-500",
    },
  ];

  return (
    <section ref={ref} className="relative bg-stone-950 py-24 sm:py-32 lg:py-40 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:64px_64px]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-red-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="mb-16 max-w-3xl"
        >
          <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold uppercase tracking-[0.25em] text-red-400 bg-red-950/50 rounded-full border border-red-900/50">
            Why Choose AI Boss Brainz
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
            {content.benefits.section_title}
          </h2>
          <p className="mt-6 text-lg text-stone-400 leading-relaxed">
            {content.benefits.section_subtitle}
          </p>
        </motion.div>

        {/* Benefits Grid - Enhanced */}
        <div className="grid gap-px overflow-hidden rounded-2xl border border-stone-800 bg-stone-800 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 + i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="group relative flex flex-col bg-stone-900/50 backdrop-blur-sm p-8 transition-all duration-500 hover:bg-stone-900/80"
            >
              {/* Hover glow */}
              <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-b from-transparent via-white/5 to-transparent rounded-xl",
              )} />

              {/* Number */}
              <span className="mb-6 text-xs font-bold tabular-nums text-stone-600 group-hover:text-stone-500 transition-colors">
                {b.num}
              </span>

              {/* Icon with gradient background */}
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "mb-6 flex size-14 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg",
                  b.gradient
                )}
              >
                <b.icon className="size-6 text-white" />
              </motion.div>

              {/* Content */}
              <h3 className="text-lg font-bold text-white group-hover:text-white transition-colors">
                {b.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-stone-400 group-hover:text-stone-300 transition-colors">
                {b.desc}
              </p>

              {/* Arrow indicator on hover */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                whileHover={{ opacity: 1, x: 0 }}
                className="mt-6 flex items-center gap-1 text-xs font-semibold text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              >
                <span>Learn more</span>
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" />
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-4 lg:gap-16"
        >
          {[
            { value: "40+", label: "Years Experience" },
            { value: "500+", label: "Brands Helped" },
            { value: "24/7", label: "Availability" },
            { value: "100%", label: "Focus on Results" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.7 + i * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-b from-white to-stone-400 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// CTA Section - Premium dark with dramatic effect
function CTASection({ content }: { content: LandingPageCMSContent }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="relative bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 py-24 sm:py-32 lg:py-40 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:48px_48px]" />

        {/* Floating orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500 rounded-full blur-[150px]"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.15, 0.1, 0.15],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-rose-500 rounded-full blur-[120px]"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          {/* Glow effect behind content */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-red-500/10 via-rose-500/5 to-red-500/10 rounded-full blur-[100px]" />

          <div className="relative text-center">
            {/* Badge */}
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full border border-red-500/30 bg-red-950/50 text-sm font-semibold text-red-400"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Ready to Scale Your Business?
            </motion.span>

            <h2 className="mx-auto max-w-4xl text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
              {content.cta.title}
            </h2>

            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-stone-400">
              {content.cta.subtitle}
            </p>

            {/* CTA Buttons with enhanced styling */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link href={content.cta.cta_primary_link}>
                <Button
                  size="lg"
                  className="group relative gap-2 overflow-hidden bg-gradient-to-r from-red-600 to-rose-600 px-10 py-6 text-base font-semibold text-white shadow-2xl shadow-red-600/30 transition-all hover:shadow-red-600/50 hover:scale-105"
                >
                  <span className="relative z-10">{content.cta.cta_primary_text}</span>
                  <ArrowRight className="relative z-10 size-4 transition-transform group-hover:translate-x-1" />
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </Link>
              <Link href={content.cta.cta_secondary_link}>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-stone-700 bg-stone-900/50 backdrop-blur-sm px-10 py-6 text-base font-medium text-stone-300 hover:border-stone-500 hover:bg-stone-900 hover:text-white transition-all hover:scale-105"
                >
                  {content.cta.cta_secondary_text}
                </Button>
              </Link>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-stone-500"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Start for free</span>
              </div>
              <div className="w-px h-4 bg-stone-700" />
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Cancel anytime</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function LandingPageClient({ content }: LandingPageClientProps) {
  return (
    <>
      <HeroSection content={content} />
      <ExecutiveCards content={content} />
      <BenefitsGrid content={content} />
      <CTASection content={content} />
    </>
  );
}
