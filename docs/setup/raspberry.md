# Raspberry Pi Setup

## Benötigte Hardware

-   Raspberry Pi Model B
-   SD-Card mit mindestens 4GB Speicherkapazität, mindestens Klasse 4
-   Micro-USB-Netzteil mit mindestens 700mA, empfohlen werden 1200mA
-   Aktiver USB-Hub
-   (optional) USB-WLAN-Stick, alternativ kabelgebundene LAN-Verbindung
-   Externe USB-Soundkarte mit Mikrofonanschluss
-   Mikrofon

Zum Einrichten wird zusätzlich benötigt:

-   USB-Tastatur
-   Bildschirm mit HDMI- oder Cinch-Composite-Eingang und dazugehöriges Anschlusskabel
-   PC mit SD-Kartenleser


## Aufbau

-   SD-Karte formatieren
    -   SDFormatter herunterladen: https://www.sdcard.org/downloads/formatter_4/
    -   ZIP-Datei entpacken, installieren und Programm starten
    -   SD-Karte auswählen
    -   "Format size adjustment" in den Optionen aktivieren
    -   Formatieren starten
-   NOOBS-Image (New Out Of Box Software) auf die SD-Karte laden
    -   herunterladen: http://downloads.raspberrypi.org/noobs
    -   entpacken und auf die SD-Karte kopieren
-   SD-Karte in den Raspberry Pi stecken
-   den Raspberry Pi mit allen Komponenten verbinden
    -   USB-Hub
        -   Externe Soundkarte mit Mikrofon
        -   USB-WLAN-Stick
        -   Tastatur
    -   LAN (optional)
    -   Bildschirm
    -   Netzteil


## Installation

### Betriebssystem

Der Raspberry Pi startet nun und zeigt die NOOBS-Hauptansicht, einen Auswahlbildschirm für verschiedene Betriebssysteme. Je nach Anschlussart des Bildschirms muss über die Tastatur der Videomodus umgeschaltet werden, wenn nicht sofort ein Bild erscheint:

-   1: HDMI (Standard)
-   2: HDMI safe mode
-   3: Composite PAL
-   4: Composite NTSC

Folgende Aktionen müssen ausgeführt werden:

-   Sprache und Tastaturlayout auf deutsch stellen
-   Raspbian auswählen
-   Installation starten

### Grundeinstellungen

Nach der Installation startet ein Konfigurations-Programm. Dieses kann auch zu einem späteren Zeitpunkt über den Befehl *raspi-config* erneut gestartet werden.

Unter "Advanced Options" sollten folgende Einstellungen angepasst werden:

-   Hostname zuweisen (Standard ist "raspberrypi"), um den Raspberry im Netzwerk anhand dieses Namens finden zu können
-   SSH-Server aktivieren, um den Raspberry über einen PC im Netzwerk fernsteuerbar zu machen
-   Split Memory: Der Speicher für die GPU kann auf 16MB reduziert werden, da wir sie für unser Projekt nicht benötigen

Der Standard-Benutzer **pi** hat das Passwort **raspberry**. Dieses kann ebenfalls im *raspi-config*-Programm geändert werden.

### Remote-Zugriff

Von nun an werden Tastatur und Bildschirm nicht mehr benötigt, da der Raspberry nun den Remote-Zugriff über SSH/SFTP erlaubt. Unter Windows können dazu z.B. die folgenden Programme verwendet werden:

-   PuTTY für eine Remote Shell: http://www.chiark.greenend.org.uk/~sgtatham/putty/download.html
-   WinSCP zum Dateitransfer: http://winscp.net/eng/download.php

Der SSH-Server ist über den eingestellten Hostnamen auf Port 22 erreichbar.

### Software-Updates einspielen

    sudo apt-get update
    sudo apt-get upgrade

### USB-WLAN-Stick einrichten

-   Folgenden Inhalt zur Datei */etc/wpa_supplicant/wpa_supplicant.conf* hinzufügen (als root):

    network={
    ssid="<SSID>"
    proto=RSN
    key_mgmt=WPA-PSK
    pairwise=CCMP TKIP
    group=CCMP TKIP
    psk="<PASSWORT>"
    }

-   Raspberry neustarten (`sudo reboot`), dabei das LAN-Kabel abziehen
-   Mit `ifconfig` überprüfen, ob eine Verbindung besteht (eine IP ist beim wlan0-Adapter eingetragen)


## Einrichten des Projekts

### Dependencies installieren

    sudo apt-get install git build-essential

### NodeJS-Server und MongoDB

NodeJS und MongoDB müssen manuell installiert werden. NodeJS ist zwar als Paket verfügbar, aufgrund des Release-Zyklus von Debian/Raspbian aber ziemlich veraltet. MongoDB bietet keine Unterstützung für die ARM-Plattform, daher müssen wir auf eine Portierung zurückgreifen.

Für den NodeJS gibt es eine vorkompilierte Binary im offiziellen Download-Bereich, diese ist allerdings nicht immer schon in der aktuellen Version von NodeJS verfügbar.

-   Dateiname der Raspberry-Version: node-v0.XXX-**linux-arm-pi**.tar.gz
-   Aktuellste Version unter http://nodejs.org/dist/latest/
-   Alle Versionen: http://nodejs.org/dist/

Folgende Befehle in die Kommandozeile eingeben, dabei die richtige NodeJS-Version einsetzen:

    cd  ~

    sudo mkdir /opt/node
    wget http://nodejs.org/dist/v0.10.22/node-v0.10.22-linux-arm-pi.tar.gz
    tar xvzf node-v0.10.22-linux-arm-pi.tar.gz
    sudo cp -r node-v0.10.22-linux-arm-pi/* /opt/node
    rm -r node-v0.10.22-linux-arm-pi

    sudo mkdir /opt/mongo
    git clone https://github.com/brice-morin/ArduPi.git
    sudo cp -r ArduPi/mongodb-rpi/mongo/* /opt/mongo
    rm -r ArduPi
    sudo mkdir /data/db
    sudo chown $USER /data/db


Falls beim Löschen der Ordner eine Warnung wegen schreibgeschützten Dateien erscheint, mit `J!` bestätigen.

In der */etc/profile* folgenden Inhalt **vor** den *export*-Befehl einfügen:

    NODE_JS_HOME="/opt/node"
    PATH="$PATH:$NODE_JS_HOME/bin:/opt/mongo/bin/"

-   Ausloggen oder Raspberry neustarten
-   Test der Installation mit `node -v` und `mongo --version`

**Autostart der MongoDB**

Ordner für Logfiles anlegen:

    cd  ~
    mkdir log

Die Datei */etc/init.d/mongod* mit folgendem Inhalt anlegen:

    #!/bin/bash

    ### BEGIN INIT INFO
    # Provides: MongoDB
    # Required-Start: $remote_fs $syslog
    # Required-Stop: $remote_fs $syslog
    # Default-Start: 2 3 4 5
    # Default-Stop: 0 1 6
    # Short-Description: MongoDB Autostart
    # Description: MongoDB Autostart
    ### END INIT INFO

    NAME="MongoDB"
    EXE=/opt/mongo/bin/mongod
    USER=pi
    OUT=/home/pi/log/mongod.log

    case "$1" in

    start)
        echo "starting $NAME: $EXE"
        sudo -u $USER $EXE >> $OUT 2>>$OUT &
        ;;

    stop)
        killall $EXE
        ;;

    *)
        echo "usage: $0 (start|stop)"
    esac

    exit 0

Ausführbar machen und in den Systemstart einbinden:

    sudo chmod 755 /etc/init.d/mongod
    sudo update-rc.d mongod defaults

Starten/stoppen

    sudo /etc/init.d/mongod start
    sudo /etc/init.d/mongod stop

### Projekt herunterladen und installieren

    cd ~
    git clone https://github.com/SBejga/hueper.git
    cd hueper/nodejs
    npm install

Starten mit

    node ~/hueper/nodejs/server.js

Autostart: */etc/init.d/nodejs* mit folgendem Inhalt erstellen:

    #!/bin/bash

    ### BEGIN INIT INFO
    # Provides: NodeJS
    # Required-Start: $remote_fs $syslog
    # Required-Stop: $remote_fs $syslog
    # Default-Start: 2 3 4 5
    # Default-Stop: 0 1 6
    # Short-Description: NodeJS Autostart
    # Description: NodeJS Autostart
    ### END INIT INFO

    NAME="NodeJS"
    EXE=/opt/node/bin/node
    PARAM=/home/pi/hueper/nodejs/server.js
    USER=pi
    OUT=/home/pi/log/nodejs.log

    case "$1" in

    start)
    	echo "starting $NAME: $EXE $PARAM"
    	sudo -u $USER $EXE $PARAM >> $OUT 2>>$OUT &
    	;;

    stop)
    	killall $EXE
    	;;

    *)
    	echo "usage: $0 (start|stop)"
    esac

    exit 0

Ausführbar machen und in den Systemstart einbinden:

    sudo chmod 755 /etc/init.d/nodejs
    sudo update-rc.d nodejs defaults

Starten/stoppen

    sudo /etc/init.d/nodejs start
    sudo /etc/init.d/nodejs stop


## Quellen

-   Raspberry Pi Quick Start Guide: http://www.raspberrypi.org/wp-content/uploads/2012/04/quick-start-guide-v2_1.pdf
-   WLAN Setup: http://pingbin.com/2012/12/setup-wifi-raspberry-pi/
-   NodeJS Setup: http://blog.rueedlinger.ch/2013/03/raspberry-pi-and-nodejs-basic-setup/
-   MongoDB Setup: https://github.com/brice-morin/ArduPi/tree/master/mongodb-rpi
