import {addImportEventListener} from "./handler.js";

let navBar;

// Create lists for buttons
const buttonArray = [
    {
        link: '/',
        icon: '../assets/home.png',
        text: 'Dashboard'
    },
    {
        link: '/websiteManagementPage.html',
        icon: '../assets/management_icon.png',
        text: 'Verwalten',
        id:   'manage-button'
    },
    {
        link: '/websiteComparisonPage.html',
        icon: '../assets/compare_icon.png',
        text: 'Vergleichen'
    },
    {
        link: '#',
        icon: '../assets/upload.png',
        text: 'Importieren',
        id: 'import-button'
    }
];

const bottomButtonArray = [
    {
        link: '/manualPage.html',
        icon: '../assets/git-img.png',
        text: 'Handbuch'
    },
    {
        link: '/settingsPage.html',
        icon: '../assets/settings-img.png',
        text: 'Einstellungen'
    },
];

function makeMenuItemsActive() {
    const currentPathname = window.location.pathname;
    const links = document.querySelectorAll('.links');
    links.forEach(link => {
        const linkPathname = link.dataset.href;
        if (linkPathname === currentPathname || (currentPathname === "/" && linkPathname === "/mainPage.html") || linkPathname === currentPathname.slice(1)) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Populates a div of class 'nav-bar'
export function populateNavBar() {
    navBar = document.querySelector('.nav-bar');
    if (!navBar) {
        console.error('Error: No .nav-bar element found.');
        return;
    }

    // Create logo box
    const logoBox = document.createElement('a');
    logoBox.href = '/'; // Link to dashboard
    logoBox.classList.add('logo-box');
    const logoImg = document.createElement('img');
    logoImg.id = "logo-box";
    logoImg.src = '../assets/Schleswig-Holstein_logo_b.png';
    logoImg.alt = 'Logo';
    logoImg.classList.add('logo-img');

    if (localStorage.getItem("mode") === "black") {
        logoImg.style.filter = 'brightness(0) invert(1)';
        logoBox.style.backgroundColor = "#151b2C";
    } else {
        logoBox.style.backgroundColor = "#ffffff";
    }

    logoBox.appendChild(logoImg);
    const title = document.createElement('p');
    title.textContent = 'JuMi';
    title.classList.add('logo-text');
    logoBox.appendChild(title);
    navBar.appendChild(logoBox);

    // Create wrapper for buttons
    const buttonWrapper = document.createElement('div');
    buttonWrapper.classList.add('buttons');
    // Create buttons
    buttonArray.forEach(button => createButton(button, buttonWrapper));
    navBar.appendChild(buttonWrapper);


    // Create list for bottom buttons
    const bottomButtonWrapper = document.createElement('div');
    bottomButtonWrapper.classList.add('buttons-bottom');
    bottomButtonArray.forEach(button => createButton(button, bottomButtonWrapper));
    navBar.appendChild(bottomButtonWrapper);

    // Make menu items active
    makeMenuItemsActive();
}

function createButton(button, parentElement) {
    const buttonElement = document.createElement('button');
    buttonElement.dataset.href = button.link;
    buttonElement.onclick = function() {
        window.location.href = button.link;
    };
    buttonElement.classList.add('links');
    if(button.id) {
        buttonElement.id = button.id;
    }

    const icon = document.createElement('img');
    icon.src = button.icon;
    icon.alt = 'Icon';
    icon.classList.add('nav-icon');
    buttonElement.appendChild(icon);

    const text = document.createTextNode(button.text);
    buttonElement.append(text);

    parentElement.appendChild(buttonElement);
}


function buildLoginPopup() {
    const loginModal = document.getElementById('loginModal');

    loginModal.innerHTML = `
        <div class="modal-content">
            <span class="close" id="close-login">&times;</span>
            <form class="login-form" action="/login" method="post">
                <label for="username">Benutzername:</label>
                <input type="text" class="input-field" id="username" name="username" required>
                <label for="password">Passwort:</label>
                <input type="password" class="input-field" id="password" name="password" required>
                <button type="submit">Bestätigen</button>
            </form>
        </div>
    `;
}

function buildUploadPopup() {
    const uploadModal = document.getElementById('uploadModal');

    uploadModal.innerHTML = `
        <div class="modal-content">
            <span class="close" id="close-upload">&times;</span>
            <h2 id="fileUploadText">Datei(en) hineinziehen</h2>
            <div id="drag_drop_zone" class="drag-drop-area">
                <div class="drag-drop-inner">
                    <div class="file-upload-button">
                        <input type="file" id="file_field_input" multiple>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function populateLoginElements() {
    buildLoginPopup();
    buildUploadPopup();
    addImportEventListener();
}

export function buildFooter() {
    const footer = document.getElementsByClassName("footer")[0];

    if (!footer) {
        console.error('Error: No .footer element found. Maybe the data is missing.');
        return;
    }

    const waves = document.createElement('div');
    waves.classList.add('waves');

    for (let i = 1; i <= 4; i++) {
        const wave = document.createElement('div');
        wave.classList.add('wave');
        wave.id = `wave${i}`;
        waves.appendChild(wave);
    }

    const menu = document.createElement('div');
    menu.classList.add('menu');

    const menuLinks = [
        {
            href: 'https://www.schleswig-holstein.de/DE/landesregierung/ministerien-behoerden/II/ii_node.html',
            text: 'Justizministerium'
        },
        {href: 'https://www.fh-kiel.de/startseite/', text: 'Fachhochschule Kiel'},
        {href: '/contactPage.html', text: 'Kontakt'}
    ];

    menuLinks.forEach(linkData => {
        const link = document.createElement('a');
        link.classList.add('menu__link');
        link.href = linkData.href;
        link.textContent = linkData.text;
        menu.appendChild(link);
    });

    const copyright = document.createElement('p');
    copyright.innerHTML = '&copy;2024 JUMI Dashboard | Im Auftrag der FH-Kiel';

    footer.appendChild(waves);
    footer.appendChild(menu);
    footer.appendChild(copyright);
}