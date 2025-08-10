const appConfig = {
  title: 'BRILS GYM',

  // UI hints for your layout (e.g. toolbar title)
  ui: {
    titleColor: '#EAB308', // yellow-500
    titleWeight: 800,      // extra-bold
  },

  theme: {
    default: 'light' as const,

    // Dark-ish "light" theme (no whites)
    light: {
      primary:   '#E5E7EB', // text/icons on dark bg
      secondary: '#9CA3AF', // muted text
      accent:    '#EAB308', // yellow accent
      accentOn:  '#111827', // text color when bg is accent
      background:'#161A1E', // page body
      surface:   '#1F242B', // cards/app-bar
      error:     '#F87171',
      info:      '#FBBF24',
      success:   '#34D399',
      warning:   '#f5800bff',
    },

    // Even darker variant
    dark: {
      primary:   '#E5E7EB',
      secondary: '#9CA3AF',
      accent:    '#EAB308',
      accentOn:  '#0B0F19',
      background:'#0F1317',
      surface:   '#171B21',
      error:     '#F87171',
      info:      '#FBBF24',
      success:   '#34D399',
      warning:   '#f5800bff',
    },
  },
};

export default appConfig;
