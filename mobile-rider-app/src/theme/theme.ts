// theme.ts
// Abstracted design tokens for Baldia Mart Rider

export const theme = {
  colors: {
    primary: '#FF4500',       // Main orange brand color
    primaryLight: '#FF450015',// Semi-transparent primary
    primaryDark: '#B45309',
    secondary: '#27ae60',     // Green successes
    secondaryLight: '#E8F5E9',// Light green backgrounds
    background: '#F8F9FB',    // App background
    surface: '#FFFFFF',       // Card background
    textHeader: '#1A1A1A',    // Dark headers
    textPrimary: '#2D3748',   // Main body text
    textSecondary: '#666666', // Helper text / subtitles
    textMuted: '#999999',     // Inactive text
    border: '#EEEEEE',        // Universal border
    error: '#E53E3E',         // Error text
    errorLight: '#FFF5F5',    // Error background
    // Rider specific
    panelDark: '#1E1E1E',
    panelSub: '#2A2A2A',
  },
  spacing: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
  borderRadius: {
    sm: 8,
    md: 14,
    lg: 20,
    max: 999,
  }
};
