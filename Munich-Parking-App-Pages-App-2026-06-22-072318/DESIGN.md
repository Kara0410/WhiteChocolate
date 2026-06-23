---
version: alpha
name: Munich Parking App Design System
description: Map-first mobile UI system for the Munich parking discovery MVP.
colors:
  background: "#E9E1D3"
  surface: "#FFFCF5"
  surfaceWarm: "#F7F0E4"
  text: "#172126"
  muted: "#69767A"
  border: "#D9CFC0"
  accent: "#DFA536"
  mapTint: "#D7E6E9"
  low: "#78AFC8"
  mid: "#B7B068"
  high: "#DFA536"
  unknown: "#C9C4B8"
typography:
  display:
    fontFamily: Georgia
    fontSize: 76px
    fontWeight: 700
    lineHeight: 0.94
  heading:
    fontFamily: Georgia
    fontSize: 27px
    fontWeight: 700
    lineHeight: 1.02
  body:
    fontFamily: Trebuchet MS
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.45
rounded:
  sm: 12px
  md: 16px
  lg: 22px
  xl: 30px
spacing:
  xs: 6px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
---

## Overview

The Munich Parking app is a map-first mobile product for drivers who need a trustworthy answer before leaving home. The interface emphasizes confidence transparency: every availability number is paired with freshness, report count, static restrictions, and an explanation of why the app is confident.

## Colors

Use warm paper surfaces over a cool map tint. Availability colors encode probability and confidence freshness: amber for high likelihood, olive for moderate, blue for low, and grey/dashed for not enough data. Avoid showing a fabricated percentage when both historical and live data are absent.

## Typography

Use Georgia for expressive, compact headings and Trebuchet MS for readable mobile body text. Keep mobile body copy at 15px or larger and labels at 12px or larger.

## Layout

Primary product screens are designed for a 390px mobile viewport. Map screens place a translucent toolbar at the top, a bottom sheet for decisions, and one primary action near the thumb zone. Non-map states use the same tokens and maintain 44px minimum touch targets.

## Elevation & Depth

Use translucent surfaces with warm backgrounds and soft directional shadows. Bottom sheets should feel attached to the map, while overlays such as fresh-check and consent cards should clearly sit above the map.

## Shapes

Large radii are part of the product language. Zone markers use asymmetrical pin-like pills to distinguish them from generic map dots.

## Components

- **Zone chip:** always displays either a percentage or an explicit no-data marker.
- **Zone row:** includes confidence, zone name, static rule, and price.
- **Fresh check panel:** must include timeout progress and fallback reassurance.
- **Consent card:** explains location use before invoking the operating-system permission prompt.
- **Billing screens:** must describe hosted Stripe handoff and portal management rather than implying in-app payment handling.

## Do's and Don'ts

Do show why a prediction is trustworthy. Do preserve list fallback for slow or unavailable map tiles. Do keep EV eligibility as a one-tap filter. Don’t use stale binary occupied/free labels. Don’t hide no-data states behind fake confidence numbers.