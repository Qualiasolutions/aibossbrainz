"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Lock,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCsrf } from "@/hooks/use-csrf";

const TOS_ACCEPTED_KEY = "alecci_tos_accepted";

interface TosPopupProps {
  onAccept?: () => void;
}

export function TosPopup({ onAccept }: TosPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tosChecked, setTosChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { csrfFetch } = useCsrf();

  useEffect(() => {
    setMounted(true);

    const checkTosStatus = async () => {
      try {
        // First try to check database (for authenticated users)
        const response = await fetch("/api/accept-tos");
        if (response.ok) {
          const data = await response.json();
          if (!data.accepted) {
            setIsOpen(true);
          }
          setIsCheckingAuth(false);
          return;
        }
      } catch {
        // API failed, fall back to localStorage
      }

      // Fallback to localStorage for non-authenticated or on API error
      const accepted = localStorage.getItem(TOS_ACCEPTED_KEY);
      if (!accepted) {
        setIsOpen(true);
      }
      setIsCheckingAuth(false);
    };

    checkTosStatus();
  }, []);

  const handleAccept = async () => {
    if (!tosChecked || !privacyChecked) return;

    setIsLoading(true);
    try {
      // Try to save to database first (with CSRF token)
      const response = await csrfFetch("/api/accept-tos", { method: "POST" });
      if (response.ok) {
        setIsOpen(false);
        onAccept?.();
        return;
      }
    } catch {
      // API failed, fall back to localStorage
    }

    // Fallback to localStorage
    localStorage.setItem(TOS_ACCEPTED_KEY, new Date().toISOString());
    setIsOpen(false);
    setIsLoading(false);
    onAccept?.();
  };

  const canAccept = tosChecked && privacyChecked;

  if (!mounted || isCheckingAuth || !isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop - soft blur, pointer-events-none to allow clicks through to modal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-neutral-100/80 backdrop-blur-md dark:bg-neutral-950/80 pointer-events-none"
          />

          {/* Modal - Bright premium design */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative z-10 w-full max-w-2xl bg-white rounded-2xl overflow-hidden shadow-2xl shadow-neutral-300/50 border border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800 dark:shadow-black/30 pointer-events-auto"
          >
            {/* Red accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-red-600" />

            {/* Header */}
            <div className="p-6 pb-4 border-b border-neutral-100 bg-gradient-to-b from-neutral-50 to-white dark:border-neutral-800 dark:from-neutral-800 dark:to-neutral-900">
              <div className="flex items-center gap-3">
                <motion.div
                  className="p-2.5 rounded-xl bg-red-50 border border-red-100 dark:bg-red-950/50 dark:border-red-900/50"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Shield className="size-6 text-red-500" />
                </motion.div>
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
                    Terms of Service & Privacy Policy
                  </h2>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Please review and accept to continue
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <ScrollArea className="h-[350px] p-6 bg-white dark:bg-neutral-900">
              <div className="space-y-6 text-sm">
                {/* Key Points */}
                <section className="space-y-4">
                  <motion.div
                    className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 dark:from-red-950/30 dark:to-rose-950/30 dark:border-red-900/50"
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <FileText className="size-5 text-red-500 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-medium text-neutral-900 dark:text-white mb-1">
                        Alecci Media LLC Services
                      </h3>
                      <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        Alecci Media LLC offers the Alecci Media Bots with
                        strategic marketing and sales information and
                        capabilities. By using our Services, you agree to be
                        bound by these Terms.
                      </p>
                    </div>
                  </motion.div>

                  <motion.div
                    className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 dark:from-blue-950/30 dark:to-indigo-950/30 dark:border-blue-900/50"
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Lock className="size-5 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-medium text-neutral-900 dark:text-white mb-1">
                        Data & Privacy
                      </h3>
                      <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        We retain information on your behalf, including the
                        content of messages. We will not use the raw text of
                        conversations for training unless explicit consent is
                        obtained. We may use anonymized data to improve the Bot.
                      </p>
                    </div>
                  </motion.div>

                  <motion.div
                    className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 dark:from-amber-950/30 dark:to-orange-950/30 dark:border-amber-900/50"
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <AlertCircle className="size-5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <h3 className="font-medium text-neutral-900 dark:text-white mb-1">
                        Important Disclaimer
                      </h3>
                      <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        Alecci Media LLC does not provide financial, tax, legal,
                        or accounting advice. This material is for informational
                        purposes only. You should consult your own advisors
                        before engaging in any transaction. We do not guarantee
                        outcomes.
                      </p>
                    </div>
                  </motion.div>
                </section>

                {/* Terms Summary */}
                <section className="space-y-3">
                  <h3 className="font-medium text-neutral-900 dark:text-white">
                    Key Terms
                  </h3>
                  <ul className="space-y-2.5 text-neutral-600 dark:text-neutral-400">
                    <li className="flex items-start gap-2.5">
                      <span className="text-red-500 mt-0.5 font-bold">•</span>
                      You are prohibited from replicating, reverse engineering,
                      or adapting the Bot
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-red-500 mt-0.5 font-bold">•</span>
                      You may not use outputs to train other bots or competitive
                      services
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-red-500 mt-0.5 font-bold">•</span>
                      Services provided &quot;AS IS&quot; without warranties of
                      any kind
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-red-500 mt-0.5 font-bold">•</span>
                      Governed by the laws of the State of Arizona
                    </li>
                  </ul>
                </section>
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-6 pt-4 border-t border-neutral-100 bg-gradient-to-t from-neutral-50 to-white space-y-4 dark:border-neutral-800 dark:from-neutral-800 dark:to-neutral-900">
              <div className="space-y-3">
                <div
                  className="flex items-center gap-3 cursor-pointer group p-2 -m-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  onClick={() => setTosChecked(!tosChecked)}
                >
                  <Checkbox
                    checked={tosChecked}
                    onCheckedChange={(checked) =>
                      setTosChecked(checked === true)
                    }
                    className="border-2 border-neutral-300 dark:border-neutral-600 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                  />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors select-none">
                    I have read and agree to the{" "}
                    <Link
                      href="/terms"
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-red-600 underline underline-offset-2 hover:text-red-700"
                    >
                      Terms of Service
                    </Link>
                  </span>
                </div>

                <div
                  className="flex items-center gap-3 cursor-pointer group p-2 -m-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  onClick={() => setPrivacyChecked(!privacyChecked)}
                >
                  <Checkbox
                    checked={privacyChecked}
                    onCheckedChange={(checked) =>
                      setPrivacyChecked(checked === true)
                    }
                    className="border-2 border-neutral-300 dark:border-neutral-600 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                  />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors select-none">
                    I have read and agree to the{" "}
                    <Link
                      href="/privacy"
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-red-600 underline underline-offset-2 hover:text-red-700"
                    >
                      Privacy Policy
                    </Link>
                  </span>
                </div>
              </div>

              <Button
                onClick={handleAccept}
                disabled={!canAccept || isLoading}
                className="w-full shadow-lg shadow-red-200/50 hover:shadow-red-300/50 transition-shadow bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                size="lg"
              >
                {isLoading ? (
                  "Processing..."
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="size-4" />
                    Accept & Continue
                  </span>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function useTosAccepted() {
  const [accepted, setAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/accept-tos");
        if (response.ok) {
          const data = await response.json();
          setAccepted(data.accepted);
          return;
        }
      } catch {
        // Fall back to localStorage
      }
      const value = localStorage.getItem(TOS_ACCEPTED_KEY);
      setAccepted(!!value);
    };

    checkStatus();
  }, []);

  return accepted;
}
