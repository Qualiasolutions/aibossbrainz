#!/usr/bin/env python3
"""Capture profile dropdown screenshot for demo GIF."""

from playwright.sync_api import sync_playwright
import time

OUTPUT_DIR = "/home/qualia/Desktop/Projects/aiagents/aibossbrainz/docs/demo/gifs"

def capture_dropdown():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            viewport={"width": 1200, "height": 800}
        )
        page = context.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:3000", wait_until="networkidle")

        # Wait for auth check
        time.sleep(2)

        # Check if on login page and use guest access
        if "login" in page.url:
            print("On login page - clicking guest access...")
            try:
                page.get_by_text("Continue as Guest").click()
                page.wait_for_load_state("networkidle")
            except:
                print("No guest button, trying alternative...")
                # Might need different auth approach

        time.sleep(2)

        print("Looking for user nav button...")
        # Wait for user nav button
        page.wait_for_selector('[data-testid="user-nav-button"]', state="visible", timeout=15000)

        # Screenshot before dropdown
        page.screenshot(path=f"{OUTPUT_DIR}/dropdown-closed.png")
        print("Screenshot saved: dropdown-closed.png")

        # Click to open dropdown
        print("Clicking user nav button...")
        page.click('[data-testid="user-nav-button"]')

        # Wait for dropdown menu
        page.wait_for_selector('[data-testid="user-nav-menu"]', state="visible", timeout=5000)
        time.sleep(0.5)  # Wait for animation

        # Screenshot with dropdown open
        page.screenshot(path=f"{OUTPUT_DIR}/dropdown-open.png")
        print("Screenshot saved: dropdown-open.png")

        # Hover over each menu item
        menu_items = page.locator('[data-testid="user-nav-menu"] a, [data-testid="user-nav-menu"] button')
        count = menu_items.count()
        print(f"Found {count} menu items")

        for i in range(count):
            item = menu_items.nth(i)
            item.hover()
            time.sleep(0.3)
            page.screenshot(path=f"{OUTPUT_DIR}/dropdown-item-{i}.png")
            print(f"Screenshot saved: dropdown-item-{i}.png")

        print("\nAll screenshots captured!")
        print(f"Saved to {OUTPUT_DIR}/")
        print("\nTo create GIF:")
        print(f"ffmpeg -framerate 3 -i {OUTPUT_DIR}/dropdown-item-%d.png -vf 'scale=600:-1:flags=lanczos' {OUTPUT_DIR}/profile-dropdown.gif")

        browser.close()

if __name__ == "__main__":
    capture_dropdown()
