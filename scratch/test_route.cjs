const puppeteer = require('puppeteer');
const { exec } = require('child_process');

console.log('Starting Vite preview server for testing...');
const previewProcess = exec('npm run preview', { cwd: 'c:\\Users\\Jose Mario\\OneDrive\\Escritorio\\Nuevo proyecto Saas' });

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

    page.on('console', (msg) => {
      console.log(`[BROWSER CONSOLE] [${msg.type()}]: ${msg.text()}`);
    });

    page.on('pageerror', (err) => {
      console.error(`[BROWSER RUNTIME ERROR]:`, err.message);
    });

    console.log('Navigating to http://localhost:4173/ ...');
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0', timeout: 10000 });

    // Click "Iniciar Sesión" or similar to enter PIN
    // Let's locate the PIN input and enter '1122'
    console.log('Entering PIN passcode...');
    await page.evaluate(() => {
      // Find Pin input or enter directly
      const inputs = document.querySelectorAll('input');
      // Or we can just set the React state or localStorage directly!
      localStorage.setItem('elevore_user_role', 'staff');
    });

    // Let's reload so it starts as staff
    await page.goto('http://localhost:4173/?view=staff', { waitUntil: 'networkidle0', timeout: 10000 });

    console.log('Simulating staff role directly in state...');
    await page.evaluate(() => {
      // Click staff role button if present
      // We can also input the passcode '1122' on the page
    });

    // Take screenshot of staff workspace
    await page.screenshot({ path: 'scratch/staff_screen.png' });
    console.log('Screenshot saved.');

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
