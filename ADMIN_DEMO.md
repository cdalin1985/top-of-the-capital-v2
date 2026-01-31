# 🎱 The List: Admin Demo & Launch Guide

This guide contains everything you need to show the other admins how "The List" platform works and how to roll it out to our 70 players.

## 🚀 Key Demo Points (The "Wow" Factors)

### 1. Identity Claiming (Onboarding Legacy Players)
*   **The Feature:** We've pre-loaded the database with the league's 70 profiles.
*   **How to Demo:** 
    *   Sign up as a new user.
    *   On the **"Claim Identity"** screen, search for a name (e.g., "Chase Dalin" or "Dan Hamper").
    *   Tap the name to link the account. 
    *   **Result:** The new account instantly inherits the historical Rank, Fargo Rating, and Points.

### 2. The Live Arena (Spectator Experience)
*   **The Feature:** A dedicated hub for watching live matches.
*   **How to Demo:** 
    *   Open the **"ARENA"** tab.
    *   Explain that when players start a match on the Scoreboard and click "GO LIVE," they paste their YouTube/Facebook stream link.
    *   Spectators get a push notification and can watch the broadcast instantly from this tab.

### 3. Real-Time Scoreboard Sync
*   **The Feature:** Match scores update across all devices in under 100ms.
*   **How to Demo:** 
    *   Open the same match scoreboard on two different phones.
    *   Update the score on one; watch the other update automatically without refreshing.
    *   This ensures the rankings update the second the match ends.

### 4. Automated Housekeeping
*   **The Feature:** No more manual rank management.
*   **How to Demo:** 
    *   Explain that the system has a built-in "Housekeeper" (Postgres Cron).
    *   If a challenge isn't responded to within **14 days**, the system auto-forfeits the match, shifts the ranks, and announces it in the Activity Feed.

### 5. AI & Social Engagement
*   **AI Avatars:** Players can generate a custom "Pool Shark" avatar using Gemini AI during sign-up.
*   **Pulse (Cheers):** Fans can "Cheer" for match results in the Feed to drive league hype.

---

## 🛠 How to Test Right Now

1.  **Download Expo Go** (App Store or Play Store).
2.  **Open the App:** Scan the QR code from the developer's terminal (using `npx expo start`).
3.  **Explore:** Feel free to issue challenges and test the scoreboard.

---
*Created for Chase Dalin & The Capital League Admins*
