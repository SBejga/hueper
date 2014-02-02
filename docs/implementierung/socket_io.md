# Dokumentation Socket.IO-Protokoll

## Generelle Funktionsweise

-   Der Großteil der Kommunikation vom Server zu den Clients besteht in der Synchronisation des *app.state*-Objektes. Darin enthalten ist der aktuelle Status der Lampen und Sensoren sowie alle Datenbank-Einträge der Favoriten, Szenen, Automatisierungen etc.
-   Möchte ein Client etwas ändern, schickt er dem Server das entsprechende Kommando
-   Der Server synchronisiert den geänderten Status dann mit allen Clients
-   **Bei allen Änderungs- und Löschungs-Befehlen sendet der Server den geänderten Status nur an die anderen verbundenen Clients, weil der davon ausgeht, dass der auslösende Client den Status bei sich bereits geändert hat!**
    Nachrichten, für die das gilt, sind mit ***Client-Änderung*** gekennzeichnet
-   Bei einem Fehler erhält der auslösende Client eine Notification. Der Status wird automatisch wieder auf den des Servers zurückgesetzt


## Login-Vorgang

-   Verbindungsaufbau abgeschlossen
-   Server sendet **login.required** *(boolean)*
-   Client sendet **login** (`{ password: "..." }`)
-   Server sendet **login** *(boolean)* - Erfolg
-   bei erfolgreichem Login teilt der Server den Client dem Room "login" zu

## Nachrichten vom Server (nach Login)

-   **state**: Übermitteln von geänderten Bereichen des app.state-Objekts
    `{ <Pfad in state>: <Objekt>, ... }`
    Für den Abgleich auf der Wurzel-Ebene des app.state-Objekts bleibt der Pfad leer
-   **state.delete**: Bereiche des app.state-Objekts löschen
    `[ <Pfad in state>, ... ]`
-   **config.password**: Antwort bei der Passwort-Änderung
    `false` bei Fehlschlag, `{ password: ... }` sonst
-   **notification**: Benachrichtigung oder Fehlermeldung
    `{ error: ... }` für Fehlermeldungen, `{ notification: ... }` für Benachrichtigungen
    Mögliche Fehlermeldungen:
    -   config.save
    -   config.password
    -   favorites.create
    -   favorites.update
    -   scenes.create
    -   scenes.update
    -   automation.create
    -   automation.update
-   **device.address**: MAC-Adresse des Clients
    `<MAC-Adresse>`

## Nachrichten vom Client (nach Login)

-   **config.deleteUser**: Benutzer von der Bridge löschen ***Client-Änderung***
    `{ id: ... }`
-   **config.pressLinkButton**: Link-Button der Bridge programmatisch drücken ***Client-Änderung***
    `true`
-   **config.password**: Passwort ändern
    `{ oldPassword: ..., newPassword: ... }`
-   **config.change**: Anwendungs-Konfiguration ändern ***Client-Änderung***
    `{ <Name>: <Wert>, ... }`
-   **config.firmware**: Firmware-Update starten ***Client-Änderung***
    `true`
-   **light.state**: Ändern von Werten einer Lampe ***Client-Änderung***
    `{ id: ..., state: { ... } }`
-   **light.stateAll**: Ändern von Werten aller Lampen ***Client-Änderung***
    `<State>`
-   **light.search**: Nach neuen Lampen suchen (true)
-   **light.name**: Lampe umbenennen ***Client-Änderung***
    `{ id: ..., name: ... }`
-   **group.state**: Status einer Gruppe verändern (alle Lampen ID 0) ***Client-Änderung***
    `{ id: ..., state: { ... } }`
-   **group.create**: Gruppe erstellen
    `{ name: ..., lights: [ 1, ...] }`
-   **group.update**: Gruppe bearbeiten ***Client-Änderung***
    `{ id: ..., name: ..., lights: [ "1", ... ] }`
-   **group.remove**: Gruppe löschen ***Client-Änderung***
    `id`
-   **favorite.create**: Favorit erstellen
    `{ name: ..., state: { ... } }`
-   **favorite.update**: Favorit bearbeiten ***Client-Änderung***
    `{ name: ..., state: { ... } }`
-   **favorite.delete**: Favorit löschen ***Client-Änderung***
    `<ID>`
-   **scene.create**: Szene erstellen
    `{ name: ..., lights: [ { light: ..., state: { ... } ] }`
-   **scene.update**: Szene bearbeiten ***Client-Änderung***
    `{ _id: ..., name: ..., lights: [ { light: ..., state: { ... } ] }`
-   **scene.delete**: Szene löschen ***Client-Änderung***
    `<ID>`
-   **scene.apply**: Szene anwenden ***Client-Änderung***
    `<ID>`
-   **automation.create**: Automatisierung erstellen
    `{ name: ..., triggers: [...], conditions: [...], allConditionsNeeded: ..., actions: [...], active: ... }`
-   **automation.update**: Automatisierung bearbeiten ***Client-Änderung***
    `{ _id: ..., name: ..., triggers: [...], conditions: [...], allConditionsNeeded: ..., actions: [...], active: ... }`
-   **automation.delete**: Automatisierung löschen ***Client-Änderung***
    `<ID>`
-   **rfid.create**: RFID-Tag erstellen
    `{ tag: ..., name: ..., lastUsed: ... }`
-   **rfid.update**: RFID-Tag bearbeiten ***Client-Änderung***
    `{ tag: ..., name: ..., lastUsed: ... }`
-   **rfid.delete**: RFID-Tag löschen ***Client-Änderung***
    Entfernt Trigger und Bedingungen von Automatisierungen mit diesem Tag (vom Server synchronisiert)
    `<ID>`
-   **rfid.reset**: Setzt die Liste der Unbekannten RFID/NFC-Tags zurück ***Client-Änderung***
-   **device.create**: Netzwerk-Gerät erstellen
    `{ address: ..., name: ..., lastActivity: ... }`
-   **device.update**: Netzwerk-Gerät bearbeiten ***Client-Änderung***
    `{ address: ..., name: ..., lastActivity: ... }`
-   **device.delete**: Netzwerk-Gerät löschen ***Client-Änderung***
    Entfernt Trigger und Bedingungen von Automatisierungen mit diesem Gerät (vom Server synchronisiert)
    `<ID>`

## Broadcasts an eingeloggte User

```js
app.controllers.socket.broadcast(data);
app.controllers.socket.broadcastSocket(socket, data);
```

Alle eingeloggten Sockets außer einem erhalten:

```js
app.controllers.socket.getBroadcastSocket(socket)
```
