#!/usr/bin/env python3
"""Simple capture script for the dropdown menu from /demo page."""

from playwright.sync_api import sync_playwright
import time
import os

OUTPUT_DIR = "/home/qualia/Desktop/Projects/aiagents/aibossbrainz/docs/demo/gifs"

# Clean up old files
for f in os.listdir(OUTPUT_DIR):
    if f.endswith('.png') and not f.startswith('profile-dropdown'):
        os.remove(os.path.join(OUTPUT_DIR, f))

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=False,
        slow_mo=50,
        args=['--force-device-scale-factor=1']  # Ensure crisp rendering
    )
    context = browser.new_context(
        viewport={'width': 1280, 'height': 800},
        device_scale_factor=1  # No scaling for sharp images
    )
    page = context.new_page()

    print("Navigating to demo page...")
    page.goto('http://localhost:3000/demo')
    time.sleep(2)

    # Find user nav
    user_nav = page.locator('[data-testid="user-nav-button"]')
    if not user_nav.is_visible(timeout=5000):
        print("ERROR: User nav not found!")
        page.screenshot(path=f'{OUTPUT_DIR}/error.png')
        browser.close()
        exit(1)

    class CaptureState:
        count = 0

    def capture():
        path = f'{OUTPUT_DIR}/f{CaptureState.count:03d}.png'
        page.screenshot(path=path)
        CaptureState.count += 1
        return path
        path = f'{OUTPUT_DIR}/f{frame_count:03d}.png'
        page.screenshot(path=path)
        frame_count += 1
        return path

    # 1. Initial closed state
    print("Capturing closed state...")
    for _ in range(2):
        capture()
        time.sleep(0.1)

    # 2. Click to open
    print("Clicking to open dropdown...")
    user_nav.click()
    time.sleep(0.3)

    # 3. Dropdown just opened
    for _ in range(3):
        capture()
        time.sleep(0.08)

    # 4. Hover each menu item
    menu = page.locator('[data-testid="user-nav-menu"]')
    menu_items = menu.locator('a, button')
    count = menu_items.count()
    print(f"Hovering {count} menu items...")

    for i in range(count):
        item = menu_items.nth(i)
        text = item.inner_text().strip()
        print(f"  {i+1}. {text}")

        item.hover()
        time.sleep(0.15)
        capture()
        time.sleep(0.1)
        capture()

    # 5. One final frame
    capture()

    print(f"\nCaptured {CaptureState.count} frames to {OUTPUT_DIR}/")
    browser.close()

# Create high-quality GIF
print("\nCreating GIF...")
import subprocess
result = subprocess.run([
    'ffmpeg', '-framerate', '8',
    '-i', f'{OUTPUT_DIR}/f%03d.png',
    '-vf', 'scale=1000:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse',
    '-y', f'{OUTPUT_DIR}/profile-dropdown.gif'
], capture_output=True, text=True)

if result.returncode == 0:
    print(f"GIF created: {OUTPUT_DIR}/profile-dropdown.gif")
    # Clean up frames
    for f in os.listdir(OUTPUT_DIR):
        if f.startswith('f') and f.endswith('.png'):
            os.remove(os.path.join(OUTPUT_DIR, f))
    print("Cleaned up frame files")
else:
    print("FFmpeg error:", result.stderr)
