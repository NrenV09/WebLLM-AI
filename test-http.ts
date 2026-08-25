import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(fs.readFileSync('final.html'));
});

server.listen(3001, async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (error: any) => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:3001');
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
  server.close();
});
