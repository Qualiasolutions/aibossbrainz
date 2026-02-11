"use client";

import { motion } from "framer-motion";
import { ArrowRight, Award, Building2, Users, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { LandingPageCMSContent } from "@/lib/cms/landing-page-types";

interface AboutPageClientProps {
  content: LandingPageCMSContent;
}

const features = [
  {
    icon: Zap,
    title: "Instant Expert Advice",
    description: "Get strategic guidance in seconds, not days. Our AI executives draw from 40+ years of combined Fortune 500 experience.",
  },
  {
    icon: Users,
    title: "Dual Executive Perspectives",
    description: "Access both marketing brilliance (Alexandria) and sales mastery (Kim) - or collaborate with both simultaneously.",
  },
  {
    icon: Building2,
    title: "Fortune 500 DNA",
    description: "Strategies and frameworks refined at the world's largest companies, now available for your business.",
  },
  {
    icon: Award,
    title: "Proven Results",
    description: "Hundreds of brands and founders have used our methodologies to scale their businesses effectively.",
  },
];

function fadeIn(variant = 0) {
  return {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { delay: variant * 0.1, duration: 0.6 },
  };
}

export function AboutPageClient({ content }: AboutPageClientProps) {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-stone-50 to-white py-24 sm:py-32">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-red-100 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-stone-200 rounded-full blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeIn(0)}>
            <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold uppercase tracking-[0.25em] text-red-700 bg-red-50 rounded-full">
              About AI Boss Brainz
            </span>
          </motion.div>

          <motion.h1
            {...fadeIn(1)}
            className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl"
          >
            Your 24/7 AI-Powered
            <span className="mt-2 block bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
              Executive Consulting Team
            </span>
          </motion.h1>

          <motion.p
            {...fadeIn(2)}
            className="mt-8 max-w-2xl mx-auto text-lg leading-relaxed text-stone-600"
          >
            We built AI Boss Brainz to give founders and business leaders instant access
            to executive-level strategy without the premium price tag. Drawing from 40+
            years of combined Fortune 500 experience, our AI executives help you make
            smarter decisions faster.
          </motion.p>

          <motion.div {...fadeIn(3)} className="mt-10">
            <Link href="/login">
              <Button
                size="lg"
                className="gap-2 bg-gradient-to-r from-red-600 to-red-700 px-8 py-6 text-base font-semibold text-white shadow-xl hover:from-red-700 hover:to-red-800"
              >
                Get Started Free
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="prose prose-lg prose-stone mx-auto"
          >
            <h2 className="text-3xl font-bold text-stone-900 mb-6">
              Why We Built This
            </h2>
            <p className="text-stone-600 leading-relaxed mb-6">
              Every founder faces the same challenge: you need expert guidance, but hiring
              a CMO or CSO costs hundreds of thousands per year. Consultants are expensive
              and slow. Generic AI tools lack real business context.
            </p>
            <p className="text-stone-600 leading-relaxed mb-6">
              AI Boss Brainz bridges that gap. Our AI executives embody the strategies,
              frameworks, and thinking patterns of seasoned Fortune 500 leaders—available
              instantly whenever you need them.
            </p>
            <p className="text-stone-600 leading-relaxed">
              Whether you&apos;re stuck on a go-to-market strategy, need to improve sales
              conversion, or want to refine your brand positioning—our AI executives are
              ready to help, 24/7.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-stone-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold text-stone-900 sm:text-4xl">
              What Makes AI Boss Brainz Different
            </h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="bg-white rounded-2xl p-8 shadow-sm border border-stone-100 hover:shadow-md transition-shadow"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white mb-6">
                  <feature.icon className="size-6" />
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-stone-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Executives Section */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-xs font-bold uppercase tracking-[0.25em] text-red-700 bg-red-50 rounded-full">
              The Team
            </span>
            <h2 className="text-3xl font-bold text-stone-900 sm:text-4xl">
              Meet Your AI Executives
            </h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            {/* Alexandria */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="bg-gradient-to-b from-red-50 to-white rounded-2xl p-8 border border-red-100 text-center"
            >
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-rose-500 rounded-full blur-xl opacity-30" />
                <Image
                  src={content.executives.alex_image}
                  alt={content.executives.alex_name}
                  width={120}
                  height={120}
                  className="relative size-32 rounded-full border-4 border-white shadow-lg mx-auto"
                />
              </div>
              <h3 className="text-2xl font-bold text-stone-900 mb-2">
                {content.executives.alex_name}
              </h3>
              <p className="text-sm font-bold uppercase tracking-wider text-red-600 mb-4">
                {content.executives.alex_role}
              </p>
              <p className="text-stone-600 leading-relaxed mb-6">
                Brand strategist with Fortune 500 experience. Specializes in go-to-market
                strategy, brand positioning, and digital campaigns that drive growth.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {content.executives.alex_expertise.split(",").map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 text-xs font-medium rounded-full bg-white border border-red-200 text-red-700"
                  >
                    {skill.trim()}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Kim */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="bg-gradient-to-b from-stone-100 to-white rounded-2xl p-8 border border-stone-200 text-center"
            >
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-stone-400 to-stone-600 rounded-full blur-xl opacity-30" />
                <Image
                  src={content.executives.kim_image}
                  alt={content.executives.kim_name}
                  width={120}
                  height={120}
                  className="relative size-32 rounded-full border-4 border-white shadow-lg mx-auto"
                />
              </div>
              <h3 className="text-2xl font-bold text-stone-900 mb-2">
                {content.executives.kim_name}
              </h3>
              <p className="text-sm font-bold uppercase tracking-wider text-stone-600 mb-4">
                {content.executives.kim_role}
              </p>
              <p className="text-stone-600 leading-relaxed mb-6">
                Revenue architect and sales optimization expert. Helps build pipelines,
                improve conversion rates, and close deals more effectively.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {content.executives.kim_expertise.split(",").map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 text-xs font-medium rounded-full bg-white border border-stone-300 text-stone-700"
                  >
                    {skill.trim()}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-stone-900">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl font-bold text-white sm:text-4xl mb-6">
              Ready to Transform Your Business Strategy?
            </h2>
            <p className="text-lg text-stone-400 mb-10 max-w-2xl mx-auto">
              Join hundreds of founders and entrepreneurs who are already using AI Boss
              Brainz to make smarter decisions, faster.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-red-600 to-rose-600 px-10 py-6 text-base font-semibold text-white shadow-xl hover:from-red-700 hover:to-rose-700"
                >
                  Start Free Trial
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-stone-700 bg-transparent px-10 py-6 text-base font-medium text-stone-300 hover:bg-stone-800 hover:text-white"
                >
                  View Pricing
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
