const puppeteer = require("puppeteer");
const getUserAgent = require("./utilities/useragents");
const cheerio = require("cheerio");
require("dotenv").config();

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

const scrapeLogic = async (URL, res) => {
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
      console.log("Retyring... " + retry);
      let domain = URL.replace(/.+\/\/|www.|\..+/g, "");
      if (domain != null || domain != undefined || domain != "") {
        domain = domain.toUpperCase();
      } else {
        let err = new Error();
        err.message = "The url/link provided is invalid";
        err.status = 403;
        throw err;
      }
      const page = await browser.newPage();
      let userAgent = getUserAgent();
      await page.setUserAgent(userAgent);
      await page.goto(URL);
      console.log("Scrapping..." + domain);
      let $ = null;
      switch (domain) {
        case "FLIPKART":
          await page.goto(URL, {
            waitUntil: "domcontentloaded",
          });
          $ = cheerio.load(await page.content());
          console.log("Response..." + $ && $(".B_NuCI").html());
          if ($ && $(".B_NuCI").html() != null) {
            response = await fetchFlipkart($, URL, domain);
            retry = 10;
          } else {
            await delay(2000);
            retry++;
          }
          break;
        case "MYNTRA":
          await page.goto(URL);
          await page.waitForSelector(".pdp-name");
          $ = cheerio.load(await page.content());
          console.log("Response..." + $ && $(".pdp-name").html());
          if ($ && $(".pdp-name").html() != null) {
            response = await fetchMyntra($, URL, domain);
            retry = 10;
          } else {
            await delay(2000);
            retry++;
          }
        default:
          break;
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

const fetchFlipkart = async ($, URL, domain) => {
  let response = {};
  //title
  response.title = $(".B_NuCI").text().trim();

  //price
  let price = {};

  if ($("._16Jk6d").text() != null) {
    price.discountPrice = $("._16Jk6d").text().trim();
  }
  if (price.discountPrice.length > 0) {
    price.discountPrice = price.discountPrice.replaceAll(",", "");
    if (price.discountPrice.charAt(0) == "₹") {
      price.discountPrice = price.discountPrice.slice(1);
    }
  }

  if ($("._2p6lqe").text() != null) {
    price.originalPrice = $("._2p6lqe").text().trim();
  } else {
    price.originalPrice = price.discountPrice;
  }
  if (price.originalPrice.length > 0 && price.originalPrice.charAt(0) == "₹") {
    price.originalPrice = price.originalPrice.slice(1);
    price.originalPrice = price.originalPrice.replaceAll(",", "");
  }

  if (
    price.originalPrice == "" ||
    price.originalPrice == null ||
    price.originalPrice == undefined
  ) {
    if (price.discountPrice != undefined)
      price.originalPrice = price.discountPrice;
  }

  if (
    price.discountPrice == "" ||
    price.discountPrice == null ||
    price.discountPrice == undefined
  ) {
    if (price.originalPrice != undefined)
      price.discountPrice = price.originalPrice;
  }

  if (price.discountPrice) response.price = price;

  //image

  if ($("._2amPTt._3qGmMb").html() != null) {
    response.image = $("._2amPTt._3qGmMb").attr().src;
  } else if ($("._2r_T1I._396QI4").html() != null) {
    response.image = $("._2r_T1I._396QI4").attr().src;
  } else {
    response.image = null;
  }

  //badge
  response.badge = null;

  //rate
  let rate = {};

  for (const e of $("._1lRcqv > ._3LWZlK")) {
    rate.ratingCount = $(e).text() + " out of 5 stars";
    break;
  }

  for (const e of $("._2_R_DZ")) {
    rate.totalRated = $(e).text();
    break;
  }
  response.rating = rate;

  //domain
  response.domain = domain;

  //url
  if (URL.includes("dl.flipkart.com")) {
    if ($("link[rel='canonical']").attr("href")) {
      response.url = $("link[rel='canonical']").attr("href");
    } else {
      response.url = $("meta[name='og_url']").attr("content");
    }
  } else {
    response.url = URL;
  }

  return response;
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
