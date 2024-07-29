import {populateNavBar, buildFooter, populateLoginElements} from "./websiteElementBuilder.js";
import {initImport} from "./import.js";
import * as db from "./databaseFunctions.js";

const currentMode = localStorage.getItem("mode");
if (currentMode === "black") {
    document.body.classList.remove("white");
}

document.addEventListener("DOMContentLoaded", function() {
    populateNavBar();
    populateLoginElements();
    buildFooter();
    initImport("contactPage.html");

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