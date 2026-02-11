"use client";

import { Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { memo, useState } from "react";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { useWindowSize } from "@/hooks/use-window-size";
import { PlusIcon } from "./icons";
import { RealtimeCall } from "./realtime-call";
import { useSidebar } from "./ui/sidebar";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
  selectedBotType = "collaborative",
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  selectedBotType?: "alexandria" | "kim" | "collaborative";
}) {
  const router = useRouter();
  const { open } = useSidebar();
  const [showCall, setShowCall] = useState(false);

  const { width: windowWidth } = useWindowSize();

  return (
    <>
      <header className="flex w-full items-center gap-2 rounded-3xl bg-transparent px-1 py-1 md:px-2">
        <SidebarToggle />

        {(!open || windowWidth < 768) && (
          <Button
            className="hover:-translate-y-0.5 order-2 ml-auto h-9 rounded-full border border-white/70 bg-white/85 px-3 font-medium text-slate-600 text-sm shadow-rose-100/40 shadow-sm transition-all hover:bg-white md:order-1 md:ml-0"
            onClick={() => {
              router.push("/new");
              router.refresh();
            }}
            variant="outline"
          >
            <PlusIcon />
            <span className="md:sr-only">New Chat</span>
          </Button>
        )}

        {/* Real-time Call Button */}
        {!isReadonly && (
          <Button
            className="hover:-translate-y-0.5 order-3 h-9 rounded-full border border-emerald-200 bg-emerald-50 px-3 font-medium text-emerald-600 text-sm shadow-emerald-100/40 shadow-sm transition-all hover:bg-emerald-100"
            onClick={() => setShowCall(true)}
            variant="outline"
          >
            <Phone className="size-4" />
            <span className="ml-1.5 hidden sm:inline">Call</span>
          </Button>
        )}

        {!isReadonly && (
          <VisibilitySelector
            chatId={chatId}
            className="order-1 ml-auto md:order-2"
            selectedVisibilityType={selectedVisibilityType}
          />
        )}
      </header>

      {/* Real-time Call Modal */}
      {showCall && (
        <RealtimeCall
          chatId={chatId}
          botType={selectedBotType}
          onClose={() => setShowCall(false)}
        />
      )}
    </>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly &&
    prevProps.selectedBotType === nextProps.selectedBotType
  );
});
