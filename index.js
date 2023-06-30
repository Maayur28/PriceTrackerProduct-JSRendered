const express = require("express");
const puppeteer = require("puppeteer");
const app = express();

require("dotenv").config();

const PORT = process.env.PORT || 4000;

app.get("/scrape", async (req, res) => {
  try {
    // Launch Puppeteer with the Railway Chrome instance
    const browser = await puppeteer.connect({
      browserWSEndpoint: `wss://${process.env.RAILWAY_STATIC_URL}/devtools/browser`,
    });

    // Create a new page
    const page = await browser.newPage();

    // Example: Navigate to a website and fetch the title
    await page.goto(
      "https://www.myntra.com/sports-shoes/puma/puma-men-black-zeta-mesh-running-shoes/14463342/buy"
    );
    const title = await page.title();
    console.log("Page title:", title);

    // Close the browser
    await browser.close();
  } catch (error) {
    console.error("An error occurred:", error.message);
  }
});

app.get("/", (req, res) => {
  res.send("Render Puppeteer server is up and running!");
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

module.exports = app;
