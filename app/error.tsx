"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function ErrorPage({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Log the error to Sentry
		Sentry.captureException(error);
	}, [error]);

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
			<div className="text-center">
				<h1 className="text-2xl font-bold text-red-600">
					Something went wrong
				</h1>
				<p className="mt-2 text-muted-foreground">
					We encountered an unexpected error. Please try again.
				</p>
				{error.digest && (
					<p className="mt-1 text-xs text-muted-foreground">
						Error ID: {error.digest}
					</p>
				)}
			</div>
			<button
				type="button"
				onClick={reset}
				className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
			>
				Try again
			</button>
		</div>
	);
}
