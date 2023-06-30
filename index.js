const express = require("express");
const app = express();

const PORT = process.env.PORT || 4000;

app.get("/scrape", async(req, res) => {
  const browser = await puppeteer.connect({
    browserWSEndpoint: `wss://${process.env.RAILWAY_STATIC_URL}/devtools/browser`,
  });

  // Create a new page
  const page = await browser.newPage();

  await page.goto("https://www.myntra.com/sports-shoes/puma/puma-men-black-zeta-mesh-running-shoes/14463342/buy");
  
  const title = await page.title();
  console.log('Page title:', title);

  // Close the browser
  await browser.close();
});

app.get("/", (req, res) => {
  res.send("Render Puppeteer server is up and running!");
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});

module.exports = app;
