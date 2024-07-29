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
    initImport("settingsPage.html");

    removeUnnecessaryMenuItems();

    checkBoxStuff();
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

function checkBoxStuff() {
    const checkbox = document.getElementById("checkbox");

    checkbox.checked = localStorage.getItem("mode") === "black";

    checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
            localStorage.setItem("mode", "black");
        } else {
            localStorage.removeItem("mode");
        }

        location.reload();
    });
}