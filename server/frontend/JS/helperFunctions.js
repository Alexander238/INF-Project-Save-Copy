import * as db from "./databaseFunctions.js";

export function convertTimeFrameToArray(startDateStr, endDateStr) {
    let startDate = new Date(startDateStr + "-01"); // Append "-01" to convert to first day of the month
    let endDate = new Date(endDateStr + "-01"); // Append "-01" to convert to first day of the month

    let monthsArray = [];

    while(startDate <= endDate) {
        let year = startDate.getUTCFullYear();
        let month = ('0' + (startDate.getUTCMonth() + 1)).slice(-2); // Get zero-padded month

        monthsArray.push(`${year}-${month}`);

        startDate.setUTCMonth(startDate.getUTCMonth() + 1); // Move to next month
    }

    return monthsArray;
}

export function getColorPalette(steps = 5) {
    const palette = [];
    const hueStep = 360 / steps;

    for (let i = 0; i < steps; i++) {
        const hue = i * hueStep;
        palette.push(`hsl(${hue}, 100%, 50%)`);
    }

    return palette;
}

export function generateDatasetsForTopBarChart(type, data, dateArray) {
    const websites = db.objectArrayToArray(data, "URL", true);

    const colors = getColorPalette(websites.length);
    let colorCounter = 0;

    // Create array of 0 to 9 in random order
    let randomArray = Array.from({length: websites.length}, (_, i) => i);
    let dataset = []

    for (const website of websites) {
        let dataEntry = [];

        dateArray.forEach(date => {
            let websiteData = 0;

            const datumExists = data.some(entry => entry.date === date && entry.URL === website);
            if (datumExists) {
                const entry = data.find(entry => entry.date === date && entry.URL === website);
                if (type === "accesses") {
                    websiteData = germanFormatToNumber(entry["Zugriffe"]);
                } else {
                    websiteData = germanFormatToNumber(entry["Verkehr in GB"]);
                }
            }
            dataEntry.push(websiteData);
        });

        dataset.push({
            label: website,
            backgroundColor: colors[randomArray[colorCounter++]],
            data: dataEntry,
            borderColor: "#000000",
            borderWidth: 1
        });
    }

    return {
        datasets: dataset,
        globalColorArray: colors
    };
}

export function germanFormatArrayToNumberArray(numbers) {
    numbers.forEach((number, index) => {
        numbers[index] = germanFormatToNumber(number);
    });
}

export function germanFormatToNumber(number) {
    if(number === "") return number;

    number = number.replace(/\./g, "");
    if(number.includes(",")) {
        number = number.replace(",", ".");
        return parseFloat(number);
    }
    else {
        return parseInt(number);
    }
}

export function formatNumberToGerman(number) {
    return new Intl.NumberFormat('de-DE').format(number);
}

export function germanizeType(type) {
    if (type.toLowerCase() === "accesses") {
        return "Zugriffe";
    } else if (type.toLowerCase() === "traffic") {
        return "Verkehr in GB";
    } else {
        throw new Error(`ERROR: Germanizing Key for type ${type}`);
    }
}