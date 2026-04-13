# Landing Page Design — tokburn.dev

**Date:** 2026-04-13
**Status:** APPROVED

## Overview

Single-page Next.js landing page for tokburn. Dark terminal aesthetic with playful pixel-art personality. Animated Tokemon sprites, interactive elements, scroll-triggered animations.

## Tech Stack

- Next.js (React 19, App Router)
- CSS Modules or Tailwind (no heavy UI libraries)
- Static export (`next export`) for deploy-anywhere
- Zero backend, zero API calls

## Vibe

- Background: #0a0a0f with subtle scanline overlay
- Typography: Press Start 2P (pixel headings), monospace (data), Inter/system (body)
- Color: sprites and UI elements pop, everything else is grayscale/dim
- Sprites glow against the dark background

## Sections

### 1. Hero — "Meet your Tokemon"
- Full viewport height
- Three Tokemons animated side by side (staggered blink timers)
- Terminal-style box showing live status line mockup
- Tagline: "Choose your Tokemon. Write code. Watch it evolve."
- Glowing green `npm i -g tokburn` with copy button

### 2. The Problem — "You're coding blind"
- Dark section, text only
- Three pain points with typewriter effect
- "tokburn fixes this." hard cut

### 3. The Dashboard — "Everything. Live. Always."
- Terminal GIF framed in macOS-style window chrome
- 6-line breakdown as glowing hover cards
- Each card: icon + label + description

### 4. The Twist — "Oh, and you get a companion"
- Three character cards (trading card style)
- Sprite animated, name, type, personality, sample quips
- Hover → happy expression
- Click/tap → flip to evolution line

### 5. Personalities — "They have opinions"
- Three columns: Sassy (orange), Hype (cyan), Anxious (pink)
- Auto-scrolling quip ticker per column
- Pauses on hover

### 6. Evolution — "They grow with you"
- Horizontal timeline: Stage 1 → 2 → 3
- Scroll-triggered progress bar animation
- Golden ★ EVOLVED! ★ flash at thresholds

### 7. Expressions — "They react"
- Interactive slider: chill → alert → stressed → panic
- Sprite changes expression live
- Rate limit bar fills alongside

### 8. Terminal — "Two commands"
- Styled terminal window with install commands
- Big copy button with "Copied!" feedback
- Platform support note

### 9. Social proof bar
- npm downloads badge (live)
- GitHub stars badge (live)
- Author credit, MIT license

### 10. Footer
- GitHub + npm links
- "Star us if you vibe with it"

## Key Interactions
- CSS keyframe sprite animations (no heavy JS)
- Hover reactions (sprite expression swap)
- Copy button with feedback
- Intersection Observer scroll triggers (no library)
- Auto-rotating personality quips
- Expression slider (JS state → sprite frame swap)

## Not Included
- No signup/email capture
- No video embed
- No testimonials
- No pricing
- No hamburger menu
