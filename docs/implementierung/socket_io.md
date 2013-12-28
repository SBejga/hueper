# Dokumentation Socket.IO-Protokoll

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

## Nachrichten vom Client (nach Login)

-   **config.deleteUser**: Benutzer von der Bridge löschen
    `{ id: ... }`
-   **config.pressLinkButton**: Link-Button der Bridge programmatisch drücken
    `true`
-   **config.password**: Passwort ändern
    `{ oldPassword: ..., newPassword: ... }`
-   **config.change**: Anwendungs-Konfiguration ändern
    `{ <Name>: <Wert>, ... }`
-   **config.firmware**: Firmware-Update starten
    `true`
-   **light.state**: Ändern von Werten einer Lampe / allen Lampen (id 0)
    `{ id: ..., state: { ... } }`
-   **light.search**: Nach neuen Lampen suchen (true)
-   **light.name**: Lampe umbenennen
    `{ id: ..., name: ... }`
-   **group.state**: Status einer Gruppe verändern
    `{ id: ..., state: { ... } }`
-   **group.create**: Gruppe erstellen
    `{ name: ..., lights: [ 1, ...] }`
-   **group.update**: Gruppe bearbeiten
    `{ id: ..., name: ..., lights: [ "1", ... ] }`
-   **group.remove**: Gruppe löschen
    `id`
-   **favorite.create**: Favorit erstellen
    `{ name: ..., state: { ... } }`
-   **favorite.update**: Favorit bearbeiten
    `{ name: ..., state: { ... } }`
-   **favorite.delete**: Favorit löschen
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