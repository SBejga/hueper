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

## Nachrichten vom Client (nach Login)

-   **light.state**: Ändern eines Wertes einer Lampe
    `{ id: ..., state: { ... } }`

## Broadcasts an eingeloggte User

```js
app.server.io.sockets.in('login').emit(...);
socket.broadcast.to('login').emit(...);
```