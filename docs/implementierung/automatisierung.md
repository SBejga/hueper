# Automatisierung

Das Automatisierungs-System bringt alle automatisierten Abläufe unter einen Hut. Es unterstützt sowohl zeitgesteuerte und periodisch ablaufende Aktionen als auch die Reaktion auf Sensoren und andere Umwelt-Faktoren.

Das Erstellen eines automatisierten Ablaufs basiert auf folgendem Schema:

-   Jeder Eintrag besitzt eine beliebige Anzahl von **Triggern**. Ereignisse aus der Umwelt oder periodische Zeit-Ereignisse werden mit den Triggern abgeglichen. Stimmt mindestens ein Trigger überein, wird ein Eintrag weiterverarbeitet.
-   Nach dem Auslösen eines Triggers werden die **Bedingungen** des Eintrags überprüft. Dabei ist einstellbar, ob nur mindestens eine oder alle Bedingungen erfüllt sein müssen, um den Eintrag zu akzeptieren.
-   Wurde ein Eintrag akzeptiert, werden dessen **Aktionen** ausgeführt. Aktionen können entweder sofort oder mit einer einstellbaren Verzögerung gestartet werden. Um eine größtmögliche Flexibilität zu erreichen, können Aktionen wiederum benutzerdefinierte Ereignisse sein, die einen Trigger eines anderen Eintrags auslösen können, der wieder mit eigenen Bedingungen verknüpft ist. Ebenso können verzögerte Aktionen, die auf ihre Ausführung warten, durch andere Aktionen abgebrochen werden.

Neben ID und Namen besitzen Automatisierungs-Einträge noch die folgenden zusätzlichen Eigenschaften und Einstellungen;

-   allConditionsNeeded: true, wenn alle Bedingungen erfüllt sein müssen; false, wenn mindestens eine erfüllt sein muss
-   active: Flag, um einen Eintrag auf aktiv/inaktiv zu setzen
-   single: true, wenn der Eintrag nach dem Ausführen gelöscht werden soll, z.B. bei Sleep-Timern oder einmaligen Weckern


Trigger, Bedingungen und Aktionen besitzen jeweils die Eigenschaften **type** und **value**. Die verschiedenen Möglichkeiten und exakten Formate werden nachfolgend angegeben.


## Trigger

#### Licht-Sensor

Periodisch alle 10 Sekunden ausgelöst, wenn der Arduino einen neuen Wert übermittelt

-   type: light
-   value
    -   relation: < / >
    -   threshold: Schwellwert, 0-100

#### Bewegungsmelder

Wird ausgelöst, wenn der Arduino eine Bewegung erkennt. Wird höchstens alle 10 Sekunden ausgelöst.

-   type: motion

#### RFID/NFC-Tag

Wird ausgelöst, wenn ein RFID/NFC-Tag über den Leser gehalten wird. Wird höchstens alle 5 Sekunden ausgelöst

-   type: rfid
-   value: Tag-ID, false für irgendein Tag (auch unbekannte)

#### Netzwerk-Gerät

-   type: device
-   value
    -   action: login / logout
    -   address: MAC-Adresse des Geräts, false für irgendein eingespeichertes Gerät

#### Sprachsteuerung

-   type: speech
-   value: Kommando, das in der erkannten Sprachsequenz enthalten sein muss

#### Wecker

Wird mit dem time-Event einmal pro Minute ausgewertet

-   type: schedule
-   value
    -   hour
    -   minute

#### Periodisch

Für Bedingungen, die ohne bestimmten Auslöser periodisch überprüft werden sollen. Das Intervall wird immer von 0 Uhr aus berechnet, ein Wert von 120 Minuten würde also um 2:00 Uhr, 4:00 Uhr usw. akzeptiert werden.

-   type: periodical
-   value: Anzahl Minuten

#### Benutzerdefiniertes Ereignis

Hört auf benutzerdefinierte Ereignisse, die durch Aktionen von anderen Einträgen ausgelöst werden können

-   type: custom
-   value: Benutzerdefiniertes Ereignis


## Bedingungen

#### Licht-Sensor

Überprüft den letzten gesendeten Wert des Licht-Sensors

-   type: light
-   value
    -   relation: < / >
    -   threshold: Schwellwert, 0-100

#### Bewegungsmelder

Überprüft die Zeit, die seit der letzten registrierten Bewegung vergangen ist

-   type: light
-   value
    -   relation: < / > (< = länger her)
    -   time: Zeit in Sekunden

#### RFID/NFC-Tag

Überprüft die Zeit, die seit dem letzten Lesen eines bestimmten RFID/NFC-Tags vergangen ist

-   type: rfid
-   value
    -   id: false für irgendein Tag
    -   relation: < / > (< = länger her)
    -   time: Zeit in Sekunden

#### Netzwerk-Gerät

Überprüft, ob derzeit ein bestimmtes oder irgendein bekanntes Gerät im Netzwerk anwesend ist

-   type: device
-   value
    -   address: MAC-Adresse, false für irgendein eingespeichertes Gerät
    -   active: true für gerade anwesend, false für abwesend

Alternativ kann auch die Zeit seit der letzten Aktivität überprüft werden. Dazu neben der MAC-Adresse folgende Einträge zu *value* hinzufügen

-   relation: < / > (< = länger her)
-   time: Zeit in **Minuten**

#### Aktuelle Tageszeit

-   type: time
-   value
    -   relation: < / >
    -   hour
    -   minute

#### Aktueller Wochentag

-   type: weekdays
-   value: Array aus Wochentag-Nummern, beginnend bei der 0 mit Sonntag!

#### Benutzer aktiv

Überprüft, ob die Anwendung aktuell auf einem Gerät geöffnet ist

-   type: connections
-   value: true / false (true für *in Benutzung*)

#### Aktueller Status der Lampen

Überprüft, ob die Lampen derzeit einem bestimmten Status entsprechen oder ob eine Szene aktiv ist. Bei nicht erreichbaren Lichtern oder ausgeschalteten Lichtern, die auf eine andere Eigenschaft (z.B. die aktuelle Farbe) überprüft werden sollen, wird die Bedingung abgelehnt.

-   type: state
-   value
    -   type: light / group / scene
    -   id [nur bei value.type == scene]: ID der Szene, die überprüft werden soll
    -   state [nur bei value.type != scene]: Status, auf den die Lampe oder Gruppe überprüft werden soll


## Aktionen

Alle Aktionen können mit dem *delay*-Attribut (in Sekunden) verzögert ausgeführt werden.

#### Licht ändern

-   type: light
-   value
    -   id: ID der Lampe, false oder 0 für alle Lampen
    -   state: Status, der angenommen werden soll. Kann die Überblendzeit als *transitiontime*-Attribut beinhalten

#### Gruppe ändern

-   type: group
-   value
    -   id: ID der Gruppe
    -   state: Status, der angenommen werden soll. Kann die Überblendzeit als *transitiontime*-Attribut beinhalten

#### Szene anwenden

-   type: scene
-   value
    -   id: ID der Szene
    -   transition: Überblendzeit, false für Standardwert

#### Benutzerdefiniertes Ereignis

-   type: custom
-   value: (Selbst festgelegter) Name des Ereignisses

#### Alle verzögerten Aktionen abbrechen

Funktioniert nicht vollständig korrekt, wenn diese Aktion selbst verzögert wird!

-   type: cancelDelay
