"use client";

import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useActionState, useEffect, useRef, useState } from "react";

import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { type SignupActionState, signup } from "../actions";

const signupHighlights = [
  {
    title: "Strategic Intelligence",
    description:
      "Access AI executives trained on proven sales and marketing frameworks, ready to elevate your business decisions.",
  },
  {
    title: "Precision Guidance",
    description:
      "The more context you provide, the more tailored and actionable your strategic recommendations become.",
  },
  {
    title: "Results-Focused",
    description:
      "Every conversation is designed to drive measurable outcomes. Think strategy, then execute.",
  },
];

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [showCheckEmail, setShowCheckEmail] = useState(false);
  const hasHandledSuccess = useRef(false);

  const [state, formAction] = useActionState<SignupActionState, FormData>(
    signup,
    {
      status: "idle",
    },
  );

  useEffect(() => {
    if (state.status === "failed") {
      toast({
        type: "error",
        description: "Something went wrong. Please try again.",
      });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description:
          "Please enter a valid email and password (min 8 characters).",
      });
    } else if (state.status === "weak_password") {
      toast({
        type: "error",
        description:
          "That password is too common. Please choose a stronger one.",
      });
    } else if (state.status === "user_exists") {
      toast({
        type: "error",
        description:
          "An account with this email already exists. Please sign in instead.",
      });
      router.push(`/login${plan ? `?plan=${plan}` : ""}`);
    } else if (state.status === "success" && !hasHandledSuccess.current) {
      hasHandledSuccess.current = true;
      setIsSuccessful(true);
      setShowCheckEmail(true);

      toast({
        type: "success",
        description: "Check your email to confirm your account!",
      });
    }
  }, [router, state.status, plan]);

  const handleSubmit = (formData: FormData) => {
    const emailValue = formData.get("email") as string;
    setEmail(emailValue);
    // Add plan to form data so it's included in the email redirect
    if (plan) {
      formData.set("plan", plan);
    }
    formAction(formData);
  };

  // Show "check your email" screen after successful signup
  if (showCheckEmail) {
    return (
      <AuthShell
        description="We've sent you a confirmation email. Click the link to activate your account and start your free trial."
        highlights={signupHighlights}
        title="Check Your Email"
      >
        <div className="space-y-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
            className="mx-auto flex size-16 items-center justify-center rounded-full bg-stone-100"
          >
            <Mail className="size-7 text-stone-600" />
          </motion.div>
          <div className="space-y-2">
            <h2 className="font-light text-2xl text-stone-900 tracking-tight">
              Check your inbox
            </h2>
            <p className="text-stone-500">
              We've sent a confirmation email to{" "}
              <span className="font-medium text-stone-700">{email}</span>
            </p>
          </div>
          <div className="rounded-xl border border-stone-100 bg-stone-50/50 p-4">
            <p className="text-sm text-stone-600">
              Click the link in the email to confirm your account and{" "}
              {plan ? (
                <span className="font-medium text-stone-900">
                  start your 14-day free trial
                </span>
              ) : (
                "get started"
              )}
            </p>
          </div>
          <p className="text-sm text-stone-400">
            Didn't receive it? Check your spam folder or{" "}
            <button
              onClick={() => {
                setShowCheckEmail(false);
                hasHandledSuccess.current = false;
              }}
              className="font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              try again
            </button>
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      description="Join business leaders using AI-powered executive intelligence to transform their sales and marketing strategy."
      highlights={signupHighlights}
      title="Begin Your Journey"
    >
      <div className="space-y-2 text-center">
        <h2 className="font-light text-2xl text-stone-900 tracking-tight">
          Create Account
        </h2>
        <p className="text-stone-500 text-sm">
          {plan ? (
            <>
              Get started with the{" "}
              <span className="font-medium text-stone-900">
                {plan === "monthly"
                  ? "Monthly"
                  : plan === "annual"
                    ? "Annual"
                    : "Lifetime"}
              </span>{" "}
              plan
            </>
          ) : (
            "Access your AI executive workspace"
          )}
        </p>
      </div>
      <AuthForm
        action={handleSubmit}
        className="px-0 sm:px-0"
        defaultEmail={email}
      >
        <SubmitButton isSuccessful={isSuccessful}>Create Account</SubmitButton>
      </AuthForm>
      <p className="text-center text-sm text-stone-500">
        Already have an account?{" "}
        <Link
          href={`/login${plan ? `?plan=${plan}` : ""}`}
          className="font-medium text-stone-900 hover:text-stone-700 transition-colors"
        >
          Sign in
        </Link>
      </p>
      <p className="text-center text-sm text-stone-500">
        <Link
          href="/forgot-password"
          className="font-medium text-stone-600 hover:text-stone-900 transition-colors"
        >
          Forgot your password?
        </Link>
      </p>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-stone-50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" />
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
