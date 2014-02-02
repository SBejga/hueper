# Dokumentation Frontend

## AngularJS

### Services

#### socket

Wrapper for the Socket.IO API

-   **on(event, callback)**
-   **emit(event, data)**


### Filter

#### filterObj

Filtert ein Objekt, das als assoziatives Array aufgebaut ist (IDs der Elemente sind die Objekt-Schlüssel)

Parameter

-   filter
    -   String: Vorkommen des Strings werden rekursiv in allen Properties der Child-Objekte gesucht
    -   Objekt: Die Schlüssel stellen die Pfade innerhalb der Child-Objekte dar, die jeweils rekursiv nach den Werten durchsucht werden
-   strict: Es werden nur exakte Treffer gezählt (vollständig und case sensitive). Standardmäßig werden auch Teilausdrücke gefunden und die Suche ist case insensitive.

Beispiele

-   filterObj:'search'
-   filterObj:'search':true
-   filterObj:{'user.name': 'Michael', 'title': 'test'}


### Controller

#### MainCtrl

-   **state**: Status und Daten der Anwendung. **Identisch mit dem serverseitigen app.state. Dort dokumentiert!**
-   **notifications**: Array mit allen Benachrichtigungsobjekten (im Format {error: ...} oder {notification: ...})
-   **client**
    -   **address**: MAC-Adresse des Clients
-   **clientConfig**: Frontend-Konfiguration
    -   **notificationTimeout**: Anzeigedauer für Notifications, danach werden sie entfernt
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
    -   **getGroups(id)**: Gruppen-IDs einer Lampe erhalten
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
-   **scenes**: Szenen
    -   **forms**: Platzhalter für Formulare
        -   **create**: Formular zum Erstellen einer Szene
            -   name
            -   lights: Array
    -   **create(scene)**: Szene erstellen
    -   **update(scene)**: Szene bearbeiten
    -   **remove(id)**: Szene löschen
    -   **apply(id)**: Szene anwenden
    -   **addLight(scene, id)**: Lampe zur Szene hinzufügen
    -   **removeLight(scene, id)**: Lampe aus einer Szene entfernen
    -   **filterUnused(lights)**: Lampen filtern - alle, die nicht im Parameter-Array enthalten sind
-   **automation**: Automatisierung
    -   **forms**: Platzhalter für Formulare
        -   **create**: Automatisierung erstellen
            -   name
            -   triggers
            -   conditions
            -   allConditionsNeeded
            -   actions
            active
    -   **create(automation)**: Automatisierung anlegen
    -   **update(automation)**: Automatisierung bearbeiten
    -   **remove(id)**: Automatisierung entfernen
    -   **resetTriggerValue(t)**: Trigger-Wert je nach ausgewähltem Typ zurücksetzen
    -   **resetConditionValue(t)**: Condition-Wert je nach ausgewähltem Typ zurücksetzen
    -   **resetActionValue(t)**: Action-Wert je nach ausgewähltem Typ zurücksetzen
-   **rfid**: RFID/NFC-Tags verwalten
    -   **create(rfid)**: RFID-Tag anlegen
    -   **update(rfid)**: RFID-Tag bearbeiten
    -   **remove(id)**: RFID-Tag löschen
    -   **reset()**: Liste der unbekannten RFID-Tags leeren
-   **devices**: Netzwerk-Geräte verwalten
    -   **create(device)**: Netzwerk-Gerät anlegen
    -   **update(device)**: Netzwerk-Gerät bearbeiten
    -   **remove(id)**: Netzwerk-Gerät löschen
    -   **isOwnRegistered()**: Ermittelt, ob das eigene Gerät bereits registriert ist
-   **helpers**: Hilfs-Funktionen
    -   **toggleList(arr, el, numeric)**: Element in ein Array einfügen/entfernen; z.B. zum Erstellen eines Arrays aus mehreren Checkboxen
    -   **listChecked(arr, el, numeric)**: Überprüfen, ob ein Element in einem Array vorhanden ist
    -   **removeFromArray(arr, index)**: Element aus einem Array entfernen


## Besondere Konstrukte

Mehrere Checkboxen zum Erstellen eines Arrays nutzen:

```html
<span ng-repeat="(id, light) in state.lights">
    <input type="checkbox" ng-checked="helpers.listChecked(groups.forms.create.lights, id, true)" ng-click="helpers.toggleList(groups.forms.create.lights, id, true)" /> {{id}}
</span>
```
