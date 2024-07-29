import {StatisticDataParser} from "./StatisticDataParser.js";
import fs, {readdirSync, rmSync} from 'fs'
import {createHash, randomBytes, pbkdf2Sync} from 'crypto';
import {saveURL, saveAccesses, saveBytes, saveSums, saveApiData, updateLastCheckedDate} from './Database.js';
import URLscan from "urlscan";

const config = JSON.parse(fs.readFileSync('API_Config.json', 'utf8'));
const urlscan = new URLscan(config); //initalisiert API mit Config.

const secretKey = 'c70435104889f7c5d9e70e7a7a1e9e3d8b673dc145b8a6b9e7580287d8a67841';

/**** FUNCTIONS ****/

export function isNumeric(str) {
    return !isNaN(str) && !isNaN(parseFloat(str));
}

export function isValidDate(dateStr) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;

    if (!regex.test(dateStr)) {
        return false;
    }

    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}

export async function parseFormData(files) {
    if (files === undefined) {
        throw new Error("ERROR: No files to parse were given.");
    }

    const parser = new StatisticDataParser();
    const success = await parser.parseFiles(files);

    let parsedData;
    // success[0] contains the status of the parsing process, success[1] can contain an error message.
    if (success[0]) {
        parsedData = parser.getData();
    } else {
        return [false, success[1]];
    }

    deleteTemporaryUploadsFolder("../uploads");
    return [true, parsedData];
}

function deleteTemporaryUploadsFolder(pathToFolder) {
    // Check if the folder exists
    fs.access(pathToFolder, fs.constants.F_OK, (err) => {
        if (err) {
            console.error('ERROR: Folder does not exist.');
            return;
        }

        // Delete the folder
        fs.rm(pathToFolder, {recursive: true}, (err) => {
            if (err) {
                console.error('ERROR while deleting folder:', err);
            } else {
                console.log('Temporary Folder was deleted successfully.');
            }
        });
    });
}

export async function saveToDatabase(data) {
    try {
        let date = data.date;
        const accesses = data.accesses;
        const bytes = data.bytes;
        const totalAccesses = data.totalAccesses;
        const totalBytes = data.totalBytes;

        /* Save date and sums to database.
         Note: Important this happens first, date is used as foreign key in other tables. */
        await saveSums(date, totalAccesses, totalBytes);

        // Save URLs
        let websites = new Map();
        await forEachList(accesses, async (value) => {
            const url = value[2];
            if (!websites.has(url)) {
                const websiteID = await saveURL(url, date);
                websites.set(url, websiteID);
            }
        });
        await forEachList(bytes, async (value) => {
            const url = value[2];
            if (!websites.has(url)) {
                const websiteID = await saveURL(url, date);
                websites.set(url, websiteID);
            }
        });

        // Save accesses to database
        await forEachList(accesses, (value) => {
            const websiteID = websites.get(value[2]);
            const thisAccesses = parseInt(value[0]);
            const thisAverage = parseFloat(value[1].replace(",", "."));

            saveAccesses(thisAccesses, thisAverage, websiteID, date);
        });

        // Save bytes to database
        await forEachList(bytes, (value) => {
            const websiteID = websites.get(value[2]);
            const thisBytes = parseFloat(value[0].replace(",", "."));
            const thisAverage = parseFloat(value[1].replace(",", "."));

            saveBytes(thisBytes, thisAverage, websiteID, date);
        });

        async function forEachList(listOfWebsites, functionToCall) {
            for (const value of listOfWebsites.values()) {
                await functionToCall(value);
            }
        }
    } catch (error) {
        throw error;
    }
}
export async function scanUrl(url, websiteId) {
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    try {
        const submission = await urlscan.submit(url);
        await delay(5000); // 5s Delay zwischen den Submits sonst liefert die API einen Error
        if (!submission.uuid) {
            return 'KEINE_DOMAIN';
        }
        let result = await waitForResult(submission.uuid);

        // Wenn die API mit "undefined" antwortet oder es kein Urteil gibt ob die Seite sicher oder unsicher ist
        // Dann wird die Webseite erstmal als unsicher eingestuft!
        const isMalicious = !result || !result.verdicts || result.verdicts.malicious === undefined || result.verdicts.malicious;

        if (!result) {
            result = {
                verdicts: {
                    malicious: true,
                },
                task: {
                    domain: 'Webseite hat keine Analyse zugelassen und wurde daher als unsicher eingestuft!',
                    url: 'Unbekannt',
                    screenshotURL: ''
                },
                page: {
                    city: 'Unbekannt',
                    country: 'Unbekannt',
                    domain: 'Unbekannt',
                    url: 'Unbekannt',
                    apexDomain: 'Unbekannt',
                    title: 'Unbekannt'
                },
                lists: {
                    domains: []
                }
            };
        } else {
            result.verdicts = result.verdicts || { malicious: true };
            result.task = result.task || { domain: 'Webseite hat keine Analyse zugelassen und wurde daher als unsicher eingestuft!', url: 'Unbekannt', screenshotURL: '' };
            result.page = result.page || { city: 'Unbekannt', country: 'Unbekannt', domain: 'Unbekannt', url: 'Unbekannt', apexDomain: 'Unbekannt', title: 'Unbekannt' };
            result.lists = result.lists || { domains: [] };
        }

        await saveApiData(result, websiteId); // Speichert API-Ergebnisse in der Datenbank

        // Update the last checked date in the website table
        const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
        await updateLastCheckedDate(websiteId, currentDate);

        return result;
    } catch (error) {
        if (error.type === 'system' && error.code === 'ETIMEDOUT') {
            console.error('Error scanning URL: The request timed out.');
            return { error: 'API_UNREACHABLE' };
        }else{
            console.error('Error scanning URL:', error);
            throw error;
        }
    }
}


async function waitForResult(uuid) {
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    let result;

    while (true) {
        try {
            result = await urlscan.result(uuid);
            if (result && result.message !== 'Scan is not finished yet') {
                return result;
            }
        } catch (error) {
            console.error('Error fetching result, retrying...', error);
            break;
        }
        await delay(5000); // 5s Delay zwischen den Submits sonst liefert die API einen Error
    }
}

export function hashAdminStatus(isAdmin) {
    const combinedValue = isAdmin.toString() + secretKey;
    return createHash('sha256').update(combinedValue).digest('hex');
}
export function hashPassword(password) {
    const salt = randomBytes(16).toString('hex'); // Generate a random salt
    const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}
export function verifyPassword(storedPassword, suppliedPassword) {
    const [salt, originalHash] = storedPassword.split(':');
    const hash = pbkdf2Sync(suppliedPassword, salt, 1000, 64, 'sha512').toString('hex');
    return hash === originalHash;
}