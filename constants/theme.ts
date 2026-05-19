// constants/theme.ts
// Shared color tokens and gradients for the dark navy aesthetic.

export const Theme = {
  // Backgrounds
  bg:        '#0A1230',
  bgMid:     '#0E1838',
  bgUp:      '#1B2A5E',
  surface:   '#101C46',
  surface2:  '#1A2552',

  // Text
  text:      '#FFFFFF',
  textDim:   '#A4B0D8',
  textMute:  '#5C6796',

  // Accents
  primary:   '#5B9BFF',
  primaryDk: '#3578F0',
  success:   '#4CC38A',
  warn:      '#FFD23F',
  warnDk:    '#FF9F43',
  danger:    '#F76C6C',
  pink:      '#E94B8C',

  // Strokes
  divider:   'rgba(255,255,255,0.08)',
  card:      'rgba(255,255,255,0.04)',
};

// Expo template compatibility tokens. These keep the unused tab/template files compiling
// while the main game screens continue using `Theme` above.
export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: Theme.primary,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: Theme.primary,
  },
  dark: {
    text: Theme.text,
    background: Theme.bg,
    tint: Theme.primary,
    icon: Theme.textDim,
    tabIconDefault: Theme.textDim,
    tabIconSelected: Theme.primary,
  },
};

export const Fonts = {
  rounded: undefined,
  mono: undefined,
};
