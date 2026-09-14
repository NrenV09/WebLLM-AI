import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  const hasOPFS = await page.evaluate(async () => {
    try {
      const root = await navigator.storage.getDirectory();
      let entries = [];
      for await (const [name, handle] of root.entries()) {
        entries.push(name);
      }
      return entries;
    } catch(e) { return e.toString(); }
  });
  console.log("OPFS:", hasOPFS);
  await browser.close();
})();
