import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto('file://' + process.cwd() + '/test-worker-file.html');
  await new Promise(r => setTimeout(r, 1000));
  const text = await page.$eval('#out', (el: any) => el.innerText);
  console.log('TEXT:', text);
  await browser.close();
})();
