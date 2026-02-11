"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Check } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useActionState, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ResetPasswordActionState, resetPassword } from "../actions";

const resetPasswordHighlights = [
  {
    title: "Strong Password",
    description:
      "Use at least 8 characters with a mix of letters, numbers, and symbols for better security.",
  },
  {
    title: "Unique Credentials",
    description:
      "Don't reuse passwords from other accounts. Your AI executives deserve unique protection.",
  },
  {
    title: "Almost There",
    description:
      "Once you reset your password, you'll be automatically logged in and ready to go.",
  },
];

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isInvalidLink, setIsInvalidLink] = useState(false);

  // Check for error params (from Supabase redirect)
  useEffect(() => {
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      setIsInvalidLink(true);
      toast({
        type: "error",
        description:
          errorDescription || "This reset link is invalid or has expired.",
      });
    }
  }, [searchParams]);

  const [state, formAction] = useActionState<
    ResetPasswordActionState,
    FormData
  >(resetPassword, { status: "idle" });

  useEffect(() => {
    if (state.status === "success") {
      setIsSuccessful(true);
      toast({
        type: "success",
        description: "Password updated! Welcome back to Boss Brainz!",
      });
      // User is already authenticated via the reset link - redirect to app
      setTimeout(() => {
        router.push("/new");
      }, 2000);
    } else if (state.status === "failed") {
      toast({
        type: "error",
        description:
          state.message || "Failed to reset password. Please try again.",
      });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: "Password must be at least 8 characters.",
      });
    } else if (state.status === "mismatch") {
      toast({
        type: "error",
        description: "Passwords do not match.",
      });
    }
  }, [state, router]);

  if (isInvalidLink) {
    return (
      <AuthShell
        description="We're here to help you get back into your account."
        highlights={resetPasswordHighlights}
        title="Link Expired"
      >
        <div className="space-y-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-stone-100"
          >
            <AlertTriangle className="h-8 w-8 text-stone-600" />
          </motion.div>
          <div className="space-y-2">
            <h2 className="font-light text-2xl text-stone-900 tracking-tight">
              Reset Link Invalid
            </h2>
            <p className="text-stone-500 text-sm">
              This password reset link has expired or is invalid.
            </p>
          </div>
          <Link href="/forgot-password">
            <Button
              size="lg"
              className="h-12 w-full bg-stone-900 text-white shadow-lg shadow-stone-900/10 hover:bg-stone-800"
            >
              Request New Link
            </Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (isSuccessful) {
    return (
      <AuthShell
        description="We're here to help you get back into your account."
        highlights={resetPasswordHighlights}
        title="Password Reset"
      >
        <div className="space-y-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-stone-900"
          >
            <Check className="h-8 w-8 text-white" strokeWidth={3} />
          </motion.div>
          <div className="space-y-2">
            <h2 className="font-light text-2xl text-stone-900 tracking-tight">
              Welcome Back
            </h2>
            <p className="text-stone-500 text-sm">
              Your password has been successfully updated.
            </p>
            <p className="text-stone-400 text-sm">
              Taking you to your AI executives...
            </p>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      description="We're here to help you get back into your account."
      highlights={resetPasswordHighlights}
      title="Create New Password"
    >
      <div className="space-y-2 text-center">
        <h2 className="font-light text-2xl text-stone-900 tracking-tight">
          New Password
        </h2>
        <p className="text-stone-500 text-sm">Enter your new password below</p>
      </div>
      <Form action={formAction} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label
            className="font-medium text-stone-700 text-sm"
            htmlFor="password"
          >
            New Password
          </Label>
          <Input
            autoComplete="new-password"
            autoFocus
            className="h-11 border-stone-200 bg-white focus:border-stone-400 focus:ring-stone-400"
            id="password"
            name="password"
            placeholder="Min 8 characters"
            required
            type="password"
            minLength={8}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label
            className="font-medium text-stone-700 text-sm"
            htmlFor="confirmPassword"
          >
            Confirm Password
          </Label>
          <Input
            autoComplete="new-password"
            className="h-11 border-stone-200 bg-white focus:border-stone-400 focus:ring-stone-400"
            id="confirmPassword"
            name="confirmPassword"
            placeholder="Re-enter your password"
            required
            type="password"
            minLength={6}
          />
        </div>
        <SubmitButton isSuccessful={isSuccessful}>Reset Password</SubmitButton>
      </Form>
      <p className="text-center text-sm text-stone-500">
        <Link
          href="/login"
          className="font-medium text-stone-900 hover:text-stone-700 transition-colors"
        >
          Back to Sign In
        </Link>
      </p>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-stone-50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
