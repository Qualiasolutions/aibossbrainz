"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useActionState, useEffect, useRef, useState } from "react";

import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { type LoginActionState, login } from "../actions";

const loginHighlights = [
	{
		title: "Strategic Intelligence",
		description:
			"Access AI executives trained on proven sales and marketing frameworks, ready to elevate your business decisions.",
	},
	{
		title: "Precision Guidance",
		description:
			"The more context you provide, the more tailored and actionable your strategic recommendations become.",
	},
	{
		title: "Results-Focused",
		description:
			"Every conversation is designed to drive measurable outcomes. Think strategy, then execute.",
	},
];

function isInternalPath(path: string): boolean {
	return path.startsWith("/") && !path.startsWith("//");
}

function LoginContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const plan = searchParams.get("plan");
	const rawRedirect = searchParams.get("redirect");
	const redirect =
		rawRedirect && isInternalPath(rawRedirect) ? rawRedirect : null;

	const [email, setEmail] = useState("");
	const [isSuccessful, setIsSuccessful] = useState(false);
	const [isRedirecting, setIsRedirecting] = useState(false);
	const hasRedirected = useRef(false);

	const [state, formAction] = useActionState<LoginActionState, FormData>(
		login,
		{
			status: "idle",
		},
	);

	useEffect(() => {
		if (state.status === "failed") {
			toast({
				type: "error",
				description: "Invalid credentials!",
			});
		} else if (state.status === "invalid_data") {
			toast({
				type: "error",
				description: "Failed validating your submission!",
			});
		} else if (state.status === "success" && !hasRedirected.current) {
			hasRedirected.current = true;
			setIsSuccessful(true);

			// If there's a plan, redirect to checkout
			if (plan) {
				setIsRedirecting(true);
				fetch("/api/stripe/checkout", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ planId: plan }),
				})
					.then((res) => res.json())
					.then((data) => {
						if (data.url) {
							window.location.href = data.url;
						} else {
							toast({ type: "error", description: "Failed to start checkout" });
							router.push(redirect || "/new");
						}
					})
					.catch(() => {
						toast({ type: "error", description: "Failed to start checkout" });
						router.push(redirect || "/new");
					});
			} else if (redirect) {
				// Respect redirect param (e.g. from subscribe page after session loss)
				window.location.href = redirect;
			} else {
				router.push("/new");
			}
		}
	}, [router, state.status, plan, redirect]);

	const handleSubmit = (formData: FormData) => {
		setEmail(formData.get("email") as string);
		formAction(formData);
	};

	return (
		<AuthShell
			description="Your AI executive team awaits. Alexandria and Kim are ready to provide strategic guidance for your sales and marketing challenges."
			highlights={loginHighlights}
			title="Welcome Back"
		>
			<div className="space-y-2 text-center">
				<h2 className="font-light text-2xl text-stone-900 tracking-tight">
					Sign in
				</h2>
				<p className="text-stone-500 text-sm">
					{plan ? (
						<>
							Continue with the{" "}
							<span className="font-medium text-stone-900">
								{plan === "monthly"
									? "Monthly"
									: plan === "annual"
										? "Annual"
										: "Lifetime"}
							</span>{" "}
							plan
						</>
					) : (
						"Access your AI executive workspace"
					)}
				</p>
			</div>
			<AuthForm
				action={handleSubmit}
				className="px-0 sm:px-0"
				defaultEmail={email}
			>
				<div className="flex justify-end -mt-2">
					<Link
						href="/forgot-password"
						className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
					>
						Forgot password?
					</Link>
				</div>
				<SubmitButton isSuccessful={isSuccessful || isRedirecting}>
					{isRedirecting ? "Redirecting..." : "Sign in"}
				</SubmitButton>
			</AuthForm>
			<p className="text-center text-sm text-stone-500">
				Don't have an account?{" "}
				<Link
					href={`/signup${plan ? `?plan=${plan}` : ""}`}
					className="font-medium text-stone-900 hover:text-stone-700 transition-colors"
				>
					Create one
				</Link>
			</p>
		</AuthShell>
	);
}

export default function Page() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center bg-stone-50">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" />
				</div>
			}
		>
			<LoginContent />
		</Suspense>
	);
}
