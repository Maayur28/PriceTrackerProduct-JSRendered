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
    await page.waitForSelector(".pdp-title");

    // Scrape the product details
    const title = await page.$eval(".pdp-title", (element) =>
      element.textContent.trim()
    );
    const price = await page.$eval(".pdp-price", (element) =>
      element.textContent.trim()
    );

    // Log the scraped data
    console.log("Title:", title);
    console.log("Price:", price);

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
