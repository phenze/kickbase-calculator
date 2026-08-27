export interface ReleaseNote {
  version: string;
  date: string;
  features?: string[];
  bugfixes?: string[];
}

export const CHANGELOG: ReleaseNote[] = [
  {
    version: '6.6.2',
    date: '25.08.2026',
    features: [
      'Positionssortierung für Spieler hinzugefügt (TW → ST).',
      'Positions-Badges in den Spielerkarten integriert.',
      'Visuelle Trenner für Positionswechsel in der Liste.',
    ],
    bugfixes: ['Fehler bei der Berechnung der Spieleranzahl behoben.'],
  },
  {
    version: '6.6.1',
    date: '24.08.2026',
    features: [
      'Filter in der Markt Übersicht hinzugefügt: nur Spieler bis zum MW Update anzeigen.',
    ],
  },
  {
    version: '6.6.0',
    date: '24.08.2026',
    features: [
      'Gruppierte Ansicht für Spieler hinzugefügt (z. B. nach fix im Team / zu Verkauf).',
      'UI & Redesign: Überarbeitete Player-Cards und allgemeine UI-Verbesserungen',
      'Expected Value: Neues Feature zur Ermittlung des Erwartungswerts',
      'Wartungsbanner: Maintenance Banner für anstehende Wartungsarbeiten ergänzt',
      'Liga-Hinweis: Benachrichtigung integriert, falls keine Liga ausgewählt ist',
      'Liga-Erfolge: Automatische Deaktivierung von Achievements, wenn ligaweit abgeschaltet',
    ],
    bugfixes: [
      'Refactoring: Numeral-Bibliothek komplett entfernt und durch eigene Directives/Pipes ersetzt',
      'Kaderberechnung: Fix für Spieleranzahl gelöschter Spieler und der Kader-Zuordnung',
    ],
  },
  {
    version: '6.5.0',
    date: '19.08.2026',
    features: ['Framework Update: Upgrade der Anwendung auf Angular 22'],
  },
];
