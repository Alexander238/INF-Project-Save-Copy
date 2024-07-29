import {getAllDatesOfDB} from "./databaseFunctions.js";
import * as db from "./databaseFunctions.js";

const topSelect = document.getElementById("top-select");
const topSelectWrapper = document.getElementById("top-select-wrapper");
const listContainer = document.getElementById("diagram-list-container");
const startSelectYear = document.getElementById("start-year");
const endSelectYear = document.getElementById("end-year");
const monthSelectStart = document.getElementById("month-select-start");
const monthSelectEnd = document.getElementById("month-select-end");
const searchBar = document.getElementById("search-bar");
const searchButton = document.getElementById("search-button");
const timeframe = document.getElementById("timeframe");
const timeframeWrapper = document.getElementById("timeframe-wrapper");
const blurryBackground = document.getElementById("blurry-background");
const searchBarContainer = document.querySelector(".search-container");

let allDates = {};
/* Number of entries per month */
let dataAvailable = 0;
let selectableItems = [];
let currentIndex = -1;
const onSingleWebsitePage = window.location.pathname === "/singleWebsite.html";

function setupKeyListeners() {
    /* Makes search results selectable using arrow keys */
    selectableItems = document.querySelectorAll('.selectable');

    function selectItem(index) {
        if (currentIndex >= 0) {
            selectableItems[currentIndex].classList.remove('selected');
        }
        if (index >= 0 && index < selectableItems.length) {
            searchBar.value = selectableItems[index].innerText;
            selectableItems[index].classList.add('selected');
            selectableItems[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
            currentIndex = index;
        }
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            if (currentIndex < selectableItems.length - 1) {
                selectItem(currentIndex + 1);
            }
        } else if (e.key === 'ArrowUp') {
            if (currentIndex > 0) {
                selectItem(currentIndex - 1);
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", async function() {
    const databaseReady = await db.checkDatabase();
    let errorMessageToShow = "Keine Daten vorhanden";
    if(!databaseReady) {
        errorMessageToShow = "Datenbank nicht erreichbar";
    }
    if(databaseReady && await db.getTopX()) {
        toggleSearchbarButton();
        if(!onSingleWebsitePage) {
            selectTimeframe();
            toggleSomeView();
            setupEventListener();
        }
        setupKeyListeners();
    }
    else {
        deleteContentOfMainBox(errorMessageToShow);
        removeUnnecessaryMenuButtons();
    }

    // Add event listener to logo
    document.getElementById("logo-box").addEventListener("click", function() {
        window.location.href = "/mainPage.html";
    });
});

async function showSearchResults() {
    const resultUrls = await db.getPartialWebsite(searchBar.value);

    const existingSearchResults = document.querySelector(".search-results");
    if(existingSearchResults) {
        existingSearchResults.remove();
    }

    const divResults = document.createElement("div");
    divResults.classList.add("search-results");
    if(resultUrls.length === 0) {
        const divResult = document.createElement("div");
        divResult.classList.add("no-hover");
        divResult.innerText = "Keine Ergebnisse gefunden";
        divResults.appendChild(divResult);
    }
    else {
        resultUrls.forEach((urlObject) => {
            const divResult = document.createElement("div");
            divResult.innerText = urlObject.url;
            divResult.classList.add("selectable");
            divResult.addEventListener("click", () => {
                currentIndex = -1;
                window.location.href = `singleWebsite.html?url=${urlObject.url}`;
                searchBar.value = urlObject.url;
            });
            divResults.appendChild(divResult);
        });
    }
    searchBarContainer.appendChild(divResults);

    // Update selectable items
    selectableItems = document.querySelectorAll('.selectable');
}

function toggleSearchbarButton() {
    searchBar.addEventListener('input', () => {
        showSearchButton();

        if (searchBar.value === "") {
            const existingSearchResults = document.querySelector(".search-results");
            if(existingSearchResults) {
                existingSearchResults.remove();
            }
        }
        else {
            showSearchResults();
        }
    });
    searchBar.addEventListener('change', showSearchButton);
    searchBar.addEventListener('click', () => {
        showSearchButton();
        if(searchBar.value) {
            showSearchResults();
        }
    });
    searchBar.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            console.log(searchBar.value);
            currentIndex = -1;
            searchButton.click();
        }
    });
}

function showSearchButton() {
    searchButton.style.display = 'inline-block';
}

export function deactivateMonths() {
    // Deactivate the month that are not available
    for(const [key, value] of Object.entries(allDates)) {
        if (key === startSelectYear.value) {
            const options = monthSelectStart.options;
            // Iterate through options and disable the ones that are not available
            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                if (!value.includes(option.value)) {
                    option.disabled = true;
                }
                else {
                    option.disabled = false;
                }
            }
        }
        if (key === endSelectYear.value) {
            const options = monthSelectEnd.options;
            // Iterate through options and disable the ones that are not available
            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                if (!value.includes(option.value)) {
                    option.disabled = true;
                }
                else {
                    option.disabled = false;
                }
            }
        }
    }
}

export function selectValidMonth(newYear = "", newMonth = "") {
    // sets new date and month
    if(newYear !== "" && newMonth !== "") {
        startSelectYear.value = newYear;
        monthSelectStart.value = newMonth;
        endSelectYear.value = newYear;
        monthSelectEnd.value = newMonth;
    }

    // Make sure selected dates are valid
    let validSelections = true;
    if(!allDates[startSelectYear.value] ||
        !allDates[endSelectYear.value] ||
        !allDates[startSelectYear.value].includes(monthSelectStart.value) ||
        !allDates[endSelectYear.value].includes(monthSelectEnd.value)) {
        validSelections = false;
    }

    // Change values to valid ones if necessary
    if(!validSelections) {
        if(!allDates[startSelectYear.value]) {
            startSelectYear.value = Object.entries(allDates)[0][0];
            monthSelectStart.value = Object.entries(allDates)[0][1];
        }
        if(!allDates[startSelectYear.value].includes(monthSelectStart.value)) {
            monthSelectStart.value = allDates[startSelectYear.value][0];
        }
        if(!allDates[endSelectYear.value]) {
            endSelectYear.value = Object.entries(allDates)[0][0];
            monthSelectEnd.value = Object.entries(allDates)[0][1];
        }
        if (!allDates[endSelectYear.value].includes(monthSelectEnd.value)) {
            monthSelectEnd.value = allDates[endSelectYear.value][0];
        }
    }
}

async function getFirstDate() {
    let firstDate = await getAllDatesOfDB();
    return firstDate[0].YearMonth;
}

// Dropdown
async function selectTimeframe() {
    let dates = await getAllDatesOfDB();
    for (let i = 0; i < dates.length; i++) {
        const year = dates[i].YearMonth.slice(0,4);
        const month = dates[i].YearMonth.slice(5,7);
        if (allDates[year] !== undefined) {
            allDates[year].push(month);
        } else {
            allDates[year] = [month];
        }
    }

    const firstDate = await getFirstDate();
    const firstYear = firstDate.slice(0,4);
    const firstMonth = firstDate.slice(5,7);
    
    startSelectYear.value = firstYear;
    endSelectYear.value = firstYear;
    monthSelectStart.value = firstMonth;
    monthSelectEnd.value = firstMonth;

    // Add all years to the dropdown
    for(const [key, _] of Object.entries(allDates)) {
        const option = document.createElement("option");
        option.text = key;
        option.value = key;
        startSelectYear.add(option);

        const option2 = document.createElement("option");
        option2.text = key;
        option2.value = key;
        endSelectYear.add(option2);
    }

    deactivateMonths();
    selectValidMonth();

    startSelectYear.addEventListener("change", () => {
        if (startSelectYear.value > endSelectYear.value) {
            endSelectYear.value = startSelectYear.value;
        }
        deactivateMonths();
        selectValidMonth();
    });
    endSelectYear.addEventListener("change", () => {
        if (endSelectYear.value < startSelectYear.value) {
            startSelectYear.value = endSelectYear.value;
        }
        deactivateMonths();
        selectValidMonth();
    });
    monthSelectStart.addEventListener("change", () => {
        if(monthSelectStart.value > monthSelectEnd.value && startSelectYear.value === endSelectYear.value) {
            monthSelectEnd.value = monthSelectStart.value;
        }
    });
    monthSelectEnd.addEventListener("change", () => {
        if(monthSelectEnd.value < monthSelectStart.value && startSelectYear.value === endSelectYear.value) {
            monthSelectStart.value = monthSelectEnd.value;
        }
    });
}

function setupEventListener() {
    document.addEventListener("click", function (event) {
        const timeframeButtonClicked = timeframeWrapper.contains(event.target) && !timeframe.contains(event.target);
        const topSelectButtonClicked = topSelectWrapper.contains(event.target) && !topSelect.contains(event.target);
        const timeframeOpen = timeframe.classList.contains("show");
        const topSelectOpen = topSelect.classList.contains("show");
        const clickedOutsideTimeframeWrapper = !timeframeWrapper.contains(event.target);
        const clickedOutsideTopSelectWrapper = !topSelectWrapper.contains(event.target);
        const searchResultsOpen = document.querySelector(".search-results");
        const clickedOutsideSearchResults = !searchBarContainer.contains(event.target);
        const selectClicked = startSelectYear.contains(event.target) || endSelectYear.contains(event.target) || monthSelectStart.contains(event.target) || monthSelectEnd.contains(event.target);

        if (searchResultsOpen && clickedOutsideSearchResults) {
            searchResultsOpen.remove();
        }

        if (timeframeButtonClicked) {
            if(timeframeOpen) {
                timeframe.classList.remove("show");
                timeframeWrapper.classList.remove("showAboveAll");
            }
            else {
                timeframe.classList.add("show");
                timeframeWrapper.classList.add("showAboveAll");
            }
            if (topSelectOpen) {
                topSelect.classList.remove("show");
                topSelectWrapper.classList.remove("showAboveAll");
            }

            if (!timeframeOpen && !topSelectOpen) {
                blurryBackground.classList.add("show");
            } else if (timeframeOpen && !topSelectOpen) {
                blurryBackground.classList.remove("show");
            }
        }
        if (topSelectButtonClicked) {
            if(topSelectOpen) {
                topSelect.classList.remove("show");
                topSelectWrapper.classList.remove("showAboveAll");
            }
            else {
                topSelect.classList.add("show");
                topSelectWrapper.classList.add("showAboveAll");
            }
            if (timeframeOpen) {
                timeframe.classList.remove("show");
                timeframeWrapper.classList.remove("showAboveAll");
            }

            if (!timeframeOpen && !topSelectOpen) {
                blurryBackground.classList.add("show");
            } else if (!timeframeOpen && topSelectOpen) {
                blurryBackground.classList.remove("show");
            }
        }

        if (clickedOutsideTimeframeWrapper && !topSelectButtonClicked && !selectClicked) {
            timeframe.classList.remove("show");
            timeframeWrapper.classList.remove("showAboveAll");
            blurryBackground.classList.remove("show");
        }
        if (clickedOutsideTopSelectWrapper && !timeframeButtonClicked && !selectClicked) {
            topSelect.classList.remove("show");
            topSelectWrapper.classList.remove("showAboveAll");
            blurryBackground.classList.remove("show");
        }
    });

    document.getElementById("filter-button").addEventListener("click", function () {
        timeframe.classList.remove("show");
        blurryBackground.classList.remove("show");
    });

    document.getElementById("diagram-list-container").addEventListener("click", function () {
        this.classList.toggle("scaled");
    });
}

function updateResults() {
    const selectedValue = parseInt(topSelect.value);
    const tableRows = listContainer.querySelectorAll("tr");
    tableRows.forEach((row, index) => {
        if (index < selectedValue) {
            row.style.display = "table-row";
        } else {
            row.style.display = "none";
        }
    });
}

function toggleSomeView() {
    updateResults();
}

function deleteContentOfMainBox(errorMessage = "Keine Daten vorhanden") {
    const mainBox = document.querySelector(".main-box");
    const footer = document.querySelector(".footer");
    while (mainBox.firstChild && mainBox.firstChild !== footer) {
        mainBox.removeChild(mainBox.firstChild);
    }

    // Add no data message
    const noData = document.createElement("p");
    noData.classList.add("no-data");
    noData.innerText = errorMessage;
    mainBox.insertBefore(noData, footer);
}

function removeUnnecessaryMenuButtons() {
    const menuButtons = document.querySelector(".nav-bar > .buttons").children;

    Array.from(menuButtons).forEach(function(button) {
        if (button.innerText !== 'Dashboard' && button.innerText !== 'Importieren') {
            button.remove();
        }
    });
}