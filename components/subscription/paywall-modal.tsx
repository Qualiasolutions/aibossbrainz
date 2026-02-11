"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  Check,
  Crown,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

const plans = [
  {
    id: "monthly",
    name: "Monthly",
    price: 297,
    period: "/month",
    description: "Flexible month-to-month",
    popular: false,
    features: [
      "Unlimited AI strategy sessions",
      "24/7 access to Alexandria & Kim",
      "Sales & marketing guidance",
      "Cancel anytime",
    ],
  },
  {
    id: "annual",
    name: "Best Value",
    price: 2500,
    period: "/year",
    description: "Save $1,000 + Bonuses",
    popular: true,
    features: [
      "Everything in Monthly",
      "Monthly Group Strategy Calls",
      "Resource Library Access",
      "Sales & Marketing Checkup",
    ],
  },
];

export function PaywallModal({
  isOpen,
  onClose,
  title = "Upgrade to Continue",
  message = "Your subscription has expired. Choose a plan to keep accessing Alexandria and Kim.",
}: PaywallModalProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    setLoading(planId);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          type: "error",
          description: data.error || "Something went wrong. Please try again.",
        });
        setLoading(null);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({
          type: "error",
          description: "Unable to start checkout. Please try again.",
        });
        setLoading(null);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        type: "error",
        description: "Network error. Please check your connection.",
      });
      setLoading(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-full p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
            >
              <X className="size-5" />
            </button>

            {/* Header */}
            <div className="bg-gradient-to-br from-red-50 to-rose-50 px-6 py-8 text-center sm:px-8">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/25">
                <Crown className="size-7" />
              </div>
              <h2 className="mt-4 font-bold text-2xl text-stone-900 sm:text-3xl">
                {title}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-stone-600">{message}</p>
            </div>

            {/* Plans */}
            <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={cn(
                    "relative rounded-xl border p-5 transition-all",
                    plan.popular
                      ? "border-red-200 bg-gradient-to-br from-red-50/50 to-rose-50/50 shadow-lg"
                      : "border-stone-200 hover:border-stone-300",
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-red-600 to-rose-600 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                        <Sparkles className="size-3" />
                        BEST VALUE
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {plan.popular ? (
                      <Star className="size-5 text-red-600" />
                    ) : (
                      <Calendar className="size-5 text-stone-500" />
                    )}
                    <span className="font-semibold text-stone-900">
                      {plan.name}
                    </span>
                  </div>

                  <div className="mt-3">
                    <span className="font-bold text-3xl text-stone-900">
                      ${plan.price.toLocaleString()}
                    </span>
                    <span className="text-stone-500"> {plan.period}</span>
                  </div>
                  <p className="mt-1 text-sm text-stone-500">
                    {plan.description}
                  </p>

                  <ul className="mt-4 space-y-2">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            plan.popular ? "text-red-600" : "text-stone-400",
                          )}
                        />
                        <span className="text-stone-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={cn(
                      "mt-5 w-full gap-2",
                      plan.popular
                        ? "shadow-lg shadow-red-500/20"
                        : "bg-stone-900 hover:bg-stone-800",
                    )}
                    variant={plan.popular ? "default" : "secondary"}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loading !== null}
                  >
                    {loading === plan.id ? (
                      <>
                        <span className="animate-spin">
                          <svg className="size-4" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                        </span>
                        Processing...
                      </>
                    ) : (
                      <>
                        Get Started
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-stone-100 bg-stone-50 px-6 py-4 text-center sm:px-8">
              <p className="text-sm text-stone-500">
                30-day money-back guarantee. Cancel anytime.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
