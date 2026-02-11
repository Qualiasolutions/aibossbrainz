import Form from "next/form";

import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function AuthForm({
  action,
  children,
  defaultEmail = "",
  className,
}: {
  action: NonNullable<
    string | ((formData: FormData) => void | Promise<void>) | undefined
  >;
  children: React.ReactNode;
  defaultEmail?: string;
  className?: string;
}) {
  return (
    <Form action={action} className={cn("flex flex-col gap-5", className)}>
      <div className="flex flex-col gap-2">
        <Label className="font-medium text-stone-700 text-sm" htmlFor="email">
          Email
        </Label>

        <Input
          autoComplete="email"
          autoFocus
          className="h-11 border-stone-200 bg-white focus:border-stone-400 focus:ring-stone-400"
          defaultValue={defaultEmail}
          id="email"
          name="email"
          placeholder="you@company.com"
          required
          type="email"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label
          className="font-medium text-stone-700 text-sm"
          htmlFor="password"
        >
          Password
        </Label>

        <Input
          autoComplete="current-password"
          className="h-11 border-stone-200 bg-white focus:border-stone-400 focus:ring-stone-400"
          id="password"
          name="password"
          placeholder="Enter your password"
          required
          type="password"
        />
      </div>

      {children}
    </Form>
  );
}
