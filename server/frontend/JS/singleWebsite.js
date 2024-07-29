import * as db from "./databaseFunctions.js";
import {populateNavBar, buildFooter, populateLoginElements} from "./websiteElementBuilder.js";
import {initImport} from "./import.js";
import * as dbSetup from "./datatableJUMIBasicSetup.js";
import {formatNumberToGerman} from "./helperFunctions.js";
import {downloadCSV, takeScreenShots} from "./exportFunctions.js";

const currentMode = localStorage.getItem("mode");
if (currentMode === "black") {
    document.body.classList.remove("white");
}

Chart.defaults.color = (localStorage.getItem("mode") !== "black") ? "#000000" : "#cbcfda";

// Get parameter from URL
const urlParams = new URLSearchParams(window.location.search);

const ctx = document.getElementById("single-website-chart");
const singleWebsiteTitle = document.getElementById("single-website-title");
const chartDiv = document.getElementById("single-website-chartDiv");
const searchBar = document.getElementById("search-bar");
const searchButton = document.getElementById("search-button");

let url, singleWebsiteChart, websiteData, topDatatable, dataToExport;

function clearChart() {
    if (singleWebsiteChart) {
        singleWebsiteChart.destroy();
    }
}

function addToObject(dataObject, key, value) {
    if (key in dataObject) {
        dataObject[key].push(value);
    } else {
        dataObject[key] = [value];
    }
}

function skipped (ctx, value) {
    if (ctx.p0.skip || ctx.p1.skip) {
        return value;
    }
    return undefined;
}

function createDatasets(dataForDatasets) {
    const datasets = [];

    dataForDatasets.forEach((data) => {
        let axisID;

        switch(data.label) {
            case "Zugriffe":
                axisID = 'y1';
                break;
            case "Verkehr":
                axisID = 'y2';
                break;
            case "Durchschnittliche Nutzer":
                axisID = 'y3';
                break;
        }

        datasets.push({
            label: data.label,
            data: data.data,
            borderColor: data.borderColor,
            segment: {
                borderColor: ctx => skipped(ctx, 'rgba(161,161,161,0.76)'),
                borderDash: ctx => skipped(ctx, [6, 6]),
            },
            spanGaps: true,
            tension: 0,
            pointRadius: function(context) {
                const index = context.dataIndex;
                const data = context.dataset.data;

                const isAtStartOrEndOfSkippedData = isNaN(Number(data[index-1])) || isNaN(Number(data[index+1]));
                const isNumber = !isNaN(Number(data[index]));

                if (isAtStartOrEndOfSkippedData && isNumber) {
                    return 5;
                }
                return 0;
            },
            pointBackgroundColor: "white",
            hidden: false,
            yAxisID: axisID,
        });
    });

    return datasets;
}

async function createLineChart() {
    let dateArray = (await db.getAllDatesOfDB()).map((date) => date.YearMonth);

    // Smallest date in websiteData
    let smallestDate = websiteData.reduce((acc, current) => {
        return acc.date < current.date ? acc : current;
    });
    // Largest date in websiteData
    let largestDate = websiteData.reduce((acc, current) => {
        return acc.date > current.date ? acc : current;
    });

    smallestDate = smallestDate.date;
    largestDate = largestDate.date;

    // Remove dates that are not in the range of smallestDate and largestDate
    dateArray = dateArray.filter((date) => date >= smallestDate && date <= largestDate);

    let dataObject = {};
    if (websiteData.length !== 0) {
        dateArray.forEach((date) => {
            let objectToAdd = {
                date: date,
                accesses: NaN,
                traffic: NaN,
                avg_user: NaN,
            };

            const dateExistsInWebsiteData = websiteData.some(e => e.date === date);

            if (dateExistsInWebsiteData) {
                const dataEntry = websiteData.find(e => e.date === date);

                objectToAdd.accesses = dataEntry.accesses;
                objectToAdd.traffic = dataEntry.traffic;
                objectToAdd.avg_user = dataEntry.avg_user;
            }

            addToObject(dataObject, 'date', objectToAdd.date);
            addToObject(dataObject, 'accesses', objectToAdd.accesses);
            addToObject(dataObject, 'traffic', objectToAdd.traffic);
            addToObject(dataObject, 'avg_user', objectToAdd.avg_user);
        });
    }

    const dataForDatasets = [
        {
            label: 'Zugriffe',
            data: dataObject.accesses,
            borderColor: 'rgb(192, 75, 75)',
        },
        {
            label: 'Verkehr',
            data: dataObject.traffic,
            borderColor: 'rgb(75, 192, 75)',
        },
        {
            label: 'Durchschnittliche Nutzer',
            data: dataObject.avg_user,
            borderColor: 'rgb(75, 75, 192)',
        }
    ];

    clearChart();

    const config = {
        type: 'line',
        data: {
            labels: dateArray,
            datasets: createDatasets(dataForDatasets),
        },
        options: {
            plugins: {
                legend: {
                    display: false
                },
            },
            fill: false,
            interaction: {
                intersect: false
            },
            radius: 0,
            responsive: true,
            scales: {
                y1: {
                    type: 'linear',
                    position: 'left',
                    ticks: {
                        beginAtZero: true,
                        color: "rgb(192, 75, 75)",
                    },
                    grid: {
                        drawOnChartArea: false, // only want the grid lines for one axis to show up
                    },
                },
                y2: {
                    type: 'linear',
                    position: 'right',
                    ticks: {
                        beginAtZero: true,
                        color: 'rgb(75, 192, 75)',
                    },
                    grid: {
                        drawOnChartArea: false, // only want the grid lines for one axis to show up
                    },
                },
                y3: {
                    type: 'linear',
                    position: 'right',
                    ticks: {
                        beginAtZero: true,
                        color: 'rgb(156,156,255)',
                    },
                    grid: {
                        drawOnChartArea: false, // only want the grid lines for one axis to show up
                    },
                },
            },
        }
    };

    singleWebsiteChart = new Chart(ctx, config);
}

function createTable() {
    const objectForAccesses = { "": "Zugriffe" };
    const objectForTraffic = { "" : "Verkehr in GB" };
    const objectForAverageUser = { "" : "Durchschnittliche Nutzer" };

    websiteData.forEach((data) => {
        objectForAccesses[data.date] = formatNumberToGerman(data.accesses);
        objectForTraffic[data.date] = formatNumberToGerman(data.traffic);
        objectForAverageUser[data.date] = formatNumberToGerman(data.avg_user);
    });


    const dataForTable = [
        objectForAccesses,
        objectForTraffic,
        objectForAverageUser,
    ];

    fillTopTable(dataForTable);
}

async function createButtons() {
    const apiData = await fetchApiData(url);
    let dataExists = apiData.length !== 0;

    const detailsButtton = document.getElementById("details-button");
    if(dataExists) {
        detailsButtton.disabled = false;
        detailsButtton.classList.remove("disabled");
        detailsButtton.addEventListener("click", showScanResult);
    }

    const checkButton = document.getElementById("api-button");
    if(dataExists) {
        if(apiData[0].malicious) {
            checkButton.classList.add("red");
            checkButton.innerText = "Nicht sicher";
        }
        else {
            checkButton.classList.add("green");
            checkButton.innerText = "Sicher";
        }
    }
    checkButton.addEventListener("click", async function() {
        alert("Für eine neue API-Abfrage bitte auf die Verwalten-Seite gehen.");
    });

    let lastChecked = (await fetchApiLastChecked(url)).lastChecked;
    lastChecked = (lastChecked == null) ? "-" : lastChecked;

    const lastCheckedElement = document.getElementsByClassName("api-text-span")[0];
    lastCheckedElement.innerHTML = `letzte Prüfung: ${lastChecked}`;
}

async function singleWebsite() {
    // Close search results if open
    const searchResultsOpen = document.querySelector(".search-results");
    if (searchResultsOpen) {
        searchResultsOpen.remove();
    }

    // Change title to url
    singleWebsiteTitle.innerText = url;
    document.title = `Single website - ${url}`;

    // Get data for website
    websiteData = await db.getWebsiteData(url);

    if(websiteData !== 0) {
        ctx.classList.remove("hidden");
        document.querySelector(".chart > .no-data")?.remove();

        createLineChart();
        createTable();
        createButtons();
    }
    else {
        const keineDatenDiv = document.createElement("div");
        keineDatenDiv.classList.add("no-data");
        keineDatenDiv.innerText = `Keine Daten für '${url}' gefunden`;

        ctx.classList.add("hidden");
        chartDiv.appendChild(keineDatenDiv);

        singleWebsiteTitle.classList.add("hidden");
    }
}

document.addEventListener("DOMContentLoaded", function() {
    populateNavBar();
    populateLoginElements();
    buildFooter();
    initImport();

    document.getElementById("backButton").addEventListener("click", function() {
        history.back();
    });

    document.getElementById('dataset1').addEventListener('change', function() {
        singleWebsiteChart.data.datasets[0].hidden = !this.checked;
        singleWebsiteChart.update();
    });
    document.getElementById('dataset2').addEventListener('change', function() {
        singleWebsiteChart.data.datasets[1].hidden = !this.checked;
        singleWebsiteChart.update();
    });
    document.getElementById('dataset3').addEventListener('change', function() {
        singleWebsiteChart.data.datasets[2].hidden = !this.checked;
        singleWebsiteChart.update();
    });

    document.getElementById('download-pdf').addEventListener('click', takeScreenShots);
    document.getElementById('download-csv').addEventListener('click', () => {
        downloadCSV(dataToExport, `csv_export_${url}.csv`, true);
    });

    searchButton.addEventListener("click", function () {
        window.location.href = `singleWebsite.html?url=${searchBar.value}`;

        searchBar.value = "";
        searchButton.style.display = 'none';
    });

    url = urlParams.get("url");
    singleWebsite();
});

//! Datatable Functions
async function fillTopTable(data){
    // No need to call buildDataTable, since we called the getTopTableData function here already.
    await dbSetup.fillTable(data, fillColumns, fillRows).then(_ => {
        if (topDatatable) {
            topDatatable.destroy();
        }
        topDatatable = new DataTable("#myTable", {
            // disable sorting
            ordering: false,
            language: {
                decimal: ",",
                thousands: ".",
            }
        });
    }).then(_ => {
        const secondRow = document.querySelectorAll("table.dataTable > thead > tr > th:nth-child(2), td:nth-child(2)");
        secondRow.forEach((cell) => {
            cell.style.zIndex = "auto";
        });
    });
    dataToExport = data;
}

function createRowElement(...values) {
    const rowElement = document.createElement("tr");
    rowElement.classList.add("row-element");

    values.forEach(function(value, index) {
        const tdElement = document.createElement("td");
        tdElement.innerText = value;
        rowElement.appendChild(tdElement);
    });

    return rowElement;
}

async function fillRows(data){
    const rowWrapper = document.getElementById("row-wrapper");
    for (let i = 0; i < data.length; i++){
        let values = Object.values(data[i]);
        rowWrapper.appendChild(createRowElement(...values))
    }
}

async function fillColumns(data) {
    const columnWrapper = document.getElementById("column-wrapper");
    let keys = Object.keys(data[0]);
    for (let i = 0; i < keys.length; i++) {
        columnWrapper.appendChild(dbSetup.createColumnElement(`${keys[i]}`));
    }
}

/** API function **/
async function fetchApiData(url) {
    const response = await fetch(`/api/get-api-data?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    // Konvertiere 'malicious' in boolean
    data.forEach(item => {
        item.malicious = !!item.malicious;
    });
    return data;
}

async function fetchApiLastChecked(url) {
    const response = await fetch(`/api/get-last-checked?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    return data[0];
}

function showScanResult() {
    console.log("Showing scan result");
    const resultModal = document.getElementById('resultAPIModal');
    const scanResultContent = document.getElementById('scanResultContent');

    fetchApiData(url).then(result => {
        if (result && result.length > 0) {
            const filteredResult = result[0];
            const maliciousText = filteredResult.malicious ? "Ja" : "Nein";
            const tableHTML = `
                <style>
                    .scan-result-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 20px 0;
                    }
                    .scan-result-table th, .scan-result-table td {
                        border: 1px solid #ddd;
                        padding: 8px;
                    }
                    .scan-result-table th {
                        background-color: #f2f2f2;
                        text-align: left;
                    }
                    .scan-result-table th, .scan-result-table td:first-child {
                        background-color: #313D60FF; /* Ändere die Hintergrundfarbe der ersten Spalte */
                    }
                    .screenshot-img {
                        max-width: 90%;
                        height: auto;
                    }
                </style>
                <table class="scan-result-table">
                    <tr>
                        <th>Schädlich</th>
                        <td>${maliciousText}</td>
                    </tr>
                    <tr>
                        <th>Webseite</th>
                        <td>${filteredResult.domain}</td>
                    </tr>
                    <tr>
                        <th>Vollständige URL</th>
                        <td>${filteredResult.url}</td>
                    </tr>
                    <tr>
                        <th>Momentaufnahme der Webseite</th>
                        <td><img src="${filteredResult.screenshotURL}" alt="Screenshot nicht verfügbar" class="screenshot-img"></td>
                    </tr>
                    <tr>
                        <th>Standort (Stadt)</th>
                        <td>${filteredResult.city}</td>
                    </tr>
                    <tr>
                        <th>Standort (Land)</th>
                        <td>${filteredResult.country}</td>
                    </tr>
                    <tr>
                        <th>Dazugehörige Hauptseite</th>
                        <td>${filteredResult.main_domain}</td>
                    </tr>
                    <tr>
                        <th>Vollständige URL der Hauptseite</th>
                        <td>${filteredResult.main_url}</td>
                    </tr>
                    <tr>
                        <th>Oberseite</th>
                        <td>${filteredResult.apex_domain}</td>
                    </tr>
                    <tr>
                        <th>Titel der Hauptseite</th>
                        <td>${filteredResult.title}</td>
                    </tr>
                </table>
            `;

            scanResultContent.innerHTML = tableHTML;
            resultModal.style.display = 'block';
        } else {
            scanResultContent.textContent = 'Keine Ergebnisse verfügbar.\n\n' +
                'Grund:\n' +
                'Entweder handelt es sich hierbei um ein CDN oder diese Domain wurde noch nie analysiert!\n\n' +
                'Sollte der Button sich in CDN umbenannt haben so handelt es hierbei um ein Content-Delivery-Network (CDN).\n' +
                'CDNs werden genutzt um Medieninhalte schneller an den Benutzer bereitzustellen.\n' +
                'CDNs sind grundsätzlich unbedenklich und werden daher als "sicher" eingestuft.';
            resultModal.style.display = 'block';
        }
    }).catch(error => {
        console.error('Error fetching API data:', error);
        scanResultContent.textContent = 'Fehler beim Laden der Daten.';
        resultModal.style.display = 'block';
    });

    const closeButton = document.getElementsByClassName('closeAPI-button')[0];
    closeButton.onclick = function() {
        resultModal.style.display = 'none';
    };

    window.onclick = function(event) {
        if (event.target === resultModal) {
            resultModal.style.display = 'none';
        }
    };
}