import { SortMode } from '../models/sort-mode';
import { KickbasePlayer } from '../models/kickbase-player';

/**
 * Sortiert eine Spielerliste nach dem gewaehlten Modus.
 *
 * Gibt immer eine neue Liste zurueck und laesst die uebergebene unangetastet.
 * Ein unbekannter Modus (z. B. ein kaputter Wert aus dem localStorage) laesst
 * die Reihenfolge bewusst unveraendert.
 */
export function sortPlayers(players: readonly KickbasePlayer[], mode: number): KickbasePlayer[] {
  const sorted = [...players];

  switch (mode) {
    case SortMode.position:
      return sorted.sort((a, b) => (a.position || 99) - (b.position || 99));

    case SortMode.marketValueAsc:
    case SortMode.marketValueDesc:
      return sorted.sort(byValue((player) => player.marketValue, mode === SortMode.marketValueAsc));

    case SortMode.marketValueChangeAsc:
    case SortMode.marketValueChangeDesc:
      return sorted.sort(
        byValue(
          (player) => player.stats?.realMarketValueChange,
          mode === SortMode.marketValueChangeAsc,
        ),
      );

    case SortMode.default:
      return sorted.sort(byExpiryWithKickbaseFirst);

    default:
      return sorted;
  }
}

/**
 * Vergleicht zwei Spieler anhand eines Zahlenwerts. Spieler ohne Wert (z. B.
 * ohne geladene Details) landen immer am Ende, statt an ihrer zufaelligen
 * Ausgangsposition zu bleiben.
 */
function byValue(
  select: (player: KickbasePlayer) => number | undefined,
  ascending: boolean,
): (a: KickbasePlayer, b: KickbasePlayer) => number {
  return (a, b) => {
    const aValue = select(a);
    const bValue = select(b);

    if (aValue === undefined || bValue === undefined) {
      if (aValue === bValue) {
        return 0;
      }
      return aValue === undefined ? 1 : -1;
    }

    if (aValue === bValue) {
      return 0;
    }

    const result = aValue < bValue ? -1 : 1;
    return ascending ? result : -result;
  };
}

/** Standardsortierung: Kickbase-Spieler zuerst, danach nach Ablaufzeit. */
function byExpiryWithKickbaseFirst(a: KickbasePlayer, b: KickbasePlayer): number {
  const aIsUserPlayer = (a.username || '').length > 0;
  const bIsUserPlayer = (b.username || '').length > 0;

  if (aIsUserPlayer && !bIsUserPlayer) {
    return 1;
  }
  if (!aIsUserPlayer && bIsUserPlayer) {
    return -1;
  }

  const aExpiry = a.expiry ?? Number.MAX_SAFE_INTEGER;
  const bExpiry = b.expiry ?? Number.MAX_SAFE_INTEGER;

  if (aExpiry === bExpiry) {
    return 0;
  }
  return aExpiry > bExpiry ? 1 : -1;
}
