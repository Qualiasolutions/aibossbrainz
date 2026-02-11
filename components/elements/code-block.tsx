"use client";

import { CheckIcon, CopyIcon, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { SyntaxHighlighterProps } from "react-syntax-highlighter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Lazy load syntax highlighter to reduce initial bundle (~200KB savings)
const SyntaxHighlighter = dynamic(
  () => import("react-syntax-highlighter").then((mod) => mod.Prism),
  {
    loading: () => (
      <div className="flex h-20 items-center justify-center bg-muted/50 rounded-md">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    ),
    ssr: false,
  },
) as React.ComponentType<SyntaxHighlighterProps>;

type CodeBlockContextType = {
  code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({
  code: "",
});

export type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  children?: ReactNode;
};

export const CodeBlock = ({
  code,
  language,
  showLineNumbers = false,
  className,
  children,
  ...props
}: CodeBlockProps) => {
  const [styles, setStyles] = useState<{
    oneLight: Record<string, React.CSSProperties>;
    oneDark: Record<string, React.CSSProperties>;
  } | null>(null);

  // Load styles on mount
  useEffect(() => {
    import("react-syntax-highlighter/dist/esm/styles/prism").then((mod) => {
      setStyles({ oneLight: mod.oneLight, oneDark: mod.oneDark });
    });
  }, []);

  const commonProps = {
    codeTagProps: {
      className: "font-mono text-sm",
    },
    customStyle: {
      margin: 0,
      padding: "1rem",
      fontSize: "0.875rem",
      background: "hsl(var(--background))",
      color: "hsl(var(--foreground))",
      overflowX: "auto" as const,
      overflowWrap: "break-word" as const,
      wordBreak: "break-all" as const,
    },
    language,
    lineNumberStyle: {
      color: "hsl(var(--muted-foreground))",
      paddingRight: "1rem",
      minWidth: "2.5rem",
    },
    showLineNumbers,
  };

  return (
    <CodeBlockContext.Provider value={{ code }}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-md border bg-background text-foreground",
          className,
        )}
        {...props}
      >
        <div className="relative">
          {styles ? (
            <>
              <SyntaxHighlighter
                className="overflow-hidden dark:hidden"
                {...commonProps}
                style={styles.oneLight}
              >
                {code}
              </SyntaxHighlighter>
              <SyntaxHighlighter
                className="hidden overflow-hidden dark:block"
                {...commonProps}
                style={styles.oneDark}
              >
                {code}
              </SyntaxHighlighter>
            </>
          ) : (
            <div className="flex h-20 items-center justify-center bg-muted/50">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {children && (
            <div className="absolute top-2 right-2 flex items-center gap-2">
              {children}
            </div>
          )}
        </div>
      </div>
    </CodeBlockContext.Provider>
  );
};

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export const CodeBlockCopyButton = ({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: CodeBlockCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const { code } = useContext(CodeBlockContext);

  const copyToClipboard = async () => {
    if (typeof window === "undefined" || !navigator.clipboard.writeText) {
      onError?.(new Error("Clipboard API not available"));
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      onCopy?.();
      setTimeout(() => setIsCopied(false), timeout);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Button
      className={cn("shrink-0", className)}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <Icon size={14} />}
    </Button>
  );
};
