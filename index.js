const getUserAgents = require("./utilities/useragents");
const cheerio = require("cheerio");

const app = require("express")();

let chrome = {};
let puppeteer;

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  chrome = require("chrome-aws-lambda");
  puppeteer = require("puppeteer-core");
} else {
  puppeteer = require("puppeteer");
}

app.get("/api", async (req, res) => {
  let options = {};

  if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    options = {
      args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    };
  }

  try {
    let retry = 0;
    do {
      console.log("retrying... ", retry);
      let browser = await puppeteer.launch(options);
      let page = await browser.newPage();
      let userAgent = getUserAgents();
      await page.setUserAgent(userAgent);
      await page.goto(
        "https://www.myntra.com/sports-shoes/puma/puma-men-black-zeta-mesh-running-shoes/14463342/buy",
        {
          waitUntil: "domcontentloaded",
        }
      );
      let $ = cheerio.load(await page.content());
      await browser.close();
      if ($ && $(".pdp-name").html() != null) {
        console.log($(".pdp-name").html());
        let response = fetchMyntra(
          $,
          "https://www.myntra.com/sports-shoes/puma/puma-men-black-zeta-mesh-running-shoes/14463342/buy",
          "MYNTRA"
        );
        res.json({ response: await response }).status(200);
      } else {
        retry++;
      }
    } while (retry <= 5);
  } catch (err) {
    console.error(err.message);
  }
});

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

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});

module.exports = app;
