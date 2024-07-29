import {populateNavBar, buildFooter, populateLoginElements} from "./websiteElementBuilder.js";
import {initImport} from "./import.js";
import * as db from "./databaseFunctions.js";

const currentMode = localStorage.getItem("mode");
if (currentMode === "black") {
    document.body.classList.remove("white");
}

function buildManualContent() {
    fetch("markdown").then(response => response.text()).then(text => {
        document.getElementById("manual-content").innerHTML = text;
    });
}

document.addEventListener("DOMContentLoaded", function() {
    populateNavBar();
    populateLoginElements();
    buildManualContent();
    buildFooter();
    initImport("manualPage.html");

    removeUnnecessaryMenuItems();
});

async function removeUnnecessaryMenuItems() {
    if(!await db.getTopX()) {
        const menuButtons = document.querySelector(".nav-bar > .buttons").children;
        Array.from(menuButtons).forEach(function(button) {
            if (button.innerText !== 'Dashboard' && button.innerText !== 'Importieren') {
                button.remove();
            }
        });
    }
}