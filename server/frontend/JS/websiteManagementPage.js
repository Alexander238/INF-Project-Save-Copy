import * as db from './databaseFunctions.js';
import {buildFooter, populateLoginElements, populateNavBar} from "./websiteElementBuilder.js";

import * as dbSetup from "./datatableJUMIBasicSetup.js"
import {initImport} from "./import.js";
import {createColumnElement, datatable} from "./datatableJUMIBasicSetup.js";
import {getAllDatesOfDB} from "./databaseFunctions.js";

/*
    Filter werden hierüber generiert und angewendet. Falls wir dem User ermöglichen wollen,
    eigene Filter zu erstellen, muss das einfach nur hier in das Array mit rein!
 */
let isSaveOptions = ["Nicht angegeben", "Ja", "Nein"];
let isAcknowledgedOptions = [0, 1];
// Enthält die Einträge aus isSaveOptions, welche nicht angezeigt werden sollen.
let filterOutFromIsSave = [];
let filterOutFromIsAcknowledged = [];

// In seconds
const notificationDuration = 2;

// Month select
const selectYear = document.getElementById("year");
const selectMonth = document.getElementById("month-select");
const deleteEntryButton = document.getElementById("delete-entry-button");

let allDates = {};

let managementDatatable;

function addYearsToDropdown() {
    while (selectYear.firstChild) {
        selectYear.removeChild(selectYear.lastChild);
    }

    for (let key in allDates) {
        const option = document.createElement("option");
        option.value = key;
        option.text = key;
        selectYear.appendChild(option);
    }
}

function addEventlistenerToSelectYear() {
    // add eventlistener to selectYear
    selectYear.addEventListener("change", async function () {
        const selectedYear = selectYear.value;
        const selectedMonths = allDates[selectedYear];

        for (let i = 0; i < selectMonth.options.length; i++) {
            if (selectedMonths.includes(selectMonth.options[i].value)) {
                // enable option
                selectMonth.options[i].disabled = false;
            } else {
                // disable option
                selectMonth.options[i].disabled = true;
            }
        }

        // set first enabled option in selectMonth option as selected
        for (let i = 0; i < selectMonth.options.length; i++) {
            if (!selectMonth.options[i].disabled) {
                selectMonth.selectedIndex = i;
                break;
            }
        }
    });
}

function addEventListenerToDeleteFileButton() {
    deleteEntryButton.addEventListener("click", async function () {
        const selectedYear = selectYear.value;
        const selectedMonth = selectMonth.value;
        const selectedMonthString = selectMonth.options[selectMonth.selectedIndex].innerText;

        const confirmed = confirm(`Wirklich alle Einträge des ${selectedMonthString} ${selectedYear} löschen?`);
        if (confirmed) {
            await db.deleteEntryOfMonthAndYear(selectedMonth, selectedYear);
            showNotification(`Alle Einträge des ${selectedMonthString} ${selectedYear} wurden gelöscht`, "green");
            await fillYears();
            // trigger change on selectYear
            selectYear.dispatchEvent(new Event("change"));
        }
    });
}

async function fillYears() {
    allDates = {};

    let dates = await getAllDatesOfDB();
    for (let i = 0; i < dates.length; i++) {
        const year = dates[i].YearMonth.slice(0, 4);
        const month = dates[i].YearMonth.slice(5, 7);
        if (allDates[year] !== undefined) {
            allDates[year].push(month);
        } else {
            allDates[year] = [month];
        }
    }

    // for key in allDates, fill the selectYear with keys as options
    addYearsToDropdown();
}

const currentMode = localStorage.getItem("mode");
if (currentMode === "black") {
    document.body.classList.remove("white");
}

function createRowElement(...values) {
    const rowElement = document.createElement("tr");
    rowElement.classList.add("row-element");

    const ID = values[0]
    const websiteName = values[1];
    // remove id from values
    values = values.slice(1);

    // WARNING: index needs to be adjusted if DB is changed
    //moveElementToEnd(values, 4);

    swapElements(values, 4, 5);


    // Loop through each value and create <td> elements
    values.forEach(function (value, index) {
        const tdElement = document.createElement("td");

        switch (index) {
            case 2:
                addIsSaveDropDown(tdElement, ID, websiteName, value);
                break;
            case 3:
                addIsAcknowledgedCheckbox(tdElement, ID, websiteName, value);
                break;
            case 4:
                addAPIElement(tdElement, ID, websiteName, value);
                break;
            case 5:
                addComment(tdElement, ID, websiteName, value);
                break;
            default:
                if (value === null) {
                    tdElement.innerText = "Nicht angegeben";
                } else {
                    tdElement.innerText = value;
                }
        }
        rowElement.appendChild(tdElement);
    });
    return rowElement;
}

function addComment(tdElement, ID, name, value) {
    const commentWrapper = document.createElement("div");
    commentWrapper.classList.add("comment-wrapper");

    const textArea = document.createElement('textarea');
    textArea.classList.add("comment-textArea");
    textArea.value = value;

    // On toggle, update database
    textArea.addEventListener('change', function () {
        db.updateCommentWebsite(ID, this.value).then(r => console.log(`updated ${name} to ${this.value}`));
        showNotification(`Kommentar für <b>${name}</b> geändert`);
    })

    commentWrapper.appendChild(textArea);
    tdElement.appendChild(commentWrapper);
}

function addIsAcknowledgedCheckbox(tdElement, ID, name, value) {
    const checkboxWrapper = document.createElement("div");
    checkboxWrapper.classList.add("checkbox-wrapper");

    // Create a checkbox element
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add("checkbox-isAcknowledged");

    if (value === 1) {
        checkbox.checked = true;
    }

    // On toggle, update database
    checkbox.addEventListener('change', function () {
        db.updateIsAcknowledgedWebsite(ID, booleanToNumber(this.checked)).then(r => console.log(`updated ${name} to ${booleanToNumber(this.checked)}`));

        if (checkbox.checked) {
            showNotification(`<b>${name}</b> wahrgenommen`);
            console.log("Notify")
        } else {
            showNotification(`<b>${name}</b> nicht länger wahrgenommen`);
        }
    })

    const checkmarkSpan = document.createElement("span");
    checkmarkSpan.classList.add("checkmark");

    checkboxWrapper.appendChild(checkbox);
    checkboxWrapper.appendChild(checkmarkSpan);
    tdElement.appendChild(checkboxWrapper);
}

let scanResults = {}; // Object to save the scan results in the current pag

async function scanUrl(url, websiteId, button, controller = null) {
    const signal = controller ? controller.signal : (new AbortController()).signal;

    // Show loading state
    button.disabled = true; // Prevent double-click during the check
    button.innerText = "PRÜFE...";
    button.style.backgroundColor = 'yellow';
    button.style.color = "#011e4a";

    try {
        const response = await fetch('/api/scan-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({url, websiteId}),
            signal: signal
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();
        const detailsButton = document.getElementById(`details-button-${websiteId}`);

        const currentDate = new Date();
        const formattedDate = formatDate(currentDate);

        if (result.error === 'API_UNREACHABLE') {
            alert('Die API ist aktuell nicht erreichbar.');
            button.style.backgroundColor = '';
            button.style.color = 'white';
            button.disabled = false;
            button.innerText = 'CHECK';
            return;
        }

        // Update last checked date
        const text = button.parentElement.querySelector('.api-text');
        const span = document.createElement('span');
        span.classList.add('api-text-span');
        span.innerHTML = `letzte Prüfung <br>${formattedDate}`;
        text.innerHTML = span.outerHTML;

        if (result === "KEINE_DOMAIN") {
            button.innerText = "CDN";
            localStorage.setItem(`buttonText_${websiteId}`, 'CDN');
            console.log('keine Domain');

            await updateLastCheckedDateInDatabase(websiteId, formattedDate);

            // Disable details button if it's a CDN
            if (detailsButton) {
                detailsButton.disabled = true;
                detailsButton.style.backgroundColor = 'grey';
                detailsButton.style.color = 'white';
            }

            return "KEINE_DOMAIN";
        }

        scanResults[url] = {
            verdicts: result.verdicts?.overall || {malicious: true},
            task: result.task,
            page: result.page,
            domains: result.lists?.domains || []
        };

        if (scanResults[url].verdicts.malicious) {
            button.style.backgroundColor = 'red';
            button.style.color = 'white';
            localStorage.setItem(`buttonState_${websiteId}`, 'red');
        } else {
            button.style.backgroundColor = 'green';
            button.style.color = 'white';
            localStorage.setItem(`buttonState_${websiteId}`, 'green');
        }

        await updateLastCheckedDateInDatabase(websiteId, formattedDate);

        // Enable details button after check
        if (detailsButton) {
            detailsButton.disabled = false;
            detailsButton.style.backgroundColor = ''; // Remove grey background
            detailsButton.style.color = 'white';
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Der API-Aufruf wurde abgebrochen.');
        } else {
            console.error('Error scanning URL:', error);
        }
    } finally {
        // Reset button state
        button.disabled = false;
        const buttonText = localStorage.getItem(`buttonText_${websiteId}`);
        button.innerText = buttonText === 'CDN' ? 'CDN' : 'CHECK';
        const buttonState = localStorage.getItem(`buttonState_${websiteId}`);
        button.style.backgroundColor = buttonState === 'red' ? 'red' : (buttonState === 'green' ? 'green' : '');
        button.style.color = "white";
    }
}


async function addAPIElement(tdElement, ID, name, value) {
    const div = document.createElement("div");
    div.classList.add("api-div");

    const button = document.createElement("button");
    button.classList.add("button", "api-button");
    button.id = `api-button-${ID}`;
    button.innerText = "CHECK";
    button.addEventListener("click", async function () {
        await scanUrl(name, ID, button);

        const currentDate = new Date();
        const formattedDate = formatDate(currentDate);

        const text = button.parentElement.querySelector('.api-text');
        const span = document.createElement('span');
        span.classList.add('api-text-span');
        span.innerHTML = `letzte Prüfung <br>${formattedDate}`;
        text.innerHTML = span.outerHTML;


        await updateLastCheckedDateInDatabase(ID, formattedDate);
        if (button.innerText !== 'CDN') {
            detailsButton.disabled = false;
            detailsButton.style.backgroundColor = '';
            detailsButton.style.color = 'white';
        }
    });

    const urlData = await fetchApiData(name);
    if (urlData.length !== 0) {
        if (urlData[0].malicious) {
            button.style.backgroundColor = 'red';
            button.style.color = 'white';
        } else {
            button.style.backgroundColor = 'green';
            button.style.color = 'white';
        }
    }

    // If lastChecked true and website not in api_data, then it is a CDN
    const isCDN = (value !== null && urlData.length === 0);
    let buttonText;
    if (isCDN) {
        button.innerText = 'CDN';
        button.style.backgroundColor = '';
        buttonText = "CDN";
    }

    const text = document.createElement("p");
    text.classList.add("api-text");

    const span = document.createElement('span');
    span.classList.add('api-text-span');
    if (value === null) {
        span.innerHTML = `letzte Prüfung <br>-`;
    } else {
        span.innerHTML = `letzte Prüfung <br>${formatDate(new Date(value))}`;
    }
    text.appendChild(span);

    const detailsButton = document.createElement("button");
    detailsButton.classList.add("button", "details-button");
    detailsButton.id = `details-button-${ID}`; // Add unique ID for details button
    detailsButton.innerText = "DETAILS";
    detailsButton.disabled = (value === null) || (buttonText === 'CDN'); // Disable if no check performed or if CDN

    if ((value === null) || (buttonText === 'CDN')) {
        detailsButton.style.backgroundColor = 'grey';
        detailsButton.style.color = 'white';
    }

    detailsButton.addEventListener("click", function () {
        showScanResult(name);
    });

    div.appendChild(button);
    div.appendChild(detailsButton);
    div.appendChild(text);
    tdElement.appendChild(div);
}


let allWebsitesAbortController;


function showNotification(message, color) {
    const mainBox = document.getElementsByClassName("main-box")[0];
    const existingNotifications = document.querySelectorAll('.notification');

    const notification = document.createElement('div');
    notification.classList.add('notification');
    notification.innerHTML = message;
    if (color !== undefined) {
        notification.style.backgroundColor = color;
    }

    mainBox.insertBefore(notification, mainBox.firstChild);
    // Slide down existing notifications
    existingNotifications.forEach(function (existingNotification) {
        existingNotification.style.top = parseInt(existingNotification.style.top) + notification.offsetHeight + 10 + 'px';
    });

    // Set the position of the new notification
    notification.style.top = '0';

    setTimeout(function () {
        notification.style.opacity = '0';
        setTimeout(function () {
            mainBox.removeChild(notification);
        }, 2000); // Delete after fading out
    }, notificationDuration * 1000); // Hide after some time
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function updateLastCheckedDateInDatabase(id, date) {
    try {
        const response = await fetch('/api/update-last-checked', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({id, date})
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const result = await response.json();
        //console.log('Update result:', result);
    } catch (error) {
        console.error('Error updating last checked date:', error);
    }
}

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

function showScanResult(url) {
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
    closeButton.onclick = function () {
        resultModal.style.display = 'none';
    };

    window.onclick = function (event) {
        if (event.target == resultModal) {
            resultModal.style.display = 'none';
        }
    };
}


function addIsSaveDropDown(tdElement, id, name, value) {
    const selectElement = document.createElement("select");
    const currentIndex = isSaveOptions.findIndex(option => option === value);
    selectElement.classList.add("option-isSave")

    // add options to dropdown.
    isSaveOptions.forEach(function (toggleValue) {
        const option = document.createElement("option");
        option.value = toggleValue;
        option.text = toggleValue;
        selectElement.appendChild(option);
    });

    selectElement.value = isSaveOptions[currentIndex];

    // On toggle, update datatable.
    selectElement.addEventListener("change", function () {
        db.updateIsSaveWebsite(id, selectElement.value).then(r => console.log(`Updated ${name} with ${selectElement.value}`));
        tdElement.appendChild(selectElement);

        showNotification(`Sicherheitsstatus von <b>${name}</b> auf "${selectElement.value}" gesetzt`);
    });

    tdElement.appendChild(selectElement);
}

function moveElementToEnd(arr, index) {
    // Remove element
    const element = arr.splice(index, 1)[0];

    // Insert back to end
    arr.push(element);
}

function swapElements(arr, index1, index2) {
    if (index1 >= 0 && index1 < arr.length && index2 >= 0 && index2 < arr.length) {
        const temp = arr[index1];
        arr[index1] = arr[index2];
        arr[index2] = temp;
    } else {
        console.error('Index out of bounds');
    }
}

async function fillRows(data) {
    const rowWrapper = document.getElementById("row-wrapper");

    for (let i = 0; i < data.length; i++) {
        let elem = data[i];

        // skip if values are in ignore-lists
        if (filterOutFromIsSave.includes(elem['isSave'])
            || filterOutFromIsAcknowledged.includes(elem['isAcknowledged'])) {
            continue
        }

        let values = Object.values(data[i]);
        rowWrapper.appendChild(createRowElement(...values))
    }
}

async function fillColumns(data) {
    const columnWrapper = document.getElementById("column-wrapper");

    const keys = Object.keys(data[0]).slice(1);

    moveElementToEnd(keys, keys.indexOf("comment"));

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
            case "comment":
                keys[i] = "Kommentar";
                break;
            case "lastchecked":
                keys[i] = "API-Prüfung";
                break;
            default:
                break;
        }
        columnWrapper.appendChild(createColumnElement(`${keys[i]}`));
    }
}

async function fillTable(data) {
    // remove generated wrapper
    const tableWrapper = document.getElementById("myTable_wrapper");
    if (tableWrapper) {
        tableWrapper.remove();
    }

    // generate own html scaffolding
    dbSetup.buildTableScaffold();

    await fillColumns(data);
    await fillRows(data);
}

function isNumeric(str) {
    return !isNaN(str) && !isNaN(parseFloat(str));
}

function createFilterOption(name) {
    const filterOption = document.createElement("div")
    filterOption.classList.add("checkbox-wrapper");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `checkbox-${name}`;
    checkbox.name = "checkbox";
    checkbox.value = name;
    checkbox.checked = true;
    checkbox.classList.add("filter-checkbox");


    const checkmarkSpan = document.createElement("span");
    checkmarkSpan.classList.add("checkmark");

    // check if filter belongs to isSave or isAcknowledged.
    if (!isNumeric(name)) {
        checkmarkSpan.textContent = name.charAt(0).toUpperCase() + name.slice(1);

        // EventListener
        checkbox.addEventListener('change', async function () {
            updateFilterArray(filterOutFromIsSave, name);

            // Refresh datatable
            await buildDataTable(db.getAllWebsites, fillTable, dbSetup.fillColumns, fillRows, [
                {
                    targets: [2, 3, 4, 5],
                    orderable: false
                }
            ]);
        });
    } else {
        checkmarkSpan.textContent = (name === 1) ? "Ja" : "Nein";

        // EventListener
        checkbox.addEventListener('change', async function () {
            updateFilterArray(filterOutFromIsAcknowledged, name);

            // Refresh datatable
            await buildDataTable(db.getAllWebsites, fillTable, dbSetup.fillColumns, fillRows, [{
                targets: [2, 3, 4, 5],
                orderable: false
            }]);
        });
    }

    filterOption.appendChild(checkbox);
    filterOption.appendChild(checkmarkSpan);

    return filterOption;
}

function booleanToNumber(value) {
    if (value) {
        return 1;
    } else {
        return 0;
    }
}

function updateFilterArray(arr, value) {
    if (arr.includes(value)) {
        const index = arr.indexOf(value);
        arr.splice(index, 1);
    } else {
        arr.push(value);
    }
}

async function checkAllWebsitesSequentially() {
    const websites = await db.getAllWebsites();

    allWebsitesAbortController = new AbortController();

    const checkPromises = websites.map(async (website) => {
        const button = document.getElementById(`api-button-${website.id}`); // Select button by unique ID
        const detailsButton = document.getElementById(`details-button-${website.id}`); // Select details button by unique ID

        if (!button) {
            return; // Skip this iteration if the button is not found
        }

        try {
            const result = await scanUrl(website.url, website.id, button, allWebsitesAbortController);

            // Enable details button if API check was done and it's not a CDN
            if (detailsButton && result !== "KEINE_DOMAIN") {
                detailsButton.disabled = false;
                detailsButton.style.backgroundColor = ''; // Remove grey background
                detailsButton.style.color = 'white';
            } else if (detailsButton && result === "KEINE_DOMAIN") {
                detailsButton.disabled = true;
                detailsButton.style.backgroundColor = 'grey'; // Keep grey background for CDN
                detailsButton.style.color = 'white';
            }
        } catch (error) {
            if (allWebsitesAbortController.signal.aborted) {
                console.log('Check all websites aborted');
                return; // Break the loop if the abort signal is triggered
            }
            console.error('Error checking website:', website.url, error);
        }
    });
    await Promise.all(checkPromises);

    // Re-enable the button after all checks are complete
    const checkAllButton = document.getElementById('api-all-sites');
    checkAllButton.disabled = false;
    checkAllButton.innerText = "Angezeigte Websites per API prüfen";
}

function init() {
    populateNavBar();
    populateLoginElements();
    buildFooter();

    fillYears().then(r => {
        addEventlistenerToSelectYear();
        addEventListenerToDeleteFileButton();

        selectYear.dispatchEvent(new Event("change"));
    });

    initImport("websiteManagementPage.html");

    const isSaveFilterWrapper = document.getElementById("isSave-filter-wrapper");
    const isAcknowledgedFilterWrapper = document.getElementById("isAcknowledged-filter-wrapper");
    // Add Filter-Options
    isSaveOptions.forEach((option) => {
        isSaveFilterWrapper.appendChild(createFilterOption(option));
    });

    isAcknowledgedOptions.forEach((option) => {
        isAcknowledgedFilterWrapper.appendChild(createFilterOption(option));
    })

    // Add event listener to the button
    document.getElementById('ack-all-btn').addEventListener('click', function () {
        // Display confirmation dialog
        const confirmed = confirm("Wirklich alle angezeigten Websites wahrnehmen?");

        if (confirmed) {
            acknowledgeAll();
        }
    });
    document.getElementById('api-all-sites').addEventListener('click', function () {
        // Display confirmation dialog
        const confirmed = confirm("Alle angezeigten Webseiten per API prüfen lassen?\n" +
            "\nHinweis: \nDer API-Check läuft im Hintergrund.\n" +
            "Wenn die Website verlassen wird dann wird auch der API-Check abgebrochen.");
        if (confirmed) {
            // Disable the button and provide visual feedback
            const checkAllButton = document.getElementById('api-all-sites');
            checkAllButton.disabled = true;
            checkAllButton.innerText = "...PRÜFUNG ALLER WEBSITES LÄUFT...";
            checkAllButton.classList.add('pulse');

            checkAllWebsitesSequentially().then(() => {
                showNotification("Alle angezeigten Websites wurden per API geprüft!", "#68aa07");
            }).catch(error => {
                console.error('Error checking all websites:', error);
            }).finally(() => {
                // Re-enable the button after all checks are complete
                checkAllButton.disabled = false;
                checkAllButton.innerText = "Angezeigte Websites per API prüfen";
                checkAllButton.classList.remove('pulse');
            });
        }
    });

}

async function buildDataTable(getFunction, fillTableFunction, fillColumnsFunction, fillRowsFunction, columnDefinitions) {
    await getFunction().then(async data => {
        await fillTableFunction(data, fillColumnsFunction, fillRowsFunction).then(_ => {
            if (managementDatatable) {
                managementDatatable.destroy();
            }
            managementDatatable = new DataTable("#myTable", {
                columnDefs: columnDefinitions
            });
        });
    });
}

function acknowledgeAll() {
    const checkboxes = document.querySelectorAll('.checkbox-isAcknowledged');

    let counter = 0;
    checkboxes.forEach(function (checkbox) {
        if (checkbox.checked) {
            counter++;
            return;
        }
        checkbox.checked = true;

        // Trigger change event manually
        checkbox.dispatchEvent(new Event('change'));
    });

    if (counter !== 0) {
        showNotification(`${counter} Websites wurden bereits wahrgenommen`, "#ee6621");
    }
}

document.addEventListener("DOMContentLoaded", async function () {
    init();
    await buildDataTable(db.getAllWebsites, fillTable, dbSetup.fillColumns, fillRows, [{
        targets: [2, 3, 4, 5],
        orderable: false
    }]).then(r => console.log("successfully build datatable"));


    document.querySelectorAll('a.toggle-visibility').forEach((element) => {
        element.addEventListener('click', function (e) {
            e.preventDefault();

            if (this.classList.contains('column-toggled-true')) {
                this.classList.remove('column-toggled-true');
                this.classList.add('column-toggled-false');
            } else {
                this.classList.remove('column-toggled-false');
                this.classList.add('column-toggled-true');
            }

            let columnIdx = e.target.getAttribute('data-column');
            let column = managementDatatable.column(columnIdx);

            // Toggle the visibility
            column.visible(!column.visible());
        });
    });
});
