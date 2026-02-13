"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function AdminError({
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
		<div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
			<h2 className="text-lg font-semibold">Something went wrong</h2>
			<p className="text-muted-foreground text-sm">{error.message}</p>
			{error.digest && (
				<p className="text-xs text-muted-foreground">
					Error ID: {error.digest}
				</p>
			)}
			<button
				type="button"
				onClick={reset}
				className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90"
			>
				Try again
			</button>
		</div>
	);
}
