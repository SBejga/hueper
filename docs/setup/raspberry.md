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

### USB-WLAN-Stick einrichten (optional)

Folgenden Inhalt zur Datei */etc/wpa_supplicant/wpa_supplicant.conf* hinzufügen (als root):

    network={
    ssid="<SSID>"
    psk="<PASSWORT>"
    }

-   Raspberry neustarten (`sudo reboot`), dabei das LAN-Kabel abziehen
-   Mit `ifconfig` überprüfen, ob eine Verbindung besteht (eine IP ist beim wlan0-Adapter eingetragen)

#### Verwenden des Raspberry Pi als WLAN-Brücke zur Hue-Bridge (optional)

Der Raspberry Pi kann so eingerichtet werden, dass er seine WLAN-Verbindnug an Geräte weitergibt, die an seiner LAN-Buchse angeschlossen sind. Ist es z.B. aufgrund der Entfernung zu den Lampen nicht möglich, die Hue-Bridge direkt an den Router anzuschließen, kann sie einfach an den Raspberry Pi angeschlossen werden.

Die ursprüngliche Netzwerk-Konfiguration kann mit `sudo cp /etc/network/interfaces /etc/network/interfaces.bak` gesichert werden, um sie bei Bedarf wiederherstellen zu können

Die Installation erfolgt über das Script *raspberry/wifi-bridge.sh* (Quelle: hackhappy.org, nachträglich modifiziert). Nachdem es auf den Pi geladen wurde, muss es mit `chmod +x wifi-bridge.sh` ausführbar gemacht und dann mit `sudo ./wifi-bridge.sh` installiert werden.

Funktionsweise:

-   Das Script installiert einen DHCP-Server (*isc-dhcp-server*), der der Hue-Bridge beim Verbindungsaufbau eine IP zuweist
-   Die *iptables*-Firewall wird so konfiguriert, dass Pakete zwischen Ethernet- und WLAN-Port weitergeleitet werden können

Nachteile:

-   Aufgrund des eigenen Adressbereichs kann die Hue-Bridge nur noch vom Raspberry Pi aus erreicht werden. Das bedeutet, dass die Hue-App und andere Drittsoftware keinen Zugriff mehr auf die Bridge erhalten
-   Der LAN-Port kann nicht mehr zum Verbinden ins Internet benutzt werden. Dazu muss der DHCP-Server gestoppt und die Netzwerk-Konfiguration geändert werden

### Firmware-Update

    sudo rpi-update

Danach ist ein Neustart nötig, um die neue Firmware zu aktivieren.


### USB-Soundkarte einrichten

Die Datei *home/pi/.asoundrc* mit folgendem Inhalt anlegen:

    pcm.!default {
        type hw
        card 1
    }

    ctl.!default {
        type hw
        card 1
    }

Die Aufnahme-Lautstärke kann über das Programm `alsamixer` geändert werden. Um die Einstellungen dauerhaft zu speichern, folgenden Befehl eingeben:

    sudo alsactl store 1


__________________
**Die nachfolgenden Schritte können automatisiert werden**

Dazu einfach die *raspberry/setup.sh* auf den Raspberry laden, mit `chmod +x setup.sh` ausführbar machen und mit `sudo ./setup.sh` starten
__________________


### Software-Updates einspielen

    sudo apt-get update
    sudo apt-get -y upgrade


## Einrichten des Projekts

### Dependencies installieren

    sudo apt-get -y install git python build-essential sox nmap alsa-tools alsa-oss flex zlib1g-dev libc-bin libc-dev-bin python-pexpect libasound2 libasound2-dev cvs

### NodeJS-Server und MongoDB

NodeJS und MongoDB müssen manuell installiert werden. NodeJS ist zwar als Paket verfügbar, aufgrund des Release-Zyklus von Debian/Raspbian aber ziemlich veraltet. MongoDB bietet keine Unterstützung für die ARM-Plattform, daher müssen wir auf eine Portierung zurückgreifen.

Für den NodeJS gibt es eine vorkompilierte Binary im offiziellen Download-Bereich, diese ist allerdings nicht immer schon in der aktuellen Version von NodeJS verfügbar.

-   Dateiname der Raspberry-Version: node-v0.XXX-**linux-arm-pi**.tar.gz
-   Aktuellste Version unter http://nodejs.org/dist/latest/
-   Alle Versionen: http://nodejs.org/dist/

Folgende Befehle in die Kommandozeile eingeben, dabei die richtige NodeJS-Version einsetzen:

    cd  ~

    sudo mkdir /opt/node
    wget http://nodejs.org/dist/v0.10.26/node-v0.10.26-linux-arm-pi.tar.gz
    tar xvzf node-v0.10.26-linux-arm-pi.tar.gz
    sudo cp -r node-v0.10.26-linux-arm-pi/* /opt/node
    rm -f -r node-v0.10.26-linux-arm-pi

    sudo mkdir /opt/mongo
    git clone https://github.com/brice-morin/ArduPi.git
    sudo cp -r ArduPi/mongodb-rpi/mongo/* /opt/mongo
    rm -f -r ArduPi
    sudo chmod +x /opt/mongo/bin/*
    sudo mkdir /data/db
    sudo chown $USER /data/db


Um den NodeJS für alle Benutzer auf der Kommandozeile sichtbar zu machen, müssen Symlinks zu den Verzeichnissen /usr/bin und /usr/lib angelegt werden:

    sudo ln -s /opt/node/bin/node /usr/bin/node
    sudo ln -s /opt/node/bin/npm /usr/bin/npm
    sudo ln -s /opt/node/lib /usr/lib/node

Zusätzlich kann in der */etc/profile* folgenden Inhalt vor den *export PATH*-Befehl eingefügt werden. Dadurch wird die MongoDB auch in den PATH eingefügt. ALSADEV wird benötigt, wenn man die Julius-Spracherkennung auch außerhalb des Projekts verwenden oder testen möchte:

    export ALSADEV="plughw:1,0"
    NODE_JS_HOME="/opt/node"
    PATH="$PATH:$NODE_JS_HOME/bin:/opt/mongo/bin/"

Um auch beim Starten mit sudo wichtige Umgebungsvariablen zu behalten, muss die Datei */etc/sudoers.d/hue* mit folgendem Inhalt angelegt werden:

    Defaults env_keep += "ALSADEV NODE_ENV"

Die Datei sollte nur vom root-Benutzer lesbar sein:

    sudo chmod 0440

-   Ausloggen oder Raspberry neustarten
-   Test der Installation mit `node -v` und `mongo --version`

**Autostart der MongoDB**

Ordner für Logfiles anlegen:

    sudo mkdir /var/log/hue
    sudo chown pi /var/log/hue

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
    PARAM="--dbpath /data/db"
    USER=pi
    OUT=/var/log/hue/mongod.log
    LOCK=/data/db/mongod.lock
    PIDFILE=/var/run/mongod.pid

    if [ "$(whoami)" != "root" ]; then
        echo "This script must be run with root privileges!"
        echo "Try sudo $0"
        exit 1
    fi

    case "$1" in

    start)

        if [ -s $LOCK ]; then
            echo "repairing MongoDB state"
            rm $LOCK
            sudo -u $USER $EXE $PARAM --repair >> $OUT 2>>$OUT
        fi

        echo "starting $NAME: $EXE $PARAM"
        sudo -u $USER $EXE $PARAM >> $OUT 2>>$OUT &
        echo $! > $PIDFILE
        ;;

    stop)
        echo "stopping $NAME"
        kill $(cat $PIDFILE)
        ;;

    restart)
        $0 stop
        $0 start
        ;;

    *)
        echo "usage: $0 (start|stop|restart)"
    esac

    exit 0

Ausführbar machen und in den Systemstart einbinden:

    sudo chmod 755 /etc/init.d/mongod
    sudo update-rc.d mongod defaults

Starten/stoppen

    sudo /etc/init.d/mongod start
    sudo /etc/init.d/mongod stop

### Julius

Julius muss über das Versionkontrollsystem CVS heruntergeladen und kompiliert werden. Unter Raspbian werden einige zusätzliche Compiler-Einstellungen benötigt.

    cvs -z3 -d:pserver:anonymous@cvs.sourceforge.jp:/cvsroot/julius co julius4
    export CFLAGS="-O2 -mcpu=arm1176jzf-s -mfpu=vfp -mfloat-abi=hard -pipe -fomit-frame-pointer"
    cd julius4
    ./configure --with-mictype=alsa
    make
    sudo make install


### Projekt herunterladen und installieren

    cd ~
    git clone https://github.com/SBejga/hueper.git
    cd hueper/nodejs
    npm install

Für Julius muss ein Akustik-Modell heruntergeladen werden:

    cd ~/hueper/julius
    wget http://www.repository.voxforge1.org/downloads/Nightly_Builds/AcousticModel-2014-05-15/HTK_AcousticModel-2014-05-15_16kHz_16bit_MFCC_O_D.tgz
    mkdir acoustic_model_files
    tar xvfz HTK_AcousticModel-2014-05-15_16kHz_16bit_MFCC_O_D.tgz -C acoustic_model_files
    rm HTK_AcousticModel-2014-05-15_16kHz_16bit_MFCC_O_D.tgz

Starten mit

    node ~/hueper/nodejs/server.js

### Autostart der Anwendung

#### Möglichkeit 1: Direkt NodeJS starten

NodeJS als Server-Software hat den Nachteil, dass sich das Programm bei einem auftretenden Fehler sofort schließt. Deshalb ist es in Produktions-Umgebungen nicht sinnvoll, nur den NodeJS zu starten.

*/etc/init.d/nodejs-hue* mit folgendem Inhalt erstellen:

    #!/bin/bash

    ### BEGIN INIT INFO
    # Provides: NodeJS Hue
    # Required-Start: $remote_fs $syslog
    # Required-Stop: $remote_fs $syslog
    # Default-Start: 2 3 4 5
    # Default-Stop: 0 1 6
    # Short-Description: NodeJS Hue Autostart
    # Description: NodeJS Hue Autostart
    ### END INIT INFO

    NAME="NodeJS"
    EXE=/opt/node/bin/node
    PARAM=/home/pi/hueper/nodejs/server.js
    USER=pi
    OUT=/var/log/hue/nodejs.log
    PIDFILE=/var/run/nodejs-hue.pid

    if [ "$(whoami)" != "root" ]; then
        echo "This script must be run with root privileges!"
        echo "Try sudo $0"
        exit 1
    fi

    case "$1" in

    start)
        echo "starting $NAME: $EXE $PARAM"
        sudo -u $USER $EXE $PARAM >> $OUT 2>>$OUT &
        echo $! > $PIDFILE
        ;;

    stop)
        echo "stopping $NAME"
        kill $(cat $PIDFILE)
        ;;

    restart)
        $0 stop
        $0 start
        ;;

    *)
        echo "usage: $0 (start|stop|restart)"
    esac

    exit 0

Ausführbar machen und in den Systemstart einbinden:

    sudo chmod 755 /etc/init.d/nodejs-hue
    sudo update-rc.d nodejs-hue defaults

Starten/stoppen

    sudo /etc/init.d/nodejs-hue start
    sudo /etc/init.d/nodejs-hue stop

#### Möglichkeit 2: Forever (wird im setup.sh-Skript ausgeführt)

Forever ist ein Programm, das NodeJS-Scripts startet und überwacht. Wird der NodeJS-Prozess durch einen Fehler beendet, startet Forever automatisch einen neuen Prozess.

Installation:

    sudo /opt/node/bin/npm install -g forever

*/etc/init.d/forever-hue* mit folgendem Inhalt erstellen:

    #!/bin/bash

    ### BEGIN INIT INFO
    # Provides: Forever NodeJS Hue
    # Required-Start: $remote_fs $syslog
    # Required-Stop: $remote_fs $syslog
    # Default-Start: 2 3 4 5
    # Default-Stop: 0 1 6
    # Short-Description: Forever NodeJS Hue Autostart
    # Description: Forever NodeJS Hue Autostart
    ### END INIT INFO

    NAME="Forever NodeJS"
    EXE=/usr/bin/forever
    SCRIPT=/home/pi/hueper/nodejs/server.js
    USER=pi
    OUT=/var/log/hue/forever.log

    if [ "$(whoami)" != "root" ]; then
        echo "This script must be run with root privileges!"
        echo "Try sudo $0"
        exit 1
    fi

    case "$1" in

    start)
        echo "starting $NAME: $EXE $PARAM"
        sudo -u $USER $EXE start -a -l $OUT $SCRIPT
        ;;

    stop)
        echo "stopping $NAME"
        sudo -u $USER $EXE stop $SCRIPT
        ;;

    restart)
        $0 stop
        $0 start
        ;;

    *)
        echo "usage: $0 (start|stop|restart)"
    esac

    exit 0

Ausführbar machen und in den Systemstart einbinden:

    sudo chmod 755 /etc/init.d/forever-hue
    sudo update-rc.d forever-hue defaults

Starten/stoppen

    sudo /etc/init.d/forever-hue start
    sudo /etc/init.d/forever-hue stop

## Quellen

-   Raspberry Pi Quick Start Guide: http://www.raspberrypi.org/wp-content/uploads/2012/04/quick-start-guide-v2_1.pdf
-   WLAN Setup: http://pingbin.com/2012/12/setup-wifi-raspberry-pi/
-   WLAN-Bridge: http://hackhappy.org/uncategorized/how-to-use-a-raspberry-pi-to-create-a-wireless-to-wired-network-bridge/
-   NodeJS Setup: http://blog.rueedlinger.ch/2013/03/raspberry-pi-and-nodejs-basic-setup/
-   MongoDB Setup: https://github.com/brice-morin/ArduPi/tree/master/mongodb-rpi
-   Externe Soundkarte: http://asliceofraspberrypi.blogspot.de/2013/02/adding-audio-input-device.html
-   Forever Setup:
    https://github.com/nodejitsu/forever
    http://stackoverflow.com/questions/4976658/on-ec2-sudo-node-command-not-found-but-node-without-sudo-is-ok#answer-5062718
-   Julius: http://www.aonsquared.co.uk/raspi_voice_control
