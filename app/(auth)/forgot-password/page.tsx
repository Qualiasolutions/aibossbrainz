"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { Suspense, useActionState, useEffect, useState } from "react";
import { AuthShell } from "@/components/auth-shell";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type ForgotPasswordActionState,
  requestPasswordReset,
} from "../actions";

const forgotPasswordHighlights = [
  {
    title: "Secure Process",
    description:
      "We'll send a secure link to your email to reset your password. The link expires in 1 hour.",
  },
  {
    title: "Check Your Inbox",
    description:
      "If you don't see the email, check your spam folder. The email comes from noreply@aleccimedia.com.",
  },
  {
    title: "Need Assistance?",
    description:
      "Contact our support team if you continue to have trouble accessing your account.",
  },
];

function ForgotPasswordContent() {
  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<
    ForgotPasswordActionState,
    FormData
  >(requestPasswordReset, { status: "idle" });

  useEffect(() => {
    if (state.status === "success") {
      setIsSuccessful(true);
      toast({
        type: "success",
        description: "Check your email for a password reset link!",
      });
    } else if (state.status === "failed") {
      toast({
        type: "error",
        description: "Something went wrong. Please try again.",
      });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: "Please enter a valid email address.",
      });
    }
  }, [state.status]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    formAction(formData);
  };

  if (isSuccessful) {
    return (
      <AuthShell
        description="We're here to help you get back into your account."
        highlights={forgotPasswordHighlights}
        title="Check Your Email"
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
              Email Sent
            </h2>
            <p className="text-stone-500 text-sm">
              We sent a password reset link to{" "}
              <span className="font-medium text-stone-700">{email}</span>
            </p>
            <p className="text-stone-400 text-sm">
              The link will expire in 1 hour.
            </p>
          </div>
          <div className="space-y-3 pt-2">
            <p className="text-stone-500 text-sm">
              Didn't receive the email?{" "}
              <button
                onClick={() => setIsSuccessful(false)}
                className="font-medium text-stone-900 hover:text-stone-700 transition-colors"
              >
                Try again
              </button>
            </p>
            <Link
              href="/login"
              className="block font-medium text-stone-500 hover:text-stone-900 transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      description="We're here to help you get back into your account."
      highlights={forgotPasswordHighlights}
      title="Reset Your Password"
    >
      <div className="space-y-2 text-center">
        <h2 className="font-light text-2xl text-stone-900 tracking-tight">
          Forgot Password?
        </h2>
        <p className="text-stone-500 text-sm">
          Enter your email and we'll send you a reset link
        </p>
      </div>
      <Form action={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label className="font-medium text-stone-700 text-sm" htmlFor="email">
            Email Address
          </Label>
          <Input
            autoComplete="email"
            autoFocus
            className="h-11 border-stone-200 bg-white focus:border-stone-400 focus:ring-stone-400"
            defaultValue={email}
            id="email"
            name="email"
            placeholder="you@company.com"
            required
            type="email"
          />
        </div>
        <SubmitButton isSuccessful={isSuccessful}>Send Reset Link</SubmitButton>
      </Form>
      <p className="text-center text-sm text-stone-500">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-medium text-stone-900 hover:text-stone-700 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-stone-50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" />
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  );
}
