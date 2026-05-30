const puppeteer = require('puppeteer');
const { exec } = require('child_process');

console.log('Starting Vite preview server for testing...');
const previewProcess = exec('npm.cmd run preview', { cwd: 'c:\\Users\\Jose Mario\\OneDrive\\Escritorio\\Nuevo proyecto Saas' });

previewProcess.stdout.on('data', (data) => {
  console.log(`[Preview Server]: ${data.trim()}`);
});

setTimeout(async () => {
  console.log('Launching browser via Puppeteer...');
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    console.log('Navigating to http://localhost:4173/ ...');
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0', timeout: 15000 });

    // Take screenshot of default EN landing
    await page.screenshot({ path: 'scratch/landing_en.png' });
    console.log('Default English landing page screenshot saved.');

    // Look for translation buttons
    console.log('Looking for ES button...');
    const buttons = await page.$$('button');
    let esButton = null;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.trim() === 'ES') {
        esButton = btn;
        break;
      }
    }

    if (esButton) {
      console.log('ES button found! Clicking...');
      await esButton.click();
      await new Promise(r => setTimeout(r, 1000));

      // Take screenshot after switching to Spanish
      await page.screenshot({ path: 'scratch/landing_es.png' });
      console.log('Spanish translation landing page screenshot saved.');

      // Check if button text updated to Spanish
      const updatedButtons = await page.$$('button');
      let foundSpanishTrial = false;
      for (const btn of updatedButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text.includes('Prueba Gratis') || text.includes('Demostración')) {
          console.log(`Successfully verified Spanish copy: "${text.trim()}"`);
          foundSpanishTrial = true;
        }
      }

      if (!foundSpanishTrial) {
        console.error('Error: Could not find any Spanish text on the landing page after click.');
      } else {
        console.log('Success: Translation verification completed successfully.');
      }
    } else {
      console.error('Error: ES translation button not found on landing page.');
    }

  } catch (error) {
    console.error('Error during browser test:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
    console.log('Killing Preview server...');
    previewProcess.kill();
    process.exit(0);
  }
}, 5000);
