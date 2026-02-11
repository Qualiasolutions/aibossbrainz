# Mailchimp 7-Day Trial Flow Setup Guide

This guide walks through the remaining Mailchimp UI tasks to complete the 7-Day Trial automation.

**Prerequisites:**
- Login to https://us5.admin.mailchimp.com
- Access to the "7-Day Trial Flow" Customer Journey
- The profile dropdown GIF: `docs/demo/gifs/profile-dropdown.gif` (443KB)

---

## Task 1: Upload & Embed GIF in Email 1

### Step 1.1: Upload GIF to Mailchimp Content Studio

1. Go to **Content** → **Content Studio** in the left sidebar
2. Click **Upload** (top right)
3. Select `profile-dropdown.gif` from your computer
4. Wait for upload to complete
5. Copy the **Image URL** (right-click image → Copy image URL)
   - Example format: `https://mcusercontent.com/xxxxx/images/xxxxx.gif`

### Step 1.2: Edit Email 1 in the Journey

1. Go to **Automations** → **Customer Journeys**
2. Open "7-Day Trial Flow" (or similar name)
3. Click on **Email 1** (Welcome Email) in the journey map
4. Click **Edit Email** or **Design Email**

### Step 1.3: Insert the GIF

1. In the email editor, find the section that says:
   > "You can manage or cancel your subscription anytime directly from your dashboard by clicking on account in the left-hand side."

2. Place your cursor AFTER this text
3. Click **Content** → **Image** block (or drag Image block)
4. Click **Browse** and select the uploaded GIF from Content Studio
5. Set image settings:
   - **Width:** 600px (or full width of content area)
   - **Alt text:** "How to find Account settings - click profile in bottom left"
   - **Link:** `https://bossbrainz.aleccimedia.com/login`

### Step 1.4: Add caption below GIF

Add a text block below the GIF:

> *Click your profile in the bottom-left corner → Select "Account" to manage your subscription*

### Step 1.5: Save and Preview

1. Click **Save & Close**
2. Click **Preview** to verify GIF displays correctly
3. Send a test email to yourself

---

## Task 2: Add Split Path for Upgraded Users

This prevents users who upgrade early from receiving "trial ending" emails.

### Step 2.1: Identify where to add condition

After each delay in the journey, add an If/Else condition:

```
EMAIL 1 (Day 0)
     ↓
  3-day delay
     ↓
  [IF/ELSE] ← ADD HERE
     ↓
EMAIL 2 (Day 3-4)
```

### Step 2.2: Add If/Else after 3-day delay

1. Click the **+** icon AFTER the "3-day delay" step
2. Select **If/Else**
3. Configure the condition:
   - **If:** Contact is tagged
   - **Tag:** Select "AI Boss Brainz Monthly" OR "AI Boss Brainz Full"
   - (These tags are applied by the platform when user upgrades)

4. Set the paths:
   - **Yes path (upgraded):** Skip to "Exit" or send "Thanks for upgrading!" email
   - **No path (still trial):** Continue to Email 2

### Step 2.3: Repeat for remaining delays

Add the same If/Else condition:
- After the 2-day delay before Email 3
- After the 2-day delay before Email 4

**Complete flow structure:**

```
TRIGGER: Contact tagged "7-Day Free Trial: AI Boss Brainz"
     ↓
EMAIL 1 — Welcome (Day 0)
     ↓
  3-day delay
     ↓
  IF: Has paid tag? → YES → Exit (or "Thanks for upgrading!")
     ↓ NO
EMAIL 2 — Mid-trial (Day 3-4)
     ↓
  2-day delay
     ↓
  IF: Has paid tag? → YES → Exit
     ↓ NO
EMAIL 3 — Trial ending soon (Day 5-6)
     ↓
  2-day delay
     ↓
  IF: Has paid tag? → YES → Exit
     ↓ NO
EMAIL 4 — Final day (Day 7)
     ↓
Contact exits
```

---

## Task 3: Add Upgrade Links to Emails 2, 3, 4

Each email should have a clear "Upgrade Now" button.

### Email 2 (Mid-trial check-in)

Find this text:
> "To keep uninterrupted access, you can upgrade by visiting our pricing page here"

Replace with a button:
- **Text:** Upgrade Now →
- **URL:** `https://bossbrainz.aleccimedia.com/pricing`
- **Style:** Primary button (red/brand color)

### Email 3 (Trial ending soon)

Add a button:
- **Text:** Upgrade Now — Keep Your Access
- **URL:** `https://bossbrainz.aleccimedia.com/pricing`

### Email 4 (Final day)

Add a prominent button:
- **Text:** Upgrade Now — $297/month
- **URL:** `https://bossbrainz.aleccimedia.com/pricing`
- **Style:** Large, primary button

---

## Task 4: Update Billing Link Placeholder

In Email 4, replace `[Billing Link]` with:
- **URL:** `https://bossbrainz.aleccimedia.com/account`
- Or use: `https://bossbrainz.aleccimedia.com/pricing`

---

## Task 5: Review & Activate

### Final checklist before activating:

- [ ] Email 1 has GIF embedded showing profile dropdown
- [ ] Email 1 has correct login link: `https://bossbrainz.aleccimedia.com/login`
- [ ] If/Else conditions added after each delay
- [ ] If/Else checks for tags: "AI Boss Brainz Monthly" OR "AI Boss Brainz Full"
- [ ] Emails 2-4 have "Upgrade Now" buttons pointing to `/pricing`
- [ ] All `[Billing Link]` placeholders replaced with actual URLs
- [ ] Email subject lines are correct
- [ ] Preview text is set for each email
- [ ] Test email sent and verified

### Activate the Journey

1. Click **Turn On** in the Customer Journey builder
2. Status changes from "Draft" to "Active"
3. New trial signups will now trigger the flow

---

## Tags Reference

The platform automatically applies these Mailchimp tags:

| Event | Tag Applied |
|-------|-------------|
| User starts 7-day trial | `7-Day Free Trial: AI Boss Brainz` |
| User upgrades to Monthly | `AI Boss Brainz Monthly` |
| User upgrades to Annual/Lifetime | `AI Boss Brainz Full` |

**How it works:**
1. User signs up for trial → Stripe webhook fires → Platform calls `applyTrialTag()`
2. User upgrades → Stripe invoice.paid webhook → Platform calls `applyPaidTag()`
3. Mailchimp If/Else conditions check for paid tags to skip emails

---

## Troubleshooting

### GIF not displaying
- Check image URL is accessible (paste in browser)
- Verify file size < 2MB (our GIF is 443KB, should be fine)
- Some email clients block GIFs by default — this is normal

### Tags not appearing
- Check Vercel environment variables for MAILCHIMP_API_KEY, MAILCHIMP_SERVER_PREFIX
- Check Stripe webhook is firing (Stripe Dashboard → Webhooks → Events)
- Check platform logs for Mailchimp API errors

### User still receiving emails after upgrade
- Verify paid tag is applied in Mailchimp (Audience → Contact → Tags)
- Check If/Else conditions are checking the correct tags
- Allow up to 1 hour for tag sync

---

*Last updated: 2026-02-02*
*Platform: AI Boss Brainz v1.1*
