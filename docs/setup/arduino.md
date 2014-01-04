# Arduino Setup

## Benötigte Hardware

-   Arduino Uno
-   Adafruit RFID/NFC shield
-   Stackable Header Kit
-   Seeedstudio Grove Base Shield
-   Seeedstudio Grove Light Sensor
-   Seeedstudio Grove PIR Motion Sensor
-   Seeedstudio Grove Sound Sensor
-   mindestens 3 4-Pin-Verbinderkabel
-   USB-A auf USB-B-Verbinderkabel

## Aufbau

-   Auflöten der Stackable Header (nicht die mitgelieferten!) auf das RFID/NFC Shield. Es müssen auf beiden Seiten die äußeren Bohrlöcher verwendet werden
-   Das RFID/NFC Shield wird auf den Arduino gesteckt
-   Das Base Shield wird auf das RFID/NFC Shield gesteckt
-   Die Folgenden Komponenten werden per 4-Pin-Verbinderkabel an das Base Shield angeschlossen:
    -   Licht-Sensor an A0
    -   Sound-Sensor an A2
    -   Motion-Sensor an D8
    -   (optional) ein Schalter/Taster kann an D6 angeschlossen werden. Verbinden der beiden äußeren Pins (GND mit D6) = Schalter geschlossen

## Installation und Flashen

-   Download der Arduino IDE: http://arduino.cc/en/Main/Software#toc1
-   Arduino IDE installieren
-   Verbinden des Arduino mit dem PC über das USB-A/B-Kabel
-   Auf Treiberinstallation warten, danach im Windows-Geräte-Manager den COM-Port des Arduino herausfinden
-   Adafruit RFID/NFC Shield I2C-Library installieren
    -   ZIP-Download von https://github.com/adafruit/Adafruit_NFCShield_I2C
    -   entpacken, umbenennen des Ordners in *Adafruit_NFCShield_I2C* und kopieren in *C:\Users\\<Benutzer\>\Documents\Arduino\libraries*
-   Arduino IDE öffnen
-   Unter *Tools -> Board* **Arduino UNO** auswählen
-   Unter *Tools -> Serieller Port* den zuvor ermittelten Port des Arduino auswählen
-   Sketch unter *arduino\arduino.ino* öffnen
-   mit Klick auf den *Upload*-Button wird das Sketch auf den Arduino geflasht


## Quellen

-   IDE installation guide: http://arduino.cc/en/Guide/Windows
-   RFID/NFC Shield: http://learn.adafruit.com/adafruit-pn532-rfid-nfc
-   Base Shield: http://www.seeedstudio.com/wiki/Grove_-_Base_Shield_V1.3
-   Light Sensor: http://www.seeedstudio.com/wiki/Grove_-_Light_Sensor
-   PIR Motion Sensor: http://www.seeedstudio.com/wiki/Grove_-_PIR_Motion_Sensor
-   Sound Sensor: http://www.seeedstudio.com/wiki/Grove_-_Sound_Sensor
