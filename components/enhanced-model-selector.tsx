"use client";

import { AnimatePresence, motion } from "framer-motion";
import { startTransition, useMemo, useOptimistic, useState } from "react";
import { saveChatModelAsCookie } from "@/app/(chat)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import {
  EXECUTIVE_PERSONALITIES,
  type ExecutivePersonality,
  type ExecutiveType,
} from "@/lib/ai/executive-personalities";
import { chatModels } from "@/lib/ai/models";
import { cn } from "@/lib/utils";
import { CheckCircleFillIcon, ChevronDownIcon, UserIcon } from "./icons";

const EXECUTIVE_ENTRIES = Object.entries(EXECUTIVE_PERSONALITIES) as Array<
  [ExecutiveType, ExecutivePersonality]
>;

interface EnhancedModelSelectorProps {
  userType?: string;
  selectedModelId: string;
  selectedExecutive?: ExecutiveType;
  onExecutiveSelect?: (executive: ExecutiveType) => void;
  className?: string;
}

export function EnhancedModelSelector({
  userType = "regular",
  selectedModelId,
  selectedExecutive = "collaborative",
  onExecutiveSelect,
  className,
}: EnhancedModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [optimisticModelId, setOptimisticModelId] =
    useOptimistic(selectedModelId);
  const [optimisticExecutive, setOptimisticExecutive] =
    useOptimistic(selectedExecutive);

  const { availableChatModelIds } =
    entitlementsByUserType[userType as keyof typeof entitlementsByUserType] ||
    entitlementsByUserType.trial;

  const availableChatModels = chatModels.filter((chatModel) =>
    availableChatModelIds.includes(chatModel.id),
  );

  const selectedChatModel = useMemo(
    () =>
      availableChatModels.find(
        (chatModel) => chatModel.id === optimisticModelId,
      ),
    [optimisticModelId, availableChatModels],
  );

  const selectedPersonality = EXECUTIVE_PERSONALITIES[optimisticExecutive];

  const getExecutiveIcon = (executive: ExecutiveType) => {
    switch (executive) {
      case "alexandria":
        return (
          <div className="flex h-4 w-4 items-center justify-center">
            <UserIcon height={16} width={16} />
          </div>
        );
      case "kim":
        return (
          <div className="flex h-4 w-4 items-center justify-center">
            <UserIcon height={16} width={16} />
          </div>
        );
      case "collaborative":
        return (
          <div className="flex h-4 w-4 items-center justify-center">
            <UserIcon height={16} width={16} />
          </div>
        );
    }
  };

  const handleExecutiveSelect = (executive: ExecutiveType) => {
    startTransition(() => {
      setOptimisticExecutive(executive);
      onExecutiveSelect?.(executive);

      // Auto-select the appropriate model for this executive
      const targetModelId = EXECUTIVE_PERSONALITIES[executive].modelId;
      if (targetModelId !== optimisticModelId) {
        setOptimisticModelId(targetModelId);
        saveChatModelAsCookie(targetModelId);
      }
    });
  };

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          "w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
          className,
        )}
      >
        <Button
          className="group md:h-[34px] md:px-2"
          data-testid="enhanced-model-selector"
          variant="outline"
        >
          <div className="flex items-center gap-2">
            <motion.div
              className="rounded-md p-1 text-white text-xs"
              style={{
                background: selectedPersonality.gradient,
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {getExecutiveIcon(optimisticExecutive)}
            </motion.div>
            <div className="flex flex-col items-start">
              <span className="font-medium text-sm">
                {selectedPersonality.name}
              </span>
              <span className="text-muted-foreground text-xs">
                {selectedChatModel?.name}
              </span>
            </div>
          </div>
          <span className="ml-2 inline-flex">
            <ChevronDownIcon />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[80vh] min-w-[320px] max-w-[90vw] overflow-y-auto p-3 sm:min-w-[380px]"
      >
        {/* Executive Selection Section */}
        <div className="mb-2">
          <p className="px-2 py-1 font-semibold text-muted-foreground text-xs">
            Select Executive
          </p>
          {EXECUTIVE_ENTRIES.map(([executiveType, personality]) => {
            const isSelected = optimisticExecutive === executiveType;

            return (
              <DropdownMenuItem
                asChild
                data-active={isSelected}
                key={executiveType}
                onSelect={() => {
                  handleExecutiveSelect(executiveType as ExecutiveType);
                }}
              >
                <button
                  className="group/item flex w-full flex-row items-center justify-between gap-2 rounded-md p-3 transition-colors hover:bg-accent"
                  type="button"
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      className={cn(
                        "rounded-md p-2 text-sm text-white transition-all",
                        isSelected
                          ? "scale-110 shadow-lg"
                          : "scale-100 opacity-80",
                      )}
                      style={{ background: personality.gradient }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {getExecutiveIcon(executiveType as ExecutiveType)}
                    </motion.div>
                    <div className="flex flex-col items-start">
                      <div className="font-medium text-sm">
                        {personality.name}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {personality.role}
                      </div>
                      <div className="mt-1 text-muted-foreground text-xs leading-relaxed">
                        {personality.description}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        animate={{ scale: 1, opacity: 1 }}
                        className="shrink-0"
                        exit={{ scale: 0, opacity: 0 }}
                        initial={{ scale: 0, opacity: 0 }}
                      >
                        <CheckCircleFillIcon />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator />

        {/* Model Selection Section */}
        <div>
          <p className="px-2 py-1 font-semibold text-muted-foreground text-xs">
            AI Model
          </p>
          {availableChatModels.map((chatModel) => {
            const { id } = chatModel;
            const isSelected = id === optimisticModelId;

            return (
              <DropdownMenuItem
                asChild
                data-active={isSelected}
                data-testid={`model-selector-item-${id}`}
                key={id}
                onSelect={() => {
                  setOpen(false);
                  startTransition(() => {
                    setOptimisticModelId(id);
                    saveChatModelAsCookie(id);
                  });
                }}
              >
                <button
                  className="group/item flex w-full flex-row items-center justify-between gap-2 rounded-md p-3 transition-colors hover:bg-accent"
                  type="button"
                >
                  <div className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      {chatModel.name}
                      {chatModel.id === selectedPersonality.modelId && (
                        <Badge
                          className="bg-green-50 text-green-700 text-xs"
                          variant="secondary"
                        >
                          Executive Match
                        </Badge>
                      )}
                    </div>
                    <div className="line-clamp-2 text-muted-foreground text-xs leading-relaxed">
                      {chatModel.description}
                    </div>
                  </div>

                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        animate={{ scale: 1, opacity: 1 }}
                        className="shrink-0"
                        exit={{ scale: 0, opacity: 0 }}
                        initial={{ scale: 0, opacity: 0 }}
                      >
                        <CheckCircleFillIcon />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </button>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
