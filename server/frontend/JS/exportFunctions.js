export function takeScreenShots() {
    console.log("hey");
    const element = document.querySelector(".main-box");
    const footer = document.querySelector("footer");
    const button = document.getElementById("download-pdf");
    const buttonContainer = document.querySelector(".button-container");
    const btnDelete = document.querySelectorAll('.btn.btn-delete');

    footer.style.display = 'none';
    button.style.display = 'none';
    buttonContainer.style.display = 'none';
    btnDelete.forEach(btn => btn.style.display = 'none');

    element.scrollIntoView();

    html2canvas(element).then((canvas) => {
        let image = canvas.toDataURL("image/jpeg");
        console.log("image saved");

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        pdf.addImage(image, 'JPEG', 10, 10, 190, 0);
        pdf.save("capture.pdf");

        footer.style.display = '';
        button.style.display = '';
        buttonContainer.style.display = '';
        btnDelete.forEach(btn => btn.style.display = '');
    }).catch(err => {
        console.log("failed to screenshot", err);

        footer.style.display = '';
        button.style.display = '';
        buttonContainer.style.display = '';
        btnDelete.forEach(btn => btn.style.display = '');
    });
}

function arrayToCSV(data) {
    const csvRows = [];

    if(data.length === 0) {
        throw new Error("No data to export!");
    }
    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(','));

    for (const row of data) {
        const values = headers.map(header => {
            const escaped = ('' + row[header]).replace(/"/g, '\\"');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
}

function switchRowAndColumn(array) {
    const transposed = [];

    // Get all unique keys (excluding the empty key)
    const keys = Array.from(new Set(array.map(obj => Object.keys(obj)).flat())).filter(key => key !== '');

    // Create transposed objects
    for (const key of keys) {
        const obj = { "": key };
        for (const item of array) {
            obj[item[""]] = item[key];
        }
        transposed.push(obj);
    }

    return transposed;
}

export function downloadCSV(data, filename, singleWebsite = false) {
    try {
        let csv;
        if(singleWebsite) {
            data = switchRowAndColumn(data);
            csv = arrayToCSV(data);
        }
        else {
            csv = arrayToCSV(data);
        }

        const blob = new Blob([csv], {type: 'text/csv'});
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', filename);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    catch(error) {
        alert("Fehler beim Export: " + error);
    }
}