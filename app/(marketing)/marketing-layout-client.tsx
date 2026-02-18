"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Globe, Menu, X } from "lucide-react";
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
								width={200}
								height={60}
								className="h-10 w-auto transition-opacity group-hover:opacity-90 sm:h-12"
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
								width={160}
								height={48}
								className="h-10 w-auto mb-4"
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
						&copy; {new Date().getFullYear()}{" "}
						<a
							href="https://aleccimedia.com"
							target="_blank"
							rel="noopener noreferrer"
							className="underline transition-colors hover:text-stone-900"
						>
							Alecci Media
						</a>
						. All rights reserved.
					</p>
					<div className="flex gap-4">
						<a
							href="https://www.aleccimedia.com"
							target="_blank"
							rel="noopener noreferrer"
							className="flex size-9 items-center justify-center rounded-lg text-stone-400 transition-all hover:bg-stone-100 hover:text-stone-900"
							aria-label="Visit Alecci Media website"
						>
							<Globe className="size-4" />
						</a>
						<a
							href="https://www.facebook.com/aleccimedia"
							target="_blank"
							rel="noopener noreferrer"
							className="flex size-9 items-center justify-center rounded-lg text-stone-400 transition-all hover:bg-stone-100 hover:text-stone-900"
							aria-label="Follow on Facebook"
						>
							<svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
							</svg>
						</a>
						<a
							href="https://www.linkedin.com/company/alecci-media"
							target="_blank"
							rel="noopener noreferrer"
							className="flex size-9 items-center justify-center rounded-lg text-stone-400 transition-all hover:bg-stone-100 hover:text-stone-900"
							aria-label="Follow on LinkedIn"
						>
							<svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
							</svg>
						</a>
						<a
							href="https://www.instagram.com/alecci_media/"
							target="_blank"
							rel="noopener noreferrer"
							className="flex size-9 items-center justify-center rounded-lg text-stone-400 transition-all hover:bg-stone-100 hover:text-stone-900"
							aria-label="Follow on Instagram"
						>
							<svg className="size-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
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
