#!/usr/bin/env python3
"""
Capture the Subscription page showing upgrade options.
You log in, script navigates to /subscription and captures the plans.
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
        viewport={'width': 1400, 'height': 1000},
        device_scale_factor=1
    )
    page = context.new_page()

    print("=" * 60)
    print(" BROWSER OPENING - PLEASE LOG IN ")
    print("=" * 60)
    print("1. A browser window will open")
    print("2. Log in to your account")
    print("3. Press Enter here when you're logged in")
    print("=" * 60)

    page.goto('http://localhost:3000')

    # Wait for manual login
    input("\nPress Enter after you've logged in...")

    print("\nNavigating to Subscription page...")
    page.goto('http://localhost:3000/subscription')
    time.sleep(2)

    class CaptureState:
        count = 0

    def capture():
        path = f'{OUTPUT_DIR}/f{CaptureState.count:03d}.png'
        page.screenshot(path=path)
        CaptureState.count += 1
        return path

    # 1. Initial page load
    print("1. Capturing initial page...")
    for _ in range(3):
        capture()
        time.sleep(0.15)

    # 2. Scroll down slowly to show all plans
    print("2. Scrolling to show plans...")
    for i in range(5):
        page.evaluate(f'window.scrollBy(0, {150 + i*50})')
        time.sleep(0.3)
        capture()

    # 3. Find plan cards and hover each one
    print("3. Hovering over plan cards...")
    plan_cards = page.locator('.border, .rounded-xl, [class*="plan"], [class*="card"]').all()
    print(f"   Found {len(plan_cards)} potential cards")

    # Try to find pricing/plan elements
    selectors = [
        '[class*="plan"]',
        '[class*="pricing"]',
        '[class*="tier"]',
        'article',
        '.border.rounded',
        '.rounded-xl.border'
    ]

    all_elements = []
    for sel in selectors:
        try:
            elems = page.locator(sel).all()
            if elems:
                all_elements.extend(elems)
        except:
            pass

    print(f"   Found {len(all_elements)} elements to check")

    # Hover over elements that look like plan cards
    hovered = set()
    for i, elem in enumerate(all_elements):
        try:
            # Get bounding box to check if it's visible and large enough
            box = elem.bounding_box()
            if box and box['height'] > 100 and box['width'] > 100:
                # Check if already hovered (avoid duplicates)
                elem_id = f"{box['x']}_{box['y']}"
                if elem_id not in hovered:
                    hovered.add(elem_id)
                    print(f"   Hovering element {i+1}...")
                    elem.hover()
                    time.sleep(0.4)
                    capture()
                    time.sleep(0.2)
                    capture()
                    if len(hovered) >= 6:  # Limit to 6 hovers
                        break
        except:
            pass

    # 4. Final overview - scroll back to top
    print("4. Scrolling back to top...")
    page.evaluate('window.scrollTo(0, 0)')
    time.sleep(0.5)
    for _ in range(3):
        capture()
        time.sleep(0.15)

    print(f"\nCaptured {CaptureState.count} frames!")
    browser.close()

# Create GIF
print("\n5. Creating GIF...")
result = subprocess.run([
    'ffmpeg', '-framerate', '5',
    '-i', f'{OUTPUT_DIR}/f%03d.png',
    '-vf', 'scale=1000:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse',
    '-y', f'{OUTPUT_DIR}/subscription-page.gif'
], capture_output=True, text=True)

if result.returncode == 0:
    # Clean up frames
    for f in os.listdir(OUTPUT_DIR):
        if f.startswith('f') and f.endswith('.png'):
            os.remove(os.path.join(OUTPUT_DIR, f))
    print(f"\n✓ GIF created: {OUTPUT_DIR}/subscription-page.gif")
    print("✓ Frame files cleaned up")
else:
    print("FFmpeg error:", result.stderr)
