import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  const storage1 = await page.evaluate(async () => await navigator.storage.estimate());
  console.log("Storage 1:", storage1);
  
  await page.evaluate(async () => {
    const keys = await caches.keys();
    for (const k of keys) {
      if (k.includes('webllm')) await caches.delete(k);
    }
  });
  
  const storage2 = await page.evaluate(async () => await navigator.storage.estimate());
  console.log("Storage 2:", storage2);
  
  await browser.close();
})();
