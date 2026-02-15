export const typography = {
  displayLarge: 'typo-display-large',
  displayMedium: 'typo-display-medium',
  displaySmall: 'typo-display-small',

  headingXLarge: 'typo-heading-xlarge',
  headingLarge: 'typo-heading-large',
  headingMedium: 'typo-heading-medium',
  headingSmall: 'typo-heading-small',
  headingXSmall: 'typo-heading-xsmall',
  headingXXSmall: 'typo-heading-xxsmall',

  bodyLargeBold: 'typo-body-large-bold',
  bodyMediumBold: 'typo-body-medium-bold',
  bodySmallBold: 'typo-body-small-bold',
  bodyXSmallBold: 'typo-body-xsmall-bold',

  bodyLarge: 'typo-body-large',
  bodyMedium: 'typo-body-medium',
  bodySmall: 'typo-body-small',
  bodyXSmall: 'typo-body-xsmall',
} as const;

export type TypographyToken = keyof typeof typography;
