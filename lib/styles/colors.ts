export const colors = {
  positive: '#20A05C',
  warning: '#E2B32C',
  danger: '#CE1E1B',

  orange: {
    1: '#FEF0E9',
    2: '#FCDCCB',
    3: '#FAC0A1',
    4: '#F8A376',
    5: '#F6874C',
    6: '#F46D25',
    7: '#CF5D1F',
    8: '#AD4D1A',
    9: '#8B3E15',
    10: '#6E3111',
  },

  neutral: {
    1: '#FFFFFF',
    2: '#FDFDFD',
    3: '#F6F6F5',
    4: '#F1F1F1',
    5: '#DDDCDB',
    6: '#C7C5C4',
    7: '#999694',
    8: '#6C6764',
    9: '#5A5451',
    10: '#3F3835',
    11: '#38312E',
    12: '#2F2824',
    13: '#1D1511',
  },
} as const;

export type ColorToken = keyof typeof colors;
