# JuMi Informatik Projekt

# ACHTUNG

Bei diesem Repository handelt es sich um eine leicht angepasste Kopie eines privaten Repositories, da dieses informationskritische Dateien enthält.  

## Installationsanleitung Linux Server:

### Voraussetzungen:
  1. Blankes Ubuntu 20.04 oder Ubuntu 22.04 System als Host OS für unsere Anwendung (gnome/KDE Desktop GUI wird nicht benötigt allerdings hilfreich zum testen).
  
  2. Internetanbindung mit entsprechenden Freigaben um Pakete wie mysql-server, nodejs und npm herunterladen und installieren zu können.

### Hauptanwendung auf dem System installieren:
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
## Installationsanleitung Windows Server:
### Voraussetzungen:
  1. Blanker Windows Server 2019 oder Windows Server 2022 System als Host OS für unsere Anwendung.
  2. Internetanbindung mit entsprechenden Freigaben um benötigte Pakete wie Mysql-Server, Nodejs und Npm herunterladen und installieren zu können.
### Hauptanwendung auf dem System installieren:
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

### Den eigentlichen Server starten sowie weitere Informationen (FAQ):
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
