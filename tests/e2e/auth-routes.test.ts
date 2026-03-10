import { expect, test } from "../fixtures";

test.describe("Auth Route Rendering", () => {
	test("login page renders server shell content", async ({ page }) => {
		await page.goto("/login");

		await expect(
			page.getByRole("heading", { name: "Welcome Back" }),
		).toBeVisible();
		await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
		await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
	});

	test("signup page renders selected plan copy", async ({ page }) => {
		await page.goto("/signup?plan=annual");

		await expect(
			page.getByRole("heading", { name: "Begin Your Journey" }),
		).toBeVisible();
		await expect(page.getByText("Get started with the")).toBeVisible();
		await expect(page.getByText("Annual")).toBeVisible();
	});

	test("forgot password page renders reset form", async ({ page }) => {
		await page.goto("/forgot-password");

		await expect(
			page.getByRole("heading", { name: "Reset Your Password" }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Send Reset Link" }),
		).toBeVisible();
	});

	test("reset password page renders new password form", async ({ page }) => {
		await page.goto("/reset-password");

		await expect(
			page.getByRole("heading", { name: "Create New Password" }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Reset Password" }),
		).toBeVisible();
	});

	test("reset password page renders invalid link state from query params", async ({
		page,
	}) => {
		await page.goto(
			"/reset-password?error=access_denied&error_description=Expired%20link",
		);

		await expect(
			page.getByRole("heading", { name: "Link Expired" }),
		).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Request New Link" }),
		).toBeVisible();
	});

	test("subscribe page renders selected plan details", async ({ page }) => {
		await page.goto("/subscribe?plan=lifetime");

		await expect(
			page.getByRole("heading", { name: "Start Your Journey" }),
		).toBeVisible();
		await expect(page.getByText("Lifetime")).toBeVisible();
		await expect(
			page.getByRole("button", { name: "Continue to payment" }),
		).toBeVisible();
	});
});
