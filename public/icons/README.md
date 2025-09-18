# Notification Icons

This folder contains icons used for push notifications in the Capital Ladder
app.

## Required Icons (64x64 PNG recommended):

- `badge-icon.png` - Main app badge icon (appears in notification)
- `challenge-icon.png` - Challenge-specific notification icon
- `match-icon.png` - Match-specific notification icon
- `accept-icon.png` - Accept action icon (for notification actions)
- `decline-icon.png` - Decline action icon (for notification actions)

## Icon Requirements:

- Format: PNG
- Size: 64x64 pixels (recommended for notifications)
- Background: Transparent or solid color
- Style: High contrast for visibility on different backgrounds

## Current Status:

Icons need to be created and added to this folder. The service worker will cache
these icons for offline notification display.

For development, placeholder icons can be used or the system will fall back to
the default badge icon.
