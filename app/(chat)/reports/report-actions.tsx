"use client";

import { Download, Eye } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

type DocumentKind = "text" | "code" | "image" | "sheet";

interface ReportActionsProps {
	title: string;
	content: string | null;
	kind: DocumentKind;
}

const EXTENSION_MAP: Record<DocumentKind, string> = {
	text: ".txt",
	code: ".js",
	image: ".txt",
	sheet: ".csv",
};

const MIME_MAP: Record<DocumentKind, string> = {
	text: "text/plain",
	code: "text/javascript",
	image: "text/plain",
	sheet: "text/csv",
};

export function ReportActions({ title, content, kind }: ReportActionsProps) {
	const [open, setOpen] = useState(false);

	const handleDownload = useCallback(() => {
		if (!content) return;

		const blob = new Blob([content], { type: MIME_MAP[kind] });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${title}${EXTENSION_MAP[kind]}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}, [content, kind, title]);

	return (
		<div className="flex items-center gap-2">
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<Button
						variant="ghost"
						size="sm"
						className="h-8 w-8 p-0"
						disabled={!content}
						aria-label={`View ${title}`}
					>
						<Eye className="h-4 w-4" />
					</Button>
				</DialogTrigger>
				<DialogContent className="max-h-[80vh] overflow-hidden flex flex-col">
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>
							{kind === "code"
								? "Code snippet"
								: kind === "sheet"
									? "Spreadsheet data"
									: "Document content"}
						</DialogDescription>
					</DialogHeader>
					<div className="flex-1 overflow-auto rounded-lg bg-neutral-50 dark:bg-slate-900 p-4">
						<pre className="whitespace-pre-wrap break-words text-sm text-slate-800 dark:text-slate-200 font-mono">
							{content}
						</pre>
					</div>
				</DialogContent>
			</Dialog>

			<Button
				variant="ghost"
				size="sm"
				className="h-8 w-8 p-0"
				disabled={!content}
				onClick={handleDownload}
				aria-label={`Download ${title}`}
			>
				<Download className="h-4 w-4" />
			</Button>
		</div>
	);
}
