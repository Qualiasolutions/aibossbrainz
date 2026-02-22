"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function ChatError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		Sentry.captureException(error);
	}, [error]);

	return (
		<div className="flex flex-col items-center justify-center h-dvh gap-4 p-4">
			<div className="text-center max-w-md">
				<h2 className="text-xl font-semibold text-neutral-900">Something went wrong</h2>
				<p className="mt-2 text-sm text-muted-foreground">
					An unexpected error occurred. Your conversations are safe.
				</p>
				{error.digest && (
					<p className="mt-1 text-xs text-muted-foreground">
						Error ID: {error.digest}
					</p>
				)}
			</div>
			<div className="flex gap-3">
				<button
					type="button"
					onClick={reset}
					className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
				>
					Try again
				</button>
				<a
					href="/new"
					className="px-4 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground hover:bg-accent"
				>
					New conversation
				</a>
			</div>
		</div>
	);
}
