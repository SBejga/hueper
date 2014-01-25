# Dokumentation Arduino

## Kommunikationsprotokoll

Der Arduino kommuniziert über das UART-Protokoll mit seinem Host. Die Kommunikation läuft über das USB-Anschlusskabel, das gleichzeitig die Stromversorgung übernimmt. Er meldet sich als serielles Gerät an (unter Windows auf einem COM-Port). Die eingestellte Baudrate ist **115200**.

Der Nachrichtenaustausch erfolgt per JSON. Jede Nachricht endet mit einem Zeilenumbruch (`\n`).

### Nachrichten:

**{ "light": \<int\> }**

Periodische Aktualisierung (alle 10s) des Helligkeitssensor-Zustands. Der Wert bewegt sich im Bereich von 0-100.


**{ "action": "beat", "strength": \<int\>, "factor": \<float\> }**

Erkennung eines Musik-Taktschlags. Der *strength*-Wert gibt die Amplituden-Quadratsumme der letzten Messreihe an und kann zur Filterung der Mindestlautstärke genutzt werden. *factor* gibt den Lautstärke-Unterschied des Schlags zu den vorher gemessenen Samples an, ist also ein Maß für die Eindeutigkeit der Erkennung.

**{ "action": "button" }**

Ein Knopfdruck wurde erkannt.

**{ "action": "motion" }**

Der Bewegungsmelder hat eine Bewegung erkannt.

**{ "nfc": \<string\> }**

Ein RFID/NFC-Chip wurde erkannt. Der Wert enthält die eindeutige ID des Chips (8 oder 14 Zeichen).

## Detaillierte Funktionsweise

### Licht-Sensor

Der Wert des Licht-Sensors wird jede Sekunde gemessen und gespeichert. Bei der periodischen Übermittlung an den Host wird der Durchschnitt der letzten Periode berechnet und gesendet. Dies verhindert, dass kurze Helligkeitsänderungen ungewollte Aktionen auslösen.

### Beat-Erkennung

Die Beat-Erkennung funktioniert nach dem folgenden Prinzip:

-   Bei jedem Zyklus des Arduino-Hauptprogramms wird der aktuelle Wert des Sensors gemessen. Da er manchmal trotz Umgebungsgeräuschen 0 zurückgibt, wird so oft gemessen, bis ein Wert ungleich 0 herauskommt
-   Der gemessene Wert wird durch einen festgelegten Wert geteilt, quadriert und dann auf eine Summe aufaddiert (Sample-Summe)
-   Die Summe besteht aus einer festgelegten Anzahl von Messungen. Wurde n mal gemessen, wird die Summe in ein Array zusammen mit früheren Summen gespeichert (Frames)
-   Um zu erkennen, ob die aktuelle Summe einen Taktschlag darstellt, wird ihr Wert mit dem Durschnittswert der gespeicherten Frames verglichen
-   Überschreitet der Unterschieds-Faktor einen festgelegten Schwellwert, wird ein Beat erkannt. Da bei höherer Musik-Lautstärke der Unterschied zwischen Taktschlägen und restlicher Musik nicht so groß ist, wird die Amplitudensumme des aktuellen Samples mit in den Schwellwert eingerechnet
-   Um eine zu schnelle Takterkennung zu verhindern, darf ein Schlag erst eine festgelegte Zeitspanne nach dem letzten erkannt werden
