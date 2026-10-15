/** @type {import('tailwindcss').Config} */

const tokens = require('./src/constants/design-tokens');

const { colors, radii, shadows, spacing, typography } = tokens;

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        accent: {
          primary: colors.accent.primary,
          surface: colors.accent.surfaceTint,
          soft: colors.accent.soft,
          pressed: colors.accent.pressed,
        },
        ink: {
          primary: colors.text.primary,
          secondary: colors.text.secondary,
          placeholder: colors.text.placeholder,
          muted: colors.text.muted,
          metadata: colors.text.metadata,
          'on-accent': colors.text.onAccent,
        },
        icon: {
          default: colors.icon.default,
          active: colors.icon.active,
          muted: colors.icon.muted,
        },
        surface: {
          default: colors.surface.default,
          raised: colors.surface.raised,
          muted: colors.surface.muted,
          input: colors.surface.input,
          glass: colors.surface.glass,
          'glass-tint': colors.surface.glassTint,
          'glass-dense': colors.surface.glassDense,
          'glass-readable': colors.surface.glassReadable,
          'glass-card': colors.surface.glassCard,
        },
        border: {
          subtle: colors.border.subtle,
          strong: colors.border.strong,
          glass: colors.border.glass,
        },
        background: {
          default: colors.background.default,
          'map-fallback': colors.background.mapFallback,
        },
        status: {
          available: colors.status.available,
          limited: colors.status.limited,
          full: colors.status.full,
          unknown: colors.status.unknown,
          'available-soft': colors.status.availableSoft,
          'limited-soft': colors.status.limitedSoft,
          'full-soft': colors.status.fullSoft,
          'unknown-soft': colors.status.unknownSoft,
        },
        feedback: {
          error: colors.feedback.error,
          'error-soft': colors.feedback.errorSoft,
          success: colors.feedback.success,
          'success-soft': colors.feedback.successSoft,
          warning: colors.feedback.warning,
          'warning-soft': colors.feedback.warningSoft,
        },
        zone: colors.zone,
        overlay: colors.overlay,
      },
      fontFamily: {
        ui: ['system-ui', 'sans-serif'],
      },
      fontSize: {
        'screen-title': [
          `${typography.screenTitle.fontSize}px`,
          {
            lineHeight: `${typography.screenTitle.lineHeight}px`,
            fontWeight: typography.screenTitle.fontWeight,
          },
        ],
        'section-title': [
          `${typography.sectionTitle.fontSize}px`,
          {
            lineHeight: `${typography.sectionTitle.lineHeight}px`,
            fontWeight: typography.sectionTitle.fontWeight,
          },
        ],
        'card-title': [
          `${typography.cardTitle.fontSize}px`,
          {
            lineHeight: `${typography.cardTitle.lineHeight}px`,
            fontWeight: typography.cardTitle.fontWeight,
          },
        ],
        body: [
          `${typography.body.fontSize}px`,
          {
            lineHeight: `${typography.body.lineHeight}px`,
            fontWeight: typography.body.fontWeight,
          },
        ],
        'body-strong': [
          `${typography.bodyStrong.fontSize}px`,
          {
            lineHeight: `${typography.bodyStrong.lineHeight}px`,
            fontWeight: typography.bodyStrong.fontWeight,
          },
        ],
        label: [
          `${typography.label.fontSize}px`,
          {
            lineHeight: `${typography.label.lineHeight}px`,
            fontWeight: typography.label.fontWeight,
          },
        ],
        caption: [
          `${typography.caption.fontSize}px`,
          {
            lineHeight: `${typography.caption.lineHeight}px`,
            fontWeight: typography.caption.fontWeight,
          },
        ],
        navigation: [
          `${typography.navigation.fontSize}px`,
          {
            lineHeight: `${typography.navigation.lineHeight}px`,
            fontWeight: typography.navigation.fontWeight,
          },
        ],
      },
      spacing: {
        touch: '44px',
        'touch-lg': '48px',
        page: `${spacing.lg}px`,
        section: `${spacing.xl}px`,
      },
      borderRadius: {
        sm: `${radii.sm}px`,
        md: `${radii.md}px`,
        control: `${radii.control}px`,
        card: `${radii.card}px`,
        'list-card': `${radii.listCard}px`,
        sheet: `${radii.sheet}px`,
        navigation: `${radii.navigation}px`,
        search: `${radii.search}px`,
        floating: `${radii.floating}px`,
      },
      boxShadow: {
        subtle: shadows.subtle,
        card: shadows.card,
        floating: shadows.floating,
        overlay: shadows.overlay,
        sheet: shadows.sheet,
        marker: shadows.marker,
        glass: shadows.glass,
      },
    },
  },
  plugins: [],
};
