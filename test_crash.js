import puppeteer from 'puppeteer';

(async () => {
  console.log('Starting puppeteer...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message, error.stack));
  
  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  } catch(e) {
    console.log('Nav error:', e.message);
  }
  
  await browser.close();
})();
