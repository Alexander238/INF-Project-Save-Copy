let isUploading = false;

// Funktion zur Anzeige des Toasts
function showToast(message, isError) {
    const toast = document.createElement('div');
    toast.classList.add('toast', isError ? 'toastError' : 'toastSuccess');
    toast.innerHTML = message;

    document.body.appendChild(toast);

    if (isError) {
        setTimeout(() => {
            toast.remove();
        }, 10000);
    } else {
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

export function addImportEventListener() {
    const dropZone = document.getElementById('drag_drop_zone');

    dropZone.addEventListener('dragenter', (event) => {
        event.preventDefault();

        if (!isUploading) {
            dropZone.classList.add('dragover');
        }
    });

    dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
    });

    dropZone.addEventListener('dragleave', (event) => {
        event.preventDefault();
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', async (event) => {
        if (!isUploading) {
            isUploading = true;
            // Prevent default action
            event.preventDefault();
            dropZone.classList.remove('dragover');
            dropZone.classList.add("loading-icon");

            const files = event.dataTransfer.files;

            // Create a FormData object to send files
            const formData = new FormData();
            for (const file of files) {
                formData.append('files[]', file); // Append each file to the FormData object
            }

            try {

                // Send POST request to server
                const response = await fetch('/data_upload', {
                    method: 'POST',
                    body: formData
                });

                const status = response.status;
                const resJson = await response.json();

                if (status === 201) {
                    showToast(resJson.message, false);
                } else {
                    showToast(resJson.message, true);
                }

                dropZone.classList.remove("loading-icon");
                isUploading = false;

            } catch (error) {
                isUploading = false;
                console.error('Error:', error);
            }

            isUploading = false;
        }
    });

    /*
     Prevent default behavior when a file is dropped anywhere on the document.
     Default behavior example: drag&drop txt into chrome and it opens it in a new tab.
     */
    document.addEventListener('dragover', (event) => {
        event.preventDefault();
    });

    document.addEventListener('drop', (event) => {
        event.preventDefault();
    });
}