import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  const idb = await page.evaluate(async () => {
    return await indexedDB.databases();
  });
  console.log("IDBs:", idb);
  await browser.close();
})();
