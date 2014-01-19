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
    -   **automation**: Automatisierung
        -   name
        -   triggers: Array: type, value
        -   conditions: Array: type, value
        -   allConditionsNeeded
        -   actions: Array: type, value, delay
        -   active
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
        -   **addQueryListener(listener)**: Listener, um Daten-Container einmalig zu befüllen. Werden vor den Connection-Listenern ausgeführt. Bekommen eine Callback-Funktion als Parameter übergeben, die sie am Ende aufrufen müssen
        -   **addConnectionListener(listener)**: Ermöglicht anderen Controllern, auf eine erstmalig aufgebaute MongoDB-Verbindung zu warten
        -   **handleError(socket, statePath, oldValue, errorType, broadcast)**: Fehlerbehandlung mit Rücksetzen des State und Senden per Socket
    -   **socket**: Handling von Socket.IO-Verbindungen und Benutzer-Login
        -   **refreshState(socket, areas)**: An bestimmte Clients bestimmte Teile des app.state-Objekts senden
        -   **deleteFromState(socket, areas)**: Bestimmte Teile des app.state-Objekts bei bestimmten Clients löschen
        -   **addSocketListener(listener)**: Hook für andere Controller, um bestimmte Socket.IO-Nachrichten abzufangen
        -   **broadcast(data)**: Nachricht an alle eingeloggten Benutzer schicken
        -   **broadcastSocket(socket, data)**: Nachricht an alle eingeloggten Benutzer außer den des Sockets schicken
        -   **getBroadcastSocket(socket)**: Alle Sockets von eingeloggten Benutzern außer dem übergebenen erhalten
        -   **sendNotification(socket, notification, isError)**: Benachrichtigung oder Fehlermeldung schicken
    -   **arduino**: Verbindungsaufbau zum Arduino
        -   **addListener(listener)**:
    -   **lights**: Steuerung der Lampen
    -   **groups**: Steuerung der Gruppen
    -   **app_configuration**: Konfiguration der Anwendung
    -   **hue_configuration**: Konfiguration der Hue Bridge
    -   **favorites**: Verwaltung der Lampeneinstellungs-Favoriten
    -   **scenes**: Verwaltung der Szenen
    -   **automation**: Automatisierung (Zeitgesteuerte Ereignisse, Sensoren)
    -   **arduino_button**: Fährt den Raspberry Pi herunter, wenn der Button am Arduino gedrückt wurde


## Controller hinzufügen

Controller werden in der server.js in das controller-Array eingefügt und global zugänglich gemacht. Die `module.exports` ist jeweils eine Funktion, die das globale `app`-Objekt als Parameter übergeben bekommt. Sie startet die autonomen Funktionen des Controllers, wenn in `app.events` das *ready*-Event gefeuert wird. Anderen Controllern kann sie Funktionen zurückgeben, indem die `module.exports` ein Objekt zurückgibt.

Grundgerüst eines Controllers, der auf bestimmte Socket.IO-Nachrichten eingeloggter Clients wartet:

```js
var app;

var init = function() {
    // independent functionality by this controller

    app.controllers.socket.addSocketListener(socketListeners);
};

var socketListeners = function(socket) {

     // create favorite
     socket.on('action', function(data) {
         // ...
     });
};

var exposedFunction = function(param) {
    // this function will be available to other controllers
};

module.exports = function(globalApp) {

    app = globalApp;

    app.events.once('ready', function() {
        init();
    });

    return {
        exposedFunction: exposedFunction
    };
};
```

## Basis CRUD-Funktionalität

```js
helpers.initCrudTemplate(
    app,
    Scene,
    'scenes',
    'scene',
    'scene'
);
```

Die Funktion `initCrudTemplate` führt folgende Aktionen aus:

-   Die Liste der Scenes (2. Parameter) wird in `app.state.scenes` (3. Parameter) gespeichert
-   Es werden Listener für Socket.IO registriert (4. Parameter)
    -   scene.create
    -   scene.update
    -   scene.remove
-   Error-Handling wird hinzugefügt (5. Parameter)
    -   scene.create
    -   scene.update
