const puppeteer = require("puppeteer");
const getUserAgent = require("./utilities/useragents");
const cheerio = require("cheerio");
require("dotenv").config();

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

const scrapeLogic = async (res) => {
  let response = "dummy";
  const browser = await puppeteer.launch({
    args: ["--disable-setuid-sandbox", "--no-sandbox", "--no-zygote"],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  try {
    let retry = 0;
    do {
      const page = await browser.newPage();
      let URL =
        "https://www.myntra.com/sports-shoes/puma/puma-men-black-zeta-mesh-running-shoes/14463342/buy";
      let userAgent = getUserAgent();
      await page.setUserAgent(userAgent);
      await page.goto(URL, {
        waitUntil: "domcontentloaded",
      });
      let $ = cheerio.load(await page.content());
      if ($ && $(".pdp-name").html() != null) {
        response = await fetchMyntra($, URL, "MYNTRA");
        retry = 10;
      } else {
        await delay(2000);
        retry++;
      }
    } while (retry <= 5);
  } catch (e) {
    console.error(e.message);
    res.send(`Something went wrong while running Puppeteer: ${e}`);
  } finally {
    console.log("finally");
    res.json({ response: response }).status(200);
    await browser.close();
  }
};

const fetchMyntra = async ($, URL, domain) => {
  let response = {};

  //title
  response.title = $(".pdp-name").html().trim();

  //price
  let price = {};
  price.originalPrice = $(".pdp-mrp > s").text().trim();
  price.discountPrice = $(".pdp-price > strong").html().trim();
  if (price.originalPrice.length > 0 && price.originalPrice.charAt(0) == "₹") {
    price.originalPrice = price.originalPrice.slice(1);
  }
  if (price.discountPrice.length > 0 && price.discountPrice.charAt(0) == "₹") {
    price.discountPrice = price.discountPrice.slice(1);
  }
  response.price = price;

  //image
  let imageHtml = cheerio.load(
    $("div.image-grid-col50:nth-of-type(1) > .image-grid-imageContainer").html()
  );
  response.image = imageHtml(".image-grid-image")
    .css("background-image")
    .replace(/(url\(|\)|")/g, "");

  //badge
  if (
    $(".xcelerator-pdpXceleratorImageTag").text() != "" &&
    $(".xcelerator-pdpXceleratorImageTag").text() != null &&
    $(".xcelerator-pdpXceleratorImageTag").text() != undefined
  ) {
    response.badge = $(".xcelerator-pdpXceleratorImageTag").text();
  }

  //rating
  let rate = {};
  let rating = $(".index-overallRating").text();
  rate.ratingCount = rating.split("|")[0] + " out of 5 stars";
  rate.totalRated = rating.split("|")[1];
  response.rating = rate;

  //domain
  response.domain = domain;

  //url
  response.url = URL;

  return response;
};

module.exports = { scrapeLogic };
