---
currentMenu: rechner
---

# Rechner

## Beschreibung

Die Hauptanwendung findet man im unteren Teil der Webseite. Hier werden euch alle Spieler der gewählten Liga aufgelistet.

Der Sinn der Anwendung ist herauszufinden welche Spieler verkauft werden müssen um aus dem Minus zu kommen.

Durch Klick auf einen Spieler werden dessen [Details](https://pascalhenze.de/kickbase-doc/doc/header.html#details) geladen.

Durch Klick auf das Profilbild wird dieser aus der Liste entfernt (WICHTIG: Er wird dadurch nicht aus euren Team entfernt. Nach einem Reload ist alles wieder beim alten).

### Funktion

Alle Spieler in der Liste werden als Verkausobjekt gehandelt. Die Summe ist also der Betrag der erziehlt wird, sollten alle Spieler aus der Liste auch tatsächlich verkauft werden.

![Summe](https://pascalhenze.de/kickbase-doc/assets/kickbase_sum.png)

Alle Spieler sollen natürlich nicht verkauft werden. Deswegen kann man am Anfang alle Spieler komplett [entfernen](#removePlayer) die man sowieso nicht verkauft.
Dadurch wächst der Kaderwert (grüner kasten) und der Kontostand schrumpft (roter kasten).

Unter dem Kontostand sehe ich alle Infos zum [Kaderwert](#kader).


![Remove2](https://pascalhenze.de/kickbase-doc/assets/kickbase_remove2.png)

Bleibt nur noch die Liste der Spieler übrig die eventuell zum Verkauf stehen sieht man an der Farbe der Spielerkachel ob dieser noch finanziert werden kann (grün) oder ob dieser nicht mehr im Budget liegt (rot).

Nehmen wir als Ausgangslage folgendes Beispiel:
![Dicide1](https://pascalhenze.de/kickbase-doc/assets/kickbase_dicide1.png)

Nach dem Entfernen aller Spieler die nicht verkauft werden sollen bleiben die drei Spiler Prömel/Fulgini und Bell übrig.
Würde ich alle 3 verkaufen hätte ich 21.292.939 € am Konto. Ich kann mir also noch ein oder mehrere dieser Spieler finanzieren.

#### Möglichkeit 1
Ich behalte Prömel. Durch Klick auf die Kachel wird dieser markiert zum Behalten (Kachel färb sich grau).
Anschließend sieht man sofort dass sich die Kacheln von Bell und Fulgini rot färben. Das bedeutet, dass ich mir diese beiden nicht mehr finanzieren kann.

![Dicide2](https://pascalhenze.de/kickbase-doc/assets/kickbase_dicide2.png)

#### Möglichkeit 2
Ich behalte Bell. Durch Klick auf die Kachel wird dieser markiert zum Behalten (Kachel färb sich grau).
Jetzt sieht man sofort dass ich mir dann Prömel nicht mehr finanzieren kann (rot). Allerdings bleibt die Kachel von Fulgini grün was bedeutet dass dieser noch finanziert werdern kann

![Dicide3](https://pascalhenze.de/kickbase-doc/assets/kickbase_dicide3.png)

Durch den Klick auf die Fulgini Kachel sehe ich dann den Kontostand wenn ich den auch behalten würde.
![Dicide4](https://pascalhenze.de/kickbase-doc/assets/kickbase_dicide4.png)




### FAQ

#### Spieler aus Liste entfernen
<a name="removePlayer"></a>
Durch einen Klick auf das Profilbild wird der Spieler aus der List komplett entfernt. Er soll demnach nicht verkauft werden. Der MW wird dem [Kaderwert](#kader) gutgeschrieben.

WICHTIG: Der Spieler wird nicht aus euren Kader in der Kickbase App entfernt. Nach einem reload der Seite ist alles wieder beim Alten.

![Remove](https://pascalhenze.de/kickbase-doc/assets/kickbase_remove.png)

#### Spieler permanent deaktivieren
<a name="deletePlayer"></a>
Durck Klick auf das "Spieler dauerhaft entfernen" Icon kann ein Spieler (grüner kasten) dauerhaft entfernt werden. Das bedeutet, dass dieser Spieler auch nach einen Reload aus der Liste entfernt wird. So spart man sich den Aufwand die Big Boys immer wieder aus der Liste für die Berechnung zu entfernen.

Diese Spieler können für die bessere Übersicht auch ganz aus der Liste ausgeblendet werden (roter kasten)

WICHTIG: Der Spieler wird nicht aus euren Kader in der Kickbase App entfernt. Nach einem reload der Seite ist alles wieder beim Alten.

![Delete](https://pascalhenze.de/kickbase-doc/assets/kickbase_delete.png)

#### Spieler deaktivieren
Ist man sich bei einem Spieler nicht sicher ob dieser verkauft werden muss, so kann man diesen in der Liste belassen und nur temporär deaktivieren. 
Durch Klick auf die Spieler Kachel wird dieser deaktiviert. Die Spieler Kachel wird grau eingefärbt.
Für die Berechnung hat es denselben Effekt als würde man den Spieler entfernen.
<a name="deactivatePlayer"></a>

#### Kaderwert
<a name="kader"></a>
Der Kaderwert ergibt sich aus allen Spielern die nicht verkauft werden sollen. Also alle Spieler die entweder komplett [entfernt](#removePlayer) oder [deaktiviert](#deactivatePlayer) wurden.
Anhand vom Kaderwert sehe ich dann den Betrag den ich ins Minus gehen kann.
Der Wert des Maximaln Angebots ist der Minusbetrag + der aktuelle Kontostand, also der Wert den ich maximal auf einen Spieler bieten kann.

![Kader](https://pascalhenze.de/kickbase-doc/assets/kickbase_kader.png)
