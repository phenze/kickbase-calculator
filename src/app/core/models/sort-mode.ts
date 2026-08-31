/** Die auswaehlbaren Sortierungen der Spielerlisten. */
export const SortMode = {
  default: -1,
  marketValueDesc: 1,
  marketValueAsc: 2,
  marketValueChangeDesc: 3,
  marketValueChangeAsc: 4,
  position: 5,
} as const;

export type SortMode = (typeof SortMode)[keyof typeof SortMode];
