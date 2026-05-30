const puppeteer = require('puppeteer');

async function testProduction() {
  console.log('Launching browser to check production URL: https://elevore-saas.vercel.app ...');
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    page.on('console', (msg) => {
      console.log(`[PROD CONSOLE] [${msg.type()}]: ${msg.text()}`);
    });

    page.on('pageerror', (err) => {
      console.error(`[PROD RUNTIME EXCEPTION]:`, err.message, err.stack);
    });

    await page.goto('https://elevore-saas.vercel.app/?view=auth', { waitUntil: 'networkidle0', timeout: 20000 });
    console.log('Production auth page loaded successfully.');
    
    // Take a screenshot to see if it's black
    await page.screenshot({ path: 'scratch/prod_auth_screenshot.png' });
    console.log('Saved production screenshot to scratch/prod_auth_screenshot.png');
  } catch (error) {
    console.error('Error during production URL check:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
    process.exit(0);
  }
}

testProduction();
