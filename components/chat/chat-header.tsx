"use client";

import {
  BarChart3,
  Bookmark,
  Download,
  Headphones,
  HelpCircle,
  LayoutGrid,
  Lightbulb,
  Loader2,
  MoreHorizontal,
} from "lucide-react";
import Link from "next/link";
import { ExecutiveSwitch } from "@/components/executive-switch";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BotType } from "@/lib/bot-personalities";
import type { ChatMessage } from "@/lib/types";
import { PlusIcon } from "../icons";

interface ChatHeaderProps {
  selectedBot: BotType;
  onBotChange: (bot: BotType) => void;
  onNewChat: () => void;
  onOpenSwotPanel: () => void;
  onOpenSupport: () => void;
  showNewButton: boolean;
  messages: ChatMessage[];
  isExporting: boolean;
  onExportPDF: () => void;
  onOpenReactionPopup: (
    type: "actionable" | "needs_clarification" | "save_for_later",
  ) => void;
}

export function ChatHeader({
  selectedBot,
  onBotChange,
  onNewChat,
  onOpenSwotPanel,
  onOpenSupport,
  showNewButton,
  messages,
  isExporting,
  onExportPDF,
  onOpenReactionPopup,
}: ChatHeaderProps) {
  return (
    <header className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="flex h-14 w-full items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
        {/* Left: Navigation */}
        <div className="flex items-center gap-3 sm:gap-4">
          <SidebarToggle />
          <div className="hidden items-center gap-2 sm:flex" />
          {showNewButton && (
            <Button
              aria-label="Start new conversation"
              className="h-8 gap-2 rounded-lg border-border bg-background px-3 font-medium text-xs text-foreground shadow-sm transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
              onClick={onNewChat}
              variant="outline"
            >
              <PlusIcon />
              <span className="hidden sm:inline">New</span>
            </Button>
          )}
        </div>

        {/* Center: Executive Selector */}
        <div className="flex flex-1 items-center justify-center">
          <ExecutiveSwitch
            onExecutiveChange={onBotChange}
            selectedExecutive={selectedBot}
          />
        </div>

        {/* Right: Strategy Canvas, Menu & Support */}
        <div className="flex items-center gap-1.5">
          <Button
            className="h-8 gap-1.5 rounded-lg border-border bg-background px-2.5 font-medium text-xs text-muted-foreground shadow-sm transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
            variant="outline"
            onClick={onOpenSwotPanel}
          >
            <LayoutGrid className="size-3.5" />
            <span className="hidden sm:inline">Strategy Canvas</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="h-8 gap-1.5 rounded-lg border-border bg-background px-2.5 font-medium text-xs text-muted-foreground shadow-sm transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                variant="outline"
              >
                <MoreHorizontal className="size-3.5" />
                <span className="hidden sm:inline">Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/analytics" className="flex items-center gap-2">
                  <BarChart3 className="size-4 text-primary" />
                  <span>Analytics</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => onOpenReactionPopup("actionable")}
              >
                <Lightbulb className="size-4 text-primary" />
                <span>Action Items</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => onOpenReactionPopup("needs_clarification")}
              >
                <HelpCircle className="size-4 text-primary" />
                <span>Clarifications</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => onOpenReactionPopup("save_for_later")}
              >
                <Bookmark className="size-4 text-primary" />
                <span>Saved for Later</span>
              </DropdownMenuItem>
              {messages.length > 0 && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  disabled={isExporting}
                  onClick={onExportPDF}
                >
                  {isExporting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4 text-primary" />
                  )}
                  <span>Export PDF</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            className="h-8 gap-1.5 rounded-lg bg-gradient-to-r from-rose-500 to-red-600 px-2.5 font-medium text-xs text-white shadow-sm transition-all hover:from-rose-600 hover:to-red-700"
            onClick={onOpenSupport}
            title="Contact Support"
            type="button"
          >
            <Headphones className="size-3.5" />
            <span className="hidden sm:inline">Support</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
