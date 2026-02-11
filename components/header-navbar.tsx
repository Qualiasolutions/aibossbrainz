"use client";

import { Menu, Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMobileSidebar } from "@/components/mobile-sidebar-context";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface HeaderNavbarProps {
  chatId?: string;
  showNewChat?: boolean;
  className?: string;
}

export function HeaderNavbar({
  chatId,
  showNewChat = true,
  className,
}: HeaderNavbarProps) {
  const router = useRouter();
  const { toggleSidebar, open } = useSidebar();
  const { openMobileSidebar } = useMobileSidebar();

  const handleNewChat = () => {
    router.push("/new");
    router.refresh();
  };

  const handleSidebarToggle = () => {
    // For desktop
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      // For mobile
      openMobileSidebar();
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-0 bg-white/90 shadow-rose-100/50 shadow-sm backdrop-blur-xl",
        className,
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-3 sm:px-6 lg:px-8">
        {/* Left side - Sidebar toggle and Logo */}
        <div className="flex items-center gap-3">
          {/* Sidebar Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="hover:-translate-y-0.5 h-9 w-9 rounded-lg border border-slate-200/60 bg-white/80 text-slate-600 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
                onClick={handleSidebarToggle}
                size="icon"
                variant="outline"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Toggle Sidebar</p>
            </TooltipContent>
          </Tooltip>

          {/* Logo */}
          <div className="flex items-center">
            <Image
              alt="Alecci Media Logo"
              className="h-8 w-auto max-w-[160px] object-contain lg:h-10 lg:max-w-[200px]"
              src="https://images.squarespace-cdn.com/content/v1/5ea759fa9e5575487ad28cd0/1591228238957-80Y8AGN1M9TTXTYNJ5QK/AM_Logo_Horizontal_4C+%281%29.jpg?format=500w"
              width={200}
              height={50}
            />
          </div>
        </div>

        {/* Right side - New Chat button */}
        {showNewChat && (!open || chatId) && (
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="hover:-translate-y-0.5 h-9 rounded-lg border border-white/70 bg-white/85 px-4 font-medium text-slate-600 text-sm shadow-rose-100/40 shadow-sm transition-all duration-200 hover:border-rose-200/50 hover:bg-white hover:shadow-md"
                  onClick={handleNewChat}
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">New Chat</span>
                  <span className="sm:sr-only">New Chat</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Start new conversation</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    </header>
  );
}
