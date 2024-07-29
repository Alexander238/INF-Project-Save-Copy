/*
    Ich habe über jede Funktion geschrieben, ob sie anpassbar für bestimmte Zwecke ist,
    oder ob sie unverändert da sein MUSS.

    Can: "Can adjust"
    Can't: "Can not adjust"

    Die Funktionen wo can't steht, befinden sich im datatableJUMIBasicSetup.js und
    können darüber einfach verwendet werden. Einfach auf der HTML-Seite als Script angeben.
    Am besten vor allen anderen Scripts.
 */

// Braucht ihr für "getAllWebsites" oder ähnliches.
// import * as db from "./databaseFunctions.js";

export let datatable;

// Can
function createRowElement(...values) {
    const rowElement = document.createElement("tr");
    rowElement.classList.add("row-element");

    // const ID = values[0]

    // Loop through each value and create <td> elements
    values.forEach(function(value, index) {
        const tdElement = document.createElement("td");

        // Adjust cases if innerText-value should be changed to something else for specific columns.
        switch (index){
            default:
                tdElement.innerText = value;
        }
        rowElement.appendChild(tdElement);
    });

    return rowElement;
}

// Can
function createColumnElement(text){
    const th = document.createElement("th");
    th.innerText = text;
    return th;
}

// Can't
async function fillRows(data){
    const rowWrapper = document.getElementById("row-wrapper");

    for (let i = 0; i < data.length; i++){
        let values = Object.values(data[i]);
        rowWrapper.appendChild(createRowElement(...values))
    }
}

// Can
async function fillColumns  (data){
    const columnWrapper = document.getElementById("column-wrapper");

    const keys = Object.keys(data[0]).slice(1);
    for (let i = 0; i < keys.length; i++) {
        columnWrapper.appendChild(createColumnElement(`${keys[i]}`));
    }
}

// Can't
function buildTableScaffold() {
    const scaffolding = document.getElementById("tableWrapper");

    const table = document.createElement("table");
    table.id = "myTable";
    table.className = "display";

    const thead = document.createElement("thead");
    const tr = document.createElement("tr");
    tr.id = "column-wrapper";
    const tbody = document.createElement("tbody");
    tbody.id = "row-wrapper";

    thead.appendChild(tr);

    table.appendChild(thead);
    table.append(tbody);

    scaffolding.appendChild(table);
}

// Can't
async function fillTable(data, fillColumnsFunction, fillRowsFunction) {
    // remove generated wrapper
    const tableWrapper = document.getElementById("myTable_wrapper");
    if (tableWrapper) {
        tableWrapper.remove();
    }

    // generate own html scaffolding
    buildTableScaffold();

    await fillColumnsFunction(data);
    await fillRowsFunction(data);
}

// CAN!!! Adjust this to get the correct data.
async function buildDataTable(getFunction, fillTableFunction, fillColumnsFunction, fillRowsFunction) {
    await getFunction().then(async data => {
        await fillTableFunction(data, fillColumnsFunction, fillRowsFunction).then(_ => {
            if (datatable) {
                datatable.destroy();
            }
            datatable = new DataTable("#myTable");
        });
    });
}

// Can't
/*
    Das hier muss selber noch implementiert werden.

$(document).ready(function() {
    buildDataTable(db.getAllWebsites, fillTable, fillColumns, fillRows).then(r => console.log("successfully build datatable"));
});

 */

export {buildTableScaffold, createRowElement, createColumnElement, buildDataTable, fillRows, fillTable, fillColumns}