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
    -   **appConfig**: Anwendungs-Konfiguration
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
        -   name
        -   state
            -   isOn
            -   bri
            -   hue
            -   sat
            -   ct
            -   effect
    -   scenes
-   **user**: User- und Login-Steuerung
    -   **password**: Ins Login-Formular eingegebenes Passwort
    -   **login()**
    -   **logout()**
-   **config**: Konfiguration der Hue-Bridge
    -   **deleteUser(id)**: User der Bridge löschen
    -   **pressLinkButton()**: Link-Button an der Bridge programmatisch drücken
    -   **changePassword(oldPassword, newPassword)**: Passwort der Anwendung ändern
    -   **change(data)**: Anwendungs-Konfiguration ändern
    -   **updateFirmware()**:  Firmware-Update starten
-   **lights**: Steuerung der Lampen
    -   **state(id, state)**: Status einer Lampe verändern
    -   **stateAttribute(id, key, val)**: Einzelnes Status-Attribut einer Lampe verändern
    -   **stateAll(state)**: Status aller Lampen verändern
    -   **search()**: Suche nach neuen Lampen anstoßen
    -   **setName(id, name)**: Name einer Lampe ändern
-   **groups**: Steuerung der Gruppen
    -   **forms**: Platzhalter für Formulare
        -   **create**: Formular zum Erstellen einer Gruppe
            -   name
            -   lights: Array
    -   **state(id, state)**: Status einer Gruppe verändern
    -   **create(group)**: Gruppe erstellen und Formular zurücksetzen; IDs in lights als Integers!
    -   **update(id, group)**: Gruppe bearbeiten; IDs in lights als Strings!
    -   **remove(id)**: Gruppe löschen
-   **favorites**: Lampeneinstellungs-Favoriten
    -   **forms**: Platzhalter für Formulare
        -   **create**: Formular zum Erstellen eines Favoriten
            -   name
            -   state: wie state.favorites.state
    -   **create(favorite)**: Favorit erstellen
    -   **update(favorite)**: Favorit bearbeiten
    -   **remove(id)**: Favorit löschen
-   **helpers**: Hilfs-Funktionen
    -   **toggleList(arr, el, numeric)**: Element in ein Array einfügen/entfernen; z.B. zum Erstellen eines Arrays aus mehreren Checkboxen
    -   **listChecked(arr, el, numeric)**: Überprüfen, ob ein Element in einem Array vorhanden ist


## Besondere Konstrukte

Mehrere Checkboxen zum Erstellen eines Arrays nutzen:

```html
<span ng-repeat="(id, light) in state.lights">
    <input type="checkbox" ng-checked="helpers.listChecked(groups.forms.create.lights, id, true)" ng-click="helpers.toggleList(groups.forms.create.lights, id, true)" /> {{id}}
</span>
```
