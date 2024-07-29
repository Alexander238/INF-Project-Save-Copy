# Handbuch

## Inhalte

1. [Einrichtung](#einrichtung)
    - [Systemvoraussetzungen](#systemvoraussetzungen)
    - [Installationsanleitung Linux Server](#installationsanleitung-linux-server)
    - [Installationsanleitung Windows Server](#installationsanleitung-windows-server)
    - [Den eigentlichen Server starten sowie weitere Informationen](#den-eigentlichen-server-starten-sowie-weitere-informationen)
2. [Benutzung](#benutzung)
    - [Dashboard Übersicht](#dashboard)
    - [Verwalten](#verwalten)
    - [Vergleichen](#vergleichen)
    - [Importieren](#importieren)
   - [Exportieren](#exportieren)
   - [Einstellungen](#einstellungen)
        
4. [Fehler und FAQ](#fehler)
    - [Fehlermeldungen](#fehlermeldungen)
    - [FAQ](#faq)


## Einrichtung

### Systemvoraussetzungen

#### Lokale Installation

- **Operating System:** Linux Ubuntu 22.04
- **Memory:** min. 4 GB RAM
- **Storage:** 10 GB 
- **Datenbank, WebServer:** z.B. MySQL
- **Internetverbindung:** Nötig für API-Prüfung

----
### Installationsanleitung Linux Server

#### Voraussetzungen
1. Blankes Ubuntu 20.04 oder Ubuntu 22.04 System als Host OS für unsere Anwendung (gnome/KDE Desktop GUI wird nicht benötigt allerdings hilfreich zum testen).

2. Internetanbindung mit entsprechenden Freigaben um Pakete wie mysql-server, nodejs und npm herunterladen und installieren zu können.

#### Hauptanwendung auf dem System installieren
1. Hierfür muss der komplette "server" Ordner auf dem System in einem nicht temporären Verzeichnis platziert werden, z.B. /home/root/ oder falls keine root-Rechte vorhanden sind /home/userX/
   wobei "userX" möglichst alle Read/Write/Execute Rechte auf dem Ubuntu-System haben sollte.
2. Ist der "server" Ordner platziert worden in beispielsweise /home/userX/server dann ein `chmod 770 -R /home/userX/server` abfeuern um sicherzugehen das nur "userX" sowie alle die der
   gleichen Gruppe wie "userX" angehören Read/Write/Execute Rechte auf die Anwendung haben.
3. Als nächstes kann man schonmal ins Installationsverzeichnis wechseln in den "backend" Ordner, in dem Beispiel also mit "cd /home/userX/server/backend".
   NodeJS installieren: Hier muss die "latest" Version aus dem Debian-NodeSource Repo heruntergeladen und installiert werden, hierzu nacheinander folgende Befehle nutzen:
   * `apt-get update`
   * `apt-get upgrade`
   * `curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -`
   * `apt-get install -y nodejs`
   *  und mit `node -v` die Installation verifizieren, hier sollte im Terminal NodeJS Version v20.X.X. ausgegeben werden.
4. Npm installieren:
   * `apt-get install npm`
   * und mit `npm -v` verifizieren.
   * Benötigte Npm Module installieren: **Wichtig** man muss sich im "../backend" Ordner befinden!
   * `npm install express`
   * `npm install multer`
   * `npm install mysql2`
   * `npm install rimraf`
   * `npm install urlscan`
   * `npm install marked`
5. Mysql-Server aufsetzen:
   * `apt-get install mysql-server`
   * `mysql_secure_installation` - hier wird man nun nach einem Passwort gefragt, es muss exakt das Passwort eingegeben werden das in der ConnectionData.js steht eingetippt werden
   * Login mit der MySql testen indem man sich anmeldet:
   * `mysql -u root -p` - root ggf. durch anderen User ersetzen (der User muss allerdings auch möglichst ALLE Rechte besitzen)
   *  Dann das Passwort vom jeweiligen User eintippen, man sollte nun eine mysql> cli bekommen in der man mysql Befehle abfeuern kann.
6. Mysql Datenbank Schema importieren:
   * Sicherstellen das man im Verzeichnis "../server/backend" ist
   * `mysql -u root -p jumi < DatabaseInit.sql`
   * Verifizieren das der Import erfolgreich war:
   * `mysql -u root -p` - einloggen in die Mysql
   * `show databases;` - hier sollte nun die DB "jumi" angezeigt werden.
   * `use jumi;`
   * `describe user;` - sollte nun den Aufbau der "user" Tabelle anzeigen, also (id,name,password,isAdmin)
   * Nun sollte man wieder in der Linux cli sein hier muss nun noch einmal der Mysql-Dienst neugestartet werden:
   * `systemctl stop mysql`
   * `systemctl status mysql` - sollte "Status: Inactive" anzeigen
   * `systemctl start mysql` - sollte nun "Status: Running" anzeigen
   * Sollen die Zugangsdaten für die Mysql geändert werden, dann müssen diese in der ConnectionData.js sowie in der Mysql selbst angepasst werden und der Mysql Dienst muss zum Schluss neugestartet werden!
----
### Installationsanleitung Windows Server
#### Voraussetzungen
1. Blanker Windows Server 2019 oder Windows Server 2022 System als Host OS für unsere Anwendung.
2. Internetanbindung mit entsprechenden Freigaben um benötigte Pakete wie Mysql-Server, Nodejs und Npm herunterladen und installieren zu können.
#### Hauptanwendung auf dem System installieren
1. Der komplette "server" Ordner muss auf dem System in einem nicht temporären Verzeichnis platziert werden, z.B. C:\server oder, falls keine Administratorrechte vorhanden sind, C:\Users\userX\server wobei "userX" möglichst alle Lese-/Schreib-/                  Ausführungsrechte auf dem Windows-System haben sollte.
2. Als nächstes in das Installationsverzeichnis wechseln in den "backend" Ordner, in dem Beispiel also in C:\Users\userX\server\backend
   Node.js installieren: Hier muss die "latest" Version von der Node.js Website heruntergeladen und installiert werden:
   * [Node.js](https://nodejs.org/)
   * Nach der Installation mit node -v die Installation verifizieren, hier sollte im Terminal Node.js Version v20.X.X angezeigt werden.
4. Npm installieren:
   * npm wird unter Windows mit Node.js mitgeliefert. Mit `npm -v` verifizieren.
   * In den "../backend" per Terminal wechseln und folgende Befehle benutzen:
   * `npm install express`
   * `npm install multer`
   * `npm install mysql2`
   * `npm install rimraf`
   * `npm install urlscan`
   * `npm install marked`
5. MySQL-Server aufsetzen:
   * MySQL v8+ Herunterladen [MySQL Download](https://dev.mysql.com/downloads/installer/)
   * Installationsanweisungen befolgen und bei den Zugangsdaten die gleichen Zugangsdaten angeben die in der ../backend/ConnectionData.js stehen.
   * Nach der Installation den Login testen mit `mysql -u $user -p` wenn die MySQL CLI zu sehen ist, dann hat bis hierhin alles funktioniert.
7. MySQL Datenbank Schema importieren:
   * Die einfachste Möglichkeit hier wäre ein Programm wie "MySQL Workbench" zu nutzen und sich mit dem MySQL Server zu verbinden und die ../backend/DatabaseInit.sql auszuführen.
   * Alternativ per Powershell mit Admin rechten: `mysql -u root -p jumi < DatabaseInit.sql` ausführen.
   * Noch einmal einloggen in die MySQL `mysql -u $user -p` und `use jumi` und testen ob beispielsweise die Tabelle "user" existiert `describe user;` - hier sollte nun den Aufbau der "user" Tabelle anzeigen, also (id,name,password,isAdmin)
   * Zum Schluss noch einmal den MySQL Dienst neustarten entweder per CLI `net stop mysql` -> `net start mysql` oder "Services.msc".
----

### Den eigentlichen Server starten sowie weitere Informationen
Im Verzeichnis "../server/backend/" im Terminal ausführen:
* `node Server.js`
* Das Terminal sollte nun "Server is running at http://localhost:3000/" anzeigen und damit hat alles funktioniert!

Wenn die Zugangsdaten aus der ConnectionData.js mit denen vom Mysql-Server übereinstimmen, dann ist der Webserver bereits mit dem Mysql-Server verbunden.
Kann man am einfachsten testen indem man auf der Website versucht neue Rohdaten zu importieren, hier geht eine Login-Maske auf, wenn man nun beim Benutzernamen/Passwort die Daten einträgt,
die man vorher in der Admin_Config.json gesetzt hat und eine Drag and Drop Zone erscheint, dann weiss man mit Sicherheit das die Verbindung erfolgreich ist.

Falls man den Adminzugang entfernen will um zum Beispiel einen neuen Adminzugang mit einem anderen Passwort zu erstellen, dann muss
man zunächst die gewünschten Zugangsdaten in die Admin_Config.json eintragen und diese speichern und in der MySQL den User entfernen am einfachsten mit:

`drop table user;`

dann noch:

```
CREATE TABLE user (
    id int not null AUTO_INCREMENT,
    name varchar(255) not null,
    password varchar(255) not null,
    isAdmin boolean not null,
    PRIMARY KEY (id)
);
```
und dann noch einmal den Server neustarten und man kann sich nun mit den neu gesetzten Zugangsdaten einloggen.

(Linux) Falls eine GUI wie beispielsweise gnome oder kde installiert ist auf dem Ubuntu System, dann kann man einfach einen Browser öffnen auf dem Server System und http://localhost:3000/ aufrufen zum testen des Webservers.

Falls von extern auf den Server zugriff gewährt werden soll also beispielsweise von einem weiteren PC/Client dann muss für die Ubuntu VM durch den Betreiber eine feste IP vergeben werden und
der PC/Client muss sich im selben Netzwerk befinden wie der Server.
Also beispielsweise die VM hat die private IP 10.100.50.10 bekommen und der PC/Client befindet sich im gleichen privaten Netz, dann kann der PC/Client einen Browser öffnen und in die URL http://10.100.50.10:3000/ eingeben um Zugriff auf die Website des Server zu bekommen.

Der Port kann entsprechend noch angepasst werden in der Server.js: Zeile 47~ `app.listen(3000,()...)...` - man sollte nur entsprechend einen freien Port wählen, sicher frei sind hier meistens die hohen Ports wie beispielsweise 27025.

Sollte irgendwo etwas mal nicht korrekt dargestellt werden, hilft es meistens in dem jeweiligen eigenem Client Browser alle Cookies/Cache zu leeren, wenn dies auch nicht hilft dann einmal die Datenbank droppen und noch einmal unser DatabaseInit.sql Skript auszuführen (wird allerdings in der Regel nicht benötigt).

## Benutzung

### Erstmalig
Bei der erstmalingen Benutzung sind noch keine Daten in der Datenbank vorhanden, die im Dashboard angezeigt werden können. Das Dashboard zeigt jetzt den Schriftzug „Keine Daten.“ Um Dateien hochzuladen (nur mit Administratorrechten möglich) links in der Navigationsleiste auf „Importieren" klicken.
Siehe auch:
[Importieren](#importieren)

### Dashboard
Auf der Startseite, dem Dashboard, werden automatisch die Daten aus der aktuellsten in der Datenbank vorhandenen Statistik angezeigt. (Sofern Daten vorhanden sind.)

In der oberen horizontalen Navigationsleiste des Dashboards können verschiedene Einstellungen bzw. Filterungen vorgenommen werden. Im Suchfeld oben links kann nach einzelnen Webseiten gesucht werden. Die Anzahl der Webseiten in der Top-Statistik kann über den Button direkt rechts neben dem Suchfeld gewählt werden. Der nächste Button rechts dient zur Auswahl des Zeitraumes: Es können hier nur Einträge ausgewählt werden, die auch in der Datenbank vorhanden sind. Anderenfalls sind die entsprechenden Monate und Jahre ausgegraut. Zusätzlich kann über die weiteren Schaltflächen nach den angezeigten Eigenschaften gefiltert werden.

Statistiken für einzelne Monate werden in einem Donut-Diagramm dargestellt, für längere Zeiträume in einem Balkendiagramm. Rechts neben dem Diagramm befindet sich die Liste der zugehörigen Webseiten. Die Liste kann über Anklicken der Spaltenüberschriften entsprechend nach dieser Spalte sortiert werden. Die Farben in der Liste entsprechen den gleichfarbigen Flächen im Diagramm. Durch Hovern über die farbigen Flächen im Diagramm wird der Name der zugehörigen Webseite eingeblendet. Zusätzlich wird die Webseite in der Liste farbig hinterlegt.

Durch Anklicken einer einzelnen Webseite in der Liste neben dem Diagramm oder im unteren Bereich bei den neuen Webseiten wird in die Einzelwebseiten-Ansicht gewechselt. Hier kann durch Klicken auf die Legenden im Diagramm, z.B. "Zugriffe" oder "Verkehr", die jeweilige Kurve hervorgehoben werden. Für Zeiträume ohne Daten wird die Kurve grau gestrichelt dargestellt.
Um in die Dashboard-Ansicht zurückzukehren, kann oben links über dem Diagramm auf das kleine Feld geklickt werden, das den Webseitennamen und ein Mülleimersymbol zeigt.

Im unteren Bereich des Dashboards werden, wenn vorhanden, Webseiten angezeigt die erstmalig im aktuell angezeigten Zeitraum in den Daten auftauchen.


### Verwalten

#### Nur als Admin
In diesem Bereich können alle in der Datenbank vorhandenen Einträge zu Webseiten verwaltet werden. Webseiten können über die entsprechenden Checkboxen als "Sicher" oder "Unsicher" eingestuft werden, weiterhin können sie als "Wahrgenommen" kategorisiert werden, und es können Text-Kommentare zu den Einträgen hinzugefügt werden. Es kann außerdem eine API-Prüfung für die Webseiten eingesehen bzw. aktualisiert werden. Die API-Prüfung kann sowohl für einzelne Webseiten über den zugehörige Schaltfläche in der Liste erfolgen, als auch für alle in der aktuellen Ansicht angezeigten Webseiten angefordert werden über den entsprechenden Button. Das dauert dann etwas länger, eine geschätzte Dauer wird eingeblendet und muss bestätigt werden bevor die API-Prüfung gestartet wird. Alle in diesem Bereich abgerufenen, eingegebenen oder geänderten Daten bleiben dann entsprechend gespeichert.

### Vergleichen
In diesem Bereich können zwei Webseiten direkt miteinander verglichen werden. Dazu die gewünschten Webseiten aus der Liste auswählen. Die Liste kann über Klick auf die Spaltenüberschriften sortiert werden. Es kann im Suchfeld rechts über der Liste auch direkt nach Webseiten gesucht werden. Im unteren Bereich werden nun mehrere Vergleichswerte dargestellt, darunter befindet sich ein Diagramm das den Vergleich der Werte der Webseiten für Zugriffe und Datenverkehr zeigt. Zur optimierten Darstellung im Diagramm gibt es zwei Skalen links und rechts, die sich jeweils auf die Menge der Zugriffe bzw. des Datenverkehrs beziehen.

Sind bereits zwei Webseiten in den Vergleich gewählt, wird mit einem Klick auf eine weitere Webseite aus der Liste diese nun anstelle der zuletzt ausgewählten Webseite angezeigt und mit der zuerst ausgewählten Webseite vergleichen.

### Importieren
#### nur als Admin
Zum Hochladen von Dateien links in der vertikalen Navigationsleiste auf die Schaltfläche "Importieren" klicken. Um Dateien hochladen zu können, muss der Benutzer sich mit Administratorrechten einloggen. Nach erfolgreichem Login öffnet sich ein Fenster, in das die Dateien per Drag&Drop hereingezogen werden können. Ein Klick auf das X oben rechts schließt das Fenster, ebenso ein Klicken außerhalb des Fensters.

### Exportieren
Mit Klick auf diesen Button wird die aktuelle Ansicht als pdf exportiert. Achtung: Wenn eine angezeigte Liste länger ist als der aktuell angezeigte Bereich, wird nicht die ganze Liste, sondern nur der angezeigte Teil exportiert.

### Einstellungen
Hier kann der Helle bzw. Dunkle Modus für die Darstellung ausgewählt werden.

## Fehler

### Fehlermeldungen

Generell erscheinen Fehlermeldungen als PopUps, beispielsweise wenn das Importieren von Dateien nicht funktioniert hat.
Dies kann daran liegen, dass möglicherweise ein ungültiges Dateiformat (zB .jpg) versucht wird hochzuladen, oder die interne Strukturierung der Datei selbst nicht erfasst werden kann.
Spezielle Meldungen sind in der Konsole bzw. dem Terminal anzeigbar (wie)

### FAQ 

#### Problem: Import/Upload funktioniert nicht.
Mögliche Gründe:
1. Benutzer ist nicht als Admin angemeldet.
2. Das Dateiformat der hochzuladenden Datei ist unpassend. (Passende Formate: .txt oder .csv)
3. Der Aufbau/ die interne Struktur der Datei ist nicht korrekt. (Datei öffnen und mit anderen vergleichen)
4. Die Datenbank ist nicht verbunden
5. Server läuft nicht. (Verbindungen und Verbindungsdaten überprüfen)
#### Problem: Es werden keine Statistiken / Daten angezeigt.
Mögliche Gründe:
1. Es sind noch keine Daten in der Datenbank vorhanden.
2. Die Datenbank ist nicht erreichbar/gestartet.
3. Ausgewählter Filter stimmt nicht mehr mit den Daten überein.
#### Problem: Das Programm reagiert nicht.
Möglicher Grund:
1. Es wurde ein API-Check für alle Einträge in der Datenbank angestoßen. Das kann dauern. Erstmal mindestens eine halbe Stunde abwarten, dann noch mal nachsehen.
