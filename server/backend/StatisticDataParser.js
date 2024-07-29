import fs from 'fs';
import path, {dirname} from "path";
import {fileURLToPath} from "url";

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parses statistics data from files and organizes it into a structured format.
 */
export class StatisticDataParser {
    parsedData = {};

    constructor() {
        this.parsedData = {};
    }

    /**
     * Parses all files and calls the transformData method for each.
     *
     * @param files All files
     */
    async parseFiles(files) {
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file
                    && typeof file.mimetype === 'string'
                    && file.originalname.endsWith('.txt')
                    && file.mimetype === 'text/plain') {
                    const message = await this.transformData(file).then((status) => {
                        if (status) {
                            console.log(`File "${file.originalname}" transformed successfully.`)
                        } else {
                            console.error(`Error transforming file: ${file.originalname}`);
                            return `ERROR: Hochladen der Datei: <br>${file.originalname} ist fehlgeschlagen. <br><br>Bitte überprüfen Sie die Datei.`;
                        }

                        return "";
                    });

                    if (message !== '') {
                        return [false, message];
                    }
                } else if (file
                    && typeof file.mimetype === 'string'
                    && file.originalname.endsWith('.csv')
                    && file.mimetype === 'text/csv') {
                    const message = await this.transformCSVData(file).then((status) => {
                        if (status) {
                            console.log(`File "${file.originalname}" transformed successfully.`)
                        } else {
                            console.error(`Error transforming file: ${file.originalname}`);
                            return `ERROR: Hochladen der Datei: <br>${file.originalname} ist fehlgeschlagen. <br><br>Bitte überprüfen Sie die Datei.`;
                        }

                        return "";
                    });
                } else {
                    console.error(`Error, non-text file: ${file.originalname}`);
                    return [false, `ERROR: Datei: <br>${file.originalname} ist keine .txt Datei. <br><br>Bitte überprüfen Sie die Datei.`];
                }
            }
            return [true, ""];
        } catch (error) {
            console.error("Exception occurred: ", error);
            return [false, `ERROR: Ein unerwarteter Error ist aufgetreten. <br><br>Bitte überprüfen Sie die Datei.`];
        }
    }

    reformatDate(date){
        const month = date.substring(0, 2); // 012021 => 01
        const year = date.substring(2, 6); // 012021 => 2021
        return year + "-" + month + "-01"; // (I.e.: 2021-01-01) instead of 012021
    }

    async createDirectory(dir){
        await new Promise((resolve, reject) => {
            fs.mkdir(dir, { recursive: true }, (err) => {
                if (err) {
                    console.error('Error creating directory: ', err);
                    reject(err);
                } else {
                    //console.log('Directory already exists or was created successfully.');
                    resolve();
                }
            });
        });
    }

    /**
     * Extracts either the accesses or bytes from one of the two "Top X ..." lines.
     *
     * @param line The line which contains the total accesses or bytes.
     */
    extractTotalsFromStatisticsHeadline(line){
        let total = 0;
        line.split(' ').forEach((word, index) => {
            if (!isNaN(parseInt(word)) && index >= 2) { // Index ignores "Top 30"
                if (word.includes(",")){
                    word = word.replace(",",".");
                    total = parseFloat(word);
                } else {
                    total = parseInt(word);
                }
            }
        });
        return total;
    }

    /**
     * Iterate through the lines of a file to extract accesses and used bytes on websites.
     *
     * @param file_string The file to be iterated through.
     * @param accessesMap Map which will contain statistics about accesses on websites.
     * @param bytesMap Map which will contain statistics about bytes from websites.
     * @returns {{totalAccesses: number, totalBytes: number}} A dictionary which contains total accesses and bytes.
     */
    iterateLines(file_string, accessesMap, bytesMap){
        let inAccesses = false;
        let inBytes = false;

        let totalAccesses = 0;
        let totalBytes = 0;
        for (const line of file_string) {
            if (line.startsWith("Top") && line.toLowerCase().includes("zugriffe")) {
                inAccesses = true;
                inBytes = false;

                // Save the total number of accesses
                totalAccesses = parseInt(this.extractTotalsFromStatisticsHeadline(line));
                continue;
            } else if (line.startsWith("Top") && line.toLowerCase().includes("bytes")) {
                inAccesses = false;
                inBytes = true;

                // Save the total number of bytes
                totalBytes = parseFloat(this.extractTotalsFromStatisticsHeadline(line));
                continue;
            }

            if (inAccesses && this.startsWithNumber(line)) {
                this.parseAndPutLine(accessesMap, line);
            }

            if (inBytes && this.startsWithNumber(line)) {
                this.parseAndPutLine(bytesMap, line);
            }

            // finished with collecting data.
            if (inBytes && line.trim() === "" && bytesMap.size > 0) {
                inBytes = false;
                inAccesses = false;
            }
        }

        return {totalAccesses: totalAccesses, totalBytes: totalBytes};
    }

    /**
     * Reads the content of a file, extracts relevant data, and puts it into parsedData.
     *
     * @param file The file to be processed.
     */
    async transformData(file) {
        try {
            const {date, data} = await this.prepareFileForTransformation(file);

            const lines = data.split('\n');

            const accessesMap = new Map();
            const bytesMap = new Map();

            let totals;
            try {
                totals = this.iterateLines(lines, accessesMap, bytesMap)
            } catch (error) {
                console.error("Error iterating through lines: ", error);
                return false;
            }
            const totalAccesses = totals.totalAccesses;
            const totalBytes = totals.totalBytes;

            if (accessesMap.size < 30 || bytesMap.size < 30) {
                throw new Error(`No data found in file. Please check the file.`);
            }

            // Structure the data into a dictionary to simplify access to the data.
            this.parsedData[date] = {
                date: date,
                accesses: accessesMap,
                bytes: bytesMap,
                totalAccesses: totalAccesses,
                totalBytes: totalBytes
            };

            return true;
        } catch (error) {
            console.error("Error parsing file: ", error);
            throw error;
        }
    }

    /**
     * Parses a line and fills the given map with the parsed data.
     *
     * @param map  The map desired to be filled with the parsed data.
     * @param line The line to parse.
     */
    parseAndPutLine(map, line) {
        // Split line at spaces, tabs, newlines etc.
        const splitLine = line.split(/\s+/);
        const key = parseInt(splitLine[0]);

        if (splitLine[1] === '') {
            throw new Error(`A Line does not contain any values. Please check the file`);
        }

        // Extract the value part | remove any parentheses | remove any extra spaces
        const valueString = splitLine.slice(1).join(' ').trim().replace(/[()]/g, '');
        const valueWithoutGb = valueString.replace(/\bgb\b/i, '');
        const valueTuple = valueWithoutGb.split(/\s+/);

        if (valueTuple.length === 0 || (valueTuple.length === 1 && valueTuple[0] === '') || valueTuple.length !== 3) {
            throw new Error(`Invalid line format, lines must contain a key followed by three values.`);
        }

        map.set(key, valueTuple);
    }

    /**
     * Checks if the given string starts with a number.
     *
     * @param s The string to be checked.
     * @return True if the string starts with a number, false otherwise.
     */
    startsWithNumber(s) {
        if (!s || s.trim().length === 0) {
            return false;
        }
        const firstLetter = s.trim()[0];
        return !isNaN(parseInt(firstLetter));
    }

    async prepareFileForTransformation(file) {
        const filePath = path.join(__dirname, '../uploads', file.originalname);
        const uploadsDirPath = path.join(__dirname, '../uploads');

        let date = file.originalname.trim().split(/\s+/)[0];
        date = this.reformatDate(date);

        // Ensure that the uploads directory exists
        await this.createDirectory(uploadsDirPath);
        // Save the file to a specific directory
        await fs.promises.writeFile(filePath, file.buffer);

        const data = await fs.promises.readFile(filePath, 'utf8');

        return {date, data};
    }

    async transformCSVData(file) {
        try {
            const {date, data} = await this.prepareFileForTransformation(file);

            // **** Specifics for the csv file transformation ****

            const lines = data.split('\n');

            const accessesMap = new Map();
            const bytesMap = new Map();

            try {
                this.iterateCSVLines(lines, accessesMap, bytesMap)
            } catch (error) {
                console.error("Error iterating through lines: ", error);
                return false;
            }

            // The csv files do not contain the total accesses and bytes, so we set them to 0.
            const totalAccesses = 0;
            const totalBytes = 0;

            // Structure the data into a dictionary to simplify access to the data.
            this.parsedData[date] = {
                date: date,
                accesses: accessesMap,
                bytes: bytesMap,
                totalAccesses: totalAccesses,
                totalBytes: totalBytes
            };

            return true;
        } catch (error) {
            console.error("Error parsing file: ", error);
            throw error;
        }
    }

    iterateCSVLines(file_string, accessesMap, bytesMap){
        let accessRank = 1;
        let bytesRank = 1;

        for (const line of file_string) {
            if (line.startsWith("connect")) {
                this.parseCSVAndPutLine(accessesMap, line, accessRank++, false);
            }

            if (line.startsWith("bytes")) {
                this.parseCSVAndPutLine(bytesMap, line, bytesRank++, true);
            }
        }
    }

    parseCSVAndPutLine(map, line, rank, isBytes) {
        const key = rank;

        // Adjust the regex to split by semicolon instead of comma
        const regex = /("([^"]*)";?|[^;]+;?)/g;
        let match;
        const splitLine = [];

        while ((match = regex.exec(line)) !== null) {
            let value = match[2] !== undefined ? match[2] : match[0].replace(/;$/, '');
            splitLine.push(value.trim());
        }

        if (splitLine[1] === '') {
            throw new Error(`A Line does not contain any values. Please check the file`);
        }

        let valueTuple;
        if (isBytes) {
            if (splitLine[1] === '' || splitLine[1] === '0' || splitLine[1] === '0.0') {
                splitLine[1] = "0";
                valueTuple = [splitLine[1], splitLine[2], splitLine[3]];
            } else {
                let parsedValue = parseInt(splitLine[1]) / 1_000_000_000;

                if (parsedValue > 0.001) {
                    valueTuple = [parsedValue + "", splitLine[2], splitLine[3]];
                } else {
                    valueTuple = ["0", splitLine[1], splitLine[3]];
                }
            }
        } else {
            valueTuple = [splitLine[1], splitLine[2], splitLine[3]];
        }

        if (valueTuple.length === 0 || (valueTuple.length === 1 && valueTuple[0] === '') || valueTuple.length !== 3) {
            throw new Error(`Invalid line format, lines must contain a key followed by three values.`);
        }

        map.set(key, valueTuple);
    }

    /**
     * Gets the parsed website data.
     *
     * @return The parsed data.
     */
    getData() {
        return this.parsedData;
    }
}
