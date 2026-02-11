"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { LandingPageCMSContent } from "@/lib/cms/landing-page-types";
import { cn } from "@/lib/utils";

interface MarketingLayoutClientProps {
  children: React.ReactNode;
  content: LandingPageCMSContent;
  isLoggedIn?: boolean;
}

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
];

function Header({
  content,
  isLoggedIn,
}: {
  content: LandingPageCMSContent;
  isLoggedIn?: boolean;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const backgroundColor = useTransform(
    scrollY,
    [0, 100],
    ["rgba(255, 255, 255, 0.8)", "rgba(255, 255, 255, 0.95)"],
  );
  const shadowOpacity = useTransform(scrollY, [0, 100], [0.05, 0.15]);
  const borderOpacity = useTransform(scrollY, [0, 100], [0.05, 0.1]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.nav
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-4 flex items-center justify-between rounded-2xl border border-stone-200/50 px-4 py-3 shadow-lg backdrop-blur-xl sm:px-6"
          style={{
            backgroundColor,
            boxShadow: `0 4px 20px -4px rgba(0, 0, 0, ${shadowOpacity.get()})`,
            borderColor: `rgba(0, 0, 0, ${borderOpacity.get()})`,
          }}
        >
          {/* Logo - Enhanced */}
          <Link href="/" className="group flex items-center">
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Image
                src={content.header.logo_url}
                alt="AI Boss Brainz"
                width={160}
                height={40}
                className="h-8 w-auto transition-opacity group-hover:opacity-90 sm:h-10"
              />
            </motion.div>
          </Link>

          {/* Desktop Navigation - Enhanced */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-4 py-2 text-sm font-medium transition-colors group"
              >
                <span
                  className={cn(
                    "relative z-10 transition-colors",
                    pathname === link.href
                      ? "text-stone-900"
                      : "text-stone-600 group-hover:text-stone-900",
                  )}
                >
                  {link.label}
                </span>
                {pathname === link.href && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600"
                  />
                )}
                {pathname !== link.href && (
                  <span className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-stone-300 scale-x-0 group-hover:scale-x-100 transition-transform" />
                )}
              </Link>
            ))}
          </div>

          {/* CTA Button - Enhanced */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href={isLoggedIn ? "/new" : "/login"}>
              <Button
                size="sm"
                className="relative overflow-hidden bg-gradient-to-r from-red-600 to-red-700 shadow-lg shadow-red-600/20 hover:from-red-700 hover:to-red-800 transition-all hover:shadow-xl hover:shadow-red-600/30 hover:scale-105"
              >
                <span className="relative z-10">
                  {isLoggedIn ? "Go to Chat" : "Sign In"}
                </span>
              </Button>
            </Link>

            {/* Mobile Menu Button - Enhanced */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex size-9 items-center justify-center rounded-lg text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 md:hidden"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>
          </div>
        </motion.nav>

        {/* Mobile Menu - Enhanced */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mt-2 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-2xl md:hidden"
          >
            <div className="flex flex-col p-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-red-50 text-red-700"
                      : "text-stone-600 hover:bg-stone-50 hover:text-stone-900",
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href={isLoggedIn ? "/new" : "/login"}
                onClick={() => setMobileMenuOpen(false)}
                className="mt-1 rounded-lg px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900"
              >
                {isLoggedIn ? "Go to Chat" : "Sign In"}
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </header>
  );
}

function Footer({ content }: { content: LandingPageCMSContent }) {
  return (
    <footer className="border-t border-stone-200 bg-gradient-to-b from-stone-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand - Enhanced */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-block">
              <Image
                src={content.header.logo_url}
                alt="AI Boss Brainz"
                width={120}
                height={32}
                className="h-8 w-auto mb-4"
              />
            </Link>
            <p className="max-w-xs text-sm text-stone-600 leading-relaxed">
              {content.footer.tagline}
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-stone-400">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>All systems operational</span>
              </div>
            </div>
          </div>

          {/* Quick Links - Enhanced */}
          <div>
            <h4 className="mb-4 font-semibold text-sm text-stone-900 uppercase tracking-wider">
              Product
            </h4>
            <ul className="space-y-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-stone-600 transition-all hover:text-stone-900 hover:pl-1"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal - Enhanced */}
          <div>
            <h4 className="mb-4 font-semibold text-sm text-stone-900 uppercase tracking-wider">
              Legal
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-stone-600 transition-all hover:text-stone-900 hover:pl-1"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-stone-600 transition-all hover:text-stone-900 hover:pl-1"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact - Enhanced */}
          <div>
            <h4 className="mb-4 font-semibold text-sm text-stone-900 uppercase tracking-wider">
              Connect
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href={`mailto:${content.footer.email}`}
                  className="text-sm text-stone-600 transition-all hover:text-stone-900 hover:pl-1"
                >
                  {content.footer.email}
                </a>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-stone-600 transition-all hover:text-stone-900 hover:pl-1"
                >
                  Contact Form
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom section - Enhanced */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-stone-200 pt-8 sm:flex-row">
          <p className="text-sm text-stone-500">
            &copy; {new Date().getFullYear()} {content.footer.copyright}
          </p>
          <div className="flex gap-4">
            <a
              href="https://x.com/aleccimedia"
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-9 items-center justify-center rounded-lg text-stone-400 transition-all hover:bg-stone-100 hover:text-stone-900"
              aria-label="Follow on X"
            >
              <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://linkedin.com/company/alecci-media"
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-9 items-center justify-center rounded-lg text-stone-400 transition-all hover:bg-stone-100 hover:text-stone-900"
              aria-label="Follow on LinkedIn"
            >
              <svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function MarketingLayoutClient({
  children,
  content,
  isLoggedIn,
}: MarketingLayoutClientProps) {
  return (
    <div className="min-h-screen bg-white">
      <Header content={content} isLoggedIn={isLoggedIn} />
      <main>{children}</main>
      <Footer content={content} />
    </div>
  );
}
