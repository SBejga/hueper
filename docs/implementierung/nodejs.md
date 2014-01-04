# Dokumentation NodeJS-Server

## Module / Dependencies

Installation über `npm install` im Projekt-Root, aktualisieren über `npm update`

-   **express**: Web-Server
    http://expressjs.com/
-   **mongoose**: MongoDB Object Modeling
    http://mongoosejs.com/
-   **node-hue-api**: Abstraktion des REST-Interfaces zur Hue-Bridge
    https://github.com/peter-murray/node-hue-api
-   **socket.io**: Echtzeitkommunikation mit WebSockets (und Fallbacks)
    http://socket.io/
-   **serialport**: Kommunkation mit dem Arduino
    https://github.com/voodootikigod/node-serialport
-   **node-web-repl**: Realtime-Remote-Debugging
    https://npmjs.org/package/node-web-repl

## Struktur

-   ***server.js***: Hauptdatei; app-Objekt, Server-Initialisierung, Einbinden der Konfiguration und der Controller
-   ***package.json***: Versionierung und NPM-Dependencies
-   **client**: Webserver-Verzeichnis
-   **debug**: Webserver-Verzeichnis für Debug-Dateien
-   **server**: Alle Dateien mit Server-Funktionalität
    -   **config**: Konfiguration der verschiedenen Module, eingebunden in der server.js
    -   **controllers**: Eingebunden in der server.js
    -   **models**: Mongoose-Models, eingebunden in der server/config/mongoose.js

## Globales app-Objekt

-   **config**: Interne Konfiguration
    -   **hueUser**: Username zur Anmeldung an der Hue-Bridge (noch nicht registriert, wenn Eintrag fehlt)
    -   **password**: Applikations-Passwort (kein Passwort, wenn Eintrag fehlt)
-   **state**: Aktueller Status der Anwendung
    -   **connect**: Verbindung zu externen Komponenten (boolean)
        -   **mongodb**: Verbindung mit der MongoDB
        -   **hue**: Verbindung mit der Hue Bridge
        -   **hueRegistered**: In der Hue Bridge registriert
        -   **arduino**: Verbindung mit dem Arduino
    -   **appConfig**: Aus der MongoDB ausgelesene Konfiguration (*Config*-Model)
        -   **transition**: Überblendzeit der Lampen (in 100ms-Intervallen)
    -   **lights**: Status der Lampen; Objekt mit Lichtern als Elemente, ID als Schlüssel
        Gefiltertes Original-Output der Hue Bridge, Details zu den Werten unter http://developers.meethue.com/1_lightsapi.html#14_get_light_attributes_and_state
        -   state
            -   on
            -   bri
            -   hue
            -   sat
            -   ct
            -   alert
            -   effect
            -   colormode
            -   reachable
        -   type
        -   name
        -   modelid
        -   swversion
    -   **groups**: Liste der Gruppen, ID als Schlüssel
        -   name
        -   lights: Array aller zur Gruppe gehörigen Lampen, IDs als Strings
        -   action: Letzter der Gruppe zugewiesener Status
            -   on
            -   bri
            -   hue
            -   sat
            -   ct
            -   effect
            -   colormode
    -   **favorites**: Liste der Lampeneinstellungs-Favoriten, ID als Schlüssel
        -   _id
        -   name
        -   state
            -   isOn
            -   bri
            -   hue
            -   sat
            -   ct
            -   effect
    -   **scenes**: Liste der Szenen, ID als Schlüssel
        -   _id
        -   name
        -   lights: Array aus allen enthaltenen Lichtern
            -   light: Licht-ID
            -   state
                -   isOn
                -   bri
                -   hue
                -   sat
                -   ct
                -   effect
    -   **config**: Konfiguration der Hue-Bridge
        Gefiltertes Original-Output der Hue Bridge, Details zu den Werten unter http://developers.meethue.com/4_configurationapi.html#42_get_configuration
        -   name
        -   mac
        -   dhcp
        -   ipaddress
        -   netmask
        -   gateway
        -   proxyaddress
        -   proxyport
        -   whitelist: Registrierte User, Name als Schlüssel
            -   name
            -   create data
            -   last use date (nicht beim NodeJS-User)
        -   swversion
        -   swupdate
            -   updatestate
                (0: kein Update, 1: verfügbar, 2: heruntergeladen und anwendbar, 3: Installation)
            -   url
            -   text
            -   notify
                (wurde der Benutzer über das Update benachrichtigt?)
        -   linkbutton
        -   portalservices
-   **server**
    -   **express**: Express-Server
    -   **http**: HTTP-Server zum Verbinden von Express und Socket.IO
    -   **io**: Socket-IO
-   **controllers**
    -   **hue**: Baut Verbindung zur Hue Bridge auf, meldet sich dort an und stellt die node-hue-api bereit
        -   **makeApiCall(callback)**: Funktion des node-hue-api-Moduls ausführen, wenn/sobald eine Verbindung zur Bridge besteht
        -   **setLightState(id, state, broadcast)**: Status einer Lampe ändern
        -   **setLightStateAll(state, broadcast)**: Status aller Lampen ändern
        -   **setGroupLightState(id, state, broadcast)**: Status einer Gruppe ändern
        -   **customApiCall(path, body, callback)**: Erlaubt benutzerdefinierten Aufruf der Hue REST-API
    -   **mongoose**: Baut Verbindung zur MongoDB auf und liest die Daten in den app.state-Cache
        -   **addConnectionListener(listener)**: Ermöglicht anderen Controllern, auf eine erstmalig aufgebaute MongoDB-Verbindung zu warten
    -   **socket**: Handling von Socket.IO-Verbindungen und Benutzer-Login
        -   **refreshState(socket, areas)**: An bestimmte Clients bestimmte Teile des app.state-Objekts senden
        -   **deleteFromState(socket, areas)**: Bestimmte Teile des app.state-Objekts bei bestimmten Clients löschen
        -   **addSocketListener(listener)**: Hook für andere Controller, um bestimmte Socket.IO-Nachrichten abzufangen
        -   **broadcast(data)**: Nachricht an alle eingeloggten Benutzer schicken
        -   **broadcastSocket(socket, data)**: Nachricht an alle eingeloggten Benutzer außer den des Sockets schicken
        -   **getBroadcastSocket(socket)**: Alle Sockets von eingeloggten Benutzern außer dem übergebenen erhalten
    -   **lights**: Steuerung der Lampen
    -   **groups**: Steuerung der Gruppen
    -   **configuration**: Konfiguration der Hue Bridge und der Anwendung
    -   **favorites**: Verwaltung der Lampeneinstellungs-Favoriten
    -   **scenes**: Verwaltung der Szenen


## Controller hinzufügen

Controller werden in der server.js hinzugefügt und global zugänglich gemacht

```js
app.controllers.xxx = require('./server/controllers/xxx')(app);
```

Um mit einem Controller Socket.IO-Events abzufangen, muss er dem Socket-Controller eine Listener-Funktion übergeben. Diese wird auf Sockets angewandt, nachdem sich der Benutzer erfolgreich eingeloggt hat.

```js
var socketListeners = function(socket) {
    socket.on('xxx', function(data) {
        // ...
    });
};

module.exports = function(app) {
    app.controllers.socket.addSocketListener(socketListeners);
};
```
