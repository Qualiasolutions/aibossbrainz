"use client";

import {
  BarChart3,
  ChevronLeft,
  Globe,
  Headphones,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Conversations",
    href: "/admin/conversations",
    icon: MessageSquare,
  },
  {
    title: "Support Tickets",
    href: "/admin/support-tickets",
    icon: Headphones,
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "Landing Page",
    href: "/admin/landing-page",
    icon: Globe,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r border-neutral-200 bg-white">
      {/* Header */}
      <div className="flex h-16 items-center gap-2 border-b border-neutral-200 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-red-600">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-neutral-900">
            Admin Panel
          </h1>
          <p className="text-xs text-neutral-500">Alecci Media AI</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-rose-50 text-rose-600"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-neutral-200 p-4">
        <Link href="/">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-neutral-600 hover:text-neutral-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to App
          </Button>
        </Link>
      </div>
    </div>
  );
}
