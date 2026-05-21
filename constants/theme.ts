// constants/theme.ts
// Dark orange gaming palette — replaces the old dark-navy/blue aesthetic.

export const Theme = {
  // Backgrounds (warm charcoal-black)
  bg:        '#0D0500',
  bgMid:     '#130700',
  bgUp:      '#221100',
  surface:   '#180800',
  surface2:  '#240D00',

  // Text
  text:      '#FFFFFF',
  textDim:   '#C8A87A',
  textMute:  '#7A5230',

  // Accents — orange replaces blue
  primary:   '#FF7A00',
  primaryDk: '#E06000',
  success:   '#4CC38A',
  warn:      '#FFD23F',
  warnDk:    '#FF9F43',
  danger:    '#F76C6C',
  pink:      '#E94B8C',

  // Strokes
  divider:   'rgba(255,150,0,0.10)',
  card:      'rgba(255,150,0,0.04)',
};

// Glassmorphism presets — white base with warm orange borders
export const GlassEffects = {
  light: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor:     'rgba(255,150,0,0.18)',
    borderWidth: 1,
  },
  medium: {
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderColor:     'rgba(255,150,0,0.26)',
    borderWidth: 1,
  },
  strong: {
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderColor:     'rgba(255,150,0,0.38)',
    borderWidth: 1,
  },
};

// Expo template compatibility tokens
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
