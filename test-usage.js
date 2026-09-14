import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  const usage = await page.evaluate(async () => {
    return await navigator.storage.estimate();
  });
  console.log("Usage:", usage);
  await browser.close();
})();
