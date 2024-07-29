async function getData(src){
    return await fetch(src).then(res => res.json());
}

export async function getTopTableData(type, amount, year, month, safe, ack) {
    const path = `/topTable/${type}/${amount}/${year}/${month}/${safe}/${ack}`;
    return await getData(path);
}

export async function getWebsiteSearchData(type, url, start = "", end = ""){
    if (start === ""){
        return await getData(`/websiteSearch/${type}/${url}`);
    } else {
        return await getData(`/websiteSearch/${type}/${url}/${start}/${end}`);
    }
}

export async function getSums(year = "", month = ""){
    if(year === "" && month === "") {
        return await getData("/sums");
    }
    return await getData(`/sums/${year}/${month}`);
}

/* Returns the most number of websites in a month */
export async function getTopX() {
    const data = await getData("/topX");
    if(data.length === 0){
        return 0;
    }
    return data[0]["Top"];
}

export async function getAllDatesOfDB(){
    const path = "/allDates";
    return await getData(path);
}

export async function getAllWebsites(){
    const path = "/allWebsites"
    return await getData(path);
}

export async function getWebsiteData(url) {
    const path = `/website/${url}`;
    const returnedData = await getData(path);
    if(returnedData.length === 0){
        return 0;
    }
    return returnedData;
}

export async function getPartialWebsite(url) {
    const path = `/partialWebsite/"${url}"`; // Wrap url in quotes to be able to search for ".de" etc.
    return await getData(path);
}

export async function getAllMonths(id) {
    const path = `/websiteDates/${id}`;
    return await getData(path);
}

export async function getNewWebsites(year, month) {
    const path = `/newWebsites/${year}/${month}`
    return await getData(path);
}

export async function getWebsiteGeneralData(id, date) {
    const path = `websiteData/${id}/${date}`;
    return await getData(path);
}

export async function getWebsiteOccurrencesData(id) {
    const path = `/websiteOccurrences/${id}`;
    return await getData(path);
}
export const updateIsSaveWebsite = async (id, value) =>
    fetch(`/updateIsSave/${id}/${value}`, { method: 'POST' })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update isSave value.');
            }
            return response.json();
        })
        .catch(error => {
            console.error('Error updating isSave value:', error);
            throw error;
        });

function booleanToNumber(value){
    if (value) {
        return 1;
    } else {
        return 0;
    }
}

export async function updateCommentWebsite(ID, value) {
    if (value === "") {
        value = "NULL-EMPTY";
    }
    const encodedValue = encodeURIComponent(value);

    return fetch(`/updateCommentWebsite/${ID}/${encodedValue}`, {method: 'POST',})
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update comment value.');
            }
            return response.json();
        })
        .catch(error => {
            console.error('Error updating comment value:', error);
            throw error;
        });
}

export async function deleteEntryOfMonthAndYear(month, year) {
    return fetch(`/deleteEntry/${month}/${year}`, {method: 'POST'})
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to delete entry.');
            }
            return response.json();
        })
        .catch(error => {
            console.error('Error deleting entry', error);
            throw error;
        });
}

export async function updateIsAcknowledgedWebsite(id, value){
    value = booleanToNumber(value);

    return fetch(`/updateIsAcknowledged/${id}/${value}`, { method: 'POST' })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to update isAcknowledged value.');
            }
            return response.json();
        })
        .catch(error => {
            console.error('Error updating isAcknowledged value:', error);
            throw error;
        });
}

export async function getListOfAllWebsites(start, end) {
    return await getData(`/websiteTimeframeData/${start}/${end}`);
}

export async function getCompareData(type, url, start, end) {
    return await getData(`websiteSearch/${type}/${url}/${start}/${end}`);
}

export function objectArrayToArray(given_array, key, isDistinct = false) {
    const output = [];
    given_array.forEach(elem => {
        if(isDistinct){
            // Only push if the entry does not already exist
            if (!output.includes(elem[key])) {
                output.push(elem[key]);
            }
        }
        else {
            output.push(elem[key]);

        }
    });
    return output;
}

export function checkDatabase() {
    return fetch('/checkDatabase')
        .then(response => {
            return response.ok;
        })
        .catch(error => {
            console.error('Error checking database:', error);
            throw error;
        });
}