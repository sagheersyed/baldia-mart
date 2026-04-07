// theme.ts
// Abstracted design tokens for Baldia Mart

export const theme = {
  colors: {
    primary: '#FF4500',       // Main orange brand color
    primaryLight: '#FF450015',// Semi-transparent primary
    secondary: '#27ae60',     // Green successes
    secondaryLight: '#E8F5E9',// Light green backgrounds
    background: '#F8F9FB',    // App background
    surface: '#FFFFFF',       // Card background
    textHeader: '#1A1A1A',    // Dark headers
    textPrimary: '#2D3748',   // Main body text
    textSecondary: '#718096', // Helper text / subtitles
    textMuted: '#A0AEC0',     // Inactive text
    border: '#F0F0F0',        // Universal border
    error: '#E53E3E',         // Error text
    errorLight: '#FFF5F5',    // Error background
    // Specialized
    foodPrimary: '#FF8C00',
    foodLight: '#FFF5E0',
    martPrimary: '#3B82F6',   // or existing green if used
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  borderRadius: {
    sm: 8,
    md: 14,
    lg: 20,
    xl: 24,
    max: 9999,
  },
  shadows: {
    light: {
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    medium: {
      shadowColor: '#FF4500',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    }
  }
};
