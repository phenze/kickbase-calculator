/**
 * Die beiden Ansichten der App. Liegt bewusst in core/models statt in der
 * AppComponent: der ApiService persistiert den zuletzt gewaehlten Modus und
 * haette sonst einen Import-Zyklus auf die Komponente.
 */
export const DisplayMode = {
  calculator: 'calculator',
  marketOverview: 'marketOverview',
} as const;

export type DisplayMode = (typeof DisplayMode)[keyof typeof DisplayMode];
