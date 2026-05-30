const puppeteer = require('puppeteer');

async function testProdSignup() {
  console.log('Launching browser to test production Signup & Dashboard...');
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    page.on('console', (msg) => {
      console.log(`[PROD CONSOLE] [${msg.type()}]: ${msg.text()}`);
    });

    page.on('pageerror', (err) => {
      console.error(`[PROD RUNTIME EXCEPTION]:`, err.message, err.stack);
    });

    // Go to production signup
    await page.goto('https://elevore-saas.vercel.app/?view=signup', { waitUntil: 'networkidle0', timeout: 25000 });
    console.log('Signup page loaded.');

    const rand = Math.random().toString(36).substring(7);
    const email = `test_${rand}@elevore.com`;

    console.log('Entering step 1: Business Name...');
    await page.waitForSelector('input', { timeout: 10000 });
    const inputs1 = await page.$$('input');
    await inputs1[0].type(`Test Corp ${rand}`);

    console.log('Clicking Next Step...');
    const nextBtn = await page.$('button.gold');
    if (nextBtn) {
      await nextBtn.click();
    } else {
      console.error('Next Step button not found');
    }

    await new Promise(r => setTimeout(r, 1000));

    console.log('Entering step 2: Email and Password...');
    const inputs2 = await page.$$('input');
    await inputs2[0].type(email);
    await inputs2[1].type('password123');

    console.log('Submitting signup...');
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      console.error('Submit button not found');
    }

    // Wait to see if it redirects and renders dashboard
    console.log('Waiting for redirection and dashboard load...');
    await new Promise(r => setTimeout(r, 6000));

    // Capture screenshot
    await page.screenshot({ path: 'scratch/prod_after_signup_dashboard.png' });
    console.log('Screenshot saved to scratch/prod_after_signup_dashboard.png');

  } catch (error) {
    console.error('Error during production signup test:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
    process.exit(0);
  }
}

testProdSignup();
