# Requirements: AI Boss Brainz

**Defined:** 2026-02-11
**Core Value:** Founders get instant, actionable sales and marketing strategy from AI executives who remember context and deliver frameworks-based guidance.
**Source:** Product feedback spreadsheet from Alexandria's team (61 items audited)

## v1.2 Requirements

Requirements for the Client Feedback Sweep milestone. Each maps to roadmap phases.

### Bug Fixes (BUG)

- [ ] **BUG-01**: Auth rate limiting works for signup and password reset (fix headersList → requestHeaders variable reference in `app/(auth)/actions.ts`)
- [ ] **BUG-02**: "Failure to generate" errors are caught and show user-friendly retry message (Row 10)
- [ ] **BUG-03**: User can create new chat threads even when another thread has a generation error (Row 39)
- [ ] **BUG-04**: Conversation content loads fully when returning to a chat (not blank, shows full history) (Row 41)

### Export & PDF (EXPORT)

- [ ] **EXPORT-01**: PDF exports strip all HTML tags and render clean formatted text (Row 7)
- [ ] **EXPORT-02**: User can export an entire chat thread as a single PDF, not just one message (Row 8)
- [ ] **EXPORT-03**: PDF file sizes are optimized to be smaller (Row 34)
- [ ] **EXPORT-04**: Copy/paste from chat produces clean text without HTML markup (Row 42)

### AI Content Quality (AI)

- [ ] **AI-01**: AI generates actual deliverable content (email drafts, social media posts, ad copy) in addition to strategy advice (Row 37)
- [ ] **AI-02**: Voice playback skips tables and charts rather than reading them row-by-row (Row 52)

### Voice & Realtime (VOICE)

- [ ] **VOICE-01**: Voice call questions and AI answers are saved to chat history (Row 11)

### Auth & Account (AUTH)

- [ ] **AUTH-01**: Password fields have show/hide toggle icon (Row 31)
- [ ] **AUTH-02**: Password minimum length is consistent — UI says 8 characters, validation enforces 8 (currently 6) (Row 32)

### Billing & Subscription (BILL)

- [ ] **BILL-01**: Billing portal shows upgrade/downgrade options between subscription tiers (Row 17)
- [ ] **BILL-02**: Pricing page shows "Cancel Anytime" instead of "30 Money Back Guarantee" with updated copy (Row 24)

### SEO & Meta (SEO)

- [ ] **SEO-01**: Link preview meta-data shows Title: "AI Boss Brainz" and Description: "Your Sales and Marketing Secret Weapon" (Row 26)
- [ ] **SEO-02**: Contact page tagline updated to "Sales and Marketing Strategy 24/7" (Row 27)

### Homepage & Landing (LAND)

- [ ] **LAND-01**: Executive bios on homepage display as regular text descriptions, not chat-bubble style (Row 19)
- [ ] **LAND-02**: Homepage hero media section supports swappable photo/video embed via admin CMS (Row 22)
- [ ] **LAND-03**: Social media icons updated — add website link to aleccimedia.com, add Facebook, remove X/Twitter (Row 23)
- [ ] **LAND-04**: Sales & Marketing Checkup section styled in red, items ordered lowest to highest value (Row 20)

### Knowledge Base (KB)

- [ ] **KB-01**: Fireflies call transcripts can be ingested into the executive knowledge base (Row 29)

### User Management (USER)

- [ ] **USER-01**: Analytics dashboard distinguishes user categories (team, client) to show only realized revenue (Row 13)

### UX Polish (UX)

- [ ] **UX-01**: Multi-select reactions — user can apply multiple reaction types to a single message (Row 16)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Multi-Tenant

- **MT-01**: User can add additional workspaces/businesses to one account ($20/business) (Row 4)
- **MT-02**: Account owner can add other users with role-based access (admin, limited user) at $5/user (Row 5)

### Advanced Features

- **ADV-01**: Real-time voice call and conversation (full-stack feature) (Row 47)
- **ADV-02**: Intelligent folder/topic organization for conversations (Row 48)
- **ADV-03**: Analytics/executive dashboard overhaul (Row 49)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-workspace accounts | v2 — requires multi-tenancy architecture |
| Multi-user accounts with roles | v2 — requires RBAC system |
| Real-time voice call | v2 — full-stack feature requiring significant architecture |
| Folder/topic intelligence | v2 — needs discussion on UX approach |
| Executive dashboard | v2 — needs requirements definition |
| Mobile app | Web-first approach |
| Video calls | Text/voice only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUG-01 | Phase 11 | Pending |
| BUG-02 | Phase 11 | Pending |
| BUG-03 | Phase 11 | Pending |
| BUG-04 | Phase 11 | Pending |
| AUTH-01 | Phase 11 | Pending |
| AUTH-02 | Phase 11 | Pending |
| EXPORT-01 | Phase 12 | Pending |
| EXPORT-02 | Phase 12 | Pending |
| EXPORT-03 | Phase 12 | Pending |
| EXPORT-04 | Phase 12 | Pending |
| AI-01 | Phase 13 | Pending |
| AI-02 | Phase 13 | Pending |
| VOICE-01 | Phase 13 | Pending |
| LAND-01 | Phase 14 | Pending |
| LAND-02 | Phase 14 | Pending |
| LAND-03 | Phase 14 | Pending |
| LAND-04 | Phase 14 | Pending |
| SEO-01 | Phase 14 | Pending |
| SEO-02 | Phase 14 | Pending |
| BILL-01 | Phase 15 | Pending |
| BILL-02 | Phase 15 | Pending |
| KB-01 | Phase 15 | Pending |
| USER-01 | Phase 15 | Pending |
| UX-01 | Phase 15 | Pending |

**Coverage:**
- v1.2 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-11 after roadmap creation*
