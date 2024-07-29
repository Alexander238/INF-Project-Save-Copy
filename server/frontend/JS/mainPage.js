import * as db from "./databaseFunctions.js"
import * as helper from "./helperFunctions.js";
import {buildFooter, populateLoginElements, populateNavBar} from "./websiteElementBuilder.js";
import * as dbSetup from "./datatableJUMIBasicSetup.js";
import {germanizeType} from "./helperFunctions.js";
import {initImport} from "./import.js";
import { takeScreenShots, downloadCSV } from './exportFunctions.js';

Chart.defaults.color = (localStorage.getItem("mode") !== "black") ? "#000000" : "#cbcfda";

const newWebsiteTable = document.getElementById("new-websites-wrapper");
const myChart = document.getElementById("myChart");
const chartDiv = document.getElementById("chartDiv");
const toptabelleTitle = document.getElementById("toptabelleTitle");
const activeFilterWrapper = document.getElementById("active-filter-wrapper");
const searchBar = document.getElementById("search-bar");
const topSelect = document.getElementById("top-select");
const topSelectButton = document.getElementById("toggle-top-select");
const topSelectWrapper = document.getElementById("top-select-wrapper");

const msStartBtn = document.getElementById("month-select-start");
const msEndBtn = document.getElementById("month-select-end");
const startYearBtn = document.getElementById("start-year");
const endYearBtn = document.getElementById("end-year");
const filterBtn = document.getElementById("filter-button");

const buttonAccesses = document.getElementById("toggle-accesses");
const buttonTraffic = document.getElementById("toggle-traffic");

const buttonSafe = document.getElementById("toggle-safe");
const buttonUnsafe = document.getElementById("toggle-unsafe");
const buttonAcknowledged = document.getElementById("toggle-acknowledged");
const buttonNa = document.getElementById("toggle-na");
const buttonUnacknowledged = document.getElementById("toggle-unacknowledged");


const buttonSearch = document.getElementById("search-button");

let type, amount, startDate, endDate, website, topDatatable, colors, dataToExport;

let safeFilter = -1;
let acknowledgedFilter = -1;

startDate = "2019-08";
endDate = "2019-12";
type = "accesses"; // default type
amount = 30; // default amount
colors = [];

const Modes = Object.freeze({
    PIE: 1,
    BAR: 2,
});

let currentChartMode = Modes.PIE;

const currentMode = localStorage.getItem("mode");
if (currentMode === "black") {
    document.body.classList.remove("white");
}

function fillNewWebsitesTable(data, year, month){
    newWebsiteTable.innerHTML = "";

    const caption = document.createElement("div");
    caption.innerText = `Neue Webseiten für ${year}-${month}`;
    caption.classList.add("title");
    newWebsiteTable.appendChild(caption);

    const entryWrapper = document.createElement("div");
    entryWrapper.classList.add("entry-wrapper");

    if(data.length === 0){
        // Zeigt Hinweis, falls keine neuen Webseiten für den Monat existieren.
        const div = document.createElement("p");
        div.innerText = `Keine neuen Webseiten`;
        entryWrapper.appendChild(div);
    }
    else {
        // Erstellt Eintrag für jede neue Webseite.
        data.forEach(entry => {
            const p = document.createElement("p")
            p.innerText = entry.url;
            p.addEventListener("click", function() {
                window.location.href = `singleWebsite.html?url=${entry.url}`;
            });
            entryWrapper.appendChild(p);
        })
    }
    newWebsiteTable.appendChild(entryWrapper);
}

let matchingElement = null;
let previousMatchingElement = null;
function fillTopPieChart(data, year, month) {
    let typeLabel = germanizeType(type);

    chartDiv.style.position = "sticky";
    chartDiv.style.top = "30%";
    chartDiv.style.flexBasis = "45%";
    document.getElementById("tableWrapper").style.flexBasis = "50%";

    toptabelleTitle.innerText = `Top ${amount} ${typeLabel} ${year}-${month}`;

    const xValues = db.objectArrayToArray(data, "URL");
    const yValues = db.objectArrayToArray(data, typeLabel);
    const formattedYValues = [...yValues];
    const chartColors = helper.getColorPalette(xValues.length);
    colors = chartColors;

    helper.germanFormatArrayToNumberArray(yValues);

    clearChart(); // Clear previous chart

    const newChart = document.createElement("canvas");
    newChart.id = "myChart";
    chartDiv.appendChild(newChart);

    new Chart("myChart", {
        type: "doughnut",
        data: {
            labels: xValues,
            datasets: [{
                backgroundColor: chartColors,
                data: yValues,
                borderColor: (localStorage.getItem("mode") !== "black") ? "#000000" : "#FFFFFF",
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            title: {
                display: false,
            },
            plugins: {
                legend: {
                    display: false,
                },
            },
            onHover: (event, chartElement) => {
                if (chartElement.length) {
                    const index = chartElement[0].index;
                    const label = xValues[index];

                    let found = false;

                    const trElements = document.querySelectorAll("tr");
                    trElements.forEach(trElement => {
                        const td = trElement.querySelectorAll("td div");
                        if (td[1] && td[1].textContent === label) {
                            found = true;
                            matchingElement = trElement;
                        }
                    });

                    if (matchingElement && found) {
                        if (previousMatchingElement) {
                            previousMatchingElement.classList.remove("highlighted");
                        }
                        matchingElement.classList.add("highlighted");
                        previousMatchingElement = matchingElement;

                        found = false;
                    } else if (!found) {
                        if (matchingElement) {
                            matchingElement.classList.remove("highlighted");
                        }
                        if (previousMatchingElement) {
                            previousMatchingElement.classList.remove("highlighted");
                        }
                    }
                } else {
                    if (matchingElement) {
                        matchingElement.classList.remove("highlighted");
                    }
                    if (previousMatchingElement) {
                        previousMatchingElement.classList.remove("highlighted");
                    }
                }
            },
        }
    });
}

function fillTopBarChart(data, start, end) {
    let typeLabel = germanizeType(type);

    chartDiv.style.position = "relative";
    chartDiv.style.top = "0";
    chartDiv.style.flexBasis = "80%";
    document.getElementById("tableWrapper").style.flexBasis = "80%";

    // Set title to timeframe
    toptabelleTitle.innerText = `Top ${amount} ${typeLabel} für ${start} bis ${end}`;

    const datumArray = helper.convertTimeFrameToArray(start, end);

    myChart.remove();
    const newChart = document.createElement("canvas");
    newChart.id = "myChart";
    chartDiv.appendChild(newChart);

    const datasets = helper.generateDatasetsForTopBarChart(type, data, datumArray).datasets;
    colors = helper.generateDatasetsForTopBarChart(type, data, datumArray).globalColorArray;

    new Chart(newChart, {
        type: 'bar',
        data: {
            labels: datumArray,
            datasets: datasets,
        },
        options: {
            tooltips: {
                displayColors: true,
                callbacks: {
                    mode: 'x',
                    label: function(tooltipItem, data) {
                        let value = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
                        value = value.toLocaleString('de-DE'); // Using German locale for desired formatting
                        return `${data.datasets[tooltipItem.datasetIndex].label}: ${value}`;
                    }
                },
            },
            scales: {
                x: {
                    stacked: true,
                    gridLines: {
                        display: false,
                    }
                },
                y: {
                    stacked: true,
                    ticks: {
                        beginAtZero: true,
                    },
                    type: 'linear',
                }
            },
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
            },
        }
    });
}

function clearChart() {
    // Remove the canvas element for the chart
    const chartCanvas = chartDiv.querySelector('canvas');
    if (chartCanvas) {
        chartDiv.removeChild(chartCanvas);
    }
}

/**
    Diese Funktion passt bei der Tabelle die Auswahl für die Anzahl pro Seite an.
    Es werden nur noch die Werte angezeigt, die kleiner oder gleich der ausgewählten Anzahl der TopX-Werte sind.
 */
function removeInvalidEntriesFromPageSelection(selectedValue) {
    const entriesPerPage = document.querySelector(".dt-length > select");
    const entries = document.querySelector(".dt-length");

    // Remove invalid options that are higher than the selected value
    for(let i = entriesPerPage.children.length - 1; i >= 0; i--) {
        if(parseInt(entriesPerPage.children[i].value) > selectedValue) {
            entriesPerPage.children[i].remove();
        }
    }

    // Set default value to selected value
    entriesPerPage.value = selectedValue;

    // Forces entriesPerPage to update the table based on the changed value above
    entriesPerPage.dispatchEvent(new Event("change"));
}

function createButtonEventListener() {
    // React to Search Button
    buttonSearch.addEventListener("click", async function() {
        website = searchBar.value;
        if (website !== "") {
            console.log(`Searching for ${searchBar.value}`);
            window.location.href = `singleWebsite.html?url=${website}`;

            searchBar.value = "";
            buttonSearch.style.display = 'none';
        }
    });

    // React to Toggle Buttons
    buttonAccesses.addEventListener("click", async function() {
        if (!this.classList.contains("active")) {
            this.classList.add("active");
            buttonTraffic.classList.remove("active");

            type = "accesses";
            await loadData(type, amount, startDate, endDate);
        }
    });
    buttonTraffic.addEventListener("click", async function() {
        if (!this.classList.contains("active")) {
            this.classList.add("active");
            buttonAccesses.classList.remove("active");

            type = "traffic";
            await loadData(type, amount, startDate, endDate);
        }
    });

    // React to Security Toggle
    buttonSafe.addEventListener("click", async function() {
        if (!this.classList.contains("active")) {
            this.classList.add("active");
            buttonUnsafe.classList.remove("active");
            buttonNa.classList.remove("active");

            safeFilter = 1;
        } else if (this.classList.contains("active")) {
            this.classList.remove("active");

            safeFilter = -1;
        }

        await loadData(type, amount, startDate, endDate, safeFilter, acknowledgedFilter);
    });

    buttonUnsafe.addEventListener("click", async function() {
        if (!this.classList.contains("active")) {
            this.classList.add("active");
            buttonSafe.classList.remove("active");
            buttonNa.classList.remove("active");

            safeFilter = 2;
        } else if (this.classList.contains("active")) {
            this.classList.remove("active");

            safeFilter = -1;
        }

        await loadData(type, amount, startDate, endDate, safeFilter, acknowledgedFilter);
    });

    buttonNa.addEventListener("click", async function() {
        if (!this.classList.contains("active")) {
            this.classList.add("active");
            buttonSafe.classList.remove("active");
            buttonUnsafe.classList.remove("active");

            safeFilter = 3;
        } else if (this.classList.contains("active")) {
            this.classList.remove("active");

            safeFilter = -1;
        }

        await loadData(type, amount, startDate, endDate, safeFilter, acknowledgedFilter);
    });

    // React to Acknowledgement Toggle
    buttonAcknowledged.addEventListener("click", async function() {
        if (!this.classList.contains("active")) {
            this.classList.add("active");
            buttonUnacknowledged.classList.remove("active");

            acknowledgedFilter = 1;
        } else if (this.classList.contains("active")) {
            this.classList.remove("active");

            acknowledgedFilter = -1
        }

        await loadData(type, amount, startDate, endDate, safeFilter, acknowledgedFilter);
    });

    buttonUnacknowledged.addEventListener("click", async function() {
        if (!this.classList.contains("active")) {
            this.classList.add("active");
            buttonAcknowledged.classList.remove("active");

            acknowledgedFilter = 2;
        } else if (this.classList.contains("active")) {
            this.classList.remove("active");

            acknowledgedFilter = -1;
        }

        await loadData(type, amount, startDate, endDate, safeFilter, acknowledgedFilter);
    });

    // React to each topX button
    const topSelectButtons = topSelect.children;
    for (let i = 0; i < topSelectButtons.length; i++) {
        topSelectButtons[i].addEventListener("click", async function() {
            amount = parseInt(this.value);
            sessionStorage.setItem("defaultAmount", amount);
            topSelectButton.innerText = `Top ${amount}`;
            await loadData(type, amount, startDate, endDate);

            // Close dropdown and remove blurry background
            topSelect.classList.remove("show");
            document.getElementById("blurry-background").classList.remove("show");
        });
    }

    // Confirm date selection
    filterBtn.addEventListener("click", async function() {
        updateDates(startYearBtn.value, msStartBtn.value, endYearBtn.value, msEndBtn.value);
        await setupFilters();
        await loadData(type, amount, startDate, endDate);
    })
}

function limitTopSelection(max) {
    // Remove all children of topSelect which values are higher than max
    const topSelectButtons = topSelect.children;
    for (let i = topSelectButtons.length - 1; i >= 0; i--) {
        if (parseInt(topSelectButtons[i].value) > max) {
            topSelectButtons[i].remove();
        }
    }
}

/* Set selection of top5,top10... to correct default value */
function topXSetDefault(max) {
    const topSelectButtons = topSelect.children;

    // Limit default value to max
    if (amount > max) {
        amount = max;
    }
    // Check if topSelect.options has an entry for amount. If not choose the one closest to amount.
    let found = false;
    for (let i = 0; i < topSelectButtons.length; i++) {
        if (parseInt(topSelectButtons[i].value) === amount) {
            found = true;
            break;
        }
    }
    // If amount is not found in topSelect.options, choose the closest value to amount
    if (!found) {
        let closest = parseInt(topSelectButtons[0].value);
        for (let i = 0; i < topSelectButtons.length; i++) {
            const currentValue = parseInt(topSelectButtons[i].value);
            if (Math.abs(currentValue - amount) < Math.abs(closest - amount)) {
                closest = topSelectButtons[i].value;
            }
        }
        amount = closest;
    }
    // Set topSelect to amount. This also adjusts the default selection in the dropdown.
    topSelectButton.value = amount;
    topSelectButton.innerText = `Top ${amount}`;
}

async function loadDataFromSessionStorage() {
    if(sessionStorage.getItem("defaultAmount") !== null) {
        amount = parseInt(sessionStorage.getItem("defaultAmount"));
    }

    if(sessionStorage.getItem("defaultStartDate") === null && sessionStorage.getItem("defaultEndDate") === null) {
        // Set last month as default value for start and end month
        await db.getAllDatesOfDB().then(data => {
            const indexOfLastElement = data.length - 1;
            const mostCurrentDate = data[indexOfLastElement].YearMonth;
            startDate = mostCurrentDate;
            endDate = mostCurrentDate;
        });
    }
    if(sessionStorage.getItem("defaultStartDate") !== null) {
        startDate = sessionStorage.getItem("defaultStartDate");
    }
    if(sessionStorage.getItem("defaultEndDate") !== null) {
        endDate = sessionStorage.getItem("defaultEndDate");
    }

    if(sessionStorage.getItem("defaultChartMode") !== null) {
        switch(Number(sessionStorage.getItem("defaultChartMode"))) {
            case 1:
                currentChartMode = Modes.PIE;
                break;
            case 2:
                currentChartMode = Modes.BAR;
                break;
            default:
                console.log("Invalid chart mode");
        }
    }
}

async function setInitialValues() {
    await loadDataFromSessionStorage();

    topSelectButton.innerText = `Top ${amount}`;

    const numberOfEntriesPerMonth = await db.getTopX();
    limitTopSelection(numberOfEntriesPerMonth);
    topXSetDefault(numberOfEntriesPerMonth);
}

async function initFunction() {
    initImport("/");
    const databaseReady = await db.checkDatabase();
    if (databaseReady && await db.getTopX() !== 0) {
        await setInitialValues();
        setupFilters();
        createButtonEventListener();
        await loadData(type, amount, startDate, endDate);

        document.getElementById('download-pdf').addEventListener('click', takeScreenShots);
        document.getElementById('download-csv').addEventListener('click', () => {
            let filename = `csv_export_${type}_${startDate}_${endDate}.csv`;
            if(startDate === endDate) {
                filename = `csv_export_${type}_${startDate}.csv`;
            }
            downloadCSV(dataToExport, filename);
        });
    }
}

function updateDates(startYear, startMonth, endYear, endMonth){
    startDate = startYear + "-" + startMonth;
    endDate = endYear + "-" + endMonth;

    if (startDate !== endDate) {
        currentChartMode = Modes.BAR;
    } else {
        currentChartMode = Modes.PIE;
    }
    sessionStorage.setItem("defaultStartDate", startDate);
    sessionStorage.setItem("defaultEndDate", endDate);
    sessionStorage.setItem("defaultChartMode", currentChartMode);
}

async function loadData(type, amount, startDate, endDate) {
    clearChart();

    switch (currentChartMode){
        case Modes.PIE:
            newWebsiteTable.style.display = "flex";
            await loadPieData();
            break;
        case Modes.BAR:
            newWebsiteTable.style.display = "none";
            await loadBarData();
            break;
        default:
            throw new Error(`ERROR: Modes ${currentChartMode} does not exist`);
    }
}

async function loadPieData(){
    // Date of type "XXXX-XX"
    const year = startDate.slice(0, 4);
    const month = startDate.slice(5, 7);

    await db.getTopTableData(type, amount, year, month, safeFilter, acknowledgedFilter).then(async data => {
        if (data.length !== 0) {
            fillTopPieChart(data, year, month);
            fillTopTable(data);
        } else {
            const table = document.getElementById("myTable");
            if (topDatatable && table) {
                table.remove();
            }
        }
        dataToExport = data;
    });

    // Füllt Liste der neuen Webseiten des Monats.
    await db.getNewWebsites(year, month).then(async data => {
        fillNewWebsitesTable(data, year, month);
    });
}

async function loadBarData(){
    const [startYear, startMonth] = startDate.split("-");
    const [endYear, endMonth] = endDate.split("-");

    const startYearNum = parseInt(startYear);
    const startMonthNum = parseInt(startMonth);
    const endYearNum = parseInt(endYear);
    const endMonthNum = parseInt(endMonth);

    let currentDate = new Date(startYearNum, startMonthNum - 1);

    let collectiveData = [];
    let topTableCollectiveData = [];

    while (currentDate.getFullYear() < endYearNum || (currentDate.getFullYear() === endYearNum && currentDate.getMonth() <= endMonthNum - 1)) {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;

        const yearStr = String(year);
        const monthStr = String(month).padStart(2, '0');

        await db.getTopTableData(type, amount, yearStr, monthStr, safeFilter, acknowledgedFilter).then(async data => {
            data.forEach(entry => {
                entry["date"] = `${yearStr}-${monthStr}`;
            });
            collectiveData.push(data);
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    collectiveData = collectiveData.flat();
    fillTopBarChart(collectiveData, startDate,  endDate);
    const dataForTable = convertChartDataForTable(collectiveData);

    // check if data is empty
    if (dataForTable.length > 0) {
        fillTopTable(dataForTable);
        dataToExport = dataForTable;
    } else {
        if (topDatatable) {
            topDatatable.clear().draw();
        }
    }
}

function convertChartDataForTable(data) {
    let tableData = [];

    // List of distinct URLs in the data
    const distinctURLs = [...new Set(data.map(e => e.URL))];

    const datumArray = helper.convertTimeFrameToArray(startDate, endDate);

    // Loop through each distinct URL
    distinctURLs.forEach(url => {
        let tableEntry = {};
        tableEntry.URL = url;

        datumArray.forEach(date => {
            const entryExists = data.some(entry => entry.date === date && entry.URL === url);
            if (!entryExists) {
                tableEntry[date] = "";
            }
            else {
                const entry = data.find(entry => entry.date === date && entry.URL === url);
                if(type === "accesses") {
                    tableEntry[date] = entry["Zugriffe"];
                }
                else if(type === "traffic") {
                    tableEntry[date] = entry["Verkehr in GB"];
                }

            }
        });

        tableData.push(tableEntry);
    });

    return tableData;
}

async function getLastDate() {
    let lastDate = await db.getAllDatesOfDB();
    return lastDate[lastDate.length - 1].YearMonth;
}

async function deleteFilter(filter, isTime = true) {
    filter.remove();

    if(isTime) {
        // Get objects of filter that are of class "timeframe-filter"
        const timeframeFilter = activeFilterWrapper.querySelectorAll(".timeframe-filter");

        if(timeframeFilter.length === 0) {
            startDate = await getLastDate();
            endDate = startDate;
        }
        else {
            const remainingFilter = activeFilterWrapper.querySelectorAll(".timeframe-filter")[0];

            let remainingFilterDate = remainingFilter.innerText;
            if(remainingFilterDate.includes("Von:")) {
                endDate = startDate;
            }
            else if(remainingFilterDate.includes("Bis:")) {
                startDate = endDate;
            }
        }

        if (startDate !== endDate) {
            currentChartMode = Modes.BAR;
        } else {
            currentChartMode = Modes.PIE;
        }

        sessionStorage.setItem("defaultStartDate", startDate);
        sessionStorage.setItem("defaultEndDate", endDate);
        sessionStorage.setItem("defaultChartMode", currentChartMode);
    }
    else {
        // Reloads dashboard
        window.location.href = "/";
    }


    await loadData(type, amount, startDate, endDate);
}

export function createFilter(text, isTime = true) {
    // Delete timeframe-filter if it already exists
    if(activeFilterWrapper.querySelector(".timeframe-filter") !== null) {
        // Check how many children of filterWrapper are of class "timeframe-filter"
        const filterCount = activeFilterWrapper.querySelectorAll(".timeframe-filter").length;

        if(startDate !== endDate && filterCount > 1) {
            activeFilterWrapper.querySelector(".timeframe-filter").remove();
        }
        else if(startDate === endDate) {
            // Delete all filter of class "timeframe-filter"
            activeFilterWrapper.querySelectorAll(".timeframe-filter").forEach(filter => {
                filter.remove();
            });
        }

    }

    const filter = document.createElement("div");
    filter.classList.add("btn", "btn-delete");
    if(isTime) {
        filter.classList.add("timeframe-filter");
    }
    filter.innerText = text;
    filter.addEventListener("click", function() {
        deleteFilter(filter, isTime);
    });

    const deleteIcon = document.createElement("span");
    deleteIcon.classList.add("mdi", "mdi-delete", "mdi-24px");
    filter.appendChild(deleteIcon);
    const deleteIconHover = document.createElement("span");
    deleteIconHover.classList.add("mdi", "mdi-delete-empty", "mdi-24px");
    filter.appendChild(deleteIconHover);

    activeFilterWrapper.appendChild(filter);
}

async function setupFilters() {
    const lastDate = await getLastDate();

    if(startDate !== lastDate) {
        if(startDate !== endDate) {
            createFilter(`Von: ${startDate}`);
            createFilter(`Bis: ${endDate}`);
        }
        else {
            createFilter(startDate);
        }
    }
}

document.addEventListener("DOMContentLoaded", async (event) => {
    const onSingleWebsitePage = window.location.pathname.includes("singleWebsite.html");
    if(!onSingleWebsitePage) {
        populateNavBar();
        populateLoginElements();
        buildFooter();
        await initFunction();
    }
});

//! Datatable Functions
async function fillTopTable(data){
    // No need to call buildDataTable, since we called the getTopTableData function here already.
    await dbSetup.fillTable(data, fillColumns, fillRows).then(_ => {
        if (topDatatable) {
            topDatatable.destroy();
        }
        topDatatable = new DataTable("#myTable", {
            order: {
                idx: 2,
                dir: "desc",
            },
            language: {
                decimal: ",",
                thousands: ".",
            }
        });
    }).then(_ => {
        // Adjust entries per page on datatable to match top-selection
        removeInvalidEntriesFromPageSelection(amount);
        fixFirstTwoColumnsOfTable();

        const observer = new MutationObserver(() => {
            fixFirstTwoColumnsOfTable();
        });
        observer.observe(document.getElementById("myTable"), {
            attributes: true,
            childList: true,
            subtree: true,
            characterData: true
        });
    });
}

function fixFirstTwoColumnsOfTable() {
    const table = document.querySelector('table.dataTable');
    const firstColCells = table.querySelectorAll('th:first-child, td:first-child');
    const secondColCells = table.querySelectorAll('th:nth-child(2), td:nth-child(2)');
    let firstColWidth = firstColCells[0].offsetWidth;

    secondColCells.forEach(cell => {
        cell.style.left = firstColWidth + 'px';
    });
}

function createRowElement(...values) {
    const rowElement = document.createElement("tr");
    rowElement.classList.add("row-element");

    // const ID = values[0]

    // Loop through each value and create <td> elements
    values.forEach(function(value, index) {
        const tdElement = document.createElement("td");

        // Adjust cases if innerText-value should be changed to something else for specific columns.
        switch (index){
            case 0:
                const colorDiv = document.createElement("div");
                colorDiv.classList.add("color-div");
                colorDiv.style.backgroundColor = value;
                tdElement.appendChild(colorDiv);
                break;
            case 1:
                // Add text to element that when clicked executes the function above
                const divElement = document.createElement("div");
                divElement.innerText = value;
                divElement.style.cursor = "pointer";
                divElement.addEventListener("click", function() {
                    window.location.href = `singleWebsite.html?url=${value}`;
                });
                tdElement.appendChild(divElement);
                break;
            default:
                tdElement.innerText = value;
        }
        rowElement.appendChild(tdElement);
    });

    return rowElement;
}

async function fillRows(data){
    const rowWrapper = document.getElementById("row-wrapper");
    for (let i = 0; i < data.length; i++){
        let values = Object.values(data[i]);
        if(currentChartMode === Modes.PIE) {
            values = values.slice(1); // remove id from values
        }

        // Add value to start of array
        if(colors.length > 0) {
            values.unshift(colors[i]);
        }
        else {
            values.unshift("hsl(36, 100%, 50%)");
        }

        rowWrapper.appendChild(createRowElement(...values))
    }
}

async function fillColumns  (data) {
    const columnWrapper = document.getElementById("column-wrapper");
    let keys = Object.keys(data[0]);
    if(currentChartMode === Modes.PIE) {
        keys = keys.slice(1);
    }

    // add a column for color-div
    columnWrapper.appendChild(dbSetup.createColumnElement(''));

    for (let i = 0; i < keys.length; i++) {
        columnWrapper.appendChild(dbSetup.createColumnElement(`${keys[i]}`));
    }
}