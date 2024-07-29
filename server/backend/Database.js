import mysql from 'mysql2';
import path from 'path';
import { dirname } from 'path'
import { fileURLToPath } from 'url';
import fs from "fs";
import * as connectionData from './ConnectionData.js';
import {hashPassword, isValidDate, verifyPassword} from "./Functions.js";

const pool = mysql.createPool({
    host: connectionData.host,
    user: connectionData.user,
    password: connectionData.password,
    database: connectionData.database,
    timezone: 'Z'
}).promise();

async function dateExists(date) {
    const result = await pool.query('SELECT * FROM sums WHERE date = ?', [date]);
    const data = result[0];
    return data.length > 0;
}

async function saveSums(date, totalAccesses, totalBytes) {
    const dateDoesExists = await dateExists(date);
    if(!dateDoesExists) {
        const result = await pool.query('INSERT INTO sums (date, accesses, traffic) VALUES (?, ?, ?)', [date, totalAccesses, totalBytes]);
        return result[0].insertId;
    }
    return -1;
}

async function urlExists(url) {
    const result = await pool.query('SELECT * FROM website WHERE url = ?', [url]);
    const data = result[0];
    return data.length > 0;
}

async function compareDates(url, arrFoDate, strNewDate) {
    const firstOccurrenceDate = arrFoDate[0][0].first_occurrence;
    const newDate = new Date(strNewDate);

    if (newDate < firstOccurrenceDate){

        //? first_occurrence changes
        await pool.query('UPDATE website SET first_occurrence = ? WHERE url = ?', [newDate, url]);
    }
}

async function saveURL(url, date) {
    if (await urlExists(url)) {
        const foDate = await pool.query('SELECT first_occurrence FROM website where url = ?', [url]);
        await compareDates(url, foDate, date);

        const idQuery = await pool.query('SELECT id FROM website WHERE url = ?', [url]);
        return idQuery[0][0].id;
    } else {
        // Added isAcknowledged and false here, if it doesn't work lmk lol.
        const insertQuery = await pool.query('INSERT INTO website (url, first_occurrence, isSave, isAcknowledged) VALUES (?, ?, ?, ?)', [url, date, "Nicht angegeben", false]);
        return insertQuery[0].insertId;
    }
}

async function accessExists(websiteID, date) {
    const result = await pool.query('SELECT * FROM accesses WHERE website = ? AND date = ?', [websiteID, date]);
    const data = result[0];
    return data.length > 0;
}

async function saveAccesses(accesses, average, websiteID, date) {
    const accessDoesExists = await accessExists(websiteID, date);
    if(!accessDoesExists) {
        const result = await pool.query('INSERT INTO accesses (accesses, a_avg_user, website, date) VALUES (?, ?, ?, ?)', [accesses, average, websiteID, date]);
        return result[0].insertId;
    }
    // If access already exists
    return -1;
}

async function bytesExists(websiteID, date) {
    const result = await pool.query('SELECT * FROM traffic WHERE website = ? AND date = ?', [websiteID, date]);
    const data = result[0];
    return data.length > 0;
}

async function saveBytes(bytes, average, websiteID, date) {
    const bytesDoesExists = await bytesExists(websiteID, date);
    if(!bytesDoesExists) {
        const result = await pool.query('INSERT INTO traffic (traffic, t_avg, website, date) VALUES (?, ?, ?, ?)', [bytes, average, websiteID, date]);
        return result[0].insertId;
    }
    // If access already exists
    return -1;
}

async function getAccesses(amount, year, month, safe, ack) {
    const date = `${year}-${month}-01`;
    if (!isValidDate(date)) {throw new Error(`ERROR: The date ${date} is invalid`)}

    let safeCondition = '';
    if (safe == 1) {
        safeCondition = ' AND w.isSave = "Ja"';
    } else if (safe == 2) {
        safeCondition = ' AND w.isSave = "Nein"';
    } else if (safe == 3) {
        safeCondition = ' AND w.isSave = "Nicht angegeben"';
    }

    let ackCondition = '';
    if (ack == 1) {
        ackCondition = ' AND w.isAcknowledged = TRUE';
    } else if (ack == 2) {
        ackCondition = ' AND w.isAcknowledged = FALSE';
    }

    const result = await pool.query('SELECT\n' +
        '   @rank := @rank + 1 AS \'Rang\',\n' +
        '   w.url AS \'URL\',\n' +
        '   FORMAT(a.accesses, 0, \'de_DE\') AS \'Zugriffe\',\n' +
        '   FORMAT(a.a_avg_user, 2, \'de_DE\') AS \'Durschnittliche Benutzer pro Tag\'\n' +
        'FROM\n' +
        '   (SELECT website, SUM(accesses) AS accesses, AVG(a_avg_user) AS a_avg_user\n' +
        '   FROM accesses\n' +
        `   WHERE MONTH(date) = ${month} AND YEAR(date) = ${year}` +
        '   GROUP BY website \n' +
        '   ORDER BY accesses DESC \n' +
        `       LIMIT ${amount}) AS a` +
        '       JOIN website w ON a.website = w.id \n' +
        '       CROSS JOIN (SELECT @rank := 0) r\n' +
        '           WHERE TRUE = TRUE ' + safeCondition + ackCondition + ' ' +
        'ORDER BY accesses DESC;\n'
    );

    return result[0];
}

async function getTraffic(amount, year, month, safe, ack) {
    const date = `${year}-${month}-01`;
    if (!isValidDate(date)) {throw new Error(`ERROR: The date ${date} is invalid`)}

    let safeCondition = '';
    if (safe == 1) {
        safeCondition = ' AND w.isSave = "Ja"';
    } else if (safe == 2) {
        safeCondition = ' AND w.isSave = "Nein"';
    } else if (safe == 3) {
        safeCondition = ' AND w.isSave = "Nicht angegeben"';
    }

    let ackCondition = '';
    if (ack == 1) {
        ackCondition = ' AND w.isAcknowledged = TRUE';
    } else if (ack == 2) {
        ackCondition = ' AND w.isAcknowledged = FALSE';
    }

    const result = await pool.query('SELECT\n' +
        '   @rank := @rank + 1 AS \'Position\',\n' +
        '   w.url AS \'URL\',\n' +
        '   FORMAT(t.traffic, 2, \'de_DE\') AS \'Verkehr in GB\',\n' +
        '   FORMAT(t.t_avg, 2, \'de_DE\') AS \'Durschnittliche Benutzer pro Tag\'\n' +
        'FROM\n' +
        '   (SELECT website, SUM(traffic) AS traffic, AVG(t_avg) AS t_avg \n' +
        '   FROM traffic \n' +
        `   WHERE MONTH(date) = ${month} AND YEAR(date) = ${year}` +
        '   GROUP BY website \n' +
        '   ORDER BY traffic DESC \n' +
        `       LIMIT ${amount}) AS t` +
        '       JOIN website w ON t.website = w.id \n' +
        '       CROSS JOIN (SELECT @rank := 0) r \n' +
        '           WHERE TRUE = TRUE ' + safeCondition + ackCondition + ' ' +
        'ORDER BY traffic DESC;\n'
    );

    const result1 = await pool.query('SELECT\n' +
        '    @rank := @rank + 1 AS Position,\n' +
        '    w.url AS URL,\n' +
        '    FORMAT(t.traffic, 2, "de_DE") AS \'Verkehr in GB\', \n' +
        '    FORMAT(t.t_avg, 2, "de_DE") AS \'Durschnittliche Benutzer pro Tag\'\n' +
        'FROM\n' +
        '    (SELECT website, SUM(traffic) AS traffic, AVG(t_avg) AS t_avg\n' +
        '     FROM traffic\n' +
        `     WHERE MONTH(date) = ${month} AND YEAR(date) = ${year}` +
        '     GROUP BY website\n' +
        `     ORDER BY traffic DESC LIMIT ${amount})` +
        '        AS t JOIN website w ON t.website = w.id\n' +
        '        CROSS JOIN (SELECT @rank := 0) r\n' +
        'ORDER BY\n' +
        '    traffic DESC;\n');
    return result[0];
}

async function getWebsiteAccessesByName(url) {
    const result = await pool.query('SELECT\n' +
        '    w.url AS URL,\n' +
        '    DATE_FORMAT(date, \'%Y-%m\') as YearMonth,\n' +
        '    SUM(a.accesses) AS TotalAccesses\n' +
        'FROM accesses a JOIN website w ON a.website = w.id\n' +
        `WHERE w.url LIKE '%${url}%'` +
        'GROUP BY w.url, YearMonth\n' +
        'ORDER BY w.url, YearMonth;\n')

    return result[0];
}

async function getWebsiteTrafficByName(url) {
    const result = await pool.query('SELECT\n' +
        '    w.url AS URL,\n' +
        '    DATE_FORMAT(date, \'%Y-%m\') as YearMonth,\n' +
        '    SUM(t.traffic) AS TotalTraffic\n' +
        'FROM traffic t JOIN website w ON t.website = w.id\n' +
        `WHERE w.url LIKE '%${url}%'` +
        'GROUP BY w.url, YearMonth\n' +
        'ORDER BY w.url, YearMonth;')
    return result[0];
}

async function getWebsiteAccessesByNameWithTimeFrame(url, start, end) {
    if (end !== undefined) {
        end = end + "-28";
    }
    end = checkEndDate(end);
    start = start + "-01";

    if (!isValidDate(start) || !isValidDate(end)) {throw new Error("ERROR: INVALID DATE FORMAT")}

    const result = await pool.query('SELECT\n' +
        '    w.url AS URL,\n' +
        '    DATE_FORMAT(date, \'%Y-%m\') as YearMonth,\n' +
        '    a.accesses AS TotalAccesses,\n' +
        '    a.a_avg_user AS AverageUsers\n' +
        'FROM accesses a JOIN website w ON a.website = w.id\n' +
        `WHERE w.url LIKE '%${url}%' AND a.date BETWEEN '${start}' AND '${end}'` +
        'ORDER BY YearMonth;\n')
    return result[0];
}

async function getWebsiteTrafficByNameInTimeframe(url, start, end) {
    if (end !== undefined){end = end + "-28";}
    end = checkEndDate(end);
    start = start + "-01";
    if (!isValidDate(start) || !isValidDate(end)) {throw new Error("ERROR: INVALID DATE FORMAT");}

    const result = await pool.query('SELECT\n' +
        '    w.url AS URL,\n' +
        '    DATE_FORMAT(date, \'%Y-%m\') as YearMonth,\n' +
        '    SUM(t.traffic) AS TotalTraffic\n' +
        'FROM traffic t JOIN website w ON t.website = w.id\n' +
        `WHERE w.url LIKE '%${url}%' AND t.date BETWEEN '${start}' AND '${end}'` +
        'GROUP BY w.url, YearMonth\n' +
        'ORDER BY w.url, YearMonth;')
    return result[0];
}

async function getWebsiteNamesByPartialURL(url) {
    const result = await pool.query(`SELECT url FROM website WHERE url LIKE '%${url}%'`);
    return result[0];
}

async function getUnacknowledgedWebsitesInTimeframe(start, end) {
    end = checkEndDate(end)
    if (!isValidDate(start) || !isValidDate(end)) {throw new Error(`ERROR: Invalid Date format for either start: ${start} or end: ${end}.`)}

    const query = `
        SELECT id, url, DATE_FORMAT(first_occurrence, '%Y-%m') as first_occurrence, isSave, isAcknowledged
        FROM website 
        WHERE website.first_occurrence BETWEEN ? AND ? AND website.isAcknowledged IS NULL`;

    const result = await pool.query(query, [start, end])
    return result[0];
}

async function getAllWebsites(){
    const result = await pool.query('SELECT id, url, DATE_FORMAT(first_occurrence, \'%Y-%m\') as first_occurrence, isSave, isAcknowledged, comment, lastChecked FROM website;')
    return result[0];
}

async function getUnacknowlegdedWebsites() {
    const result = await pool.query('SELECT id, url, DATE_FORMAT(first_occurrence, \'%Y-%m\') as first_occurrence, isSave, isAcknowledged\n' +
        'FROM website\n' +
        'WHERE isAcknowledged IS NULL;')
    return result[0];
}

async function getNewWebsites(year, month){
    if (year !== undefined && month !== undefined) {
        const date = year + "-" + month + "-01";
        if (!isValidDate(date)) {throw new Error(`ERROR: ${date} is invalid`);}
    } else {
        const currentDate = new Date();
        year = currentDate.getFullYear();
        month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed, so we add 1
        console.log(`No date given, retrieving data for ${year}-${month}`);
    }

    const result = await pool.query(`SELECT url, DATE_FORMAT(first_occurrence, '%Y-%m') as first_occurrence, isSave, isAcknowledged FROM website
                                    WHERE YEAR(first_occurrence) = ? AND MONTH(first_occurrence) = ?;`, [year, month]);
    return result[0];
}

async function getSumsOfYearMonth(year, month){
    let date;
    if (year !== undefined && month !== undefined) {
        date = year + "-" + month + "-01";
        if (!isValidDate(date)) {throw new Error("INVALID DATE");}
    } else {
        const currentDate = new Date();
        year = currentDate.getFullYear();
        month = String(currentDate.getMonth() + 1).padStart(2, '0');
        console.log(`No date given, retrieving data for ${year}-${month}`);
    }

    const result = await pool.query(`SELECT accesses, traffic FROM sums WHERE YEAR(date) = ? AND MONTH(date) = ?`, [year, month]);
    return result[0];
}

async function getAllDates(){
    const result = await pool.query(`SELECT DATE_FORMAT(date, \'%Y-%m\') as YearMonth FROM sums`);
    return result[0];
}

async function getSumsOfYearMonthWithTimeframe(start, end){
    end = checkEndDate(end);
    if (end !== undefined){end = end + "-01";}

    start = start + "-01";
    if (!isValidDate(end) && !isValidDate(start)){
        throw new Error(`Invalid date(s): ${start} and ${end}`);
    }

    const result = await pool.query(`SELECT DATE_FORMAT(date, '%Y-%m') as date, accesses, traffic FROM sums
                                    WHERE date BETWEEN ? AND ?;`, [start, end]);
    return result[0];
}

async function getWebsiteAccessesAndTrafficByTimeframe(start, end) {
    end = checkEndDate(end);
    if (end !== undefined){end = end + "-01";}

    start = start + "-01";
    if (!isValidDate(end) && !isValidDate(start)){
        throw new Error(`Invalid date(s): ${start} and ${end}`);
    }

    const result = await pool.query(`select w.url, DATE_FORMAT(s.date, '%Y-%m') as date, a.accesses, a.a_avg_user, t.traffic, t.t_avg
                           FROM website w
                               JOIN sums s ON w.first_occurrence <= s.date
                               LEFT JOIN accesses a ON w.id = a.website AND s.date = a.date
                               LEFT JOIN traffic t ON w.id = t.website AND s.date = t.date
                           WHERE (s.date BETWEEN ? AND ?) AND (a.accesses is not null OR t.traffic is not null)
                           ORDER BY w.id, s.date;`, [start, end]);
    return result[0];
}

async function getTopAccessesInTimeframe(start, end, amount) {
    end = checkEndDate(end);
    if (end !== undefined){end = end + "-01";}

    start = start + "-01";
    if (!isValidDate(end) && !isValidDate(start)){
        throw new Error(`Invalid date(s): ${start} and ${end}`);
    }

    const result = await pool.query(`
                            SELECT website.id, website.url, SUM(accesses.accesses) AS total_accesses
                            FROM website
                                JOIN accesses ON website.id = accesses.website
                                JOIN sums ON accesses.date = sums.date
                            WHERE sums.date BETWEEN ? AND ?
                            GROUP BY website.id, website.url
                            ORDER BY total_accesses DESC LIMIT ?;`, [start, end, parseInt(amount)]);
    return result[0];
}

async function getTopTrafficInTimeframe(start, end, amount) {
    end = checkEndDate(end);
    if (end !== undefined){end = end + "-01";}

    start = start + "-01";
    if (!isValidDate(end) && !isValidDate(start)){
        throw new Error(`Invalid date(s): ${start} and ${end}`);
    }

    const result = await pool.query(`
                           SELECT website.id, website.url, FORMAT(SUM(traffic.traffic), 3) AS total_traffic
                           FROM website
                                   JOIN traffic ON website.id = traffic.website
                                   JOIN sums ON traffic.date = sums.date
                           WHERE sums.date BETWEEN ? AND ?
                           GROUP BY website.id, website.url
                           ORDER BY total_traffic DESC LIMIT ?;`, [start, end, parseInt(amount)]);
    return result[0];
}

async function loginUser(username, password) {
    try {
        const sql = 'SELECT * FROM user';
        const [rows, fields] = await pool.query(sql);

        for (const user of rows) {
            if (verifyPassword(user.name, username) && verifyPassword(user.password, password)) {
                return [user];
            }
        }
        return [];
    } catch (error) {
        console.error('Error logging in user:', error);
        throw error;
    }
}


function checkEndDate(end){
    if (end === undefined) {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed, so we add 1
        return `${year}-${month}-28`;
    }
    return end;
}

async function getMonthsOfWebsite(id) {
    const result = await pool.query(`SELECT DISTINCT DATE_FORMAT(date, '%Y-%m') as date FROM (
         SELECT date FROM accesses WHERE website = ?
         UNION
         SELECT date FROM traffic WHERE website = ?
         order by date ) AS combined_dates;`, [id, id]);
    return result[0];
}

async function getDataOfWebsite(id, date) {
    date = date + "-01";
    if (!isValidDate(date)) {throw new Error(`ERROR: ${date} is not a valid date. Enter date in YYYY-MM Format.`)}

    const result = await pool.query(`
                           SELECT DATE_FORMAT(w.first_occurrence, '%Y-%m') AS first_occurrence, a.accesses, a.a_avg_user, t.traffic, t.t_avg
                           FROM website AS w
                             LEFT JOIN accesses AS a ON w.id = a.website AND a.date = ?
                             LEFT JOIN traffic AS t ON w.id = t.website AND t.date = ?
                           WHERE w.id = ?;`, [date, date, id]);
    return result[0];
}

async function getAllDataOfWebsite(url) {
    const result = await pool.query(`
            SELECT
                DATE_FORMAT(COALESCE(a.date, t.date), '%Y-%m') AS date,
                COALESCE(w.url, 'No URL') AS url,
                COALESCE(a.accesses, 0) AS accesses,
                COALESCE(t.traffic, 0) AS traffic,
                COALESCE(a.a_avg_user, t.t_avg) AS avg_user
            FROM
                accesses a
            LEFT JOIN
                traffic t ON a.date = t.date AND a.website = t.website
            LEFT JOIN
                website w ON w.id = a.website
            WHERE w.url = ?
            UNION
            SELECT
                DATE_FORMAT(COALESCE(a.date, t.date), '%Y-%m') AS date,
                COALESCE(w.url, 'No URL') AS url,
                COALESCE(a.accesses, 0) AS accesses,
                COALESCE(t.traffic, 0) AS traffic,
                COALESCE(a.a_avg_user, t.t_avg) AS avg_user
            FROM
                traffic t
            LEFT JOIN
                accesses a ON t.date = a.date AND t.website = a.website
            LEFT JOIN
                website w ON w.id = t.website
            WHERE
                (a.date IS NULL OR a.website IS NULL) AND w.url = ?;
`,
        [url, url]);
    return result[0];
}

async function getWebsiteOccurrences(id) {
    const result = await pool.query(`
                           SELECT
                              COUNT(DISTINCT accesses.date) AS accesses_count,
                              COUNT(DISTINCT traffic.date) AS traffic_count
                           FROM website
                              LEFT JOIN accesses ON website.id = accesses.website
                              LEFT JOIN traffic ON website.id = traffic.website
                           WHERE website.id = ?;`, [id]);
    return result[0];
}

async function updateIsSaveInWebsite(id, value) {
    const result = await pool.query('UPDATE website SET isSave = ? WHERE id = ?;', [value, id]);
    return result[0].insertId;
}

async function updateIsAcknowledgedInWebsite(id, value) {
    const result = await pool.query('UPDATE website SET isAcknowledged = ? WHERE id = ?;', [value, id]);
    return result[0].insertId;
}

async function deleteEntryOfMonthInYear(month, year) {
    const date = `${year}-${month}-01`;
    if (!isValidDate(date)) {throw new Error(`ERROR: The date ${date} is invalid`)}

    try {
        // Accesses table
        await pool.query('DELETE FROM accesses WHERE date BETWEEN ? AND ?', [date, date]);

        // Traffic table
        await pool.query('DELETE FROM traffic WHERE date BETWEEN ? AND ?', [date, date]);

        // Sums table
        await pool.query('DELETE FROM sums WHERE date BETWEEN ? AND ?', [date, date]);

        // Api_data table
        await pool.query(`
            DELETE FROM api_data 
            WHERE website_id IN (SELECT id FROM website WHERE first_occurrence BETWEEN ? AND ?)
        `, [date, date]);

        // Website table
        // Find websites with first_occurrence between the specified date range
        const [websitesToDelete] = await pool.query(`
            SELECT id FROM website WHERE first_occurrence BETWEEN ? AND ?
        `, [date, date]);

        if (websitesToDelete.length > 0) {
            const websiteIds = websitesToDelete.map(website => website.id);

            // Check if these websites have other appearances in accesses, traffic, or sums tables
            const [websitesInAccesses] = await pool.query(`
                SELECT DISTINCT website FROM accesses WHERE website IN (?)
            `, [websiteIds]);

            const [websitesInTraffic] = await pool.query(`
                SELECT DISTINCT website FROM traffic WHERE website IN (?)
            `, [websiteIds]);

            // Remove websites that have other appearances in sums, accesses, or traffic tables
            const websitesToActuallyDelete = websiteIds.filter(id =>
                !websitesInAccesses.some(w => w.website === id) &&
                !websitesInTraffic.some(w => w.website === id)
            );

            if (websitesToActuallyDelete.length > 0) {
                await pool.query('DELETE FROM website WHERE id IN (?)', [websitesToActuallyDelete]);
            }
        }
        await pool.query('COMMIT');

        return { success: true, message: `Entries for ${month}/${year} deleted successfully` };
    } catch (error) {
        console.error('Error deleting entries:', error);
        throw error;
    }
}

async function updateCommentOnWebsite(id, value) {
    const result = await pool.query('UPDATE website SET comment = ? WHERE id = ?;', [value, id]);
    return result[0].insertId;
}

// Hinzugefügt von Nina und Lucas - 4.5.24
async function getListOfAllWebsitesInTimeframe(start, end) {
    end = checkEndDate(end)
    if (!isValidDate(start) || !isValidDate(end)) {throw new Error("ERROR: INVALID DATE FORMAT")}

    const result = await pool.query(`SELECT DISTINCT(a.website), w.url as url  FROM accesses a
                                    JOIN website w ON w.id = a.website
                                    WHERE a.date >= ? AND a.date <= ?`, [start, end]);
    return result[0];
}

async function getNumberOfEntriesForEachMonth() {
    const result = await pool.query('SELECT COUNT(accesses) AS Top, DATE_FORMAT(date, \'%Y-%m\') as date FROM jumi.accesses GROUP BY date ORDER BY Top DESC')
    return result[0];
}

// Neue Funktion zum Speichern der API-Daten
async function saveApiData(apiResult, websiteId) {
    const sql = `
        INSERT INTO api_data 
        (website_id, malicious, domain, url, screenshotURL, city, country, main_domain, main_url, apex_domain, title) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        malicious = VALUES(malicious),
        domain = VALUES(domain),
        url = VALUES(url),
        screenshotURL = VALUES(screenshotURL),
        city = VALUES(city),
        country = VALUES(country),
        main_domain = VALUES(main_domain),
        main_url = VALUES(main_url),
        apex_domain = VALUES(apex_domain),
        title = VALUES(title);
    `;

    // Safely access each attribute and set default values if undefined
    const values = [
        websiteId,
        apiResult.verdicts?.malicious ? 1 : 0,
        apiResult.task?.domain || '',
        apiResult.task?.url || '',
        apiResult.task?.screenshotURL || '',
        apiResult.page?.city || '',
        apiResult.page?.country || '',
        apiResult.page?.domain || '',
        apiResult.page?.url || '',
        apiResult.page?.apexDomain || '',
        apiResult.page?.title || ''
    ];
    await pool.query(sql, values);
}

async function getApiLastChecked(url) {
    const result = await pool.query(`
        SELECT DATE_FORMAT(lastChecked, \'%Y-%m-%d\') as lastChecked
        FROM website
        WHERE url = ?;
    `, [url]);
    return result[0];
}

async function getApiDataByUrl(url) {
    const result = await pool.query(`
        SELECT ad.malicious, ad.domain, ad.url, ad.screenshotURL, ad.city, ad.country, ad.main_domain, ad.main_url, ad.apex_domain, ad.title
        FROM api_data ad
        JOIN website w ON ad.website_id = w.id
        WHERE w.url = ?;
    `, [url]);
    return result[0];
}
async function updateLastCheckedDate(websiteId, date) {
    const sql = 'UPDATE website SET lastChecked = ? WHERE id = ?';
    const values = [date, websiteId];
    await pool.query(sql, values);
}
async function createAdminUser() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const configPath = path.join(__dirname, 'Admin_Config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    const adminUsername = config.adminUsername;
    const adminPassword = config.adminPassword;

    const hashedAdminUsername = await hashPassword(adminUsername);
    const hashedAdminPassword = await hashPassword(adminPassword);

    try {
        // Check ob Admin Zugang bereits existiert
        const [rows] = await pool.query('SELECT * FROM user WHERE isAdmin = ?', [true]);
        if (rows.length === 0) { //noch anpassen
            // Wenn keiner existiert dann wird einer mit den aus der Admin_Config.json angelegt
            const sql = 'INSERT INTO user (name, password, isAdmin) VALUES (?, ?, ?)';
            await pool.query(sql, [hashedAdminUsername, hashedAdminPassword, true]);
            console.log('Admin Zugang erstellt');
        } else {
            console.log('Admin Zugang existiert');
        }
    } catch (err) {
        console.error('Database might not be started!');
        console.error('Error creating admin user:', err);
    }
}

async function checkDatabaseRunning() {
    await pool.query('SELECT * FROM website');
}

export {
    saveSums,
    saveBytes,
    saveAccesses,
    saveURL,
    getAccesses,
    getTraffic,
    getWebsiteTrafficByName,
    getWebsiteAccessesByName,
    getWebsiteAccessesByNameWithTimeFrame,
    getWebsiteTrafficByNameInTimeframe,
    getUnacknowlegdedWebsites,
    getUnacknowledgedWebsitesInTimeframe,
    loginUser,
    getSumsOfYearMonth,
    getNewWebsites,
    getSumsOfYearMonthWithTimeframe,
    updateIsSaveInWebsite,
    getAllWebsites,
    updateIsAcknowledgedInWebsite,
    getMonthsOfWebsite,
    getDataOfWebsite,
    getWebsiteOccurrences,
    getListOfAllWebsitesInTimeframe,
    getWebsiteAccessesAndTrafficByTimeframe,
    getTopTrafficInTimeframe,
    getTopAccessesInTimeframe,
    getAllDates,
    getNumberOfEntriesForEachMonth,
    getAllDataOfWebsite,
    updateCommentOnWebsite,
    getWebsiteNamesByPartialURL,
    saveApiData,
    getApiDataByUrl,
    updateLastCheckedDate,
    deleteEntryOfMonthInYear,
    createAdminUser,
    getApiLastChecked,
    checkDatabaseRunning
}