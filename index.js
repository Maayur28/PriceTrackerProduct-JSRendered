const express = require("express");
const puppeteer = require("puppeteer");
const axios = require("axios");
const cheerio = require("cheerio");
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

const initialisePuppeteer = async () => {
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
  let $ = cheerio.load(await page.content());
  await browser.close();
  return $;
};

const scrapMyntraPriceOnly = ($) => {
  //price
  let price = null;
  if ($(".pdp-price > strong").html() != null) {
    price = $(".pdp-price > strong").html().trim();
  }
  if (price.length > 0 && price.charAt(0) == "₹") {
    price = price.slice(1);
  }
  return price;
};

app.get("/scrape", async (req, res) => {
  try {
    let retry = 0;
    console.log("IS_PRODUCTION: ", IS_PRODUCTION);
    do {
      console.log("Retrying...", retry);
      let $ = await initialisePuppeteer();
      if ($ && $(".pdp-name").html() != null) {
        let price = await scrapMyntraPriceOnly($);
        if (price != null) {
          retry = 100;
          console.log(price);
          res.json(price).status(200);
        } else {
          console.log("price null !!! retrying....", retry);
          await delay(2000);
          retry++;
        }
      } else {
        console.log("$ is null !!! retrying....", retry);
        await delay(2000);
        retry++;
      }
    } while (retry <= 5);
  } catch (error) {
    console.log(error.message);
  }
});

app.get("/", (req, res) => {
  res.send("Render Puppeteer server is up and running!");
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

module.exports = app;
