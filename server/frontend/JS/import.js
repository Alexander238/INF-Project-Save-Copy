let location = "/";

// Funktion zum Initialisieren des Upload-Popups
function initUploadPopup() {
    let closeUploadButton = document.getElementById("close-upload");
    closeUploadButton.addEventListener('click', closeUploadPopup);
}

function initLogin() {
    const modal = document.getElementById('loginModal');
    const importBtn = document.getElementById('import-button');
    const span = document.getElementById('close-login');
    const manageBtn = document.getElementById('manage-button');

    if (importBtn) {
        importBtn.onclick = function() {
            if (!checkLoginStatus()) {
                modal.style.display = 'flex';
                document.getElementById("username").focus();
            } else {
                openUploadPopup();
            }
            localStorage.setItem('nextAction', 'import');
        };
    }

    if (manageBtn) {
        manageBtn.onclick = function() {
            if (!checkLoginStatus()) {
                modal.style.display = 'flex';
                document.getElementById("username").focus();
            } else {
                window.location.href = '/websiteManagementPage.html';
            }
            localStorage.setItem('nextAction', 'manage');
        };
    }

    if (span) {
        span.onclick = function() {
            modal.style.display = 'none';
        };
    }

    document.body.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            event.preventDefault();
            modal.style.display = 'none';
        }
    });

    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Öffne das Upload-Popup
function openUploadPopup() {
    const uploadModal = document.getElementById('uploadModal');
    if (checkLoginStatus()) {
        uploadModal.style.display = 'flex';
        initUploadPopup()
    } else {
        alert('Bitte melden Sie sich zuerst an.');
    }
}

function handleLoginSuccess() {
    sessionStorage.setItem('isLoggedIn', 'true'); // Store login status in sessionStorage
    const nextAction = localStorage.getItem('nextAction');
    if (nextAction === 'import') {
        openUploadPopup();
    } else if (nextAction === 'manage') {
        window.location.href = '/websiteManagementPage.html';
    }
}

function checkLoginStatus() {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    if (!isLoggedIn) {
        return false;
    }
    return true;
}

function closeUploadPopup() {
    let uploadModal = document.getElementById('uploadModal');
    uploadModal.style.display = 'none';
    window.location.hash = '';
    window.location.href = '/';
}

export function initImport(loc) {
    initLogin();

    if (loc !== undefined) {
        location = loc;
    }

    document.addEventListener('click', function(event) {
        const uploadModal = document.getElementById('uploadModal');
        const closeUploadButton = document.getElementById('close-upload');
        if (event.target === uploadModal || event.target === closeUploadButton) {
            closeUploadPopup();
        }
    });

    $(document).ready(function() {
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);

        if (urlParams.has('login') && urlParams.get('login') === 'unsuccessful') {
            alert('Login-Daten waren inkorrekt!');
        } else if (urlParams.has('admin')) {
            handleLoginSuccess();
        }
    });
}
