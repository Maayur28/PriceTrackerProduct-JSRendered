const express = require("express");
const puppeteer = require("puppeteer");
const axios = require("axios");
const app = express();

require("dotenv").config();

const PORT = process.env.PORT || 4000;

const IS_PRODUCTION = process.env.NODE_ENV === "production";

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

const getBrowser = async () =>
  IS_PRODUCTION
    ? // Connect to browserless so we don't run Chrome on the same hardware in production
      puppeteer.connect({
        browserWSEndpoint: "wss://browserless-production-1385.up.railway.app/",
      })
    : // Run the browser locally while in development
      puppeteer.launch();

const fetchUserAgent = async () => {
  let response = await axios.get(
    `${process.env.DOMAIN_FETCH_CONFIDENTIAL_INFO_IOT}${process.env.IOT_API_KEY}/${process.env.KEY_USERAGENT}`
  );
  await delay(1000);
  if (
    response == null ||
    response == undefined ||
    response.status != 200 ||
    response.data == null ||
    response.data == undefined ||
    response.data.length < 20
  ) {
    response = await axios.get(
      `${process.env.DOMAIN_FETCH_CONFIDENTIAL_INFO_IAM}${process.env.IAM_API_KEY}/${process.env.KEY_USERAGENT}`
    );
    await delay(1000);
  }
  if (response == null || response == undefined) {
    throw new Error("Invalid Useragents");
  }
  return response.data;
};

const getUserAgent = (maxLimit) => {
  let rand = Math.floor(Math.random() * maxLimit);
  return rand;
};

app.get("/scrape", async (req, res) => {
  try {
    // Launch Puppeteer with the Railway Chrome instance
    const browser = await getBrowser();

    let useragent = await fetchUserAgent();

    let userAgent = useragent[getUserAgent(useragent.length)];
    // Create a new page
    const page = await browser.newPage();

    await page.setUserAgent(userAgent);
    // Example: Navigate to a website and fetch the title
    await page.goto(
      "https://www.myntra.com/sports-shoes/puma/puma-men-black-zeta-mesh-running-shoes/14463342/buy",
      {
        waitUntil: "domcontentloaded",
      }
    );

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
    res.json(title).status(200);
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
