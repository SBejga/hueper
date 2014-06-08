# Sprachsteuerung

## mit SoX / Google Speech API

-   Das Soundprocessing-Programm SoX beginnt eine Audio-Datei aufzunehmen, sobald die Mikrofon-Lautstärke einen einstellbaren Schwellwert übersteigt
-   Fällt die Lautstärke danach für mindestens 0.75 Sekunden unter diesen Schwellwert, wird die Aufnahme beendet
-   Die Aufgenommene Datei wird zu Analyse an die Google Speech API geschickt
-   Konnte der Inhalt erkannt werden (Eingestellte Sprache beachten!), liefert die API den gesprochenen Text als String zurück


## mit Julius

Julius ist ein Open Source Spracherkennungs-Programm, das von mehreren japanischen Universitäten entwickelt wurde. Es funktioniert unabhängig von der Sprache und wertet Audio-Signale direkt auf dem lokalen Gerät aus, man benötigt für den Betrieb allerdings ein Akustik-Modell sowie ein Wörterbuch oder eine Grammatik. Bei Julius mitgeliefert ist lediglich ein Modell für die japanische Sprache. Modelle für andere Sprachen kann man z.B. unter http://voxforge.org/ herunterladen oder selbst erstellen.

Für die Benutzung mit der Standard-Grammatik wird das englische Akustik-Modell von VoxForge empfohlen. Da dieses der GPL unterliegt, ist es nicht im Projekt enthalten und muss bei der Installation zusätzlich heruntergeladen werden:

-   Download von http://www.repository.voxforge1.org/downloads/Nightly_Builds/AcousticModel-2014-05-15/HTK_AcousticModel-2014-05-15_16kHz_16bit_MFCC_O_D.tgz
-   Entpacken nach *julius/acoustic_model_files*

Um eine angemessen zuverlässige Erkennung zu gewährleisten, beherrscht die Standard-Grammatik nur einen einfachen Satz von Regeln:

-   Start-Befehle: Computer, Hue
-   Kommandos: Scene, initiate, stop
-   Bereiche: All, Zahlen von zero bis nine
-   Werte: Off, on, dark, bright, blue, green, red, yellow, white, purple, orange

Diese Wort-Kategorien können folgendermaßen zusammengesetzt werden:

-   Start Wert
-   Start Wert Wert
-   Start Bereich
-   Start Bereich Wert
-   Start Kommando
-   Start Kommando Bereich
-   Start Kommando Wert

Bsp: *Computer one blue*


Die Grammatik kann in der *.voca* und *.grammar*-Datei im Ordner *julius/grammar* modifiziert werden. Um eingesetzt werden zu können, muss sie noch kompiliert werden:

-   Download des Quickstart-Archivs für das entsprechende Betriebssystem von http://www.repository.voxforge1.org/downloads/Nightly_Builds/AcousticModel-2014-05-15/
-   *bin*-Ordner in denselben Ordner wie den *grammar*-Ordner mit der modifizierten Grammatik entpacken
-   in den *grammar*-Ordner wechseln
-   [Linux] `../bin/mkdfa.pl hue` aufrufen. Dadurch werden die *.dict*-, *.dfa*- und *.term*-Datei neu generiert



## Quellen

-   https://github.com/sreuter/node-speakable
-   http://www.aonsquared.co.uk/raspi_voice_control
-   http://julius.sourceforge.jp/en_index.php
-   http://www.voxforge.org/home/dev/acousticmodels/windows/create/htkjulius/tutorial/data-prep/step-1
