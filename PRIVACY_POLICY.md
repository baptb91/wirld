# Privacy Policy — WILDS

**Effective date:** 2025-05-01  
**App name:** WILDS  
**Developer:** Baptiste  
**Contact:** support@wilds.app

---

## 1. What We Collect

### 1a. Data you provide
| Data | Where it goes | Why |
|------|--------------|-----|
| Optional username | Supabase (cloud) | Leaderboard display name |

### 1b. Data generated automatically
| Data | Where it goes | Why |
|------|--------------|-----|
| Anonymous user ID (UUID) | Supabase (cloud) | Link your save to online features |
| Leaderboard score (creature count, rarity score, level) | Supabase (cloud) | Global leaderboard |
| Market listings you post | Supabase (cloud) | Player-to-player creature trading |
| Purchase receipt validation | RevenueCat (cloud) | Unlock paid features |
| Advertising ID (optional) | Google AdMob | Serve relevant ads |

### 1c. Data stored only on-device
Your terrain, creatures, resources, and all gameplay state are stored locally using AsyncStorage and are never uploaded except as reflected in the leaderboard score above.

---

## 2. Data We Do NOT Collect
- Real name, email address, phone number
- Location or GPS data
- Camera or microphone data
- Contacts or call logs
- Health or fitness data
- Photos or files

---

## 3. Third-Party Services

| Service | Purpose | Privacy policy |
|---------|---------|----------------|
| **Supabase** | Anonymous auth, leaderboard, market | https://supabase.com/privacy |
| **RevenueCat** | In-app purchase management | https://www.revenuecat.com/privacy |
| **Google AdMob** | Rewarded video ads (optional) | https://policies.google.com/privacy |

---

## 4. Permissions Used

| Permission | Platform | Justification |
|-----------|----------|---------------|
| `INTERNET` | Android & iOS | Required for leaderboard, market, and ad delivery |
| `VIBRATE` | Android | Haptic feedback on creature capture and UI interactions |
| `POST_NOTIFICATIONS` | Android 13+ | Alert when wild creatures appear or habitats need attention |
| `RECEIVE_BOOT_COMPLETED` | Android | Reschedule creature alerts after device restart |
| `SCHEDULE_EXACT_ALARM` | Android 12+ | Deliver creature alerts at precise scheduled times |
| `com.android.vending.BILLING` | Android | Process in-app purchases via Google Play |
| `NSUserNotificationsUsageDescription` | iOS | Alert when wild creatures appear or habitats need attention |

---

## 5. Data Retention

- **Anonymous account data** (leaderboard, market listings): retained until you delete the app or request deletion.
- **Local gameplay data**: deleted when the app is uninstalled.
- **Ad identifiers**: managed by Google AdMob per their data policies.

---

## 6. Children's Privacy

WILDS is rated for ages 4+ and does not knowingly collect personal data from children under 13. We use anonymous IDs only — no email or name is required to play.

---

## 7. Your Rights

You may request deletion of your online data (anonymous user ID, username, leaderboard entry, market listings) by emailing **support@wilds.app**. We will process requests within 30 days.

---

## 8. Security

All data in transit is encrypted via TLS. Supabase stores data in secure, access-controlled databases. We do not store payment card information — all billing is handled by Apple / Google.

---

## 9. Changes to This Policy

We may update this policy. The "Effective date" at the top will reflect the latest revision. Continued use of the app after changes constitutes acceptance.

---

## 10. Contact

Questions or data requests: **support@wilds.app**
