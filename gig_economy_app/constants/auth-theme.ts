/**
 * Auth theme: colors, spacing, fonts, and layout.
 * Single source of truth; all colors from here – no hardcoding.
 */
export const authColors = {
  background: '#0D0D0D',
  surface: '#2A2520',
  surfaceElevated: '#3D3630',
  text: '#FAF7F2',
  textSecondary: '#D4B896',
  accent: '#D4A84B',
  accentMuted: '#C9A227',
  border: '#5C5248',
  inputBg: '#1E1B18',
  placeholder: '#8B7355',
  /** Social buttons (Google, Apple). */
  socialButtonBg: '#FFFFFF',
  /** Avatar circle backgrounds (soft pastels for dark theme). */
  avatarBg1: '#3D3630',
  avatarBg2: '#4A4239',
  avatarBg3: '#3D3630',
} as const;

export const authSpacing = {
  xs: 6,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const authFonts = {
  regular: 'Inter_400Regular',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  title: 'Inter_600SemiBold',
  titleBold: 'Inter_700Bold',
  highlight: 'Inter_700Bold',
} as const;

/** Layout and sizing for auth screens. */
export const authLayout = {
  formCardRadius: 28,
  inputRadius: 12,
  primaryButtonRadius: 12,
  primaryButtonRadiusSignup: 14,
  checkboxSize: 20,
  checkboxRadius: 4,
  socialButtonSize: 52,
  socialIconSize: 24,
  /** Space above form card (scroll spacer). */
  spacerMinHeight: 24,
  /** Extra bottom padding (0 = full bleed). */
  tabBarPadding: 0,
  /** Offset for KeyboardAvoidingView above keyboard (e.g. tab bar). */
  keyboardVerticalOffset: 20,
  /** Title / subtitle font sizes. */
  formTitleSize: 30,
  formSubtitleSize: 15,
  formSubtitleLineHeight: 22,
  inputFontSize: 16,
  smallFontSize: 14,
  primaryButtonFontSize: 16,
  primaryButtonFontSizeSignup: 17,
  primaryButtonIconGap: 10,
  primaryButtonIconSize: 20,
} as const;
