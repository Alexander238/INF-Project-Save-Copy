import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url'; 
import { dirname } from 'path'
import multer from 'multer'; // For file uploads
import { marked } from 'marked'; // For markdown parsing
import fs from "fs";

import {
   getAccesses,
   getTraffic,
   getWebsiteTrafficByName,
   getWebsiteAccessesByName,
   getWebsiteTrafficByNameInTimeframe,
   getWebsiteAccessesByNameWithTimeFrame,
   getUnacknowlegdedWebsites,
   getUnacknowledgedWebsitesInTimeframe,
   loginUser,
   getSumsOfYearMonth,
   getNewWebsites,
   getSumsOfYearMonthWithTimeframe,
   updateIsSaveInWebsite,
   getAllWebsites,
   updateIsAcknowledgedInWebsite,
   getMonthsOfWebsite,
   getDataOfWebsite,
   getWebsiteOccurrences,
   getWebsiteAccessesAndTrafficByTimeframe,
   getTopAccessesInTimeframe,
   getTopTrafficInTimeframe,
   getAllDates,
   getNumberOfEntriesForEachMonth,
   getAllDataOfWebsite,
   getApiDataByUrl,
   updateCommentOnWebsite,
   getWebsiteNamesByPartialURL,
   updateLastCheckedDate,
   deleteEntryOfMonthInYear,
   createAdminUser,
   getApiLastChecked,
   checkDatabaseRunning,
} from './Database.js';

import { parseFormData, saveToDatabase, hashAdminStatus, scanUrl} from './Functions.js';

const app = express();

// Custom renderer for marked to add IDs to headings
const renderer = new marked.Renderer();
renderer.heading = (text, level) => {
   const escapedText = text.toLowerCase().replace(/[^\w]+/g, '-');
   return `
        <h${level} id="${escapedText}">
            ${text}
        </h${level}>
    `;
};

// Set the custom renderer for marked
marked.use({ renderer });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const frontEndFilePath = path.join(__dirname, '../frontend');
const upload = multer();

app.use(express.static(frontEndFilePath));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.listen(3000, () => {
   console.log('Server is running at http://localhost:3000/');
   createAdminUser();
});

/**** ROUTES ****/

//! GET
app.get('/', (req, res) => {
   res.sendFile(path.join(frontEndFilePath, 'HTML/mainPage.html'));
});

app.get('/singleWebsite.html', (req, res) => {
   res.sendFile(path.join(frontEndFilePath, 'HTML/singleWebsite.html'));
});

app.get('/settingsPage.html', (req, res) => {
   res.sendFile(path.join(frontEndFilePath, 'HTML/settingsPage.html'));
});

app.get('/contactPage.html', (req, res) => {
   res.sendFile(path.join(frontEndFilePath, 'HTML/contactPage.html'));
});

app.get('/manualPage.html', (req, res) => {
   res.sendFile(path.join(frontEndFilePath, 'HTML/manualPage.html'));
});

app.get('/websiteManagementPage.html', (req, res) => {
   res.sendFile(path.join(frontEndFilePath, 'HTML/websiteManagementPage.html'));
});

app.get('/websiteComparisonPage.html', (req, res) => {
   res.sendFile(path.join(frontEndFilePath, 'HTML/websiteComparisonPage.html'));
});

// Neue Route zum Scannen einer URL (um aus den Frontend auf die API zuzugreifen)
app.post('/api/scan-url', async (req, res) => {
   const { url, websiteId } = req.body;
   if (!url || !websiteId) {
      return res.status(400).json({ error: 'URL and Website ID are required' });
   }
   try {
      const result = await scanUrl(url, websiteId);
      res.json(result);
   } catch (error) {
      res.status(500).json({ error: 'Error scanning URL' });
   }
});

app.get('/api/get-api-data', async (req, res) => {
   const { url } = req.query;
   if (!url) {
      return res.status(400).json({ error: 'URL is required' });
   }
   try {
      const data = await getApiDataByUrl(url);
      res.json(data);
   } catch (error) {
      console.error('Error fetching API data:', error);
      res.status(500).json({ error: 'Error fetching API data' });
   }
});

app.post('/api/update-last-checked', async (req, res) => {
   const { id, date } = req.body;
   try {
      await updateLastCheckedDate(id, date);
      res.json({ message: 'Last checked date updated successfully' });
   } catch (error) {
      console.error('Error updating last checked date:', error);
      res.status(500).json({ error: 'Error updating last checked date' });
   }
});

app.get('/api/get-last-checked', async (req, res) => {
   const { url } = req.query;
   if (!url) {
      return res.status(400).json({ error: 'URL is required' });
   }
   try {
      const data = await getApiLastChecked(url);
      res.json(data);
   } catch (error) {
      console.error('Error fetching API data:', error);
      res.status(500).json({ error: 'Error fetching API data' });
   }
});

// Get all accesses and traffic for a website
app.get("/website/:url", async (req, res) => {
   const url = req.params.url;

   try {
      const websiteData = await getAllDataOfWebsite(url);
      res.send(websiteData);
   } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Internal Server Error" });
   }
});

// Get all websites that match a partial url
app.get("/partialWebsite/:url", async (req, res) => {
    let url = req.params.url;
    url = url.replace(/"/g, "");

    try {
        const websiteData = await getWebsiteNamesByPartialURL(url);
        res.send(websiteData);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Get handbook as markdown
app.get('/markdown', (req, res) => {
   const markdownFilePath = path.join(frontEndFilePath, 'assets/handbuch.md');
   fs.readFile(markdownFilePath, 'utf8', (err, data) => {
      if (err) {
         return res.status(500).send('Error reading Markdown file');
      }
      const htmlContent = marked(data);
      res.send(htmlContent);
   });
});



//! POST

// POST route to handle file upload
app.post("/data_upload", upload.array('files[]'), async (req, res) => {
   const files = req.files;

   try {
      const entriesMessage = await parseFormData(files);

      if (entriesMessage[0] === false) {
         const errorMessage = entriesMessage[1];

         res.status(501).json({ message: errorMessage });
         return;
      }

      const entries = Object.entries(entriesMessage[1]);
      for (let [_, dataFromFile] of entries) {
         await saveToDatabase(dataFromFile);
      }

      res.status(201).json({ message: "Upload war erfolgreich!" });
   } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Upload nicht erfolgreich: Interner Server Error" });

   }
});

// Login
app.post('/login/:path?', async (req, res) => {
   const { username, password } = req.body;
   let path = req.params.path;

   try {
      const users = await loginUser(username, password);

      if (users.length > 0) {
         const user = users[0];
         const isAdminHash = hashAdminStatus(user.isAdmin === 1);

         if (path !== undefined) {
            res.redirect(`/${path}.html?admin=${isAdminHash}`);
         } else {
            res.redirect(`/?admin=${isAdminHash}`);
         }
      } else {
         if (path !== undefined) {
            res.redirect(`/${path}.html?login=unsuccessful`);
         } else {
            res.redirect(`/?login=unsuccessful`);
         }
      }
   } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
   }
});


// topTable
app.get("/topTable/:type/:amount/:year/:month/:safe/:ack", async (req, res) => {
   const type = req.params.type;

   let am = req.params.amount;
   const amount = (am > 30) ? 30 : am;

   const year = req.params.year; // example: 2001
   const month = req.params.month; // example: 01

   const safe = req.params.safe; // example: 1 = sicher, 2 = unsicher, 3 = "Nicht angegeben"
   const ack = req.params.ack; // example: 1 = true, 2 = false

   if(type.toLowerCase() === "accesses") {
      const accesses = await getAccesses(amount, year, month, safe, ack);
      res.send(accesses);
   }
   else if (type.toLowerCase() === "traffic") {
      const traffic = await getTraffic(amount, year, month, safe, ack);
      res.send(traffic);
   }
   else {
      res.status(500).send("ERROR: Invalid input");
   }
});

app.get("/topTableTimeframe/:type/:amount/:timeframeStart/:timeframeEnd?", async (req, res) => {
   const type = req.params.type;

   const amount = req.params.amount;

   const timeFrameStart = req.params.timeframeStart; // example: 2001-01
   const timeframeEnd = req.params.timeframeEnd; // example: 2002-01

   if(type.toLowerCase() === "accesses") {
      const topAccesses = await getTopAccessesInTimeframe(timeFrameStart, timeframeEnd, amount);
      res.send(topAccesses);
   }
   else if (type.toLowerCase() === "traffic") {
      const accesses = await getTopTrafficInTimeframe(timeFrameStart, timeframeEnd, amount);
      res.send(accesses);
   }
   else {
      res.status(500).send("ERROR: Invalid input");
   }
});

// Website search by URl and optional timeframe
app.get("/websiteSearch/:type/:url/:timeframeStart?/:timeframeEnd?", async (req, res) => {
   const type = req.params.type; // example: accesses
   const url = req.params.url; // example(this all works): microsoft | mic | microsoft.de

   const timeFrameStart = req.params.timeframeStart; // example: 2001-01
   const timeframeEnd = req.params.timeframeEnd; // example: 2002-01

   try {
      if (type.toLowerCase() === "accesses"){
         if (timeFrameStart !== undefined){
            const websiteData = await getWebsiteAccessesByNameWithTimeFrame(url, timeFrameStart, timeframeEnd);
            res.send(websiteData);
         } else {
            const websiteData = await getWebsiteAccessesByName(url);
            res.send(websiteData);
         }
      } else if (type.toLowerCase() === "traffic"){
         if (timeFrameStart !== undefined) {
            const websiteData = await getWebsiteTrafficByNameInTimeframe(url, timeFrameStart, timeframeEnd);
            res.send(websiteData);
         } else {
            const websiteData = await getWebsiteTrafficByName(url);
            res.send(websiteData);
         }
      }
   } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "ERROR: Invalid input"});
   }
});

// New websites // new websites and timeframe
app.get("/unacknowledgedWebsites/:timeframeStart?/:timeframeEnd?", async (req, res) => {
   const timeframeStart = req.params.timeframeStart; // example: 2001-01
   const timeframeEnd = req.params.timeframeEnd; // example: 2002-01

   try {
      // timeframeEnd is optional if timeframeStart was given.
      if (timeframeStart !== undefined){
         const newWebsites = await getUnacknowledgedWebsitesInTimeframe(timeframeStart, timeframeEnd);
         res.send(newWebsites);
      } else {
         const newWebsites = await getUnacknowlegdedWebsites();
         res.send(newWebsites);
      }
   } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Internal Server Error" });
   }
});

// Get new websites
app.get("/newWebsites/:year?/:month?", async (req, res) => {
   const year = req.params.year; // example: 2001
   const month = req.params.month; // example: 01

   try {
      const newWebsites = await getNewWebsites(year, month);
      res.send(newWebsites);
   } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Internal Server Error" });
   }
});

app.get("/allWebsites", async (req, res) => {
   try {
      const allWebsites = await getAllWebsites();
      res.send(allWebsites);
   } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Internal Server Error" });
   }
})

// Sums of accesses and traffic for given year and month
app.get("/sums/:year?/:month?", async (req, res) => {
   const year = req.params.year; // example: 2001
   const month = req.params.month; // example: 01

   try {
      if(year === undefined) {
         const allDates = await getAllDates();
         res.send(allDates);
      }
      else {
         const sums = await getSumsOfYearMonth(year, month);
         res.send(sums);
      }
   } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Internal Server Error" });
   }
});

// end is optional. If no end given, today's date is chosen
app.get("/timeframeSums/:start/:end?", async (req, res) => {
   const start = req.params.start; // example: 2001-01
   const end = req.params.end; // example: 2002-01

   try {
      const sums = await getSumsOfYearMonthWithTimeframe(start, end);
      res.send(sums);
   } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Internal Server Error" });
   }
});
app.get("/websiteDates/:id", async (req, res ) => {
   const id = req.params.id;

   try {
      const sums = await getMonthsOfWebsite(id);
      res.send(sums);
   } catch (error) {
      console.error("Error:", error);
      res.status(500).json({message: "Internal Server Error"});
   }
});

app.get("/allDates", async (req, res ) => {
   const id = req.params.id;

   try {
      const dates = await getAllDates();
      res.send(dates);
   } catch (error) {
      console.error("Error:", error);
      res.status(500).json({message: "Internal Server Error"});
   }
});

app.get("/websiteTimeframeData/:timeframeStart/:timeframeEnd?", async (req, res) => {
   const timeFrameStart = req.params.timeframeStart;
   const timeframeEnd = req.params.timeframeEnd;

   try {
      const websiteData = await getWebsiteAccessesAndTrafficByTimeframe(timeFrameStart, timeframeEnd);
      res.send(websiteData);
   } catch (error) {
      console.error("Error:", error);
      res.status(500).json({message: "ERROR: All Websites can't be retrieved"});
   }
});

// get data about a website by id and date.
app.get("/websiteData/:id/:date", async (req, res ) => {
   const id = req.params.id;
   const date = req.params.date; // example: 2017-01

   try {
      const data = await getDataOfWebsite(id, date);
      res.send(data);
   } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Internal Server Error" });
   }
});

// get websites occurrences in the database.
app.get("/websiteOccurrences/:id", async (req, res ) => {
   const id = req.params.id;

   try {
      const occurrences = await getWebsiteOccurrences(id);
      res.send(occurrences);
   } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Internal Server Error" });
   }
});

// Get number of entries in accesses and traffic for a month
app.get("/topX", async (req, res) => {
   try {
      const topX = await getNumberOfEntriesForEachMonth();
      res.send(topX);
   } catch (error) {
      console.log("Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
   }
});

// compare the occurrences of two websites by their IDs in the database.

//! UPDATE DATATABLES

// Update isSave field in Websites
app.post("/updateIsSave/:id/:value", async (req, res) => {
   const id = req.params.id;
   const value = req.params.value;

   try {
      await updateIsSaveInWebsite(id, value);
      res.status(201).json({ message: "Upload was successful" });
   } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Internal Server Error" });
   }
});

// Update isAcknowledged field in Websites
app.post("/updateIsAcknowledged/:id/:value", async (req, res) => {
   const id = req.params.id;
   const value = req.params.value;

   try {
      await updateIsAcknowledgedInWebsite(id, value);
      res.status(201).json({ message: "Upload was successful" });
   } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Internal Server Error" });
   }
});

app.post("/updateCommentWebsite/:id/:value", async (req, res) => {
   const id = req.params.id;
   let value = req.params.value;

   try {
      value = decodeURIComponent(value);

      if (value === "NULL-EMPTY"){
         value = "";
      }

      await updateCommentOnWebsite(id, value);
      res.status(201).json({ message: "Update was successful" });
   } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Internal Server Error" });
   }
});

app.post("/deleteEntry/:month/:year", async (req, res) => {
    const month = req.params.month;
    const year = req.params.year;

    try {
        await deleteEntryOfMonthInYear(month, year);
        res.status(201).json({ message: "Delete was successful" });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.get("/checkDatabase", async (req, res) => {
   try {
      await checkDatabaseRunning();
      res.status(200).json({ message: "Database is running" });
   }
   catch (error) {
      console.error("Error:", error);
      res.status(500).json({ message: "Database is not running" });
   }
});