"use client";

import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Briefcase, Building2, Loader2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "@/components/toast";
import { useCsrf } from "@/hooks/use-csrf";
import { BOT_PERSONALITIES } from "@/lib/bot-personalities";
import {
  EMPLOYEE_COUNT_RANGES,
  INDUSTRIES,
  REVENUE_RANGES,
  YEARS_IN_BUSINESS_RANGES,
} from "@/lib/constants/business-profile";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";

interface UserProfile {
  displayName: string | null;
  companyName: string | null;
  industry: string | null;
  onboardedAt: string | null;
}

type OnboardingStep =
  | "welcome"
  | "meet-team"
  | "profile"
  | "business"
  | "success";

const STEPS: OnboardingStep[] = [
  "welcome",
  "meet-team",
  "profile",
  "business",
  "success",
];

const alexandria = BOT_PERSONALITIES.alexandria;
const kim = BOT_PERSONALITIES.kim;

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState<OnboardingStep>("welcome");
  // Profile fields
  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  // Business profile fields
  const [productsServices, setProductsServices] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [competitors, setCompetitors] = useState("");
  const [businessGoals, setBusinessGoals] = useState("");
  const [annualRevenue, setAnnualRevenue] = useState("");
  const [yearsInBusiness, setYearsInBusiness] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const { csrfFetch, isLoading: csrfLoading } = useCsrf();

  useEffect(() => {
    async function checkProfile() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const profile: UserProfile = await res.json();
          if (!profile.onboardedAt) {
            setIsOpen(true);
          }
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setIsLoading(false);
      }
    }

    checkProfile();
  }, []);

  const buildPayload = () => ({
    displayName: displayName.trim() || null,
    companyName: companyName.trim() || null,
    industry: industry || null,
    productsServices: productsServices.trim() || null,
    websiteUrl: websiteUrl.trim() || null,
    targetMarket: targetMarket.trim() || null,
    competitors: competitors.trim() || null,
    businessGoals: businessGoals.trim() || null,
    annualRevenue: annualRevenue || null,
    yearsInBusiness: yearsInBusiness || null,
    employeeCount: employeeCount || null,
    completeOnboarding: true,
  });

  const saveAndFinish = async () => {
    if (csrfLoading) {
      toast({
        type: "error",
        description: "Please wait a moment and try again.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await csrfFetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      if (res.ok) {
        setStep("success");
        const name = displayName.trim() || "there";
        toast({
          type: "success",
          description: `Welcome aboard, ${name}!`,
        });
        setTimeout(() => {
          setIsOpen(false);
        }, 2500);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Failed to save profile:", errorData);
        toast({
          type: "error",
          description: "Failed to save your profile. Please try again.",
        });
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
      toast({
        type: "error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    saveAndFinish();
  };

  const handleProfileContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setStep("business");
  };

  const handleBusinessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveAndFinish();
  };

  // Don't render anything until we know whether to show the modal
  if (isLoading || !isOpen) return null;

  const currentStepIndex = STEPS.indexOf(step);

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-lg overflow-hidden border-0 bg-white p-0 shadow-2xl sm:rounded-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Step progress bar */}
        <div className="h-1 w-full bg-stone-100">
          <motion.div
            className="h-full bg-gradient-to-r from-rose-500 to-red-500"
            initial={{ width: "0%" }}
            animate={{
              width: `${((currentStepIndex + 1) / STEPS.length) * 100}%`,
            }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />
        </div>

        <AnimatePresence mode="wait">
          {step === "welcome" && (
            <WelcomeStep key="welcome" onNext={() => setStep("meet-team")} />
          )}
          {step === "meet-team" && (
            <MeetTeamStep
              key="meet-team"
              onNext={() => setStep("profile")}
              onSkip={handleSkip}
              isSaving={isSaving}
            />
          )}
          {step === "profile" && (
            <ProfileStep
              key="profile"
              displayName={displayName}
              setDisplayName={setDisplayName}
              companyName={companyName}
              setCompanyName={setCompanyName}
              industry={industry}
              setIndustry={setIndustry}
              onSubmit={handleProfileContinue}
              onSkip={handleSkip}
              isSaving={isSaving}
            />
          )}
          {step === "business" && (
            <BusinessProfileStep
              key="business"
              productsServices={productsServices}
              setProductsServices={setProductsServices}
              websiteUrl={websiteUrl}
              setWebsiteUrl={setWebsiteUrl}
              targetMarket={targetMarket}
              setTargetMarket={setTargetMarket}
              competitors={competitors}
              setCompetitors={setCompetitors}
              businessGoals={businessGoals}
              setBusinessGoals={setBusinessGoals}
              annualRevenue={annualRevenue}
              setAnnualRevenue={setAnnualRevenue}
              yearsInBusiness={yearsInBusiness}
              setYearsInBusiness={setYearsInBusiness}
              employeeCount={employeeCount}
              setEmployeeCount={setEmployeeCount}
              onSubmit={handleBusinessSubmit}
              onSkip={handleSkip}
              isSaving={isSaving}
            />
          )}
          {step === "success" && (
            <SuccessStep key="success" displayName={displayName || "there"} />
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="relative flex flex-col items-center px-8 pt-8 pb-10"
    >
      <VisuallyHidden.Root>
        <DialogTitle>Welcome to AI Boss Brainz</DialogTitle>
        <DialogDescription>
          Your executive AI consulting team awaits
        </DialogDescription>
      </VisuallyHidden.Root>

      {/* Executive avatars - overlapping */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 180 }}
        className="relative mb-8"
      >
        <div className="flex -space-x-5">
          {alexandria.avatar && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="relative z-10 size-[72px] overflow-hidden rounded-full border-[3px] border-white shadow-lg"
            >
              <Image
                src={alexandria.avatar}
                alt={alexandria.name}
                fill
                className="object-cover"
                sizes="72px"
              />
            </motion.div>
          )}
          {kim.avatar && (
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="relative size-[72px] overflow-hidden rounded-full border-[3px] border-white shadow-lg"
            >
              <Image
                src={kim.avatar}
                alt={kim.name}
                fill
                className="object-cover"
                sizes="72px"
              />
            </motion.div>
          )}
        </div>
        {/* Glow behind avatars */}
        <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-gradient-to-br from-rose-200/40 to-red-200/40 blur-2xl" />
      </motion.div>

      {/* Welcome text */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-2 text-center font-bold text-2xl tracking-tight text-stone-900"
      >
        Welcome to Boss Brainz
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-2 max-w-xs text-center text-[15px] leading-relaxed text-stone-500"
      >
        Your personal executive consulting team is ready to help you grow your
        business.
      </motion.p>

      {/* Executive names */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mb-8 flex items-center gap-6"
      >
        <div className="text-center">
          <p className="font-semibold text-sm text-stone-800">Alexandria</p>
          <p className="text-xs text-rose-500">CMO</p>
        </div>
        <div className="h-4 w-px bg-stone-200" />
        <div className="text-center">
          <p className="font-semibold text-sm text-stone-800">Kim</p>
          <p className="text-xs text-red-500">CSO</p>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-xs"
      >
        <Button
          autoFocus
          onClick={onNext}
          className="group h-11 w-full bg-stone-900 font-semibold text-white transition-all hover:bg-stone-800"
        >
          Meet Your Team
          <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

function MeetTeamStep({
  onNext,
  onSkip,
  isSaving,
}: {
  onNext: () => void;
  onSkip: () => void;
  isSaving: boolean;
}) {
  const [activeExec, setActiveExec] = useState<"alexandria" | "kim">(
    "alexandria",
  );

  const executives = [
    { key: "alexandria" as const, data: alexandria },
    { key: "kim" as const, data: kim },
  ];

  const currentExec = activeExec === "alexandria" ? alexandria : kim;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="relative flex flex-col px-8 pt-6 pb-8"
    >
      <VisuallyHidden.Root>
        <DialogTitle>Meet Your Executive Team</DialogTitle>
        <DialogDescription>
          Alexandria and Kim are ready to help
        </DialogDescription>
      </VisuallyHidden.Root>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 text-center"
      >
        <h2 className="mb-1 font-bold text-lg tracking-tight text-stone-900">
          Your Executive Team
        </h2>
        <p className="text-sm text-stone-500">
          Two experts, one mission: your success
        </p>
      </motion.div>

      {/* Executive tabs */}
      <div className="mb-4 flex gap-2">
        {executives.map(({ key, data }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveExec(key)}
            className={`flex flex-1 items-center gap-3 rounded-xl border-2 p-3 transition-all duration-200 ${
              activeExec === key
                ? "border-stone-900 bg-stone-50"
                : "border-transparent bg-stone-50 hover:bg-stone-100"
            }`}
          >
            {data.avatar && (
              <div className="relative size-10 overflow-hidden rounded-full">
                <Image
                  src={data.avatar}
                  alt={data.name}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
            )}
            <div className="text-left">
              <p className="font-semibold text-sm text-stone-900">
                {data.name.split(" ")[0]}
              </p>
              <p className="text-xs text-stone-400">
                {data.role.split(" ")[0]}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Executive detail card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeExec}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="mb-6 overflow-hidden rounded-xl border border-stone-200"
        >
          {/* Executive header with gradient */}
          <div className={`bg-gradient-to-r ${currentExec.color} px-5 py-4`}>
            <div className="flex items-center gap-4">
              {currentExec.avatar && (
                <div className="relative size-14 overflow-hidden rounded-xl border-2 border-white/20 shadow-lg">
                  <Image
                    src={currentExec.avatar}
                    alt={currentExec.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
              )}
              <div>
                <h3 className="font-bold text-white">{currentExec.name}</h3>
                <p className="text-sm text-white/70">{currentExec.role}</p>
              </div>
            </div>
          </div>

          {/* Executive info */}
          <div className="bg-white p-4">
            <p className="mb-3 text-sm leading-relaxed text-stone-600">
              {currentExec.personality}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {currentExec.expertise.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-600"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* CTA */}
      <Button
        onClick={onNext}
        className="group h-11 w-full bg-stone-900 font-semibold text-white transition-all hover:bg-stone-800"
      >
        Continue
        <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" />
      </Button>

      {/* Skip */}
      <button
        type="button"
        onClick={onSkip}
        disabled={isSaving}
        className="mt-3 text-center text-sm text-stone-400 transition-colors hover:text-stone-600 disabled:opacity-50"
      >
        {isSaving ? "Saving..." : "Skip for now"}
      </button>
    </motion.div>
  );
}

function ProfileStep({
  displayName,
  setDisplayName,
  companyName,
  setCompanyName,
  industry,
  setIndustry,
  onSubmit,
  onSkip,
  isSaving,
}: {
  displayName: string;
  setDisplayName: (value: string) => void;
  companyName: string;
  setCompanyName: (value: string) => void;
  industry: string;
  setIndustry: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSkip: () => void;
  isSaving: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="relative flex flex-col px-8 pt-6 pb-8"
    >
      <VisuallyHidden.Root>
        <DialogTitle>Tell Us About Yourself</DialogTitle>
        <DialogDescription>
          Help us personalize your experience
        </DialogDescription>
      </VisuallyHidden.Root>

      {/* Header with icon */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center gap-4"
      >
        <div className="flex size-11 items-center justify-center rounded-xl bg-stone-100">
          <Briefcase className="size-5 text-stone-600" />
        </div>
        <div>
          <h2 className="font-bold text-lg tracking-tight text-stone-900">
            About you
          </h2>
          <p className="text-sm text-stone-500">
            So we can personalize your experience
          </p>
        </div>
      </motion.div>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Name */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-1.5"
        >
          <Label
            htmlFor="displayName"
            className="font-medium text-sm text-stone-700"
          >
            Your Name <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="displayName"
            placeholder="How should we address you?"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="h-11 border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:ring-stone-400/20"
            autoFocus
            required
          />
        </motion.div>

        {/* Company */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-1.5"
        >
          <Label
            htmlFor="companyName"
            className="font-medium text-sm text-stone-700"
          >
            Company{" "}
            <span className="font-normal text-stone-400 text-xs">
              (optional)
            </span>
          </Label>
          <Input
            id="companyName"
            placeholder="Your company or business name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="h-11 border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:ring-stone-400/20"
          />
        </motion.div>

        {/* Industry */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-1.5"
        >
          <Label
            htmlFor="industry"
            className="font-medium text-sm text-stone-700"
          >
            Industry{" "}
            <span className="font-normal text-stone-400 text-xs">
              (optional)
            </span>
          </Label>
          <Select value={industry} onValueChange={setIndustry}>
            <SelectTrigger
              id="industry"
              className="h-11 border-stone-200 bg-white text-stone-900 focus:border-stone-400 focus:ring-stone-400/20"
            >
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent className="border-stone-200 bg-white">
              {INDUSTRIES.map((ind) => (
                <SelectItem
                  key={ind}
                  value={ind}
                  className="text-stone-700 focus:bg-stone-50 focus:text-stone-900"
                >
                  {ind}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Continue */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="pt-2"
        >
          <Button
            type="submit"
            className="group h-11 w-full bg-stone-900 font-semibold text-white transition-all hover:bg-stone-800 disabled:opacity-50"
            disabled={!displayName.trim()}
          >
            Continue
            <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </motion.div>
      </form>

      {/* Skip */}
      <button
        type="button"
        onClick={onSkip}
        disabled={isSaving}
        className="mt-3 text-center text-sm text-stone-400 transition-colors hover:text-stone-600 disabled:opacity-50"
      >
        {isSaving ? "Saving..." : "Skip for now"}
      </button>
    </motion.div>
  );
}

function BusinessProfileStep({
  productsServices,
  setProductsServices,
  websiteUrl,
  setWebsiteUrl,
  targetMarket,
  setTargetMarket,
  competitors,
  setCompetitors,
  businessGoals,
  setBusinessGoals,
  annualRevenue,
  setAnnualRevenue,
  yearsInBusiness,
  setYearsInBusiness,
  employeeCount,
  setEmployeeCount,
  onSubmit,
  onSkip,
  isSaving,
}: {
  productsServices: string;
  setProductsServices: (value: string) => void;
  websiteUrl: string;
  setWebsiteUrl: (value: string) => void;
  targetMarket: string;
  setTargetMarket: (value: string) => void;
  competitors: string;
  setCompetitors: (value: string) => void;
  businessGoals: string;
  setBusinessGoals: (value: string) => void;
  annualRevenue: string;
  setAnnualRevenue: (value: string) => void;
  yearsInBusiness: string;
  setYearsInBusiness: (value: string) => void;
  employeeCount: string;
  setEmployeeCount: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onSkip: () => void;
  isSaving: boolean;
}) {
  const inputClass =
    "h-11 border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:ring-stone-400/20";

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="relative flex flex-col px-8 pt-6 pb-8"
    >
      <VisuallyHidden.Root>
        <DialogTitle>Tell Us About Your Business</DialogTitle>
        <DialogDescription>
          Help your executives understand your business
        </DialogDescription>
      </VisuallyHidden.Root>

      {/* Header with icon */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center gap-4"
      >
        <div className="flex size-11 items-center justify-center rounded-xl bg-rose-100">
          <Building2 className="size-5 text-rose-600" />
        </div>
        <div>
          <h2 className="font-bold text-lg tracking-tight text-stone-900">
            Your business
          </h2>
          <p className="text-sm text-stone-500">
            The more we know, the better we advise
          </p>
        </div>
      </motion.div>

      <form onSubmit={onSubmit} className="flex flex-col">
        <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">
          {/* Products/Services */}
          <div className="space-y-1.5">
            <Label
              htmlFor="productsServices"
              className="font-medium text-sm text-stone-700"
            >
              Products / Services{" "}
              <span className="font-normal text-stone-400 text-xs">
                (optional)
              </span>
            </Label>
            <Textarea
              id="productsServices"
              placeholder="What does your business offer?"
              value={productsServices}
              onChange={(e) => setProductsServices(e.target.value)}
              className="min-h-[72px] resize-none border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:ring-stone-400/20"
            />
          </div>

          {/* Website */}
          <div className="space-y-1.5">
            <Label
              htmlFor="websiteUrl"
              className="font-medium text-sm text-stone-700"
            >
              Website{" "}
              <span className="font-normal text-stone-400 text-xs">
                (optional)
              </span>
            </Label>
            <Input
              id="websiteUrl"
              type="url"
              placeholder="https://yourcompany.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Target Market */}
          <div className="space-y-1.5">
            <Label
              htmlFor="targetMarket"
              className="font-medium text-sm text-stone-700"
            >
              Target Market{" "}
              <span className="font-normal text-stone-400 text-xs">
                (optional)
              </span>
            </Label>
            <Input
              id="targetMarket"
              placeholder="Who are your ideal customers?"
              value={targetMarket}
              onChange={(e) => setTargetMarket(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Competitors */}
          <div className="space-y-1.5">
            <Label
              htmlFor="competitors"
              className="font-medium text-sm text-stone-700"
            >
              Competitors{" "}
              <span className="font-normal text-stone-400 text-xs">
                (optional)
              </span>
            </Label>
            <Input
              id="competitors"
              placeholder="Key competitors or alternatives"
              value={competitors}
              onChange={(e) => setCompetitors(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Business Goals */}
          <div className="space-y-1.5">
            <Label
              htmlFor="businessGoals"
              className="font-medium text-sm text-stone-700"
            >
              Business Goals{" "}
              <span className="font-normal text-stone-400 text-xs">
                (optional)
              </span>
            </Label>
            <Textarea
              id="businessGoals"
              placeholder="What are you trying to achieve?"
              value={businessGoals}
              onChange={(e) => setBusinessGoals(e.target.value)}
              className="min-h-[72px] resize-none border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:ring-stone-400/20"
            />
          </div>

          {/* Dropdowns row */}
          <div className="grid grid-cols-3 gap-3">
            {/* Annual Revenue */}
            <div className="space-y-1.5">
              <Label className="font-medium text-xs text-stone-700">
                Revenue
              </Label>
              <Select value={annualRevenue} onValueChange={setAnnualRevenue}>
                <SelectTrigger className="h-10 border-stone-200 bg-white text-sm text-stone-900 focus:border-stone-400 focus:ring-stone-400/20">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="border-stone-200 bg-white">
                  {REVENUE_RANGES.map((range) => (
                    <SelectItem
                      key={range}
                      value={range}
                      className="text-stone-700 focus:bg-stone-50 focus:text-stone-900"
                    >
                      {range}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Years in Business */}
            <div className="space-y-1.5">
              <Label className="font-medium text-xs text-stone-700">
                Years
              </Label>
              <Select
                value={yearsInBusiness}
                onValueChange={setYearsInBusiness}
              >
                <SelectTrigger className="h-10 border-stone-200 bg-white text-sm text-stone-900 focus:border-stone-400 focus:ring-stone-400/20">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="border-stone-200 bg-white">
                  {YEARS_IN_BUSINESS_RANGES.map((range) => (
                    <SelectItem
                      key={range}
                      value={range}
                      className="text-stone-700 focus:bg-stone-50 focus:text-stone-900"
                    >
                      {range}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee Count */}
            <div className="space-y-1.5">
              <Label className="font-medium text-xs text-stone-700">Team</Label>
              <Select value={employeeCount} onValueChange={setEmployeeCount}>
                <SelectTrigger className="h-10 border-stone-200 bg-white text-sm text-stone-900 focus:border-stone-400 focus:ring-stone-400/20">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent className="border-stone-200 bg-white">
                  {EMPLOYEE_COUNT_RANGES.map((range) => (
                    <SelectItem
                      key={range}
                      value={range}
                      className="text-stone-700 focus:bg-stone-50 focus:text-stone-900"
                    >
                      {range}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="mt-5">
          <Button
            type="submit"
            className="h-11 w-full bg-stone-900 font-semibold text-white transition-all hover:bg-stone-800 disabled:opacity-50"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Setting up...
              </>
            ) : (
              "Get Started"
            )}
          </Button>
        </div>
      </form>

      {/* Skip */}
      <button
        type="button"
        onClick={onSkip}
        disabled={isSaving}
        className="mt-3 text-center text-sm text-stone-400 transition-colors hover:text-stone-600 disabled:opacity-50"
      >
        {isSaving ? "Saving..." : "Skip for now"}
      </button>
    </motion.div>
  );
}

function SuccessStep({ displayName }: { displayName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex flex-col items-center px-8 py-12"
    >
      <VisuallyHidden.Root>
        <DialogTitle>Welcome Complete</DialogTitle>
        <DialogDescription>Your executive team is ready</DialogDescription>
      </VisuallyHidden.Root>

      {/* Success animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
        className="relative mb-6"
      >
        <div className="flex size-20 items-center justify-center rounded-full bg-emerald-500 shadow-lg">
          <motion.svg
            className="size-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </motion.svg>
        </div>
        <div className="absolute -inset-3 -z-10 rounded-full bg-emerald-500/10 blur-xl" />
      </motion.div>

      {/* Welcome message */}
      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-2 text-center font-bold text-xl tracking-tight text-stone-900"
      >
        Welcome, {displayName}!
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6 text-center text-stone-500"
      >
        Your executive advisors are ready.
      </motion.p>

      {/* Executive avatars with check badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center justify-center gap-4"
      >
        {[
          { exec: alexandria, delay: 0.5 },
          { exec: kim, delay: 0.6 },
        ].map(({ exec, delay }) =>
          exec.avatar ? (
            <div key={exec.name} className="relative">
              <div className="relative size-14 overflow-hidden rounded-full border-2 border-white shadow-lg ring-2 ring-stone-100">
                <Image
                  src={exec.avatar}
                  alt={exec.name}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay }}
                className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white"
              >
                <svg
                  className="size-3 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </motion.div>
            </div>
          ) : null,
        )}
      </motion.div>
    </motion.div>
  );
}
