# Einrichten der Entwicklungsumgebung

unter Windows

## Voraussetzungen

-   Eine Philips Hue Bridge muss im lokalen Netzwerk vorhanden und eingeschaltet sein


## Benötigte Software installieren

-   NodeJS: http://nodejs.org/download/
-   MongoDB: http://www.mongodb.org/downloads
-   Git: http://msysgit.github.io/
-   Arduino IDE: http://arduino.cc/en/Main/Software

NPM, der Node Package Manager, benötigt weitere Software, um NodeJS-Module installieren zu können:

-   Phyton **(Version 2.x!)**: http://python.org/download/
-   Eine beliebige Version des Visual Studio (auch Express), z.B. http://www.visualstudio.com/downloads/download-visual-studio-vs#d-express-windows-desktop


Die IDE kann beliebig gewählt werden, empfohlen wird WebStorm: https://www.jetbrains.com/webstorm/


## Projekt einrichten

-   *Git bash* öffnen
-   Repository klonen: `git clone https://github.com/SBejga/hueper.git`
-   *Node.js command prompt* öffnen
-   mit `cd` in den Ordner *nodejs* im Projekt-Verzeichnis wechseln
-   Dependencies installieren mit `npm install`

Für die MongoDB muss ein Datenverzeichnis angelegt werden, in das sie die Datenbank speichert. Gestartet werden kann sie dann in der Kommandozeile mit

    C:\<Pfad>\bin\mongod.exe --dbpath "C:\<Pfad zum Daten-Verzeichnis>"

Der Einfachheit halber kann dieser Befehl in eine BAT-Datei oder eine Verknüpfung gespeichert werden. Um das Projekt ordnungsgemäß starten zu können, muss die MongoDB aktiv sein.

Das Projekt selbst kann ebenfalls über die Kommandozeile gestartet werden:

    node <Projektpfad>/nodejs/server.js

Bei der Verwendung von WebStorm kann dieser den NodeJS-Server direkt starten. Dazu einfach unter *Run -> Edit configurations...* eine neue NodeJS-Konfiguration anlegen, die die *nodejs/server.js* startet

Ist der NodeJS-Server gestartet, kann der WebClient im Browser über folgende Adresse aufgerufen werden:

http://localhost:8080/



# Einrichten unter Linux

getestet mit Linux Mint 15 (basiert auf Ubuntu 12.04)


## Dependencies

    sudo apt-get install git python build-essential nodejs mongodb arduino

## Einstellungen

Benutzer der Gruppe *dialout* zuordnen, um eine Verbindung mit dem Arduino aufbauen zu können

    sudo usermod -aG dialout username


Danach muss evtl. ein Logout erfolgen oder der PC neugestartet werden, um eine Verbindung zum Arduino aufbauen zu können

In der Arduino-IDE muss der verwendete serielle Port noch unter *Tools -> Serieller Port* eingestellt werden

Die MongoDB startet im Gegensatz zu Windows automatisch beim Systemstart.

Die Einrichtung des Projekts gleicht im Wesentlichen der unter Windows.


**Quellen**

http://playground.arduino.cc/Linux/Mint
