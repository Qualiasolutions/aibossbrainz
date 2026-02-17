#!/usr/bin/env python3
"""
Manual capture - you log in, script captures the dropdown.
Run this, a browser will open. Log in to your account, then press Enter in terminal.
"""

from playwright.sync_api import sync_playwright
import time
import os
import subprocess

OUTPUT_DIR = "/home/qualia/Desktop/Projects/aiagents/aibossbrainz/docs/demo/gifs"

# Clean up old files
for f in os.listdir(OUTPUT_DIR):
    if f.endswith('.png'):
        os.remove(os.path.join(OUTPUT_DIR, f))

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=False,
        slow_mo=50,
        args=['--force-device-scale-factor=1']
    )
    context = browser.new_context(
        viewport={'width': 1400, 'height': 900},
        device_scale_factor=1
    )
    page = context.new_page()

    # Open the app - will redirect to login
    print("=" * 60)
    print(" BROWSER OPENING - PLEASE LOG IN ")
    print("=" * 60)
    print("1. A browser window will open")
    print("2. Log in to your account")
    print("3. Make sure you see the chat interface with sidebar")
    print("4. Come back here and press Enter")
    print("=" * 60)

    page.goto('http://localhost:3000/new')

    # Wait for manual login
    input("\nPress Enter after you've logged in and see the chat interface...")

    print("\nGreat! Now capturing the dropdown...")

    # Give it a moment to settle
    time.sleep(1)

    # Find user nav
    user_nav = page.locator('[data-testid="user-nav-button"]')
    if not user_nav.is_visible(timeout=5000):
        print("ERROR: User nav not found! Is the sidebar visible?")
        print("Taking debug screenshot...")
        page.screenshot(path=f'{OUTPUT_DIR}/debug-error.png', full_page=True)
        browser.close()
        exit(1)

    class CaptureState:
        count = 0

    def capture():
        path = f'{OUTPUT_DIR}/f{CaptureState.count:03d}.png'
        page.screenshot(path=path)
        CaptureState.count += 1
        return path

    # 1. Initial closed state (sidebar visible, user nav at bottom)
    print("1. Capturing closed state...")
    for _ in range(3):
        capture()
        time.sleep(0.1)

    # 2. Click to open dropdown
    print("2. Opening dropdown...")
    user_nav.click()
    time.sleep(0.4)

    # 3. Dropdown just opened
    for _ in range(4):
        capture()
        time.sleep(0.08)

    # 4. Hover each menu item slowly
    menu = page.locator('[data-testid="user-nav-menu"]')
    menu_items = menu.locator('a, button')
    count = menu_items.count()
    print(f"3. Hovering {count} menu items...")

    for i in range(count):
        item = menu_items.nth(i)
        text = item.inner_text().strip()
        print(f"   - {text}")

        # Hover with pause
        item.hover()
        time.sleep(0.2)
        capture()
        time.sleep(0.15)
        capture()

    # Final frame
    capture()

    print(f"\nCaptured {CaptureState.count} frames!")
    browser.close()

# Create high-quality GIF
print("\n4. Creating GIF...")
result = subprocess.run([
    'ffmpeg', '-framerate', '6',
    '-i', f'{OUTPUT_DIR}/f%03d.png',
    '-vf', 'scale=1000:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse',
    '-y', f'{OUTPUT_DIR}/profile-dropdown.gif'
], capture_output=True, text=True)

if result.returncode == 0:
    # Clean up frames
    for f in os.listdir(OUTPUT_DIR):
        if f.startswith('f') and f.endswith('.png'):
            os.remove(os.path.join(OUTPUT_DIR, f))
    print(f"\n✓ GIF created: {OUTPUT_DIR}/profile-dropdown.gif")
    print("✓ Frame files cleaned up")
else:
    print("FFmpeg error:", result.stderr)
