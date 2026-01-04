// Theme colors with light and dark mode support
// Green gradient theme

export const lightTheme = {
    // Base colors
    background: '#ffffff',
    foreground: '#0f172a',
    card: '#f8fafc',
    cardForeground: '#0f172a',

    // Primary (green)
    primary: '#22c55e',
    primaryForeground: '#ffffff',

    // Secondary
    secondary: '#f1f5f9',
    secondaryForeground: '#475569',

    // Muted
    muted: '#f1f5f9',
    mutedForeground: '#64748b',

    // Accent
    accent: '#ecfdf5',
    accentForeground: '#059669',

    // Destructive (errors)
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',

    // Borders
    border: '#e2e8f0',
    input: '#e2e8f0',
    ring: '#22c55e',

    // Gradient colors (green)
    gradientStart: '#22c55e',
    gradientEnd: '#16a34a',

    // Grade colors
    gradeAPlus: '#22c55e',
    gradeA: '#4ade80',
    gradeB: '#facc15',
    gradeC: '#fb923c',
    gradeD: '#f87171',
    gradeF: '#ef4444',
};

export const darkTheme = {
    // Base colors
    background: '#0f172a',
    foreground: '#f8fafc',
    card: '#1e293b',
    cardForeground: '#f8fafc',

    // Primary (green)
    primary: '#22c55e',
    primaryForeground: '#ffffff',

    // Secondary
    secondary: '#1e293b',
    secondaryForeground: '#cbd5e1',

    // Muted
    muted: '#334155',
    mutedForeground: '#94a3b8',

    // Accent
    accent: '#064e3b',
    accentForeground: '#34d399',

    // Destructive (errors)
    destructive: '#b91c1c',
    destructiveForeground: '#fef2f2',

    // Borders
    border: '#334155',
    input: '#334155',
    ring: '#22c55e',

    // Gradient colors (green)
    gradientStart: '#22c55e',
    gradientEnd: '#16a34a',

    // Grade colors
    gradeAPlus: '#22c55e',
    gradeA: '#4ade80',
    gradeB: '#facc15',
    gradeC: '#fb923c',
    gradeD: '#f87171',
    gradeF: '#ef4444',
};

// Type for theme colors
export type ThemeColors = typeof lightTheme;

// Default export for backwards compatibility (will be replaced by dynamic theme)
export const colors = lightTheme;

export default colors;
