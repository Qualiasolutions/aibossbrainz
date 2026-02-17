#!/usr/bin/env python3
"""
Full flow: Click profile menu -> Select Subscription -> Show subscription page -> Hover 3 plans
"""

from playwright.sync_api import sync_playwright
import time
import os
import subprocess

OUTPUT_DIR = "/home/qualia/Desktop/Projects/aiagents/aibossbrainz/docs/demo/gifs"
PROD_URL = "https://bossbrainz.aleccimedia.com"

# Clean up old files
for f in os.listdir(OUTPUT_DIR):
    if f.endswith('.png'):
        os.remove(os.path.join(OUTPUT_DIR, f))

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=False,
        slow_mo=200,
        args=['--force-device-scale-factor=1']
    )
    context = browser.new_context(
        viewport={'width': 1400, 'height': 900},
        device_scale_factor=1
    )
    page = context.new_page()

    # Inject CSS to hide email, chat history, and other sensitive info
    hide_css = """
        [data-testid="user-email"] {
            visibility: hidden !important;
        }
        /* Hide sidebar chat history */
        [data-testid="chat-history"], .chat-history, #chat-history {
            visibility: hidden !important;
        }
        /* Hide all chat list items in sidebar */
        [data-testid^="sidebar-history"], [class*="sidebar-history"] {
            display: none !important;
        }
    """

    print("=" * 60)
    print(" OPENING PRODUCTION SITE ")
    print("=" * 60)
    print("1. A browser window will open")
    print("2. Make sure you're logged in")
    print("3. Press Enter when ready")
    print("=" * 60)

    page.goto(f'{PROD_URL}/new')

    # Inject the hiding CSS
    page.add_init_script(hide_css)

    input("\nPress Enter when you see the app and you're logged in...")

    # Re-inject CSS after page load
    page.evaluate(f"() => {{ const style = document.createElement('style'); style.textContent = `{hide_css}`; document.head.appendChild(style); }}")

    class CaptureState:
        count = 0

    def capture():
        path = f'{OUTPUT_DIR}/f{CaptureState.count:03d}.png'
        page.screenshot(path=path)
        CaptureState.count += 1
        return path

    # === PART 1: Open Profile Dropdown ===
    print("\n=== PART 1: Opening Profile Dropdown ===")

    # Find and open sidebar if needed
    try:
        sidebar_toggle = page.locator('[data-testid="sidebar-toggle-button"]')
        if sidebar_toggle.is_visible(timeout=2000):
            sidebar_toggle.click()
            time.sleep(0.5)
    except:
        pass

    user_nav = page.locator('[data-testid="user-nav-button"]')
    if not user_nav.is_visible(timeout=3000):
        print("ERROR: User nav not found!")
        browser.close()
        exit(1)

    # Capture before clicking
    print("1. Capturing before dropdown...")
    for _ in range(2):
        capture()
        time.sleep(1)

    # Click dropdown
    print("2. Clicking dropdown...")
    user_nav.click()
    time.sleep(1.5)

    # Dropdown open
    for _ in range(4):
        capture()
        time.sleep(0.8)

    # === PART 2: Hover Subscription Option ===
    print("\n=== PART 2: Hovering Subscription Option ===")

    menu = page.locator('[data-testid="user-nav-menu"]')
    menu_items = menu.locator('a')

    # Find the Subscription link
    subscription_link = None
    for i in range(menu_items.count()):
        item = menu_items.nth(i)
        text = item.inner_text()
        if "subscription" in text.lower():
            subscription_link = item
            print(f"Found Subscription link: {text}")
            break

    if not subscription_link:
        print("ERROR: Subscription link not found in menu!")
        print("Available options:")
        for i in range(menu_items.count()):
            print(f"  - {menu_items.nth(i).inner_text()}")
        browser.close()
        exit(1)

    # Hover over Subscription
    print("3. Hovering Subscription option...")
    for _ in range(5):
        subscription_link.hover()
        time.sleep(1)
        capture()

    # === PART 3: Click and Navigate to Subscription Page ===
    print("\n=== PART 3: Clicking Subscription...")

    subscription_link.click()
    time.sleep(3)  # Wait for navigation

    print("4. On subscription page, capturing initial view...")
    for _ in range(3):
        capture()
        time.sleep(1)

    # === PART 4: Scroll to show all plans ===
    print("\n=== PART 4: Scrolling to show all plans ===")

    # Scroll down slowly
    for i in range(6):
        page.evaluate(f'window.scrollBy(0, {100 + i*30})')
        time.sleep(1.2)
        capture()

    # === PART 5: Hover Over Each Plan Card ===
    print("\n=== PART 5: Hovering Over Plan Cards ===")

    # Find plan cards - they should have pricing info
    plan_cards = page.locator('div:has-text("$"), article, .border.rounded-xl, [class*="plan"]').all()

    # Filter to likely plan cards
    actual_plans = []
    seen_positions = set()
    for card in plan_cards:
        try:
            text = card.inner_text()
            # Check if it looks like a plan card
            if '$' in text and ('month' in text.lower() or 'year' in text.lower() or 'trial' in text.lower() or 'plan' in text.lower()):
                # Get position to avoid duplicates
                box = card.bounding_box()
                if box:
                    pos_key = f"{int(box['y'])}"
                    if pos_key not in seen_positions:
                        seen_positions.add(pos_key)
                        actual_plans.append(card)
                        lines = text.strip().split('\n')
                        plan_name = lines[0][:30] if lines else "Unknown"
                        print(f"Found plan: {plan_name}")
        except:
            pass

    print(f"5. Hovering over {min(len(actual_plans), 3)} plan cards...")

    for i, plan in enumerate(actual_plans[:3]):  # Max 3 plans
        print(f"   Plan {i+1}...")
        try:
            # Scroll into view if needed
            plan.scroll_into_view_if_needed()
            time.sleep(1.5)

            # Hover with multiple frames
            for _ in range(4):
                plan.hover()
                time.sleep(1)
                capture()

            # Hold hover
            capture()
            time.sleep(1)
        except Exception as e:
            print(f"   Error hovering plan {i+1}: {e}")

    # Final frame
    capture()

    print(f"\n✓ Captured {CaptureState.count} frames total!")
    browser.close()

# === CREATE GIF ===
print("\n=== CREATING GIF ===")
result = subprocess.run([
    'ffmpeg', '-framerate', '3',
    '-i', f'{OUTPUT_DIR}/f%03d.png',
    '-vf', 'scale=1100:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse',
    '-y', f'{OUTPUT_DIR}/subscription-flow.gif'
], capture_output=True, text=True)

if result.returncode == 0:
    # Clean up frames
    for f in os.listdir(OUTPUT_DIR):
        if f.startswith('f') and f.endswith('.png'):
            os.remove(os.path.join(OUTPUT_DIR, f))
    print(f"\n✓ GIF created: {OUTPUT_DIR}/subscription-flow.gif")
    print("✓ Frame files cleaned up")
    print("\nDone!")
else:
    print("FFmpeg error:", result.stderr)

if result.returncode == 0:
    # Clean up frames
    for f in os.listdir(OUTPUT_DIR):
        if f.startswith('f') and f.endswith('.png'):
            os.remove(os.path.join(OUTPUT_DIR, f))
    print(f"\n✓ GIF created: {OUTPUT_DIR}/subscription-flow.gif")
    print("✓ Frame files cleaned up")
    print("\nDone!")
else:
    print("FFmpeg error:", result.stderr)
