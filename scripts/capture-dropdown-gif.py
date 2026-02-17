#!/usr/bin/env python3
"""
Capture profile dropdown GIF from the actual app.
Creates a test user and captures high-quality screenshots.
"""

from playwright.sync_api import sync_playwright
import secrets
import time
import os

OUTPUT_DIR = "/home/qualia/Desktop/Projects/aiagents/aibossbrainz/docs/demo/gifs"


def capture_dropdown():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=100)
        context = browser.new_context(
            viewport={'width': 1400, 'height': 900},
            record_video_dir=OUTPUT_DIR
        )
        page = context.new_page()

        # Generate test user
        random_suffix = secrets.token_hex(4)
        email = f"gif-demo-{random_suffix}@test.com"
        password = "GifDemo123!"

        print(f"Creating test user: {email}")

        # Go to signup
        page.goto("http://localhost:3000/signup")
        time.sleep(2)

        # Fill signup form
        page.locator('input[name="email"]').fill(email)
        page.locator('input[name="password"]').fill(password)

        # Submit
        page.locator('button:has-text("Create Account"), button[type="submit"]').click()
        time.sleep(2)

        # Check if we need to confirm email (skip for demo)
        # Instead, let's go directly to /new which should trigger auth redirect
        page.goto("http://localhost:3000/new")
        time.sleep(3)

        print(f"Current URL: {page.url}")

        # If redirected to login, we need a different approach
        if "login" in page.url or "signup" in page.url:
            print("Auth required - trying direct navigation with manual auth...")
            print("\n=== MANUAL AUTH REQUIRED ===")
            print("1. Complete the signup/login in the browser")
            print("2. Press Enter here when you see the chat interface")
            input()

        # Now we should be in the app
        print("Looking for sidebar...")

        # Click sidebar toggle if needed
        try:
            sidebar_toggle = page.locator('[data-testid="sidebar-toggle-button"]')
            if sidebar_toggle.is_visible(timeout=3000):
                print("Opening sidebar...")
                sidebar_toggle.click()
                time.sleep(0.5)
        except:
            print("Sidebar already open or no toggle found")

        # Find user nav
        print("Looking for user nav button...")
        user_nav = page.locator('[data-testid="user-nav-button"]')

        if not user_nav.is_visible(timeout=5000):
            print("User nav not found - taking debug screenshot")
            page.screenshot(path=f"{OUTPUT_DIR}/debug-state.png")
            browser.close()
            return

        # Capture sequence for GIF
        frames = []
        frame_dir = OUTPUT_DIR
        os.makedirs(frame_dir, exist_ok=True)

        frame_count = 0

        # Helper to capture frame
        def capture():
            nonlocal frame_count
            path = f"{frame_dir}/f{frame_count:03d}.png"
            page.screenshot(path=path)
            frames.append(path)
            frame_count += 1

        # 1. Initial state (3 frames)
        for _ in range(3):
            capture()
            time.sleep(0.15)

        # 2. Click user nav
        print("Clicking user nav...")
        user_nav.click()
        time.sleep(0.4)

        # 3. Dropdown opening (4 frames)
        for _ in range(4):
            capture()
            time.sleep(0.1)

        # 4. Get menu items and hover each
        menu = page.locator('[data-testid="user-nav-menu"]')
        menu_items = menu.locator('a, button')
        count = menu_items.count()
        print(f"Found {count} menu items")

        for i in range(count):
            item = menu_items.nth(i)
            text = item.inner_text()
            print(f"Hovering item {i}: {text[:30]}...")

            # Hover in (2 frames)
            item.hover()
            capture()
            time.sleep(0.1)
            capture()
            time.sleep(0.15)

            # Hold hover (2 frames)
            capture()
            time.sleep(0.1)
            capture()
            time.sleep(0.1)

        print(f"\nCaptured {len(frames)} frames")
        print(f"Frames saved to {frame_dir}/")

        browser.close()

        return frames


if __name__ == "__main__":
    capture_dropdown()
