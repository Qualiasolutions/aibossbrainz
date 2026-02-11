"use client";

import type { User } from "@supabase/supabase-js";
import {
  ChevronUp,
  CreditCard,
  Home,
  LogIn,
  LogOut,
  Mail,
  Settings,
  Shield,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { guestRegex } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

export function SidebarUserNav({
  user,
  isAdmin = false,
}: {
  user: User;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  const isGuest = guestRegex.test(user?.email ?? "");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="h-10 bg-background data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              data-testid="user-nav-button"
            >
              <Image
                alt={user.email ?? "User Avatar"}
                className="rounded-full"
                height={24}
                src={`https://avatar.vercel.sh/${user.email}`}
                width={24}
              />
              <span
                className="truncate text-neutral-600"
                data-testid="user-email"
              >
                {isGuest ? "Guest" : user?.email}
              </span>
              <ChevronUp className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 rounded-xl border-neutral-200 bg-white p-1 shadow-lg"
            data-testid="user-nav-menu"
            side="top"
          >
            <DropdownMenuItem
              asChild
              className="rounded-lg px-3 py-2.5 cursor-pointer focus:bg-rose-50 focus:text-rose-600"
            >
              <Link href="/">
                <Home className="mr-2.5 h-4 w-4 text-rose-500" />
                <span className="text-sm font-medium">Homepage</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className="rounded-lg px-3 py-2.5 cursor-pointer focus:bg-rose-50 focus:text-rose-600"
            >
              <Link href="/account">
                <Settings className="mr-2.5 h-4 w-4 text-rose-500" />
                <span className="text-sm font-medium">Account</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className="rounded-lg px-3 py-2.5 cursor-pointer focus:bg-rose-50 focus:text-rose-600"
            >
              <Link href="/pricing">
                <CreditCard className="mr-2.5 h-4 w-4 text-rose-500" />
                <span className="text-sm font-medium">Pricing</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className="rounded-lg px-3 py-2.5 cursor-pointer focus:bg-rose-50 focus:text-rose-600"
            >
              <Link href="/contact">
                <Mail className="mr-2.5 h-4 w-4 text-rose-500" />
                <span className="text-sm font-medium">Contact</span>
              </Link>
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  asChild
                  className="rounded-lg px-3 py-2.5 cursor-pointer focus:bg-purple-50 focus:text-purple-600"
                >
                  <Link href="/admin">
                    <Shield className="mr-2.5 h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Admin Panel</span>
                  </Link>
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              asChild
              data-testid="user-nav-item-auth"
              className="rounded-lg px-3 py-2.5 cursor-pointer focus:bg-rose-50 focus:text-rose-600"
            >
              <button
                className="w-full"
                onClick={() => {
                  if (isGuest) {
                    router.push("/login");
                  } else {
                    handleSignOut();
                  }
                }}
                type="button"
              >
                {isGuest ? (
                  <>
                    <LogIn className="mr-2.5 h-4 w-4 text-rose-500" />
                    <span className="text-sm font-medium">
                      Login to your account
                    </span>
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2.5 h-4 w-4 text-rose-500" />
                    <span className="text-sm font-medium">Sign out</span>
                  </>
                )}
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
