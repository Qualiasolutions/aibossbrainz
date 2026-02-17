"use client";

import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Mic, Target, TrendingUp, Users, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { InteractiveChatDemo } from "@/components/landing/interactive-chat-demo";
import { Button } from "@/components/ui/button";
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

// Shared animation config
const revealVariants = {
	hidden: { opacity: 0, y: 32 },
	visible: (delay: number) => ({
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.8,
			delay,
			ease: [0.25, 0.46, 0.45, 0.94],
		},
	}),
};

// ─────────────────────────────────────────────────────────────
// HERO SECTION — Premium, high-quality, animated gradient background
// ─────────────────────────────────────────────────────────────
function HeroSection({ content }: { content: LandingPageCMSContent }) {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true });
	const { scrollY } = useScroll();
	const contentY = useTransform(scrollY, [0, 400], [0, 60]);

	return (
		<section
			ref={ref}
			className="relative min-h-[100svh] overflow-hidden bg-[#0a0a0a] flex items-center justify-center"
		>
			{/* Premium Animated Background */}
			<div className="absolute inset-0 z-0 overflow-hidden">
				{/* Deep base gradient */}
				<div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950" />

				{/* Animated Orbs/Glows */}
				<motion.div
					animate={{
						scale: [1, 1.2, 1],
						opacity: [0.3, 0.5, 0.3],
					}}
					transition={{
						duration: 10,
						repeat: Infinity,
						ease: "easeInOut",
					}}
					className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-red-900/10 blur-[120px]"
				/>
				<motion.div
					animate={{
						scale: [1, 1.1, 1],
						opacity: [0.2, 0.4, 0.2],
					}}
					transition={{
						duration: 15,
						repeat: Infinity,
						ease: "easeInOut",
						delay: 2,
					}}
					className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-blue-900/5 blur-[120px]"
				/>

				{/* Grid Pattern Overlay */}
				<div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light" />
				<div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
			</div>

			{/* Content */}
			<motion.div
				className="relative z-10 w-full max-w-7xl px-6 pt-32 pb-20 lg:px-8"
				style={{ y: contentY }}
			>
				<div className="grid w-full gap-16 lg:grid-cols-2 lg:gap-24 items-center">
					{/* Left — Text */}
					<div className="flex flex-col justify-center text-left">
						{/* Badge */}
						<motion.div
							variants={revealVariants}
							initial="hidden"
							animate={isInView ? "visible" : "hidden"}
							custom={0.2}
							className="mb-8"
						>
							<div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md transition-colors hover:bg-white/10">
								<span className="relative flex h-2 w-2">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
									<span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
								</span>
								<span className="text-[11px] font-medium tracking-[0.2em] uppercase text-white/80">
									AI-Powered Executive Consulting
								</span>
							</div>
						</motion.div>

						{/* Heading */}
						<motion.h1
							variants={revealVariants}
							initial="hidden"
							animate={isInView ? "visible" : "hidden"}
							custom={0.35}
							className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl xl:text-[5rem] leading-[1.05]"
						>
							<span className="block">{content.hero.title_main}</span>
							<span className="mt-2 block bg-gradient-to-r from-red-500 via-red-400 to-orange-400 bg-clip-text text-transparent pb-2">
								{content.hero.title_highlight}
							</span>
						</motion.h1>

						{/* Subtitle */}
						<motion.p
							variants={revealVariants}
							initial="hidden"
							animate={isInView ? "visible" : "hidden"}
							custom={0.5}
							className="mt-8 max-w-xl text-lg leading-relaxed text-white/60 sm:text-xl font-light"
						>
							{content.hero.subtitle}
						</motion.p>

						{/* CTAs */}
						<motion.div
							variants={revealVariants}
							initial="hidden"
							animate={isInView ? "visible" : "hidden"}
							custom={0.65}
							className="mt-10 flex flex-col gap-4 sm:flex-row"
						>
							<Link href={content.hero.cta_primary_link}>
								<Button
									size="lg"
									className="h-14 px-8 text-base font-semibold text-white bg-red-600 hover:bg-red-500 rounded-full shadow-[0_0_20px_-5px_rgba(220,38,38,0.5)] transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(220,38,38,0.6)] hover:-translate-y-0.5"
								>
									{content.hero.cta_primary_text}
									<ArrowRight className="ml-2 h-4 w-4" />
								</Button>
							</Link>
							<Link href={content.hero.cta_secondary_link}>
								<Button
									variant="outline"
									size="lg"
									className="h-14 px-8 text-base font-medium text-white/90 border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 rounded-full backdrop-blur-sm transition-all duration-300"
								>
									{content.hero.cta_secondary_text}
								</Button>
							</Link>
						</motion.div>

						{/* Trust */}
						<motion.div
							variants={revealVariants}
							initial="hidden"
							animate={isInView ? "visible" : "hidden"}
							custom={0.8}
							className="mt-14 flex items-center gap-6 text-xs text-white/40 font-medium"
						>
							<div className="flex items-center gap-3">
								<div className="flex -space-x-2">
									{[...Array(4)].map((_, i) => (
										<div
											key={`avatar-${i}`}
											className="h-8 w-8 rounded-full border border-neutral-900 bg-neutral-800 flex items-center justify-center overflow-hidden"
										>
											<div className="w-full h-full bg-gradient-to-br from-neutral-700 to-neutral-800" />
										</div>
									))}
								</div>
								<span>Trusted by 500+ founders</span>
							</div>
							<div className="h-4 w-px bg-white/10" />
							<div className="flex items-center gap-2">
								<div className="flex text-red-500">
									{[...Array(5)].map((_, i) => (
										<svg
											key={`star-${i}`}
											className="w-3.5 h-3.5 fill-current"
											viewBox="0 0 20 20"
										>
											<path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
										</svg>
									))}
								</div>
								<span>5.0 Rating</span>
							</div>
						</motion.div>
					</div>

					{/* Right — Interactive Demo or Media */}
					<motion.div
						variants={revealVariants}
						initial="hidden"
						animate={isInView ? "visible" : "hidden"}
						custom={0.4}
						className="relative flex items-center justify-center lg:justify-end"
					>
						{/* Glow behind the interface */}
						<div className="absolute inset-0 bg-gradient-to-tr from-red-500/10 to-blue-500/10 blur-[80px] rounded-full" />

						<div className="w-full max-w-2xl xl:max-w-3xl relative backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-2 shadow-2xl ring-1 ring-white/10">
							{content.hero.media_type === "image" && content.hero.media_url ? (
								<Image
									src={content.hero.media_url}
									alt="AI Boss Brainz"
									width={800}
									height={600}
									className="relative rounded-xl shadow-2xl"
									priority
								/>
							) : content.hero.media_type === "video" &&
								content.hero.media_url ? (
								<div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl">
									{content.hero.media_url.includes("youtube.com") ||
									content.hero.media_url.includes("youtu.be") ||
									content.hero.media_url.includes("vimeo.com") ? (
										<iframe
											src={content.hero.media_url}
											className="w-full h-full"
											allow="autoplay; fullscreen; picture-in-picture"
											allowFullScreen
											title="AI Boss Brainz"
										/>
									) : (
										<video
											src={content.hero.media_url}
											controls
											className="w-full h-full object-cover"
										>
											<track kind="captions" />
										</video>
									)}
								</div>
							) : (
								<InteractiveChatDemo content={content} />
							)}
						</div>
					</motion.div>
				</div>
			</motion.div>

			{/* Scroll Indicator */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={isInView ? { opacity: 1 } : {}}
				transition={{ delay: 1.5, duration: 0.8 }}
				className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2"
			>
				<motion.div
					animate={{ y: [0, 6, 0] }}
					transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
					className="flex flex-col items-center gap-3"
				>
					<span className="text-[10px] font-medium tracking-[0.3em] uppercase text-white/30">
						Scroll
					</span>
					<div className="h-10 w-px bg-gradient-to-b from-white/20 to-transparent" />
				</motion.div>
			</motion.div>
		</section>
	);
}

// ─────────────────────────────────────────────────────────────
// EXECUTIVE CARDS — Editorial, asymmetric layout
// ─────────────────────────────────────────────────────────────
function ExecutiveCards({ content }: { content: LandingPageCMSContent }) {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, margin: "-80px" });

	const executives = [
		{
			name: content.executives.kim_name,
			role: content.executives.kim_role,
			image: content.executives.kim_image,
			description:
				"A sales powerhouse who has generated millions in sales for all types of businesses and has been a serial entrepreneur across brick and mortar, non-profits, and e-commerce businesses.",
			achievements: [
				"Launched and scaled 5 businesses",
				"International bestselling author",
				"Generated over $15M in online sales",
				"Worked with top leaders from The Secret",
			],
		},
		{
			name: content.executives.alex_name,
			role: content.executives.alex_role,
			image: content.executives.alex_image,
			description:
				"Has architected the content, branding, and go-to-market strategies that have fueled startup growth, raised millions in capital, and driven successful exits.",
			achievements: [
				"Worked with Fortune 500s to startups to grow their visibility",
				"Drove content marketing engine contributing to $100M+ and acquisition",
				"Launched Alecci Media — a full-scale marketing and branding agency with a global portfolio of clients",
				"Built content + investor strategy securing $90M in funding and driving a $700M valuation for a NYC FinTech",
			],
		},
	];

	return (
		<section
			ref={ref}
			className="relative bg-white py-24 sm:py-32 lg:py-40 overflow-hidden"
		>
			<div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-8">
				{/* Section Header */}
				<motion.div
					variants={revealVariants}
					initial="hidden"
					animate={isInView ? "visible" : "hidden"}
					custom={0}
					className="mb-16 text-center"
				>
					{/* Red rule */}
					<div className="mx-auto mb-8 h-px w-16 bg-red-500" />

					<span className="inline-block mb-5 text-[11px] font-semibold tracking-[0.25em] uppercase text-red-600">
						The Experts Behind Your Growth
					</span>
					<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-stone-900 leading-tight">
						{content.executives.section_title}{" "}
						<span className="bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
							{content.executives.section_title_highlight}
						</span>
					</h2>
					<p className="mt-5 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed text-stone-500 font-light">
						{content.executives.section_subtitle}
					</p>
				</motion.div>

				{/* Executive Cards */}
				<div className="grid gap-8 md:grid-cols-2">
					{executives.map((exec, i) => (
						<motion.div
							key={exec.name}
							variants={revealVariants}
							initial="hidden"
							animate={isInView ? "visible" : "hidden"}
							custom={0.2 + i * 0.15}
							className="group relative rounded-2xl border border-stone-100 bg-white p-8 sm:p-10 transition-all duration-500 hover:border-red-100 hover:shadow-xl hover:shadow-red-500/5"
						>
							{/* Top accent */}
							<div className="absolute top-0 left-10 right-10 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

							{/* Avatar + Identity */}
							<div className="flex items-center gap-5 mb-6">
								<div className="size-20 shrink-0 overflow-hidden rounded-2xl ring-1 ring-stone-100 shadow-lg">
									<Image
										src={exec.image}
										alt={exec.name}
										width={80}
										height={80}
										className="size-full object-cover"
									/>
								</div>
								<div>
									<h3 className="text-xl font-bold tracking-tight text-stone-900">
										{exec.name}
									</h3>
									<p className="text-sm font-medium text-stone-400 tracking-wide">
										{exec.role}
									</p>
								</div>
							</div>

							{/* Description */}
							<p className="text-sm text-stone-500 leading-relaxed mb-8">
								{exec.description}
							</p>

							{/* Thin separator */}
							<div className="h-px w-full bg-stone-100 mb-6" />

							{/* Achievements */}
							<ul className="space-y-3">
								{exec.achievements.map((item) => (
									<li
										key={item}
										className="flex items-start gap-3 text-sm text-stone-600"
									>
										<span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-red-500" />
										<span className="leading-relaxed">{item}</span>
									</li>
								))}
							</ul>
						</motion.div>
					))}
				</div>

				{/* CTA */}
				<motion.div
					variants={revealVariants}
					initial="hidden"
					animate={isInView ? "visible" : "hidden"}
					custom={0.6}
					className="mt-14 text-center"
				>
					<Link href="/login">
						<Button
							size="lg"
							className="gap-2.5 bg-stone-900 px-8 py-6 text-sm font-semibold text-white shadow-xl shadow-stone-900/10 transition-all duration-300 hover:bg-stone-800 hover:shadow-stone-900/20"
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

// ─────────────────────────────────────────────────────────────
// CHECKUP SECTION — Sophisticated red gradient, inline stats
// ─────────────────────────────────────────────────────────────
function CheckupSection({ content }: { content: LandingPageCMSContent }) {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, margin: "-80px" });

	const items = [
		{
			title: content.checkup.item_1_title,
			value: content.checkup.item_1_value,
		},
		{
			title: content.checkup.item_2_title,
			value: content.checkup.item_2_value,
		},
		{
			title: content.checkup.item_3_title,
			value: content.checkup.item_3_value,
		},
	];

	return (
		<section
			ref={ref}
			className="relative bg-gradient-to-br from-red-700 via-red-800 to-stone-900 py-24 sm:py-32 overflow-hidden"
		>
			{/* Subtle texture */}
			<div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff04_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:64px_64px]" />

			<div className="relative z-10 mx-auto max-w-5xl px-6 lg:px-8">
				{/* Title */}
				<motion.div
					variants={revealVariants}
					initial="hidden"
					animate={isInView ? "visible" : "hidden"}
					custom={0}
					className="text-center mb-16"
				>
					<h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
						{content.checkup.section_title}
					</h2>
				</motion.div>

				{/* Stats inline */}
				<div className="flex flex-col sm:flex-row items-center justify-center divide-y sm:divide-y-0 sm:divide-x divide-white/10">
					{items.map((item, i) => (
						<motion.div
							key={item.title}
							variants={revealVariants}
							initial="hidden"
							animate={isInView ? "visible" : "hidden"}
							custom={0.15 + i * 0.12}
							className="flex-1 py-8 sm:py-0 sm:px-10 text-center"
						>
							<div className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight">
								{item.value}
							</div>
							<p className="text-white/60 text-sm sm:text-base leading-relaxed font-light">
								{item.title}
							</p>
						</motion.div>
					))}
				</div>

				{/* CTA */}
				<motion.div
					variants={revealVariants}
					initial="hidden"
					animate={isInView ? "visible" : "hidden"}
					custom={0.6}
					className="mt-16 text-center"
				>
					<Link href="/pricing">
						<Button
							size="lg"
							className="gap-2.5 bg-white px-8 py-6 text-sm font-semibold text-red-700 shadow-2xl shadow-black/20 transition-all duration-300 hover:bg-white/95 hover:shadow-black/30"
						>
							See All Plans
							<ArrowRight className="size-4" />
						</Button>
					</Link>
				</motion.div>
			</div>
		</section>
	);
}

// ─────────────────────────────────────────────────────────────
// BENEFITS GRID — Refined 2×2 layout, dark section
// ─────────────────────────────────────────────────────────────
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
		},
		{
			icon:
				IconMap[content.benefits.benefit_2_icon as keyof typeof IconMap] || Mic,
			title: content.benefits.benefit_2_title,
			desc: content.benefits.benefit_2_desc,
			num: "02",
		},
		{
			icon:
				IconMap[content.benefits.benefit_3_icon as keyof typeof IconMap] ||
				Target,
			title: content.benefits.benefit_3_title,
			desc: content.benefits.benefit_3_desc,
			num: "03",
		},
		{
			icon:
				IconMap[content.benefits.benefit_4_icon as keyof typeof IconMap] ||
				TrendingUp,
			title: content.benefits.benefit_4_title,
			desc: content.benefits.benefit_4_desc,
			num: "04",
		},
	];

	return (
		<section
			ref={ref}
			className="relative bg-stone-950 py-24 sm:py-32 lg:py-40 overflow-hidden"
		>
			{/* Subtle ambient glow */}
			<div className="absolute top-0 left-1/3 w-[600px] h-[600px] bg-red-500/5 rounded-full blur-[150px]" />
			<div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-red-500/3 rounded-full blur-[120px]" />

			<div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-8">
				{/* Section Header */}
				<motion.div
					variants={revealVariants}
					initial="hidden"
					animate={isInView ? "visible" : "hidden"}
					custom={0}
					className="mb-20 max-w-2xl"
				>
					<div className="mb-8 h-px w-16 bg-red-500/60" />
					<span className="inline-block mb-5 text-[11px] font-semibold tracking-[0.25em] uppercase text-red-400/70">
						Why Choose AI Boss Brainz
					</span>
					<h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
						{content.benefits.section_title}
					</h2>
					<p className="mt-6 text-base sm:text-lg text-stone-500 leading-relaxed font-light">
						{content.benefits.section_subtitle}
					</p>
				</motion.div>

				{/* Benefits 2×2 Grid */}
				<div className="grid gap-6 sm:grid-cols-2">
					{benefits.map((b, i) => (
						<motion.div
							key={b.title}
							variants={revealVariants}
							initial="hidden"
							animate={isInView ? "visible" : "hidden"}
							custom={0.1 + i * 0.12}
							className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 sm:p-10 transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.04]"
						>
							{/* Number */}
							<span className="block mb-6 text-xs font-mono text-stone-700 group-hover:text-stone-600 transition-colors">
								{b.num}
							</span>

							{/* Icon */}
							<div className="mb-6 flex size-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03]">
								<b.icon className="size-5 text-red-500/80" />
							</div>

							{/* Content */}
							<h3 className="text-lg font-semibold text-white mb-3 tracking-tight">
								{b.title}
							</h3>
							<p className="text-sm leading-relaxed text-stone-500 group-hover:text-stone-400 transition-colors">
								{b.desc}
							</p>
						</motion.div>
					))}
				</div>

				{/* Stats row */}
				<motion.div
					variants={revealVariants}
					initial="hidden"
					animate={isInView ? "visible" : "hidden"}
					custom={0.6}
					className="mt-20 flex flex-wrap justify-center gap-12 sm:gap-16 lg:gap-24"
				>
					{[
						{ value: "40+", label: "Years Experience" },
						{ value: "500+", label: "Brands Helped" },
						{ value: "24/7", label: "Availability" },
						{ value: "100%", label: "Focus on Results" },
					].map((stat) => (
						<div key={stat.label} className="text-center">
							<div className="text-2xl sm:text-3xl font-bold text-white/90 tracking-tight">
								{stat.value}
							</div>
							<div className="mt-2 text-[11px] font-medium uppercase tracking-[0.15em] text-stone-600">
								{stat.label}
							</div>
						</div>
					))}
				</motion.div>
			</div>
		</section>
	);
}

// ─────────────────────────────────────────────────────────────
// CTA SECTION — Cinematic closing, dramatic negative space
// ─────────────────────────────────────────────────────────────
function CTASection({ content }: { content: LandingPageCMSContent }) {
	const ref = useRef(null);
	const isInView = useInView(ref, { once: true, margin: "-100px" });

	return (
		<section
			ref={ref}
			className="relative bg-stone-950 py-32 sm:py-40 lg:py-48 overflow-hidden"
		>
			{/* Ambient glow */}
			<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-red-500/[0.06] rounded-full blur-[150px]" />

			<div className="relative z-10 mx-auto max-w-4xl px-6 lg:px-8 text-center">
				{/* Red rule */}
				<motion.div
					variants={revealVariants}
					initial="hidden"
					animate={isInView ? "visible" : "hidden"}
					custom={0}
					className="mx-auto mb-12 h-px w-16 bg-red-500/50"
				/>

				{/* Badge */}
				<motion.span
					variants={revealVariants}
					initial="hidden"
					animate={isInView ? "visible" : "hidden"}
					custom={0.1}
					className="inline-flex items-center gap-2 px-4 py-2 mb-10 rounded-full border border-white/[0.08] bg-white/[0.03] text-[11px] font-medium tracking-[0.2em] uppercase text-white/40"
				>
					<span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
					Ready to Scale Your Business?
				</motion.span>

				{/* Heading */}
				<motion.h2
					variants={revealVariants}
					initial="hidden"
					animate={isInView ? "visible" : "hidden"}
					custom={0.2}
					className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight text-white leading-[1.15]"
				>
					{content.cta.title}
				</motion.h2>

				{/* Subtitle */}
				<motion.p
					variants={revealVariants}
					initial="hidden"
					animate={isInView ? "visible" : "hidden"}
					custom={0.35}
					className="mx-auto mt-8 max-w-2xl text-base sm:text-lg leading-relaxed text-stone-500 font-light"
				>
					{content.cta.subtitle}
				</motion.p>

				{/* CTA Buttons */}
				<motion.div
					variants={revealVariants}
					initial="hidden"
					animate={isInView ? "visible" : "hidden"}
					custom={0.5}
					className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row"
				>
					<Link href={content.cta.cta_primary_link}>
						<Button
							size="lg"
							className="group gap-2.5 bg-red-600 px-10 py-6 text-sm font-semibold tracking-wide text-white shadow-2xl shadow-red-600/20 transition-all duration-300 hover:bg-red-500 hover:shadow-red-500/30"
						>
							<span>{content.cta.cta_primary_text}</span>
							<ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
						</Button>
					</Link>
					<Link href={content.cta.cta_secondary_link}>
						<Button
							variant="outline"
							size="lg"
							className="border-white/10 bg-white/[0.03] backdrop-blur-sm px-10 py-6 text-sm font-medium text-white/60 hover:border-white/20 hover:bg-white/[0.06] hover:text-white/80 transition-all duration-300"
						>
							{content.cta.cta_secondary_text}
						</Button>
					</Link>
				</motion.div>

				{/* Trust indicators */}
				<motion.div
					variants={revealVariants}
					initial="hidden"
					animate={isInView ? "visible" : "hidden"}
					custom={0.65}
					className="mt-14 flex flex-wrap items-center justify-center gap-6 text-xs text-stone-600"
				>
					<div className="flex items-center gap-2">
						<svg
							className="w-4 h-4 text-red-500/60"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5 13l4 4L19 7"
							/>
						</svg>
						<span>Start for free</span>
					</div>
					<div className="w-px h-3 bg-white/[0.06]" />
					<div className="flex items-center gap-2">
						<svg
							className="w-4 h-4 text-red-500/60"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M5 13l4 4L19 7"
							/>
						</svg>
						<span>Cancel anytime</span>
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
			<CheckupSection content={content} />
			<BenefitsGrid content={content} />
			<CTASection content={content} />
		</>
	);
}
