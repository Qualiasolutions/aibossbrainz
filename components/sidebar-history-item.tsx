import { Star } from "lucide-react";
import Link from "next/link";
import { memo } from "react";
import type { Chat } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { MoreHorizontalIcon, TrashIcon } from "./icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";

const PureChatItem = ({
  chat,
  isActive,
  onDelete,
  setOpenMobile,
  onPinToggle,
}: {
  chat: Chat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  setOpenMobile: (open: boolean) => void;
  onPinToggle?: (chatId: string, isPinned: boolean) => void;
}) => {
  const isPinned = chat.isPinned ?? false;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link
          className={cn(
            "group relative my-1 flex h-10 items-center rounded-lg px-3",
            "border border-transparent transition-all duration-200",
            "hover:bg-red-100 hover:border-red-300 hover:shadow-sm",
            isActive && "bg-red-100 border-red-400 shadow-sm",
            isPinned && !isActive && "bg-amber-50/50 border-amber-200/50",
          )}
          href={`/chat/${chat.id}`}
          onClick={() => setOpenMobile(false)}
          prefetch={false}
        >
          {/* Active state indicator */}
          {isActive && (
            <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-red-500" />
          )}

          <div className="flex w-full items-center gap-2 min-w-0">
            {isPinned && (
              <Star className="size-3 shrink-0 fill-red-500 text-red-500" />
            )}
            <span
              className={cn(
                "truncate text-sm transition-colors",
                "text-neutral-700 group-hover:text-neutral-900",
                isActive && "text-red-700 font-medium",
              )}
            >
              {chat.title}
            </span>
          </div>
        </Link>
      </SidebarMenuButton>

      <DropdownMenu modal={true}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            className="mr-1 rounded-lg transition-colors duration-200 hover:bg-red-100 data-[state=open]:bg-red-100 data-[state=open]:text-red-700"
            showOnHover={!isActive}
          >
            <div className="flex h-4 w-4 items-center justify-center">
              <MoreHorizontalIcon size={16} />
            </div>
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuItem
            className={cn(isPinned && "text-red-500")}
            onSelect={() => {
              onPinToggle?.(chat.id, !isPinned);
            }}
          >
            <Star
              className={cn("size-4", isPinned && "fill-red-500 text-red-500")}
            />
            <span className="font-medium text-sm">
              {isPinned ? "Unpin" : "Pin"}
            </span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="text-red-400 focus:text-red-400"
            onSelect={() => onDelete(chat.id)}
          >
            <TrashIcon size={16} />
            <span className="font-medium text-sm">Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

export const ChatItem = memo(PureChatItem, (prevProps, nextProps) => {
  if (prevProps.isActive !== nextProps.isActive) {
    return false;
  }
  if (prevProps.chat.isPinned !== nextProps.chat.isPinned) {
    return false;
  }
  if (prevProps.chat.topic !== nextProps.chat.topic) {
    return false;
  }
  if (prevProps.chat.topicColor !== nextProps.chat.topicColor) {
    return false;
  }
  return true;
});
