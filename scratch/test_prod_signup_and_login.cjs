const puppeteer = require('puppeteer');

async function testSignupAndLogin() {
  console.log('Launching browser for complete signup + login test on production...');
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

    // 1. SIGNUP
    await page.goto('https://elevore-saas.vercel.app/?view=signup', { waitUntil: 'networkidle0', timeout: 25000 });
    console.log('Signup page loaded.');

    const rand = Math.random().toString(36).substring(7);
    const email = `jose_mario_${rand}@elevore.com`;
    const password = 'password123';

    console.log(`Signing up with email: ${email}`);
    await page.waitForSelector('input', { timeout: 10000 });
    const inputs1 = await page.$$('input');
    await inputs1[0].type(`Empire ${rand}`);

    const nextBtn = await page.$('button.gold');
    await nextBtn.click();
    await new Promise(r => setTimeout(r, 1000));

    const inputs2 = await page.$$('input');
    await inputs2[0].type(email);
    await inputs2[1].type(password);

    const submitBtn = await page.$('button[type="submit"]');
    await submitBtn.click();

    console.log('Waiting after signup (redirect to landing)...');
    await new Promise(r => setTimeout(r, 6000));

    // 2. LOGIN
    console.log('Navigating to login page...');
    await page.goto('https://elevore-saas.vercel.app/?view=auth', { waitUntil: 'networkidle0', timeout: 25000 });
    
    console.log('Entering login credentials...');
    await page.waitForSelector('input', { timeout: 10000 });
    const loginInputs = await page.$$('input');
    await loginInputs[0].type(email);
    await loginInputs[1].type(password);

    console.log('Submitting login...');
    const loginBtn = await page.$('button[type="submit"]');
    await loginBtn.click();

    console.log('Waiting for dashboard load...');
    await new Promise(r => setTimeout(r, 7000));

    // Capture screenshot of dashboard
    await page.screenshot({ path: 'scratch/prod_after_login_dashboard.png' });
    console.log('Saved screenshot to scratch/prod_after_login_dashboard.png');

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
    process.exit(0);
  }
}

testSignupAndLogin();
