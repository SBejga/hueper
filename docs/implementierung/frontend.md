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
    -   groups
    -   scenes
-   **lights**: Steuerung der Lampen
    -   **state(id, state)**: Status einer Lampe verändern
    -   **stateAttribute(id, key, val)**: Einzelnes Status-Attribut einer Lampe verändern
    -   **stateAll(state)**: Status aller Lampen verändern
    -   **search()**: Suche nach neuen Lampen anstoßen
    -   **setName(id, name)**: Name einer Lampe ändern
-   **user**: User- und Login-Steuerung
    -   **password**: Ins Login-Formular eingegebenes Passwort
    -   **login()**
    -   **logout()**
