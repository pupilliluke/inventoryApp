# Warehousing — App Store Connect Listing

Everything below is copy-paste ready for App Store Connect. Replace the
`<…>` placeholders before submitting.

---

## 1. App information

- **Name (30 char max):** `Warehousing`
- **Subtitle (30 char max):** `Inventory & pull-list manager`
- **Bundle ID:** `com.pupilli.dev.inventoryApp`
- **Primary category:** Business
- **Secondary category (optional):** Productivity
- **Privacy Policy URL:** `https://<your-host>/privacy-policy.html`  ← host store/privacy-policy.html
- **Support URL:** `https://<your-host>/` (any page with a contact email)
- **Marketing URL (optional):** leave blank

---

## 2. Description

```
Warehousing is a fast, no-friction inventory system for teams that move real
product. Track stock across showroom and warehouse locations, stage items into
containers, build and check off pull lists, and keep everyone working from the
same live numbers.

FEATURES
• Live inventory across showroom and warehouse, synced in real time
• Container staging with per-container rollups
• Pull lists you can build, share, and check off — depleting stock as you go
• Low-quantity and out-of-stock views so nothing slips
• Truck / load tracking
• Activity log and 7-day analytics for full accountability
• Role-based access: admins manage users; new members join via approval
• Secure sign-in with Apple or Google

Built for warehouse teams who want speed and a clear source of truth.
```

---

## 3. Keywords (100 char max, comma-separated, no spaces)

```
inventory,warehouse,stock,pull list,pick list,supply,count,container,logistics,parts
```

---

## 4. App Privacy answers (the questionnaire)

You DO collect data. Answer "Yes, we collect data" and declare:

| Data Type | Collected? | Linked to identity? | Used for tracking? | Purpose |
|---|---|---|---|---|
| Email Address | Yes | Yes | No | App Functionality |
| Name | Yes | Yes | No | App Functionality |
| User ID | Yes | Yes | No | App Functionality |
| Other Data (inventory records you enter) | Yes | Yes | No | App Functionality |

- **Tracking:** No — you do not track users across other companies' apps/sites.
- **Third-party advertising:** None.
- All data is collected solely for **App Functionality** (auth + running the app).

---

## 5. Sign-in for review (IMPORTANT)

The app is fully gated behind sign-in AND a new-user approval step, so the
reviewer cannot self-serve with their own Apple ID (they'd land on the
waitlist). Provide a PRE-APPROVED demo account:

1. Create a throwaway Google account (e.g. `warehousing.review@gmail.com`).
2. In the PRODUCTION app, sign in once with it via "Continue with Google" to
   create its record (it will be pending).
3. As admin (pupilli.dev@gmail.com), open User Management and **Approve** it.
   (Optionally grant it admin so the reviewer can see the full feature set.)
4. Put the credentials in App Review notes:

**App Review notes (paste into App Store Connect):**
```
Sign in with the Google account below (tap "Continue with Google"):
  Email: warehousing.review@gmail.com
  Password: <demo-password>

This account is pre-approved and has full access. Note: the app requires admin
approval for brand-new accounts, so please use the provided account rather than
a personal one. Sign in with Apple is also supported.
```

---

## 6. Screenshots required

Capture from the running app (or a simulator). Required sizes:
- **6.9" iPhone** (1320 × 2868) — e.g. iPhone 16 Pro Max
- **6.5" iPhone** (1242 × 2688) — e.g. iPhone 11 Pro Max
- **13" iPad** (2048 × 2732) — required because `supportsTablet: true` in app.json
  (or set `supportsTablet: false` to drop the iPad requirement)

Suggested shots (3–5 each): Dashboard, Inventory list, Pull list detail,
Low-quantity view, User Management.

---

## 7. Other required fields

- **Age rating:** complete the questionnaire — this app is 4+ (no objectionable content).
- **Export compliance:** already handled via `ITSAppUsesNonExemptEncryption: false` in app.json.
- **Copyright:** `2026 Luke Pupilli`
- **Contact info:** your name, phone, email for the review team.
