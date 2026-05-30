const puppeteer = require('puppeteer');
const { exec } = require('child_process');

console.log('Starting Vite dev server...');
const devProcess = exec('npm run dev', { cwd: 'c:\\Users\\Jose Mario\\OneDrive\\Escritorio\\Nuevo proyecto Saas' });

devProcess.stdout.on('data', (data) => {
  console.log(`[Dev Server]: ${data.trim()}`);
});

setTimeout(async () => {
  console.log('Launching browser to test Signup & Dashboard rendering...');
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

    // Go to signup view
    await page.goto('http://localhost:5173/?view=signup', { waitUntil: 'networkidle0', timeout: 15000 });
    console.log('Signup page loaded.');

    const rand = Math.random().toString(36).substring(7);
    const email = `test_${rand}@elevore.com`;

    // Fill in signup form
    console.log('Filling in signup details...');
    const inputs = await page.$$('input');
    // OnboardingFlow inputs:
    // 0: Business Name
    // 1: Admin Name
    // 2: Email
    // 3: Password
    // 4: PIN
    await inputs[0].type(`Test Company ${rand}`);
    await inputs[1].type('Jose Admin');
    await inputs[2].type(email);
    await inputs[3].type('password123');
    await inputs[4].type('2026');

    console.log('Submitting signup...');
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    }

    // Wait to see if it redirects to the dashboard (?view=brief) and check if it goes black
    await new Promise(r => setTimeout(r, 4500));

    // Capture screenshot of dashboard
    await page.screenshot({ path: 'scratch/after_signup_dashboard.png' });
    console.log('Dashboard screenshot saved to scratch/after_signup_dashboard.png');

  } catch (error) {
    console.error('Error during signup check:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
    console.log('Killing Dev server...');
    devProcess.kill();
    process.exit(0);
  }
}, 5000);
