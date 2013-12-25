# Dokumentation NodeJS-Server

## Module / Dependencies

Installation über `npm install` im Projekt-Root

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

-   **config**: Aus der MongoDB ausgelesene Konfiguration (*Config*-Model)
-   **state**: Aktueller Status der Anwendung
    -   **connect**: Verbindung zu externen Komponenten (boolean)
        -   **mongodb**: Verbindung mit der MongoDB
        -   **hue**: Verbindung mit der Hue Bridge
        -   **hueRegistered**: In der Hue Bridge registriert
        -   **arduino**: Verbindung mit dem Arduino
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
    -   **groups**
    -   **scenes**
-   **server**
    -   **express**: Express-Server
    -   **http**: HTTP-Server zum Verbinden von Express und Socket.IO
    -   **io**: Socket-IO
-   **controllers**
    -   **hue**: Baut Verbindung zur Hue Bridge auf, meldet sich dort an und stellt die node-hue-api bereit
        -   **getApi()**: Liefert die node-hue-api
        -   **setLightState(data)**: Status einer Lampe ändern (id-Property im Objekt)
    -   **lights**: Steuerung der Lampen
    -   **mongoose**: Baut Verbindung zur MongoDB auf und liest die Daten in den app.state-Cache
    -   **socket**: Handling von Socket.IO-Verbindungen und Benutzer-Login
        -   **refreshState(socket, areas)**: An bestimmte Clients bestimmte Teile des app.state-Objekts senden
        -   **addSocketListener(listener)**: Hook für andere Controller, um bestimmte Socket.IO-Nachrichten abzufangen


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
