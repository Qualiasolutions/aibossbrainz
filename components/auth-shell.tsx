"use client";

import { motion } from "framer-motion";
import { Globe, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

type Highlight = {
	title: string;
	description: string;
};

type AuthShellProps = {
	eyebrow?: string;
	title: string;
	description: string;
	children: ReactNode;
	highlights?: Highlight[];
	className?: string;
	showLogo?: boolean;
};

const ALECCI_LOGO_URL =
	"https://images.squarespace-cdn.com/content/v1/5ea759fa9e5575487ad28cd0/1591228238957-80Y8AGN1M9TTXTYNJ5QK/AM_Logo_Horizontal_4C+%281%29.jpg?format=500w";

const navLinks = [
	{ href: "/", label: "Home" },
	{ href: "/about", label: "About" },
	{ href: "/pricing", label: "Pricing" },
	{ href: "/contact", label: "Contact" },
];

function AuthHeader() {
	const pathname = usePathname();
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	return (
		<header className="absolute top-0 left-0 right-0 z-50">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<motion.nav
					initial={{ y: -20, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
					className="mt-4 flex items-center justify-between rounded-2xl border border-stone-200/50 bg-white/80 px-4 py-3 shadow-lg backdrop-blur-xl sm:px-6"
				>
					<Link href="/" className="group flex items-center">
						<Image
							src={ALECCI_LOGO_URL}
							alt="AI Boss Brainz"
							width={160}
							height={40}
							className="h-8 w-auto transition-opacity group-hover:opacity-90 sm:h-10"
							priority
						/>
					</Link>

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
										layoutId="auth-nav-indicator"
										className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600"
									/>
								)}
								{pathname !== link.href && (
									<span className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-stone-300 scale-x-0 group-hover:scale-x-100 transition-transform" />
								)}
							</Link>
						))}
					</div>

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
				</motion.nav>

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
						</div>
					</motion.div>
				)}
			</div>
		</header>
	);
}

function AuthFooter() {
	return (
		<footer className="relative z-10 border-t border-stone-200/60 bg-white/50 backdrop-blur-sm">
			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				<div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
					<p className="text-sm text-stone-500">
						&copy; {new Date().getFullYear()} AI Boss Brainz. All rights
						reserved.
					</p>
					<div className="flex items-center gap-4">
						<Link
							href="/terms"
							className="text-sm text-stone-500 transition-colors hover:text-stone-900"
						>
							Terms
						</Link>
						<Link
							href="/privacy"
							className="text-sm text-stone-500 transition-colors hover:text-stone-900"
						>
							Privacy
						</Link>
						<div className="flex gap-2">
							<a
								href="https://aleccimedia.com"
								target="_blank"
								rel="noopener noreferrer"
								className="flex size-8 items-center justify-center rounded-lg text-stone-400 transition-all hover:bg-stone-100 hover:text-stone-900"
								aria-label="Visit Alecci Media website"
							>
								<Globe className="size-3.5" />
							</a>
							<a
								href="https://facebook.com/aleccimedia"
								target="_blank"
								rel="noopener noreferrer"
								className="flex size-8 items-center justify-center rounded-lg text-stone-400 transition-all hover:bg-stone-100 hover:text-stone-900"
								aria-label="Follow on Facebook"
							>
								<svg
									className="size-3.5"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
								</svg>
							</a>
							<a
								href="https://linkedin.com/company/alecci-media"
								target="_blank"
								rel="noopener noreferrer"
								className="flex size-8 items-center justify-center rounded-lg text-stone-400 transition-all hover:bg-stone-100 hover:text-stone-900"
								aria-label="Follow on LinkedIn"
							>
								<svg
									className="size-3.5"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
								</svg>
							</a>
							<a
								href="https://www.instagram.com/alecci_media/"
								target="_blank"
								rel="noopener noreferrer"
								className="flex size-8 items-center justify-center rounded-lg text-stone-400 transition-all hover:bg-stone-100 hover:text-stone-900"
								aria-label="Follow on Instagram"
							>
								<svg
									className="size-3.5"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
								</svg>
							</a>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}

export function AuthShell({
	title,
	description,
	highlights = [],
	children,
	className,
	showLogo = true,
}: AuthShellProps) {
	return (
		<div
			className={cn(
				"relative flex min-h-dvh w-full flex-col overflow-hidden bg-stone-50",
				className,
			)}
		>
			<AuthHeader />

			{/* Refined background - subtle, sophisticated */}
			<div aria-hidden className="pointer-events-none absolute inset-0">
				<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-100 via-stone-50 to-white" />
				<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-stone-200 to-transparent" />
			</div>

			<div className="flex flex-1 items-center justify-center">
				<motion.div
					animate={{ opacity: 1, y: 0 }}
					className="relative z-10 grid w-full max-w-6xl items-center gap-16 px-6 pt-24 pb-12 sm:px-8 lg:grid-cols-[1fr_420px] lg:gap-20 lg:px-12"
					initial={{ opacity: 0, y: 16 }}
					transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
				>
					{/* Left side - Brand & highlights */}
					<div className="space-y-12">
						{/* Logo */}
						{showLogo && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ duration: 0.5 }}
							>
								<Image
									src={ALECCI_LOGO_URL}
									alt="Alecci Media"
									width={180}
									height={45}
									className="h-10 w-auto object-contain"
									priority
								/>
							</motion.div>
						)}

						{/* Title & description */}
						<div className="space-y-5">
							<motion.h1
								animate={{ opacity: 1, y: 0 }}
								className="font-light text-4xl text-stone-900 leading-[1.15] tracking-tight sm:text-5xl"
								initial={{ opacity: 0, y: 12 }}
								transition={{
									duration: 0.5,
									delay: 0.1,
									ease: [0.22, 1, 0.36, 1],
								}}
							>
								{title}
							</motion.h1>

							<motion.p
								animate={{ opacity: 1, y: 0 }}
								className="max-w-lg text-lg text-stone-500 leading-relaxed"
								initial={{ opacity: 0, y: 10 }}
								transition={{
									duration: 0.5,
									delay: 0.15,
									ease: [0.22, 1, 0.36, 1],
								}}
							>
								{description}
							</motion.p>
						</div>

						{/* Highlights - minimal, refined */}
						{highlights.length > 0 && (
							<motion.div
								className="space-y-4"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ duration: 0.5, delay: 0.25 }}
							>
								{highlights.map(
									(
										{
											title: highlightTitle,
											description: highlightDescription,
										},
										index,
									) => (
										<motion.div
											key={highlightTitle}
											className="group"
											initial={{ opacity: 0, x: -12 }}
											animate={{ opacity: 1, x: 0 }}
											transition={{
												duration: 0.4,
												delay: 0.3 + index * 0.08,
												ease: [0.22, 1, 0.36, 1],
											}}
										>
											<div className="flex items-start gap-4">
												<div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-stone-300 transition-colors duration-300 group-hover:bg-stone-900" />
												<div className="space-y-1">
													<h3 className="text-sm font-medium text-stone-900 tracking-wide">
														{highlightTitle}
													</h3>
													<p className="text-sm text-stone-500 leading-relaxed">
														{highlightDescription}
													</p>
												</div>
											</div>
										</motion.div>
									),
								)}
							</motion.div>
						)}
					</div>

					{/* Right side - Form card */}
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className="relative"
						initial={{ opacity: 0, y: 20 }}
						transition={{
							duration: 0.5,
							delay: 0.2,
							ease: [0.22, 1, 0.36, 1],
						}}
					>
						{/* Premium card with subtle border */}
						<div className="relative rounded-2xl border border-stone-200/60 bg-white p-8 shadow-xl shadow-stone-200/20">
							{/* Top accent line */}
							<div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-stone-900/20 to-transparent" />

							{/* Content */}
							<div className="flex flex-col gap-6">{children}</div>
						</div>
					</motion.div>
				</motion.div>
			</div>

			<AuthFooter />
		</div>
	);
}
