import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  await page.waitForSelector('#model-switcher-btn');
  console.log("App loaded. Now attempting to open sidebar/modal.");
  
  await page.type('textarea', 'Hello');
  await page.click('#send-prompt-btn');
  
  await new Promise(r => setTimeout(r, 2000));
  
  const menuBtn = await page.$('button[title="Chat options (or right-click)"]');
  if (menuBtn) {
    await menuBtn.click();
    console.log("Clicked menu button");
    await new Promise(r => setTimeout(r, 500));
    
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('button'));
      const pdfBtn = items.find(el => el.textContent.includes('Save chat as PDF'));
      if (pdfBtn) {
        pdfBtn.click();
        console.log("Clicked Save as PDF via evaluate");
      }
    });
  } else {
    console.log("Menu btn not found");
  }

  await new Promise(r => setTimeout(r, 10000));
  await browser.close();
})();
