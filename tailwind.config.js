/** @type {import('tailwindcss').Config} */

// These palettes intentionally define the utility names already used in the
// source (`bg-blue-600`, `text-slate-500`, etc.). NativeWind reads them while
// compiling className strings; application components should not import this
// Node-oriented config file at runtime.
const BRAND = {
  50: '#EFF6FF',
  100: '#DBEAFE',
  200: '#BFDBFE',
  300: '#93C5FD',
  500: '#3B82F6',
  600: '#2563EB',
  700: '#1D4ED8',
  800: '#1E40AF',
  900: '#1E3A8A',
  950: '#172554',
};

const INK = {
  50: '#F8FAFC',
  100: '#F1F5F9',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#475569',
  700: '#334155',
  800: '#1E293B',
  900: '#0F172A',
  950: '#020617',
};

module.exports = {
  // Scan every source file so Tailwind only ships the classes that are actually used.
  content: ['./src/**/*.{js,jsx,ts,tsx}'],

  // NativeWind's preset wires Tailwind into React Native's style system.
  presets: [require('nativewind/preset')],

  theme: {
    extend: {
      /*
       * DESIGN SYSTEM MAP
       * ------------------
       * The app currently has two visual layers. The map/account/auth UI uses
       * Tailwind's slate + blue utilities. The original parking detail route
       * and the billing/fresh-check experience use the warm-paper tokens from
       * src/constants/theme.ts. Both palettes are kept here intentionally so
       * a new screen can choose the right family without hunting through files.
       *
       * Existing callsites are named beside the tokens below. The aliases are
       * additive: existing classes such as bg-blue-600 and text-slate-950 keep
       * working exactly as before.
       */
      colors: {
        // Legacy dark parking-detail palette.
        // Used by src/app/+not-found.tsx and src/app/parking/[id].tsx:
        //   bg-surface, bg-elevated, bg-sunken, bg-gold, text-surface, text-gold.
        surface:  '#25292e',
        elevated: '#2d3238',
        sunken:   '#1e2227',
        gold:     '#ffd33d',

        // Warm-paper palette from src/constants/theme.ts.
        // Inline-style callsites: src/components/TopBar.tsx,
        // src/components/ConsentModal.tsx, src/app/billing.tsx,
        // src/app/fresh-check.tsx, and src/app/(tabs)/_layout.tsx.
        warm: {
          bg: '#E9E1D3',
          surface: '#FFFCF5',
          'surface-warm': '#F7F0E4',
          panel: '#FFFCF5F7',
          text: '#172126',
          muted: '#69767A',
          body: '#46575C',
          'body-muted': '#536368',
          'deep-text': '#31454C',
          border: '#D9CFC0',
          accent: '#DFA536',
          'accent-text': '#7C5F1E',
          deep: '#203842',
          'map-tint': '#D7E6E9',
          'danger-soft': '#F1D9CA',
          'danger-text': '#69462E',
          'overlay-ink': '#17212652',
          'panel-border': '#FFFFFFB3',
          'progress-track': '#20384224',
          'cancel-surface': '#FFFAF0',
        },

        // Primary action family for the current light UI.
        // Existing utility callsites include onboarding, account/auth sheets,
        // parking headers/list rows, search overlays, and navigation controls.
        // Examples: bg-blue-600 (primary), active:bg-blue-700 (pressed),
        // bg-blue-50 (icon tile), bg-blue-100 (soft pressed/selected state).
        brand: BRAND,

        // Explicit utility aliases. These are the names existing components
        // already use, so changing a token here updates the app consistently.
        blue: BRAND,

        // Neutral text/surface aliases used throughout account, settings,
        // bottom-sheet, and map components. These mirror Tailwind's built-in
        // slate values already used by classes such as text-slate-950,
        // text-slate-500, border-slate-200, and bg-slate-100.
        ink: INK,
        slate: INK,

        // Supporting utility families used by parking status rows, warnings,
        // restrictions, validation messages, and the legacy detail screen.
        emerald: {
          100: '#D1FAE5',
          500: '#10B981',
          700: '#047857',
        },
        orange: {
          100: '#FFEDD5',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
        },
        red: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
        },
        purple: {
          100: '#F3E8FF',
          700: '#7E22CE',
        },
        amber: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          600: '#D97706',
        },
        gray: {
          200: '#E5E7EB',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
        },
        white: '#FFFFFF',
        black: '#000000',

        // Semantic light surfaces. Use these aliases for new screens when the
        // intent is clearer than a raw slate utility. Existing screens mostly
        // use bg-slate-100 for page backgrounds and bg-white for cards.
        app: {
          canvas: '#F1F5F9', // Account/favorites pages: bg-slate-100.
          sheet: '#F3F5F8', // Parking/list/search bottom-sheet backgrounds.
          card: '#FFFFFF', // Cards, setting groups, and modal surfaces.
          input: '#F8FAFC', // Text inputs and quiet control surfaces.
          divider: '#F1F5F9', // Subtle list dividers: border-slate-100.
        },

        // Status and data-visualisation families. These match the existing
        // ParkingInfoRow accents and parking availability indicators.
        status: {
          success: '#059669', // emerald-600/700: available, open, success.
          'success-soft': '#D1FAE5', // emerald-100 icon tiles.
          warning: '#D97706', // amber/orange: caution and premium affordances.
          'warning-soft': '#FEF3C7', // amber-50/100 icon tiles.
          danger: '#DC2626', // red-600/700: validation, restrictions, errors.
          'danger-soft': '#FEE2E2', // red-50/100 icon tiles.
          info: '#2563EB', // blue: informative links and navigation.
          unavailable: '#94A3B8', // slate-400: unknown or unavailable data.
        },

        // Availability colors used by src/constants/theme.ts and the map
        // marker/bubble components. Do not use these for generic success UI:
        // they encode parking likelihood, not account/action status.
        availability: {
          low: '#78AFC8',
          medium: '#B7B068',
          high: '#DFA536',
          unknown: '#C9C4B8',
        },

        // ParkMunich light palette (kept as the original public token names).
        // src/components/parking-map/ParkingAvailabilityBubbleDemo.tsx uses
        // text-pm-text; the rest of the warm family is consumed via C.*.
        pm: {
          bg:      '#F7F8FC',
          card:    '#FFFFFF',
          text:    '#101828',
          muted:   '#667085',
          border:  '#D9E0EA',
          accent:  '#007AFF',
          success: '#34C759',
          warning: '#FF9F0A',
          danger:  '#D92D20',
        },
      },

      /*
       * TYPOGRAPHY
       *
       * FONT_DISPLAY and FONT_BODY in src/constants/theme.ts are the source
       * of truth for inline styles. They resolve to Georgia/serif for display
       * headings and Trebuchet MS/sans-serif for readable body copy.
       *
       * Existing Tailwind screens use the platform default sans font unless a
       * class is explicitly added. The font-display and font-body aliases
       * below let future NativeWind callsites express the same split without
       * adding a font dependency. Current inline examples:
       *   - Display: billing.tsx, fresh-check.tsx, TopBar.tsx, ConsentModal.tsx
       *   - Body: the same screens' supporting copy (currently inline styles)
       *
       * Weight language in the current Tailwind UI:
       *   font-black (900) = page titles; font-extrabold (800) = buttons,
       *   setting/card titles, and important labels; font-bold (700) = section
       *   titles and values; font-semibold (600) = supporting copy and rows.
       */
      fontFamily: {
        display: ['Georgia', 'serif'],
        body: ['Trebuchet MS', 'sans-serif'],
        ui: ['system-ui', 'sans-serif'],
      },

      // Named sizes mirror the existing inline design scale and common
      // className values. Existing arbitrary values remain valid; these names
      // are recommended for new reusable components.
      fontSize: {
        'display-xl': ['76px', { lineHeight: '0.94', fontWeight: '700' }],
        'display-lg': ['52px', { lineHeight: '1', fontWeight: '700' }],
        'screen-title': [
          '30px',
          { lineHeight: '1.1', fontWeight: '900', letterSpacing: '-0.8px' },
        ],
        'section-title': [
          '27px',
          { lineHeight: '1.02', fontWeight: '700', letterSpacing: '-0.5px' },
        ],
        'card-title': ['17px', { lineHeight: '1.35', fontWeight: '800' }],
        body: ['15px', { lineHeight: '1.45', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '600' }],
        caption: ['13px', { lineHeight: '1.45', fontWeight: '600' }],
        overline: [
          '12px',
          {
            lineHeight: '1.2',
            fontWeight: '800',
            letterSpacing: '0.8px',
          },
        ],
      },

      // The app's recurring line-height language: compact headings, readable
      // 5/6-line supporting text, and 17px/20px detail descriptions.
      lineHeight: {
        compact: '1.02',
        body: '1.45',
        readable: '1.5',
        relaxed: '1.75',
      },

      // Tracking used by screen titles and uppercase settings/metadata labels.
      letterSpacing: {
        'title-tight': '-0.8px',
        micro: '0.5px',
        label: '0.8px',
        overline: '1.4px',
      },

      /*
       * SHAPE, SPACING, AND DEPTH
       *
       * Cards and sheets use continuous large radii. The current callsites
       * often use arbitrary rounded-[28px] / rounded-[32px] values; the named
       * aliases below make the intent reusable in new components.
       */
      spacing: {
        touch: '44px', // Minimum control target used by settings/back actions.
        'touch-lg': '54px', // Primary CTA height: min-h-14 / h-14.
        page: '20px', // Main horizontal inset on account and sheet content.
        section: '24px', // Vertical section rhythm (SPACING.lg).
        'section-lg': '40px', // Large onboarding/marketing separation.
      },
      borderRadius: {
        control: '16px', // rounded-2xl: buttons, inputs, icon tiles.
        card: '28px', // rounded-[28px]: account/settings/detail cards.
        sheet: '32px', // Bottom-sheet top corners and large surfaces.
        pill: '9999px', // rounded-full: badges, compact controls, progress bars.
      },
      borderWidth: {
        hairline: '1px', // All visible borders are intentionally subtle 1px lines.
      },
      boxShadow: {
        // Inline equivalents appear in account/settings/list/search components.
        card: '0 4px 12px rgba(15,23,42,0.06)',
        floating: '0 3px 10px rgba(15,23,42,0.07)',
        overlay: '0 10px 24px rgba(15,23,42,0.14)',
        sheet: '0 -4px 14px rgba(0,0,0,0.1)',
        nav: '0 14px 32px rgba(2,6,23,0.28)',
        'warm-panel': '0 12px 28px rgba(25,42,47,0.16)',
        'marker-cell': '0 7px 16px rgba(30,64,175,0.18)',
        // Map floating controls use these stronger elevations than the base floating recipe.
        'floating-strong': '0 4px 14px rgba(15,23,42,0.16)',
        'floating-deep': '0 4px 14px rgba(15,23,42,0.2)',
        'floating-message': '0 5px 16px rgba(15,23,42,0.18)',
        'search-marker': '0 4px 10px rgba(127,29,29,0.28)',
        'location-marker': '0 1px 4px rgba(15,23,42,0.35)',
      },

      /*
       * COMPONENT RECIPES (the current class language)
       *
       * Page background:
       *   flex-1 bg-slate-100
       *   AccountScreen, account placeholder, favorites, and auth callback.
       *
       * Grouped card/section:
       *   overflow-hidden rounded-[28px] border border-white/80 bg-white
       *   with boxShadow card and continuous borderCurve.
       *   SettingsSection, ProfileHeader, and the account settings sections.
       *
       * Detail card:
       *   rounded-[28px] border border-white/70 bg-white px-4/5 py-5 shadow-sm.
       *   ParkingBottomSheet, ParkingDetailSection, and ParkingInfoRow.
       *
       * Primary action:
       *   min-h-12 or min-h-14 rounded-2xl/rounded-full bg-blue-600
       *   active:bg-blue-700 text-white.
       *   Onboarding, CreateAccountSheet, email auth, and parking navigation.
       *
       * Secondary/quiet action:
       *   min-h-11/12 rounded-full or rounded-2xl bg-slate-100
       *   active:bg-slate-200 text-slate-900.
       *   Back, guest, close, and non-destructive settings controls.
       *
       * Inputs:
       *   mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3
       *   text-[15px] font-semibold text-slate-900.
       *   EmailSignInCard and onboarding email forms.
       *
       * Supporting text:
       *   text-[13px/14px] font-semibold leading-5/6 text-slate-500.
       *   Muted metadata uses text-slate-400; errors use text-red-700;
       *   action links use text-blue-600 or text-blue-700.
       *
       * Touch targets:
       *   h-9/h-10 icon buttons use hitSlop; interactive rows use min-h-11
       *   or min-h-16; primary buttons use min-h-12 or min-h-14.
       *   Keep new interactive controls at approximately 44px or larger.
       */
    },
  },

  plugins: [],
};
