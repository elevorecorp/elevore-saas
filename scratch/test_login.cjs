const puppeteer = require('puppeteer');
const { exec } = require('child_process');

console.log('Starting Vite dev server...');
const devProcess = exec('npm run dev', { cwd: 'c:\\Users\\Jose Mario\\OneDrive\\Escritorio\\Nuevo proyecto Saas' });

devProcess.stdout.on('data', (data) => {
  console.log(`[Dev Server]: ${data.trim()}`);
});

setTimeout(async () => {
  console.log('Launching browser to test login flow...');
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    page.on('console', (msg) => {
      console.log(`[BROWSER CONSOLE] [${msg.type()}]: ${msg.text()}`);
    });

    page.on('pageerror', (err) => {
      console.error(`[BROWSER RUNTIME EXCEPTION]:`, err.message, err.stack);
    });

    await page.goto('http://localhost:5173/?view=auth', { waitUntil: 'networkidle0', timeout: 15000 });
    console.log('Auth page loaded.');

    // Click on the Staff tab
    console.log('Clicking Staff tab...');
    const tabs = await page.$$('button');
    for (const tab of tabs) {
      const text = await page.evaluate(el => el.textContent, tab);
      if (text.trim().toLowerCase() === 'staff') {
        await tab.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 500));

    // Fill in credentials
    console.log('Entering credentials...');
    const inputs = await page.$$('input');
    // First input is email/company name, second is PIN
    await inputs[0].type('Jose Mario');
    await inputs[1].type('2026');

    // Click submit
    console.log('Submitting login...');
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      console.error('Submit button not found');
    }

    // Wait to see if it redirects or crashes
    await new Promise(r => setTimeout(r, 3000));

    // Capture screenshot
    await page.screenshot({ path: 'scratch/after_login_screenshot.png' });
    console.log('Screenshot saved to scratch/after_login_screenshot.png');
    
  } catch (error) {
    console.error('Error during login check:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
    console.log('Killing Dev server...');
    devProcess.kill();
    process.exit(0);
  }
}, 5000);
