---
currentMenu: header
---

# Liga Daten
 Im oberen Bereich könnt ihr die Liga auswählen für die ihr euren Kader verwalten wollt. (roter Bereich)
 Nachdem diese ausgewählt wurde werden die Daten dafür geladen (grüner Bereich).

Ihr seht dann euren aktuellen Kontostand und alle erwarteten Ausgaben, also alle austehenden Angebote die ihr gerade am markt abgegeben habt.

### Erwartete Ausgaben
Die erwarteten Ausgaben können nach belieben verändert werden. So kann man beispielsweise eine Summe x eintragen die man für Spieler x ausgeben mag und kann dann auf Basis dessen seinen Kader berechnen/planen. Mehr dazu weiter unten.
<a name="extraAmount"></a>

### Marktwertänderungen
Marktwertänderungen werden erst nach dem Laden der [Details](#details) mit einberechnet. Details können entweder pro Spieler oder alle [auf einmal](#details) geladen werden.
Da sich der Marktwert jeden Tag ändert, kann der damit erwirtschaftete Gewinn/Verlust bis Freitag nur grob geschätzt werden. Diese Zahl ist also nie genau. Gibt euch aber einen groben Anhaltspunkt wieviel Geld man noch erwirtschaftetet, sofern sich der Marktwert immer genauso weiter steigert oder fällt.
<a name="marketChanges"></a>

Die Marktwertänderung wird immer bis Freitag in die Berechnung mit einbezogen da dann meist Spieltage beginnen. Die Anzahl der Tage kann aber auch [hier](#countDays) geändert werden.

 ![Liga Daten](https://pascalhenze.de/kickbase-doc/assets/kickbase_header.png)

# Optionen
In diesem Abschnitt können verschiedene Optionen getätigt werden:

<a name="options"></a>
![Optionen](https://pascalhenze.de/kickbase-doc/assets/kickbase_options.png)

### Erwarte Ausgaben/Ausstehende Angebote einbeziehen
Beim Aktivieren dieser Option wird die Summe die ihr weiter oben bei [Erwartete Ausgaben](#extraAmount) eingetragen habt in die Berechnung mit eingeschlossen. Der Betrag wird also von euren Kontostand abgezogen.

### Negative Marktwertänderung mit einbeziehen
Beim Aktivieren dieser Option werden auch dei negativen Marktwerte in die Berechnung der Gewinne/Verluste bis Freitag mit einbezogen. Normalerweise holt man sich am Mittwoch ein Angebot und sichert sich so den Marktwert. Deswegen kann diese Option nur bei Bedarf aktiviert werden. siehe [Marktwertänderungen](#marketChanges)

### Sortierung
Hier kann man die Sortierung der List der Spieler einstellen. Sie Sortierung MW Änderung greift erst nachdem alle [Details](#details) geladen wurden.

### Einnahmen Anzahl Tage ( Tag X)
Hier kann man die Anzahl an Tage einstellen die für den voraussichtlichen [Marktwert Gewinn/Verlust](#marketChanges) verwendet werden soll. Beim Neuladen der Seite wird die Zahl immer auf den jeweils nächsten Freitag gelegt. Man kann diese Zahl hier aber nach Belieben ändern. Sollte der Spieltag z.B. auf einen Samstag fallen.
<a name="countDays"></a>

# Funktionen
In diesem Abschnitt können verschiedene Funktionen ausgelöst werden:

![Funktionen](https://pascalhenze.de/kickbase-doc/assets/kickbase_functions.png)

### Reset
Gleicht einem Reload der Seite. Die Daten werden neu geladen

### Druckansicht
In der Druckansicht werden sensible Informationen wie MW-Änderungen etc ausgeblendet. Es bleibt nur noch der Name und der Richtwert den man aktuell fordert. So kann man einfach Screenshots machen und seinen Kollegen diese schicken zur Übersicht.

Vorher:
![Print No](https://pascalhenze.de/kickbase-doc/assets/kickbase_print_no.png)

Nachher:
![Print Yes](https://pascalhenze.de/kickbase-doc/assets/kickbase_print_yes.png)

### Alle Details laden
Diese Funktion lädt alle Details aller Spieler. Details sind Werte wie die MW-Änderung oder der 3-tage Trend. Außerdem wieviel Gewinn/Verlust man mit einem Spieler erwirtschaftet hat. Diese Details braucht man um manche [Optionen](#options)
<a name="details"></a>