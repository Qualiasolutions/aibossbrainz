"use client";

import { Download } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";
import type { BotType } from "@/lib/bot-personalities";
import { BOT_PERSONALITIES } from "@/lib/bot-personalities";
import { Response } from "./elements/response";
import { CopyIcon } from "./icons";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

type MessageFullscreenProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  botType: BotType;
};

export function MessageFullscreen({
  open,
  onOpenChange,
  content,
  botType,
}: MessageFullscreenProps) {
  const [_, copyToClipboard] = useCopyToClipboard();
  const [isExporting, setIsExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const personality =
    BOT_PERSONALITIES[botType] ?? BOT_PERSONALITIES.alexandria;

  const handleCopy = async () => {
    if (!content) {
      toast.error("There's no text to copy!");
      return;
    }

    await copyToClipboard(content);
    toast.success("Copied to clipboard!");
  };

  const handleExportPDF = async () => {
    if (!contentRef.current) {
      toast.error("Content not available for export");
      return;
    }

    setIsExporting(true);
    try {
      // Dynamic import to reduce initial bundle size (~700KB savings)
      const { exportToPDF } = await import("@/lib/pdf-export");

      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `${personality.name.replace(/\s+/g, "-")}-message-${timestamp}`;
      await exportToPDF(contentRef.current, filename);
      toast.success("PDF exported successfully!");
    } catch (_error) {
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-3">
              {personality.avatar && (
                <Image
                  alt={`${personality.name} avatar`}
                  className="size-8 rounded-full border-2 border-rose-100"
                  src={personality.avatar}
                  width={32}
                  height={32}
                />
              )}
              <div className="flex flex-col">
                <span className="text-lg font-semibold">
                  {personality.name}
                </span>
                <span className="text-xs font-normal text-stone-500">
                  {personality.role}
                </span>
              </div>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCopy}
                size="sm"
                type="button"
                variant="outline"
              >
                <CopyIcon />
                <span className="ml-2">Copy</span>
              </Button>
              <Button
                disabled={isExporting}
                onClick={handleExportPDF}
                size="sm"
                type="button"
                variant="outline"
              >
                <Download className="size-4" />
                <span className="ml-2">
                  {isExporting ? "Exporting..." : "Export PDF"}
                </span>
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div
          className="prose prose-stone mt-4 max-w-none"
          data-testid="fullscreen-message-content"
          ref={contentRef}
        >
          <Response>{content}</Response>
        </div>
      </DialogContent>
    </Dialog>
  );
}
