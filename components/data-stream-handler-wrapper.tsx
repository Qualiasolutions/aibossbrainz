"use client";

import dynamic from "next/dynamic";

// Dynamically import DataStreamHandler to defer artifact client loading
// (CodeMirror, ProseMirror, papaparse, etc.) until after first paint.
// DataStreamHandler only activates during active AI streaming, not on mount.
const DataStreamHandler = dynamic(
	() =>
		import("./data-stream-handler").then((mod) => ({
			default: mod.DataStreamHandler,
		})),
	{ ssr: false, loading: () => null },
);

export function DataStreamHandlerWrapper() {
	return <DataStreamHandler />;
}
