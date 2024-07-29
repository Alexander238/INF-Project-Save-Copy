import * as dbSetup from "./datatableJUMIBasicSetup.js";
import * as db from "./databaseFunctions.js";
import {buildFooter, populateLoginElements, populateNavBar} from "./websiteElementBuilder.js";
import {initImport} from "./import.js";
import {datatable} from "./datatableJUMIBasicSetup.js";

const dropdowns = document.querySelectorAll('.dropdown');

let compIDs = {0: "", 1: ""};
let compDates = {0: "", 1: ""};
let currentWebsites = {0: "", 1: ""};

const emptyTextStrings = ["", "Bitte auswählen"];

const labelColor = (localStorage.getItem("mode") !== "black") ? "#000000" : "#cbcfda";

const currentMode = localStorage.getItem("mode");
if (currentMode === "black") {
    document.body.classList.remove("white");
}

let comparisonDatatable;

function addCompResult(first, percentage, second, titleText) {
    const wrapper = document.getElementById("comparison-wrapper");

    const row = document.createElement('div');
    row.classList.add('comparison-row');

    const title = document.createElement("div");
    title.classList.add('comparison-title');
    title.textContent = titleText;

    const elementsWrapper = document.createElement('div');
    elementsWrapper.classList.add('comparison-row-elements');

    const firstElement = document.createElement('div');
    firstElement.classList.add('comparison-row-element');
    firstElement.textContent = first;

    const percentageElement = document.createElement('div');
    percentageElement.classList.add('comparison-percentage');
    percentageElement.textContent = percentage;

    const secondElement = document.createElement('div');
    secondElement.classList.add('comparison-row-element');
    secondElement.textContent = second;

    elementsWrapper.appendChild(firstElement);
    elementsWrapper.appendChild(percentageElement);
    elementsWrapper.appendChild(secondElement);

    row.appendChild(title);
    row.appendChild(elementsWrapper);

    wrapper.appendChild(row);
}

function nullCheckCompCalculation(v1, v2, title){
    if (v1 === null && v2 === null) {
        addCompResult("N / A", "_", "N / A", title)
        return true;
    } else if (v1 === null && v2 !== null) {
        addCompResult("N / A", "_", formatNumber(v2), title);
        return true;
    } else if (v1 !== null && v2 === null) {
        addCompResult(formatNumber(v1), "_", "N / A", title);
        return true;
    }
}

function formatNumber(number) {
    const formatter = new Intl.NumberFormat('de-DE');
    return formatter.format(number);
}

function calculateCompResult(v1, v2, title, flat, unit){
    // Check if v1 or v2 are null, thus displaying a special result.
    if (nullCheckCompCalculation(v1, v2, title)) {return;}

    const percentage = ((v1 / v2) - 1) * 100;
    let comparisonResult;

    outerIf:
    if (percentage > 0) {
        if (!flat) {
            const roundedPercentage = parseFloat(Math.abs(percentage).toFixed(2));
            comparisonResult = `${roundedPercentage}% mehr als`;
            break outerIf;
        }
        comparisonResult = v1 - v2 + " mehr als"

    } else if (percentage < 0) {
        if (!flat) {
            const roundedPercentage = parseFloat(Math.abs(percentage).toFixed(2));
            comparisonResult = `${roundedPercentage}% weniger als`;
            break outerIf;
        }
        comparisonResult = v2 - v1 + " weniger als"

    } else {
        comparisonResult = "gleich";
    }

    v1 = formatNumber(v1);
    v2 = formatNumber(v2);

    // if given, add unit behind v1 and v2 for better display purposes.
    if (unit) {
        v1 = v1 + " " + unit;
        v2 = v2 + " " + unit;
    }

    addCompResult(v1, comparisonResult, v2, title);
}

function calculateDateCompResult(v1, v2, title) {
    if (nullCheckCompCalculation(v1, v2, title)) {return;}

    const d1 = new Date(v1);
    const d2 = new Date(v2);

    const difference = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());

    let comparisonResult;
    if (difference > 0) {
        comparisonResult = `${Math.abs(difference)} Monate früher als`;
    } else if (difference < 0) {
        comparisonResult = `${Math.abs(difference)} Monate später als`;
    } else {
        comparisonResult = "gleich";
    }

    addCompResult(v1, comparisonResult, v2, title);
}

// Clear wrapper from previous comparison.
function clearComparisonWrapper() {
    const wrapper = document.getElementById("comparison-wrapper");
    wrapper.innerHTML = '';
}

function clearChart(parentDiv, chartId) {
    const chartDiv = document.getElementById(parentDiv);
    const chartCanvas = chartDiv.querySelector('canvas');

    if (chartCanvas) {
        chartDiv.removeChild(chartCanvas);
    }
    const newChart = document.createElement("canvas");
    newChart.id = chartId;
    chartDiv.appendChild(newChart);
}

function loadChart(websiteAccesses, websiteTraffic, websiteAvgUser) {
    clearChart("compareChartDiv", "compareChartAccesses");

    websiteAccesses = websiteAccesses.map(x => x === null ? 0 : x);
    websiteTraffic = websiteTraffic.map(x => x === null ? 0 : x);

    let ctx = document.getElementById("compareChartAccesses").getContext("2d");
    new Chart(ctx, {
        type: "bar",
        data: {
            labels: [currentWebsites["0"], currentWebsites["1"]],
            datasets: [
                {
                    label: `Zugriffe`,
                    backgroundColor: "#ff1c1c",
                    borderColor: "#FFF",
                    borderWidth: 1,
                    yAxisID: 'y-axis-accesses',
                    data: websiteAccesses
                },
                {
                    label: "Verkehr",
                    backgroundColor: "#2a1bff",
                    borderColor: "#FFF",
                    borderWidth: 1,
                    yAxisID: 'y-axis-traffic',
                    data: websiteTraffic
                },
            ]
        },
        options: {
            responsive: true,
            legend: {
                position: "top",
                labels: {
                    fontColor: labelColor,
                }
            },
            title: {
                display: true,
                text: `Zugriffe vs Verkehr`,
                fontColor: labelColor,
                position: 'bottom',
                padding: 20,
            },
            scales: {
                yAxes: [
                    {
                        id: 'y-axis-accesses',
                        type: 'linear',
                        position: 'left',
                        ticks: {
                            beginAtZero: true,
                            fontColor: labelColor,
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Zugriffe',
                            fontColor: labelColor,
                        },
                    },
                    {
                        id: 'y-axis-traffic',
                        type: 'linear',
                        position: 'right',
                        ticks: {
                            beginAtZero: true,
                            fontColor: labelColor,
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Verkehr',
                            fontColor: labelColor,
                        },
                    },
                ],
                xAxes: [{
                    ticks: {
                        fontColor: labelColor,
                    }
                }]
            },
            tooltips: {
                displayColors: true,
                callbacks: {
                    mode: 'x',
                    label: function(tooltipItem, data) {
                        let value = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
                        let label = data.datasets[tooltipItem.datasetIndex].label;

                        value = value.toLocaleString('de-DE');
                        return `${label}: ${value} GB`;
                    }
                },
            },
        }
    });
}
async function executeComparison() {
    console.log(`Comparing ${compDates["0"]} and ${compDates["1"]}...`)

    clearComparisonWrapper();

    let generalData1 = await db.getWebsiteGeneralData(compIDs["0"], compDates["0"]);
    let generalData2 = await db.getWebsiteGeneralData(compIDs["1"], compDates["1"]);
    let v1OccurrencesData = await db.getWebsiteOccurrencesData(compIDs["0"]);
    let v2OccurrencesData = await db.getWebsiteOccurrencesData(compIDs["1"]);
    generalData1 = generalData1[0];
    generalData2 = generalData2[0];
    v1OccurrencesData = v1OccurrencesData[0];
    v2OccurrencesData = v2OccurrencesData[0];

    // Compare accesses.
    const v1Accesses = generalData1["accesses"];
    const v2Accesses = generalData2["accesses"];
    calculateCompResult(v1Accesses, v2Accesses, "Zugriffe");

    // Compare traffic.
    const v1Traffic = generalData1["traffic"];
    const v2Traffic = generalData2["traffic"];
    calculateCompResult(v1Traffic, v2Traffic, "Datenverkehr", false, "GB");

    // Compare average User.
    let v1AvgUser = generalData1["a_avg_user"];
    let v2AvgUser = generalData2["a_avg_user"];
    const v1AvgTrafficUser = generalData1["t_avg"];
    const v2AvgTrafficUser = generalData2["t_avg"];
    if(v1AvgUser === null) {
        v1AvgUser = v1AvgTrafficUser;
    }
    if(v2AvgUser === null) {
        v2AvgUser = v2AvgTrafficUser;
    }
    calculateCompResult(v1AvgUser, v2AvgUser, "Durchschnittliche Nutzer");

    // calculate user/traffic ratio
    let v1UserTrafficRatio = (v1Traffic / v1Accesses) * Math.pow(10, 6);
    let v2UserTrafficRatio = (v2Traffic / v2Accesses) * Math.pow(10, 6);
    if (v1UserTrafficRatio === Infinity || v1UserTrafficRatio === -Infinity || isNaN(v1UserTrafficRatio) || v1UserTrafficRatio === 0) {
        v1UserTrafficRatio = null;
    } else {
        v1UserTrafficRatio = v1UserTrafficRatio.toFixed(2);
    }
    if (v2UserTrafficRatio === Infinity || v2UserTrafficRatio === -Infinity || isNaN(v2UserTrafficRatio) || v2UserTrafficRatio === 0) {
        v2UserTrafficRatio = null;
    } else {
        v2UserTrafficRatio = v2UserTrafficRatio.toFixed(2);
    }

    calculateCompResult(v1UserTrafficRatio, v2UserTrafficRatio, "Durchschnittlich verbrauchte KB pro Zugriff")

    // Compare occurrence of websites in accesses (Datatable).
    const v1AccessCount = v1OccurrencesData.accesses_count;
    const v2AccessCount = v2OccurrencesData.accesses_count;
    calculateCompResult(v1AccessCount, v2AccessCount, "Vorkommen in Zugriffe-Datenbank", true);

    // Compare occurrence of websites in traffic (Datatable).
    const v1TrafficCount = v1OccurrencesData.traffic_count;
    const v2TrafficCount = v2OccurrencesData.traffic_count;
    calculateCompResult(v1TrafficCount, v2TrafficCount, "Vorkommen in Datenverkehr-Datenbank", true);

    // Compare first occurrences of websites in database.
    const v1FirstOccurrence= generalData1["first_occurrence"];
    const v2FirstOccurrence = generalData2["first_occurrence"];
    calculateDateCompResult(v1FirstOccurrence, v2FirstOccurrence, "Erstmaliges Auftreten");

    // Dsiplay comparison wrapper.
    showWrapper("comparison-wrapper");

    // Display chart
    showWrapper("compareChartDiv")
    loadChart([v1Accesses, v2Accesses], [v1Traffic, v2Traffic], [v1AvgUser, v2AvgUser]);

}

async function addMonths(id, element){
    const months = await db.getAllMonths(id);
    const listElement = document.getElementById(`v${element}-dropdown-content`);

    listElement.innerHTML = '';

    for (let i = 0; i < months.length; i++) {
        const aElement = document.createElement("a");
        const btn = document.getElementById(`v${element}-btn`);
        const date = months[i]["date"];

        aElement.innerText = date;

        aElement.addEventListener("click", async () => {
            btn.innerText = date;
            compDates[`${element - 1}`] = date;

            if (compDates["0"] !== "" && compDates["1"] !== "") {
                await executeComparison();
            }
        })

        if (i === 0) {
            btn.innerText = date;
            compDates[`${element-1}`] = date;
        }

        listElement.appendChild(aElement);
    }
    updateDropdowns();
}

/**
 * Update the dropdown objects according to if they have children or not.
 */
function updateDropdowns() {
    dropdowns.forEach(dropdown => {
        const dropdownContent = dropdown.querySelector('.dropdown-content');
        if (dropdownContent && dropdownContent.children.length !== 0) {
            console.log("No children found in dropdown.: " + dropdownContent.children.length);
            dropdown.classList.add('has-children');
        } else {
            dropdown.classList.remove('has-children');
        }
    });
}

async function addToComparison(id, url) {
    const v1 = document.getElementById("v1-element");
    const v2 = document.getElementById("v2-element");

    const deleteFirstBtn = document.createElement("button");
    const deleteSecondBtn = document.createElement("button");
    deleteFirstBtn.classList.add("close-button");
    deleteSecondBtn.classList.add("close-button");

    deleteFirstBtn.addEventListener("click", function () {
        hideWrapper("comparison-wrapper"); // Hide compare table
        hideWrapper("compareChartDiv"); // Hide chart
        console.log("Deleting first comparison element...");

        // clear v1 and v2 dates dropdown.
        const v1ListElement = document.getElementById(`v1-dropdown-content`);
        v1ListElement.innerHTML = ''

        compDates['0'] = "";

        const v1Btn = document.getElementById("v1-btn");
        v1Btn.innerText = "Datum";


        compIDs["0"] = "";
        v1.innerText = "Bitte auswählen";

        updateDropdowns();
        clearComparisonWrapper();
    })
    deleteSecondBtn.addEventListener("click", function () {
        hideWrapper("comparison-wrapper"); // Hide compare table
        hideWrapper("compareChartDiv"); // Hide chart
        console.log("Deleting second comparison element...");

        const v2ListElement = document.getElementById(`v2-dropdown-content`);
        v2ListElement.innerHTML = '';

        compDates['1'] = "";

        const v2Btn = document.getElementById("v2-btn");
        v2Btn.innerText = "Datum";

        compIDs["1"] = "";
        v2.innerText = "Bitte auswählen";

        updateDropdowns();
        clearComparisonWrapper();
    });

    const innerV1 = v1.innerText;
    const innerV2 = v2.innerText;
    if (emptyTextStrings.includes(innerV1) && emptyTextStrings.includes(innerV2)) {
        console.log("Adding to first comparison element... 1");
        console.log(innerV1, innerV2)

        v1.innerText = url;
        currentWebsites["0"] = url;
        await addMonths(id, 1);
        v1.appendChild(deleteFirstBtn);

        compIDs["0"] = id;

        return 0;
    } else if (emptyTextStrings.includes(innerV1) && !emptyTextStrings.includes(innerV2)) {
        console.log("Adding to second comparison element...");
        console.log(innerV1, innerV2)

        v1.innerText = url;
        currentWebsites["0"] = url;
        compIDs["0"] = id;
        v1.appendChild(deleteFirstBtn);

        await addMonths(id, 1);
        await executeComparison();

        return 0;
    } else if (!emptyTextStrings.includes(innerV1) && emptyTextStrings.includes(innerV2)) {
        console.log("Adding to first comparison element... 2");
        console.log(innerV1, innerV2)

        v2.innerText = url;
        currentWebsites["1"] = url;
        compIDs["1"] = id;
        v2.appendChild(deleteSecondBtn);

        await addMonths(id, 2);
        await executeComparison();

        return 1;
    } else { // override second element
        v2.innerText = url;
        currentWebsites["1"] = url;
        compIDs["1"] = id;
        v2.appendChild(deleteSecondBtn);

        await addMonths(id, 2);
        await executeComparison();

        return 1;
    }
}

function createRowElement(...values) {
    const rowElement = document.createElement("tr");
    rowElement.classList.add("row-element");

    const ID = values[0]
    const URL = values[1];

    // remove id from values
    // values = values.slice(1);

    // Loop through each value and create <td> elements
    values.forEach(function(value, index) {
        const tdElement = document.createElement("td");

        // Adjust cases if innerText-value should be changed to something else for specific columns.
        switch (index){
            case 0:
                const btn = document.createElement("button");
                btn.textContent = "Wählen";
                btn.classList.add("add-btn")

                btn.addEventListener("click", function () {
                    // Add row element to comparison
                    addToComparison(ID, URL).then();
                })

                tdElement.appendChild(btn);
                break;
            case 4:
                // convert boolean to "Ja" or "Nein" for readability
                if (value === 1) {
                    tdElement.innerText = "Ja";
                } else {
                    tdElement.innerText = "Nein";
                }
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
        values.pop(); // remove comment
        values.pop(); // remove lastChecked
        rowWrapper.appendChild(createRowElement(...values))
    }
}

async function fillColumns  (data){
    const columnWrapper = document.getElementById("column-wrapper");

    // add a column for an "add-to-comparison" button.
    columnWrapper.appendChild(dbSetup.createColumnElement(``));

    const keys = Object.keys(data[0]).slice(1);

    // remove comment and lastChecked from column
    keys.pop();
    keys.pop();

    for (let i = 0; i < keys.length; i++) {
        switch (keys[i].toLowerCase()) {
            case "url":
                keys[i] = "URL";
                break;
            case "first_occurrence":
                keys[i] = "Erstauftreten";
                break;
            case "issave":
                keys[i] = "Sicherheitsstatus";
                break;
            case "isacknowledged":
                keys[i] = "Wahrgenommen";
                break;
            default:
                keys[i] = "N/A";
                break;
        }
        columnWrapper.appendChild(dbSetup.createColumnElement(`${keys[i]}`));
    }
}

async function fillTable(data, fillColumnsFunction, fillRowsFunction) {
    // remove generated wrapper
    const tableWrapper = document.getElementById("myTable_wrapper");
    if (tableWrapper) {
        tableWrapper.remove();
    }

    // generate own html scaffolding
    dbSetup.buildTableScaffold();

    await fillColumnsFunction(data);
    await fillRowsFunction(data);
}

function hideWrapper(wrapperId) {
    const wrapper = document.getElementById(wrapperId);
    wrapper.classList.add('hidden');
}

function showWrapper(wrapperId) {
    const wrapper = document.getElementById(wrapperId);
    wrapper.classList.remove('hidden');
}

function handleDateDropdown(){
    const dropdowns = document.querySelectorAll('.dropdown');
    dropdowns.forEach(dropdown => {
        const dropBtn = dropdown.querySelector('.dropBtn');
        const dropdownContent = dropdown.querySelector('.dropdown-content');

        dropdown.addEventListener('mouseover', () => {
            if (dropdownContent.children.length > 0) {
                dropBtn.classList.add('hidden');
            }
        });

        dropdown.addEventListener('mouseout', () => {
            dropBtn.classList.remove('hidden');
        });

        dropdownContent.addEventListener('mouseout', () => {
            dropBtn.classList.remove('hidden');
        });
    });
}

function init(){
    handleDateDropdown();

    populateNavBar();
    populateLoginElements();
    buildFooter();

    initImport("websiteComparisonPage.html");
}

async function buildDataTable(getFunction, fillTableFunction, fillColumnsFunction, fillRowsFunction, columnDefinitions) {
    await getFunction().then(async data => {
        await fillTableFunction(data, fillColumnsFunction, fillRowsFunction).then(_ => {
            if (comparisonDatatable) {
                comparisonDatatable.destroy();
            }
            comparisonDatatable = new DataTable("#myTable", {
                order: {
                    idx: 2,
                    dir: "desc",
                },
                columnDefs: columnDefinitions
            });
        });
    });
}

document.addEventListener("DOMContentLoaded", async (event) => {
    init();
    await buildDataTable(db.getAllWebsites, fillTable, fillColumns, fillRows, [{
        targets: [0],
        orderable: false
    }]).then(r => console.log("successfully build datatable"));
});


