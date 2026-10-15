# White Chocolate design system

The active application theme is defined by `src/constants/design-tokens.js` and exposed to TypeScript through `src/constants/theme.ts`. Tailwind/NativeWind reads the same CommonJS token object, so utility classes and component styles cannot drift into separate themes.

## Figma source values

The following values were parsed from `Home Screen.svg` and are treated as source values rather than inferred styling:

- Primary violet: `#824DFF`
- GPS surface tint: `#601CFF`
- Navigation foreground: `#323232`
- Search placeholder: `#797979`
- Glass base: `#FFFFFF` at `0.10` opacity
- Reference frame: `405 × 874`
- Search: `x 25`, `y 79`, `355 × 47`, radius `23.5`
- Navigation: `x 25`, `y 775`, `354.818 × 67.0014`, radius `20`
- GPS: `x 333`, `y 703`, `47 × 47`, radius `23.5`
- GPS/navigation gap: `25`
- User marker: outer radius `9.5`, inner radius `6.5`
- SVG backdrop-blur metadata: radius `7.5`
- SVG outer shadow: `0 8`, Gaussian standard deviation `6.5`, black at `0.15`
- SVG inner highlights: `-1 -3 / 2` and `4 5 / 3`, white at `0.40`
- SVG noise: three-octave fractal noise, white at `0.25`

The search, GPS, Map, Favorite, and Profile paths in `src/components/ui/figma-icons.tsx` are the original vector geometries from the source SVG. Labels remain accessible native text.

## Native translation

`GlassSurface` owns all floating glass variants. It uses `expo-blur`, a translucent white fallback for Reduce Transparency, one shared multi-layer shadow recipe, and platform-safe borders. The SVG's fractal noise is intentionally omitted: reproducing it per floating surface adds texture uploads/compositing over the live map without enough visual benefit.

The 405 × 874 values are reference relationships. Safe-area insets, current viewport width, and bottom gesture insets determine actual placement. The current-location button is positioned from the navigation metrics rather than an unrelated screen offset.

Google Maps receives a light custom style. Apple Maps uses its supported muted standard configuration. Those colors are documented semantic extensions because the Figma map is an embedded raster and does not expose editable map-style values.

## Semantic extensions

Parking availability, feedback, map, and zone-category colors are application semantics not extracted from the SVG. They live only in `design-tokens.js`, are used to convey real state, and do not form an alternate decorative palette. Dense lists and forms use readable opaque surfaces; glass is reserved for floating controls, cards, sheets, and modals.

## Maintenance

- Add or change raw color values in `design-tokens.js`, not feature components.
- Expose new NativeWind utilities through `tailwind.config.js` using semantic names.
- Use `GlassSurface` instead of creating local blur/shadow recipes.
- Run `scripts/generate-design-assets.ps1` after changing the vector parking mark.
- Run `npm test`, `npm run lint`, `npx tsc --noEmit`, and `npx expo-doctor` before release.
