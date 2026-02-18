import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import {
	type Browser,
	type BrowserContext,
	chromium,
	type Page,
} from "playwright";

const OUTPUT_DIR =
	"/home/qualia/Desktop/Projects/aiagents/aibossbrainz/docs/demo/gifs";
const GIF_PATH = join(OUTPUT_DIR, "profile-dropdown.gif");

// Ensure output directory exists
mkdirSync(OUTPUT_DIR, { recursive: true });

async function captureDropdownGif(): Promise<void> {
	let browser: Browser | null = null;
	let context: BrowserContext | null = null;

	try {
		console.log("Launching browser...");
		browser = await chromium.launch({
			headless: false,
			args: ["--window-size=1200,800"],
		});

		context = await browser.newContext({
			viewport: { width: 1200, height: 800 },
			recordVideo: {
				dir: OUTPUT_DIR,
				size: { width: 1200, height: 800 },
			},
		});

		const page = await context.newPage();

		console.log("Navigating to app...");
		await page.goto("http://localhost:3000", { waitUntil: "networkidle" });

		// Wait for auth redirect to login
		await page.waitForTimeout(2000);

		// Check if we're on login page and need to authenticate
		const currentUrl = page.url();
		console.log("Current URL:", currentUrl);

		if (currentUrl.includes("/login")) {
			console.log("On login page - looking for dev auth bypass...");
			// Try to use guest access
			await page
				.click(
					'button:has-text("Continue as Guest"), a:has-text("Continue as Guest")',
					{ timeout: 5000 },
				)
				.catch(() => {
					console.log("No guest button found, trying other login methods...");
				});
			await page.waitForTimeout(2000);
		}

		// Wait for main app to load
		await page.waitForTimeout(3000);

		console.log("Looking for user nav button...");
		// Find and click the user nav button (avatar + email)
		const userNavButton = page.locator('[data-testid="user-nav-button"]');
		await userNavButton.waitFor({ state: "visible", timeout: 10000 });
		console.log("User nav button found");

		// Get a screenshot before dropdown opens
		console.log("Taking screenshot before dropdown...");
		await page.screenshot({ path: join(OUTPUT_DIR, "dropdown-closed.png") });

		// Click to open dropdown
		console.log("Clicking to open dropdown...");
		await userNavButton.click();

		// Wait for dropdown menu to appear
		const dropdownMenu = page.locator('[data-testid="user-nav-menu"]');
		await dropdownMenu.waitFor({ state: "visible", timeout: 5000 });
		console.log("Dropdown menu opened");

		// Wait a bit for animations
		await page.waitForTimeout(500);

		// Take screenshot of open dropdown
		console.log("Taking screenshot of open dropdown...");
		await page.screenshot({ path: join(OUTPUT_DIR, "dropdown-open.png") });

		// Highlight each menu item with a delay
		const menuItems = await dropdownMenu.locator("a, button").all();
		console.log(`Found ${menuItems.length} menu items`);

		for (let i = 0; i < menuItems.length; i++) {
			const item = menuItems[i];
			await item.hover();
			await page.waitForTimeout(800);
			await page.screenshot({
				path: join(OUTPUT_DIR, `dropdown-item-${i}.png`),
			});
		}

		console.log("Screenshots captured successfully!");
		console.log(`\nScreenshots saved to ${OUTPUT_DIR}:`);
		console.log(`- dropdown-closed.png`);
		console.log(`- dropdown-open.png`);
		console.log(
			`- dropdown-item-0.png to dropdown-item-${menuItems.length - 1}.png`,
		);
		console.log("\nTo create a GIF, use ffmpeg like:");
		console.log(
			`ffmpeg -framerate 2 -i ${OUTPUT_DIR}/dropdown-item-%d.png -vf "scale=600:-1" ${GIF_PATH}`,
		);
	} catch (error) {
		console.error("Error capturing dropdown:", error);
		throw error;
	} finally {
		if (context) {
			await context.close();
		}
		if (browser) {
			await browser.close();
		}
	}
}

captureDropdownGif().catch(console.error);
