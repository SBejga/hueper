# Dokumentation Frontend

## AngularJS Scope

-   **state**: Status und Daten der Anwendung
    -   **user**: Login-Status
        -   **loginPromptReceived**: Wurde per Socket bereits übermittelt, ob ein Login erforderlich ist?
        -   **loginRequired**: true, wenn ein Login erforderlich ist
        -   **loginWaiting**: true, nachdem user.login() aufgerufen wurde, bis die Antwort zurückkommt
        -   **login**: ist der Benutzer eingeloggt?
        -   **loginError**: true, wenn der Login mit einem falschen Passwort versucht wurde
    -   **socket**
        -   **connected**: besteht eine Socket.IO-Verbindung?
        -   **wasConnected**: true, wenn einmal eine Socket.IO-Verbindung aufgebaut war; zum Erkennen von Verbindungsabbrüchen
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
    -   groups
    -   scenes
-   **lights**: Steuerung der Lampen
    -   **state(id, key, value)**: Einzelnen Wert einer Lampe verändern
-   **user**: User- und Login-Steuerung
    -   **password**: Ins Login-Formular eingegebenes Passwort
    -   **login()**
    -   **logout()**
