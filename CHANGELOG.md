# Changelog

Alle wichtigen Änderungen und Updates des Kickbase Calculators auf einen Blick.

---

## [Unreleased]

### 🚀 Neue Features & Verbesserungen
- **Dunkelmodus:** Der Rechner lässt sich jetzt zwischen Hell, Dunkel und der System-Einstellung des Geräts umschalten. Der Schalter sitzt oben rechts und ist auch auf der Login-Seite erreichbar. Die Auswahl wird im Browser gespeichert.
- **Symbole sichtbar:** Die Icons in Buttons, Hinweisen und Überschriften (Rechner, Markt, Aktualisieren, Logout, Erfolge …) werden jetzt tatsächlich angezeigt – das dafür nötige Icon-Paket hatte bisher gefehlt.
- **Startzustand der Verkaufsauswahl umschaltbar:** Neue Option "Niemanden zum Verkauf vormarkieren". Damit ist nach dem Laden kein Spieler vorausgewählt und du markierst nur die, die wirklich verkauft werden sollen.

### 🐛 Bugfixes & Wartung
- **Sortierung "MW Änderung" korrigiert:** Die beiden Richtungen waren vertauscht – bei "MW Änderung ↓" stand die niedrigste Änderung oben statt der höchsten. Spieler ohne geladene Details stehen jetzt außerdem immer am Ende der Liste.

---

## [6.7.0] - 27.08.2026

### 🚀 Neue Features & Verbesserungen
- **Sicherheits- & Datenschutz-Update:** Deine Anmeldedaten werden ab sofort noch geschützter verarbeitet. Veraltete Speichereinträge im Browser wurden automatisch und sicher bereinigt.
- **Stabilere Server-Verbindung:** Vollständige Überarbeitung der API-Schnittstelle für eine zuverlässigere und schnellere Datenübertragung.
- **Neue Hinweismeldungen:** Bei Verbindungsproblemen oder abgelaufener Sitzung erscheint nun direkt ein einfaches Warnbanner.

### 🐛 Bugfixes & Wartung
- **Sitzungsverwaltung:** Automatisches Verlängern der Anmeldung im Hintergrund sowie sauberes Ausloggen, falls die Sitzung abgelaufen ist.

> ⚠️ **WICHTIGER HINWEIS:**  
> Aufgrund der Umstellung des Sicherheitssystems kann es sein, dass du einmalig ausgeloggt wurdest. Bitte melde dich bei Bedarf einfach erneut an.

---

## [6.6.2] - 25.08.2026

### 🚀 Neue Features
- Positionssortierung für Spieler hinzugefügt (Torwart → Stürmer).
- Positions-Badges direkt in den Spielerkarten integriert.
- Visuelle Trenner für Positionswechsel in der Liste.

### 🐛 Bugfixes
- Fehler bei der Berechnung der Spieleranzahl behoben.

---

## [6.6.1] - 24.08.2026

### 🚀 Neue Features
- Filter in der Markt-Übersicht hinzugefügt: Nur Spieler bis zum Marktwert-Update anzeigen.

---

## [6.6.0] - 24.08.2026

### 🚀 Neue Features
- Gruppierte Ansicht für Spieler hinzugefügt (z. B. nach "Fix im Team" vs. "Zu verkaufen").
- **UI & Redesign:** Überarbeitete Player-Cards und allgemeine Design-Verbesserungen.
- **Expected Value:** Neues Feature zur Ermittlung des Erwartungswerts.
- **Wartungsbanner:** Banner für anstehende Wartungsarbeiten ergänzt.
- **Liga-Hinweis:** Benachrichtigung integriert, falls keine Liga ausgewählt ist.
- **Liga-Erfolge:** Automatische Deaktivierung von Achievements, wenn ligaweit abgeschaltet.

### 🐛 Bugfixes
- **Refactoring:** Numeral-Bibliothek komplett entfernt und durch eigene Directives/Pipes ersetzt.
- **Kaderberechnung:** Korrektur für Spieleranzahl gelöschter Spieler und der Kader-Zuordnung.

---

## [6.5.0] - 19.08.2026

### 🚀 Neue Features
- **Framework Update:** Upgrade der Anwendung auf Angular 22.
