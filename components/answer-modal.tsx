"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CheckSquare,
  Copy,
  Download,
  Lightbulb,
  Sparkles,
  Target,
  User,
  X,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface AnswerSection {
  title: string;
  content: string;
  icon?: React.ReactNode;
  type?: "insight" | "analysis" | "action" | "recommendation";
}

interface AnswerModalProps {
  isOpen: boolean;
  onClose: () => void;
  executiveName: string;
  executiveRole?: string;
  executiveAvatar?: string;
  title?: string;
  content: string;
  sections?: AnswerSection[];
  timestamp?: string;
}

export function AnswerModal({
  isOpen,
  onClose,
  executiveName,
  executiveRole,
  executiveAvatar,
  title,
  content,
  sections,
  timestamp,
}: AnswerModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${executiveName}-response-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSectionIcon = (type?: string) => {
    switch (type) {
      case "insight":
        return <Lightbulb className="size-4 text-red-500" />;
      case "analysis":
        return <Target className="size-4 text-blue-400" />;
      case "action":
        return <CheckSquare className="size-4 text-emerald-400" />;
      case "recommendation":
        return <ArrowRight className="size-4 text-purple-400" />;
      default:
        return <Sparkles className="size-4 text-red-500" />;
    }
  };

  const getSectionBorderColor = (type?: string) => {
    switch (type) {
      case "insight":
        return "border-l-red-500";
      case "analysis":
        return "border-l-blue-500";
      case "action":
        return "border-l-emerald-500";
      case "recommendation":
        return "border-l-purple-500";
      default:
        return "border-l-red-500";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-4xl max-h-[90vh] glass-dark rounded-2xl overflow-hidden flex flex-col"
          >
            {/* Gold accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 red-gradient" />

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-4">
                {/* Executive Avatar */}
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center border border-red-500/30">
                    {executiveAvatar ? (
                      <Image
                        src={executiveAvatar}
                        alt={executiveName}
                        className="w-full h-full rounded-full object-cover"
                        width={48}
                        height={48}
                      />
                    ) : (
                      <User className="size-6 text-red-500" />
                    )}
                  </div>
                  {/* Online indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    {executiveName}
                    <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-500 border border-red-500/30">
                      {executiveRole || "Executive"}
                    </span>
                  </h2>
                  {timestamp && (
                    <p className="text-sm text-muted-foreground">{timestamp}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {copied ? (
                    <Check className="size-4 text-emerald-400" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleExport}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Download className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 p-6">
              {/* Title */}
              {title && (
                <h3 className="text-xl font-semibold text-white mb-6 red-text">
                  {title}
                </h3>
              )}

              {/* Sections or Content */}
              {sections && sections.length > 0 ? (
                <div className="space-y-6">
                  {sections.map((section, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        "p-5 rounded-xl bg-white/5 border-l-4",
                        getSectionBorderColor(section.type),
                      )}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-white/5">
                          {section.icon || getSectionIcon(section.type)}
                        </div>
                        <h4 className="font-semibold text-white">
                          {section.title}
                        </h4>
                      </div>
                      <div className="text-foreground/80 text-sm leading-relaxed prose prose-invert prose-sm max-w-none">
                        {section.content}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none text-foreground/80 leading-relaxed">
                  {content.split("\n").map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                This response was generated by {executiveName}
              </p>
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Hook to detect if a message is comprehensive (long or structured)
export function useIsComprehensiveAnswer(content: string): boolean {
  // Check if content is long (more than 500 chars) or has multiple sections
  const isLong = content.length > 500;
  const hasMultipleSections = (content.match(/#{2,3}\s/g) || []).length >= 2;
  const hasBulletPoints = (content.match(/^[-*]\s/gm) || []).length >= 3;

  return isLong || hasMultipleSections || hasBulletPoints;
}

// Parse markdown content into sections
export function parseContentToSections(content: string): AnswerSection[] {
  const sections: AnswerSection[] = [];
  const lines = content.split("\n");
  let currentSection: AnswerSection | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    // Check for headers (## or ###)
    const headerMatch = line.match(/^#{2,3}\s+(.+)$/);

    if (headerMatch) {
      // Save previous section if exists
      if (currentSection) {
        currentSection.content = currentContent.join("\n").trim();
        sections.push(currentSection);
      }

      // Determine section type based on title
      const title = headerMatch[1].toLowerCase();
      let type: AnswerSection["type"];

      if (title.includes("insight") || title.includes("key")) {
        type = "insight";
      } else if (title.includes("analysis") || title.includes("overview")) {
        type = "analysis";
      } else if (
        title.includes("action") ||
        title.includes("next step") ||
        title.includes("todo")
      ) {
        type = "action";
      } else if (title.includes("recommend") || title.includes("suggest")) {
        type = "recommendation";
      }

      currentSection = {
        title: headerMatch[1],
        content: "",
        type,
      };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Add last section
  if (currentSection) {
    currentSection.content = currentContent.join("\n").trim();
    sections.push(currentSection);
  }

  return sections;
}
