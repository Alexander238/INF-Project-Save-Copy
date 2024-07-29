# noinspection SqlCurrentSchemaInspectionForFile

DROP DATABASE IF EXISTS jumi;
CREATE DATABASE IF NOT EXISTS jumi;
USE jumi;

CREATE TABLE user (
    id int not null AUTO_INCREMENT,
    name varchar(255) not null,
    password varchar(255) not null,
    isAdmin boolean not null,
    PRIMARY KEY (id)
);

CREATE TABLE website (
    id int not null AUTO_INCREMENT,
    url varchar(100) not null,
    first_occurrence date not null,
    isSave varchar(100),
    isAcknowledged boolean,
    comment varchar(1000),
    lastChecked date,
    PRIMARY KEY (id)
);

CREATE TABLE sums (
    date date not null,
    accesses int not null,
    traffic float not null,
    PRIMARY KEY (date)
);

CREATE TABLE accesses (
    accesses int not null,
    a_avg_user float not null,
    website int not null,
    date date not null,
    PRIMARY KEY (website, date),
    FOREIGN KEY (website) REFERENCES website(id),
    FOREIGN KEY (date) REFERENCES sums(date)
);

CREATE TABLE traffic (
    traffic float not null,
    t_avg float not null,
    website int not null,
    date date not null,
    PRIMARY KEY (website, date),
    FOREIGN KEY (website) REFERENCES website(id),
    FOREIGN KEY (date) REFERENCES sums(date)
);

CREATE TABLE api_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    website_id INT NOT NULL,
    malicious BOOLEAN,
    domain VARCHAR(255),
    url VARCHAR(255),
    screenshotURL VARCHAR(255),
    city VARCHAR(255),
    country VARCHAR(255),
    main_domain VARCHAR(255),
    main_url VARCHAR(255),
    apex_domain VARCHAR(255),
    title VARCHAR(255),
    UNIQUE KEY unique_website_id (website_id),
    FOREIGN KEY (website_id) REFERENCES website(id)
);

-- insert wird nicht mehr benötigt, Zugangsdaten in die Admin_Config.json eintragen und die 'user' Tabelle einmal droppen und neu erstellen
-- Server neustarten und mit den Zugangsdaten aus der Admin_Config einloggen.
-- insert into user (name, password, isAdmin) values ("admin", "admin", TRUE);
