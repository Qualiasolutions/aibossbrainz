"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";

const PasswordInput = React.forwardRef<
	HTMLInputElement,
	Omit<React.ComponentProps<"input">, "type">
>(({ className, ...props }, ref) => {
	const [showPassword, setShowPassword] = React.useState(false);

	return (
		<div className="relative">
			<Input
				type={showPassword ? "text" : "password"}
				className={cn("pr-10", className)}
				ref={ref}
				{...props}
			/>
			<button
				type="button"
				className="absolute right-0 top-0 flex h-full items-center px-3 text-stone-400 transition-colors hover:text-stone-600"
				onClick={() => setShowPassword((prev) => !prev)}
				aria-label={showPassword ? "Hide password" : "Show password"}
				tabIndex={-1}
			>
				{showPassword ? (
					<EyeOff className="size-4" />
				) : (
					<Eye className="size-4" />
				)}
			</button>
		</div>
	);
});
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
